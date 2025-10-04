-- Add reply_to column to messages table for replying to specific messages
ALTER TABLE messages ADD COLUMN reply_to uuid REFERENCES messages(id) ON DELETE SET NULL;

-- Create index for better performance when fetching replies
CREATE INDEX idx_messages_reply_to ON messages(reply_to);