-- Update RLS policies to allow public access for this specific use case
-- Since this is a private 2-person chat app, we'll allow all operations

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Allow all message access" ON public.messages;
DROP POLICY IF EXISTS "Allow all conversation access" ON public.conversations;
DROP POLICY IF EXISTS "Allow all participants access" ON public.conversation_participants;

-- Create permissive policies for the chat app
CREATE POLICY "Enable all operations for messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for conversations" ON public.conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for participants" ON public.conversation_participants FOR ALL USING (true) WITH CHECK (true);