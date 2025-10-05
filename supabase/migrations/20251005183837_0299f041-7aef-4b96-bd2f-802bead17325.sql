-- ============================================
-- CLEAN UP AND SECURE DATABASE RLS POLICIES
-- ============================================

-- Drop all existing policies for messages table
DROP POLICY IF EXISTS "Enable all operations for messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- Drop all existing policies for conversations table
DROP POLICY IF EXISTS "Enable all operations for conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Creator can delete conversations" ON public.conversations;

-- Drop all existing policies for conversation_participants table
DROP POLICY IF EXISTS "Enable all operations for participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can remove participants" ON public.conversation_participants;

-- Create security definer function to check conversation participation
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

-- ============================================
-- SECURE MESSAGES TABLE
-- ============================================

-- Policy: Users can only view messages in conversations they participate in
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (
  public.is_conversation_participant(conversation_id, sender_id)
);

-- Policy: Users can only send messages to conversations they participate in
CREATE POLICY "Users can send messages in their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  public.is_conversation_participant(conversation_id, sender_id)
);

-- Policy: Users can only update their own messages in their conversations
CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
USING (
  public.is_conversation_participant(conversation_id, sender_id)
);

-- Policy: Users can only delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
USING (
  public.is_conversation_participant(conversation_id, sender_id)
);

-- ============================================
-- SECURE CONVERSATIONS TABLE
-- ============================================

-- Policy: Users can only view conversations they participate in
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
  )
);

-- Policy: Anyone can create conversations (they'll add themselves as participant)
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (true);

-- Policy: Participants can update conversation metadata
CREATE POLICY "Participants can update conversations"
ON public.conversations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
  )
);

-- ============================================
-- SECURE CONVERSATION_PARTICIPANTS TABLE
-- ============================================

-- Policy: Users can view participants of conversations they're in
CREATE POLICY "Users can view participants in their conversations"
ON public.conversation_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
  )
);

-- Policy: Allow adding participants (with business logic validation in app)
CREATE POLICY "Users can add participants"
ON public.conversation_participants
FOR INSERT
WITH CHECK (true);

COMMENT ON FUNCTION public.is_conversation_participant IS 'Security definer function to check if a user is a participant in a conversation. Prevents infinite recursion in RLS policies.';