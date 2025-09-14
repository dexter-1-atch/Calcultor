-- First, let's see what foreign key constraints exist and remove them
-- Then change the column types to work with simple text IDs

-- Drop foreign key constraints if they exist
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_created_by_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

-- Now change the column types to text
ALTER TABLE public.conversations ALTER COLUMN created_by TYPE text;
ALTER TABLE public.messages ALTER COLUMN sender_id TYPE text;

-- Create the conversation record that the app expects
INSERT INTO public.conversations (id, created_by) 
VALUES ('00000000-0000-0000-0000-000000000001', 'system')
ON CONFLICT (id) DO NOTHING;