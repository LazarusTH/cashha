BEGIN;

-- Add text search indexes for common search queries
CREATE INDEX IF NOT EXISTS idx_bank_accounts_account_name_trgm ON bank_accounts USING gin (account_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_account_number_trgm ON bank_accounts USING gin (account_number gin_trgm_ops);

COMMIT;
