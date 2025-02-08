-- Create transaction status enum
CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'rejected');

-- Create user_limits table
CREATE TABLE IF NOT EXISTS user_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    min_deposit_amount DECIMAL(12,2) NOT NULL DEFAULT 100,
    max_deposit_amount DECIMAL(12,2) NOT NULL DEFAULT 100000,
    daily_deposit_limit DECIMAL(12,2) NOT NULL DEFAULT 50000,
    monthly_deposit_limit DECIMAL(12,2) NOT NULL DEFAULT 1000000,
    min_withdrawal_amount DECIMAL(12,2) NOT NULL DEFAULT 100,
    max_withdrawal_amount DECIMAL(12,2) NOT NULL DEFAULT 50000,
    daily_withdrawal_limit DECIMAL(12,2) NOT NULL DEFAULT 25000,
    monthly_withdrawal_limit DECIMAL(12,2) NOT NULL DEFAULT 500000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create deposits table
CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    payment_method TEXT NOT NULL,
    description TEXT,
    status transaction_status NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    rejected_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    description TEXT,
    status transaction_status NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    rejected_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_user_balance(UUID);

-- Create function to calculate user balance
CREATE OR REPLACE FUNCTION get_user_balance(user_id UUID)
RETURNS DECIMAL(12,2)
LANGUAGE plpgsql
AS $$
DECLARE
    total_deposits DECIMAL(12,2);
    total_withdrawals DECIMAL(12,2);
BEGIN
    -- Get total approved deposits
    SELECT COALESCE(SUM(amount), 0)
    INTO total_deposits
    FROM deposits
    WHERE user_id = $1 AND status = 'approved';

    -- Get total approved withdrawals
    SELECT COALESCE(SUM(amount), 0)
    INTO total_withdrawals
    FROM withdrawals
    WHERE user_id = $1 AND status = 'approved';

    -- Return balance
    RETURN total_deposits - total_withdrawals;
END;
$$;

-- Create indexes for better query performance
CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_deposits_created_at ON deposits(created_at);
CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_withdrawals_created_at ON withdrawals(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE user_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- user_limits policies
CREATE POLICY "Users can view their own limits"
    ON user_limits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert/update limits"
    ON user_limits FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- deposits policies
CREATE POLICY "Users can view their own deposits"
    ON deposits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deposits"
    ON deposits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can update deposits"
    ON deposits FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- withdrawals policies
CREATE POLICY "Users can view their own withdrawals"
    ON withdrawals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawals"
    ON withdrawals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can update withdrawals"
    ON withdrawals FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_limits_updated_at
    BEFORE UPDATE ON user_limits
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_deposits_updated_at
    BEFORE UPDATE ON deposits
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_withdrawals_updated_at
    BEFORE UPDATE ON withdrawals
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
