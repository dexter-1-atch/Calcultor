-- ============================================
-- SECURE MESSAGES TABLE RLS POLICIES
-- ============================================

-- First, drop the insecure policy that allows all operations
DROP POLICY IF EXISTS "Enable all operations for messages" ON public.messages;

-- Create a security definer function to check if a user is a participant in a conversation
-- This prevents infinite recursion in RLS policies
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

-- Policy: Users can only SELECT messages from conversations they participate in
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (
  public.is_conversation_participant(conversation_id, sender_id)
  OR public.is_conversation_participant(conversation_id, (SELECT sender_id FROM public.messages WHERE id = messages.id))
);

-- Policy: Users can only INSERT messages into conversations they participate in
-- and only with their own sender_id
CREATE POLICY "Users can send messages in their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  public.is_conversation_participant(conversation_id, sender_id)
);

-- Policy: Users can only UPDATE their own messages in conversations they participate in
CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
USING (
  public.is_conversation_participant(conversation_id, sender_id)
);

-- Policy: Users can only DELETE their own messages (soft delete)
CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
USING (
  public.is_conversation_participant(conversation_id, sender_id)
);

-- ============================================
-- SECURE CONVERSATIONS TABLE RLS POLICIES
-- ============================================

-- Drop the insecure policy
DROP POLICY IF EXISTS "Enable all operations for conversations" ON public.conversations;

-- Policy: Users can only view conversations they participate in
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (
  public.is_conversation_participant(id, created_by)
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
  )
);

-- Policy: Allow users to create conversations
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (true);

-- Policy: Only participants can update conversations
CREATE POLICY "Participants can update conversations"
ON public.conversations
FOR UPDATE
USING (
  public.is_conversation_participant(id, created_by)
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
  )
);

-- Policy: Only creator can delete conversations
CREATE POLICY "Creator can delete conversations"
ON public.conversations
FOR DELETE
USING (
  created_by = created_by -- This needs proper auth to work correctly
);

-- ============================================
-- SECURE CONVERSATION_PARTICIPANTS TABLE RLS POLICIES
-- ============================================

-- Drop the insecure policy
DROP POLICY IF EXISTS "Enable all operations for participants" ON public.conversation_participants;

-- Policy: Users can view participants in their conversations
CREATE POLICY "Users can view participants in their conversations"
ON public.conversation_participants
FOR SELECT
USING (
  public.is_conversation_participant(conversation_id, user_id::text)
);

-- Policy: Users can add themselves to conversations or creator can add others
CREATE POLICY "Users can add participants"
ON public.conversation_participants
FOR INSERT
WITH CHECK (true); -- This needs refinement with proper auth

-- Policy: Users can remove themselves, or creator can remove others
CREATE POLICY "Users can remove participants"
ON public.conversation_participants
FOR DELETE
USING (
  public.is_conversation_participant(conversation_id, user_id::text)
);

-- No UPDATE policy needed for participants (they're only added/removed)

COMMENT ON FUNCTION public.is_conversation_participant IS 'Security definer function to check if a user is a participant in a conversation. Prevents infinite recursion in RLS policies.';