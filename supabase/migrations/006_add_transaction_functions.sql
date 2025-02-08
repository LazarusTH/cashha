-- Drop existing functions first
DROP FUNCTION IF EXISTS get_user_transaction_totals(UUID);
DROP FUNCTION IF EXISTS get_user_monthly_transactions(UUID);
DROP FUNCTION IF EXISTS get_user_balance(UUID);
DROP FUNCTION IF EXISTS check_user_balance(UUID, DECIMAL(12,2));

-- Function to get user transaction totals
CREATE OR REPLACE FUNCTION get_user_transaction_totals(user_id UUID)
RETURNS TABLE (
    total_deposits DECIMAL(12,2),
    total_withdrawals DECIMAL(12,2),
    total_sent DECIMAL(12,2),
    total_received DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0) as total_deposits,
        COALESCE(SUM(CASE WHEN w.status = 'approved' THEN w.amount ELSE 0 END), 0) as total_withdrawals,
        COALESCE(SUM(CASE WHEN t.type = 'send' AND t.status = 'approved' THEN t.amount ELSE 0 END), 0) as total_sent,
        COALESCE(SUM(CASE WHEN t.type = 'receive' AND t.status = 'approved' THEN t.amount ELSE 0 END), 0) as total_received
    FROM deposits d
    LEFT JOIN withdrawals w ON w.user_id = user_id
    LEFT JOIN transactions t ON t.user_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user monthly transactions
CREATE OR REPLACE FUNCTION get_user_monthly_transactions(user_id UUID)
RETURNS TABLE (
    month DATE,
    total_deposits DECIMAL(12,2),
    total_withdrawals DECIMAL(12,2),
    total_sent DECIMAL(12,2),
    total_received DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH months AS (
        SELECT generate_series(
            date_trunc('month', NOW()) - interval '11 months',
            date_trunc('month', NOW()),
            interval '1 month'
        )::DATE as month
    )
    SELECT
        m.month,
        COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0) as total_deposits,
        COALESCE(SUM(CASE WHEN w.status = 'approved' THEN w.amount ELSE 0 END), 0) as total_withdrawals,
        COALESCE(SUM(CASE WHEN t.type = 'send' AND t.status = 'approved' THEN t.amount ELSE 0 END), 0) as total_sent,
        COALESCE(SUM(CASE WHEN t.type = 'receive' AND t.status = 'approved' THEN t.amount ELSE 0 END), 0) as total_received
    FROM months m
    LEFT JOIN deposits d ON date_trunc('month', d.created_at)::DATE = m.month AND d.user_id = user_id
    LEFT JOIN withdrawals w ON date_trunc('month', w.created_at)::DATE = m.month AND w.user_id = user_id
    LEFT JOIN transactions t ON date_trunc('month', t.created_at)::DATE = m.month AND t.user_id = user_id
    GROUP BY m.month
    ORDER BY m.month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user balance
CREATE OR REPLACE FUNCTION get_user_balance(user_id UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    balance DECIMAL(12,2);
BEGIN
    SELECT
        COALESCE(
            SUM(
                CASE
                    WHEN d.status = 'approved' THEN d.amount
                    WHEN w.status = 'approved' THEN -w.amount
                    WHEN t.type = 'send' AND t.status = 'approved' THEN -t.amount
                    WHEN t.type = 'receive' AND t.status = 'approved' THEN t.amount
                    ELSE 0
                END
            ),
            0
        ) INTO balance
    FROM deposits d
    LEFT JOIN withdrawals w ON w.user_id = user_id
    LEFT JOIN transactions t ON t.user_id = user_id;
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has sufficient balance
CREATE OR REPLACE FUNCTION check_user_balance(user_id UUID, amount DECIMAL(12,2))
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(12,2);
BEGIN
    SELECT get_user_balance(user_id) INTO current_balance;
    RETURN current_balance >= amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes to improve function performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_recipient ON transactions(user_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(type, status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
