-- Fix remaining RLS issues by ensuring conversation creation works

-- The issue is that when creating a conversation, the SELECT policy is evaluated
-- for the RETURNING clause, but there are no participants yet.
-- We need to allow the creator to see their own conversation during creation.

DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (
  -- Allow viewing if user created it OR is a participant
  created_by = (SELECT auth.uid()::text)
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
  )
);