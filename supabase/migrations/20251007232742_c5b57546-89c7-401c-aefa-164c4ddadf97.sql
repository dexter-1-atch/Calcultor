-- Drop the foreign key constraint first
ALTER TABLE public.conversation_participants 
DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey;

-- Now change the column type to text
ALTER TABLE public.conversation_participants 
ALTER COLUMN user_id TYPE text;

-- Recreate the is_conversation_participant function
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conversation_id uuid, user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = is_conversation_participant.conversation_id
    AND conversation_participants.user_id = is_conversation_participant.user_id
  );
$$;

-- Fix the conversations SELECT policy
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (
  created_by IS NOT NULL
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
  )
);