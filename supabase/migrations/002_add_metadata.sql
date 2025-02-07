-- Add metadata column to transactions
ALTER TABLE transactions
ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Add metadata index for better performance
CREATE INDEX idx_transactions_metadata ON transactions USING GIN (metadata);

-- Add notifications table for transaction updates
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('transaction', 'system', 'support')),
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Create function to automatically create notifications for transactions
CREATE OR REPLACE FUNCTION create_transaction_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- For new transactions
    IF TG_OP = 'INSERT' THEN
        -- Notify the sender
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (
            NEW.user_id,
            CASE
                WHEN NEW.type = 'deposit' THEN 'Deposit Initiated'
                WHEN NEW.type = 'withdraw' THEN 'Withdrawal Initiated'
                WHEN NEW.type = 'send' THEN 'Money Sent'
            END,
            CASE
                WHEN NEW.type = 'deposit' THEN 'Your deposit of $' || NEW.amount || ' has been initiated'
                WHEN NEW.type = 'withdraw' THEN 'Your withdrawal of $' || NEW.amount || ' has been initiated'
                WHEN NEW.type = 'send' THEN 'You have sent $' || NEW.amount || ' to another user'
            END,
            'transaction'
        );
        
        -- Notify the recipient for send transactions
        IF NEW.type = 'send' AND NEW.recipient_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (
                NEW.recipient_id,
                'Money Received',
                'You have received $' || NEW.amount || ' from another user',
                'transaction'
            );
        END IF;
    END IF;

    -- For status updates
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Notify the user about status change
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (
            NEW.user_id,
            'Transaction Status Updated',
            CASE
                WHEN NEW.status = 'completed' THEN 'Your ' || NEW.type || ' transaction for $' || NEW.amount || ' has been completed'
                WHEN NEW.status = 'failed' THEN 'Your ' || NEW.type || ' transaction for $' || NEW.amount || ' has failed'
                ELSE 'Your ' || NEW.type || ' transaction for $' || NEW.amount || ' status has been updated to ' || NEW.status
            END,
            'transaction'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transaction notifications
CREATE TRIGGER transaction_notification_trigger
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION create_transaction_notification();

-- Add bank_accounts table for user bank details
CREATE TABLE bank_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    bank_id UUID REFERENCES banks(id) NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for bank_accounts
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Bank accounts policies
CREATE POLICY "Users can view their own bank accounts"
    ON bank_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts"
    ON bank_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts"
    ON bank_accounts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts"
    ON bank_accounts FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all bank accounts"
    ON bank_accounts FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can update all bank accounts"
    ON bank_accounts FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'admin');

-- Add function to ensure only one default bank account per user
CREATE OR REPLACE FUNCTION ensure_single_default_bank_account()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default THEN
        UPDATE bank_accounts
        SET is_default = false
        WHERE user_id = NEW.user_id
        AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default bank account
CREATE TRIGGER single_default_bank_account_trigger
    BEFORE INSERT OR UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_bank_account();
