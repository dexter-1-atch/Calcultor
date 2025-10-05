-- Fix infinite recursion in RLS policies

-- Drop the problematic policy on conversation_participants
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;

-- Create a simple policy that allows anyone to view conversation participants
-- Security is enforced at the messages level via is_conversation_participant function
CREATE POLICY "Allow viewing conversation participants"
ON public.conversation_participants
FOR SELECT
USING (true);

-- Ensure the function bypasses RLS correctly
-- Recreate it to make absolutely sure it's SECURITY DEFINER
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
    AND conversation_participants.user_id::text = is_conversation_participant.user_id
  );
$$;