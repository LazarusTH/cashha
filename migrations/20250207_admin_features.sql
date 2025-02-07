-- Create email templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email receipts table
CREATE TABLE IF NOT EXISTS email_receipts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    template_id UUID REFERENCES email_templates(id),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin settings table
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    min_withdrawal_amount DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    max_withdrawal_amount DECIMAL(10,2) NOT NULL DEFAULT 10000.00,
    min_deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    max_deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 10000.00,
    transaction_fee_percentage DECIMAL(5,2) NOT NULL DEFAULT 2.50,
    support_email VARCHAR(255) NOT NULL DEFAULT 'support@cashora.com',
    maintenance_mode BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) UNIQUE,
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    push_notifications BOOLEAN NOT NULL DEFAULT true,
    transaction_alerts BOOLEAN NOT NULL DEFAULT true,
    security_alerts BOOLEAN NOT NULL DEFAULT true,
    marketing_emails BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create security settings table
CREATE TABLE IF NOT EXISTS security_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    max_login_attempts INTEGER NOT NULL DEFAULT 5,
    lockout_duration_minutes INTEGER NOT NULL DEFAULT 30,
    require_2fa_for_withdrawals BOOLEAN NOT NULL DEFAULT true,
    minimum_password_length INTEGER NOT NULL DEFAULT 8,
    password_requires_letter BOOLEAN NOT NULL DEFAULT true,
    password_requires_number BOOLEAN NOT NULL DEFAULT true,
    password_requires_special_char BOOLEAN NOT NULL DEFAULT true,
    session_timeout_minutes INTEGER NOT NULL DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_receipts_user_id ON email_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_receipts_sent_at ON email_receipts(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- Insert default admin settings
INSERT INTO admin_settings (id) VALUES (uuid_generate_v4())
ON CONFLICT DO NOTHING;

-- Insert default security settings
INSERT INTO security_settings (id) VALUES (uuid_generate_v4())
ON CONFLICT DO NOTHING;

-- Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at
    BEFORE UPDATE ON admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
