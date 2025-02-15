-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

BEGIN;

-- Core Tables
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret TEXT,
    email_notifications BOOLEAN DEFAULT true,
    login_alerts BOOLEAN DEFAULT true,
    transaction_alerts BOOLEAN DEFAULT true,
    last_password_change TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMPTZ,
    deactivation_reason TEXT,
    deactivated_at TIMESTAMPTZ,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security Tables
CREATE TABLE security_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, question)
);

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

CREATE TABLE security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    details JSONB,
    ip_address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transaction Tables
CREATE TABLE transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw', 'send')),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    recipient_id UUID REFERENCES profiles(id),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE banks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support Tables
CREATE TABLE support_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_security_questions_user_id ON security_questions(user_id);
CREATE INDEX idx_device_history_user_id ON device_history(user_id);
CREATE INDEX idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_login_attempts_created_at ON login_attempts(created_at DESC);
CREATE INDEX idx_device_history_last_active ON device_history(last_active DESC);
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at DESC);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_recipient_id ON transactions(recipient_id);
CREATE INDEX idx_support_requests_user_id ON support_requests(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles"
    ON profiles FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- Security Questions
CREATE POLICY "Users can view own security questions"
    ON security_questions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own security questions"
    ON security_questions FOR ALL
    USING (auth.uid() = user_id);

-- Device History
CREATE POLICY "Users can view own device history"
    ON device_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own device history"
    ON device_history FOR ALL
    USING (auth.uid() = user_id);

-- Login Attempts
CREATE POLICY "Users can view own login attempts"
    ON login_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own login attempts"
    ON login_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Security Logs
CREATE POLICY "Users can view own security logs"
    ON security_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own security logs"
    ON security_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Transactions
CREATE POLICY "Users can view their own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create transactions"
    ON transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all transactions"
    ON transactions FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- Banks
CREATE POLICY "Anyone can view active banks"
    ON banks FOR SELECT
    USING (status = 'active');

CREATE POLICY "Admin can manage banks"
    ON banks FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- Support Requests
CREATE POLICY "Users can view their own support requests"
    ON support_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create support requests"
    ON support_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all support requests"
    ON support_requests FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- Functions and Triggers

-- Update last active timestamp
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET last_active = NOW()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_last_active_on_login
    AFTER INSERT ON login_attempts
    FOR EACH ROW
    WHEN (NEW.success = true)
    EXECUTE FUNCTION update_last_active();

-- Handle failed login attempts
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

CREATE TRIGGER handle_failed_login_attempt
    AFTER INSERT ON login_attempts
    FOR EACH ROW
    EXECUTE FUNCTION handle_failed_login();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_banks_updated_at
    BEFORE UPDATE ON banks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_requests_updated_at
    BEFORE UPDATE ON support_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT; 