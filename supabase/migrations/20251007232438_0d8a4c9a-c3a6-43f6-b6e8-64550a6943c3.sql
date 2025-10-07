-- Add unique constraint to prevent duplicate participants
ALTER TABLE public.conversation_participants
ADD CONSTRAINT conversation_participants_conversation_user_unique 
UNIQUE (conversation_id, user_id);