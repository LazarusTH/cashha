-- Create banks table
CREATE TABLE IF NOT EXISTS banks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    logo_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add code column to banks table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banks' AND column_name = 'code'
    ) THEN
        ALTER TABLE banks ADD COLUMN code VARCHAR(50) UNIQUE;
    END IF;
END $$;

-- Create user_banks table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_banks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    bank_id UUID REFERENCES banks(id),
    assigned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, bank_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_banks_code ON banks(code);
CREATE INDEX IF NOT EXISTS idx_banks_created ON banks(created_at);

CREATE INDEX IF NOT EXISTS idx_user_banks_user ON user_banks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_banks_bank ON user_banks(bank_id);
CREATE INDEX IF NOT EXISTS idx_user_banks_created ON user_banks(created_at);

-- Add trigger for updated_at if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_banks_updated_at'
    ) THEN
        CREATE TRIGGER update_banks_updated_at
            BEFORE UPDATE ON banks
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add RLS policies
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_banks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view assigned banks" ON banks;
DROP POLICY IF EXISTS "Users can view their bank assignments" ON user_banks;
DROP POLICY IF EXISTS "Admins can manage all banks" ON banks;
DROP POLICY IF EXISTS "Admins can manage all bank assignments" ON user_banks;

-- Users can view banks they're assigned to
CREATE POLICY "Users can view assigned banks"
    ON banks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_banks
            WHERE user_banks.bank_id = banks.id
            AND user_banks.user_id = auth.uid()
        )
    );

-- Users can view their bank assignments
CREATE POLICY "Users can view their bank assignments"
    ON user_banks
    FOR SELECT
    USING (user_id = auth.uid());

-- Admins can manage all banks and assignments
CREATE POLICY "Admins can manage all banks"
    ON banks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all bank assignments"
    ON user_banks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
