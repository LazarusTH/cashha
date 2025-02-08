BEGIN;

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date ON transactions(user_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_status ON transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_default ON bank_accounts(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status ON support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_type ON security_logs(user_id, type);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_success ON login_attempts(user_id, success);

-- Add partial indexes for common filtered queries
CREATE INDEX IF NOT EXISTS idx_transactions_pending ON transactions(user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_transactions_completed ON transactions(user_id) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_bank_accounts_verified ON bank_accounts(user_id) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_support_tickets_open ON support_tickets(user_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_login_attempts_failed ON login_attempts(user_id) WHERE success = false;

COMMIT;
