-- Create deposit requests table
CREATE TABLE IF NOT EXISTS deposit_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    amount DECIMAL(10,2) NOT NULL,
    receipt_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    admin_note TEXT,
    approved_by UUID REFERENCES auth.users(id),
    rejected_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create withdrawal requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    amount DECIMAL(10,2) NOT NULL,
    bank_id UUID REFERENCES banks(id),
    account_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    admin_note TEXT,
    approved_by UUID REFERENCES auth.users(id),
    rejected_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sending requests table
CREATE TABLE IF NOT EXISTS sending_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id),
    recipient_id UUID REFERENCES auth.users(id),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    admin_note TEXT,
    approved_by UUID REFERENCES auth.users(id),
    rejected_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_created ON deposit_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created ON withdrawal_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_sending_requests_sender ON sending_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_sending_requests_recipient ON sending_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_sending_requests_status ON sending_requests(status);
CREATE INDEX IF NOT EXISTS idx_sending_requests_created ON sending_requests(created_at);

-- Add triggers for updated_at
CREATE TRIGGER update_deposit_requests_updated_at
    BEFORE UPDATE ON deposit_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at
    BEFORE UPDATE ON withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sending_requests_updated_at
    BEFORE UPDATE ON sending_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sending_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own deposit requests"
    ON deposit_requests
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view their own withdrawal requests"
    ON withdrawal_requests
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view their own sending requests"
    ON sending_requests
    FOR SELECT
    USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Users can create requests
CREATE POLICY "Users can create deposit requests"
    ON deposit_requests
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can create withdrawal requests"
    ON withdrawal_requests
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can create sending requests"
    ON sending_requests
    FOR INSERT
    WITH CHECK (sender_id = auth.uid());

-- Admins can manage all requests
CREATE POLICY "Admins can manage all deposit requests"
    ON deposit_requests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all withdrawal requests"
    ON withdrawal_requests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all sending requests"
    ON sending_requests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
