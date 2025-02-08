BEGIN;

-- Create security_questions table
DROP TABLE IF EXISTS security_questions CASCADE;
CREATE TABLE security_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, question)
);

-- Create device_history table
DROP TABLE IF EXISTS device_history CASCADE;
CREATE TABLE device_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_id TEXT NOT NULL,
    browser TEXT,
    os TEXT,
    ip_address TEXT NOT NULL,
    location TEXT,
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

-- Create login_attempts table
DROP TABLE IF EXISTS login_attempts CASCADE;
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL,
    location TEXT,
    device_info JSONB,
    success BOOLEAN NOT NULL DEFAULT false,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create security_logs table
DROP TABLE IF EXISTS security_logs CASCADE;
CREATE TABLE security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    details JSONB,
    ip_address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Check if profiles table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        RAISE EXCEPTION 'The profiles table must exist before running this migration';
    END IF;
END
$$;

-- Add security-related columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_alerts BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transaction_alerts BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_security_questions_user_id ON security_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_history_user_id ON device_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_history_last_active ON device_history(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at DESC);

-- Enable RLS on all security tables
ALTER TABLE security_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own device history" ON device_history;
DROP POLICY IF EXISTS "Users can update own device history" ON device_history;
DROP POLICY IF EXISTS "Users can delete own device history" ON device_history;
DROP POLICY IF EXISTS "Users can view own security questions" ON security_questions;
DROP POLICY IF EXISTS "Users can update own security questions" ON security_questions;
DROP POLICY IF EXISTS "Users can delete own security questions" ON security_questions;
DROP POLICY IF EXISTS "Users can view own login attempts" ON login_attempts;
DROP POLICY IF EXISTS "Users can insert own login attempts" ON login_attempts;
DROP POLICY IF EXISTS "Users can view own security logs" ON security_logs;
DROP POLICY IF EXISTS "Users can insert own security logs" ON security_logs;

-- Create RLS policies
-- Device History policies
CREATE POLICY "Users can view own device history"
    ON device_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own device history"
    ON device_history FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own device history"
    ON device_history FOR DELETE
    USING (auth.uid() = user_id);

-- Security Questions policies
CREATE POLICY "Users can view own security questions"
    ON security_questions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own security questions"
    ON security_questions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own security questions"
    ON security_questions FOR DELETE
    USING (auth.uid() = user_id);

-- Login Attempts policies
CREATE POLICY "Users can view own login attempts"
    ON login_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own login attempts"
    ON login_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Security Logs policies
CREATE POLICY "Users can view own security logs"
    ON security_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own security logs"
    ON security_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create functions and triggers
-- Function to update last_active timestamp
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET last_active = NOW()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_active on login
DROP TRIGGER IF EXISTS update_last_active_on_login ON login_attempts;
CREATE TRIGGER update_last_active_on_login
    AFTER INSERT ON login_attempts
    FOR EACH ROW
    WHEN (NEW.success = true)
    EXECUTE FUNCTION update_last_active();

-- Function to handle failed login attempts
CREATE OR REPLACE FUNCTION handle_failed_login()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT NEW.success THEN
        UPDATE profiles
        SET failed_login_attempts = failed_login_attempts + 1,
            account_locked_until = CASE
                WHEN failed_login_attempts >= 5 THEN NOW() + INTERVAL '30 minutes'
                ELSE NULL
            END
        WHERE id = NEW.user_id;
    ELSE
        UPDATE profiles
        SET failed_login_attempts = 0,
            account_locked_until = NULL
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for failed login attempts
DROP TRIGGER IF EXISTS handle_failed_login_attempt ON login_attempts;
CREATE TRIGGER handle_failed_login_attempt
    AFTER INSERT ON login_attempts
    FOR EACH ROW
    EXECUTE FUNCTION handle_failed_login();

COMMIT;
