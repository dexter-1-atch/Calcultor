-- Add reactions column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;