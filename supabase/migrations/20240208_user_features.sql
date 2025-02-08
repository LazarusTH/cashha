BEGIN;

-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer')),
    amount DECIMAL(19,4) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    reference TEXT UNIQUE,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id),
    message TEXT NOT NULL,
    attachments JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can update own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view messages of own tickets" ON support_messages;
DROP POLICY IF EXISTS "Users can send messages to own tickets" ON support_messages;

-- Policies for bank_accounts
CREATE POLICY "Users can view own bank accounts"
    ON bank_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank accounts"
    ON bank_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank accounts"
    ON bank_accounts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank accounts"
    ON bank_accounts FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for transactions
CREATE POLICY "Users can view own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
    ON transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policies for support_tickets
CREATE POLICY "Users can view own tickets"
    ON support_tickets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
    ON support_tickets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies for support_messages
CREATE POLICY "Users can view messages of own tickets"
    ON support_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM support_tickets 
        WHERE id = ticket_id 
        AND user_id = auth.uid()
    ));

CREATE POLICY "Users can send messages to own tickets"
    ON support_messages FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM support_tickets 
        WHERE id = ticket_id 
        AND user_id = auth.uid()
    ));

-- Add transaction limits to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_transfer_limit DECIMAL(19,4);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_withdrawal_limit DECIMAL(19,4);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_deposit_limit DECIMAL(19,4);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_balance DECIMAL(19,4) DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);

COMMIT;
