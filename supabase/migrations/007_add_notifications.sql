-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS mark_notification_read(UUID);
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, notification_type, JSONB);
DROP FUNCTION IF EXISTS get_unread_notification_count(UUID);

-- Drop existing tables and types if they exist
DROP TABLE IF EXISTS notifications;
DROP TYPE IF EXISTS notification_status;
DROP TYPE IF EXISTS notification_type;

-- Create notification status enum
CREATE TYPE notification_status AS ENUM ('read', 'unread');

-- Create notification type enum
CREATE TYPE notification_type AS ENUM ('transaction', 'security', 'system');

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type notification_type NOT NULL,
    notification_status notification_status NOT NULL DEFAULT 'unread',
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_notification_status_idx ON notifications(notification_status);

-- Add RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS notifications AS $$
DECLARE
    updated_notification notifications;
BEGIN
    UPDATE notifications
    SET notification_status = 'read',
        updated_at = NOW()
    WHERE id = notification_id
    AND user_id = auth.uid()
    RETURNING * INTO updated_notification;
    
    RETURN updated_notification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type notification_type,
    p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS notifications AS $$
DECLARE
    new_notification notifications;
BEGIN
    INSERT INTO notifications (
        user_id,
        title,
        message,
        notification_type,
        data
    )
    VALUES (
        p_user_id,
        p_title,
        p_message,
        p_type,
        p_data
    )
    RETURNING * INTO new_notification;
    
    RETURN new_notification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    notification_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO notification_count
    FROM notifications
    WHERE user_id = p_user_id
    AND notification_status = 'unread';
    
    RETURN notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
