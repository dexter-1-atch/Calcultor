-- Fix the database schema to use text IDs instead of UUIDs for this simple chat app
-- This allows us to use simple usernames like "serish" and "jiya"

-- Update conversations table to use text for created_by
ALTER TABLE public.conversations ALTER COLUMN created_by TYPE text;

-- Update messages table to use text for sender_id  
ALTER TABLE public.messages ALTER COLUMN sender_id TYPE text;

-- Create the conversation record that the app expects
INSERT INTO public.conversations (id, created_by) 
VALUES ('00000000-0000-0000-0000-000000000001', 'system')
ON CONFLICT (id) DO NOTHING;