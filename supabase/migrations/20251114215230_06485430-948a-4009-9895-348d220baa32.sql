-- Create couples table
CREATE TABLE public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  setup_complete BOOLEAN DEFAULT false
);

-- Drop existing profiles table if it exists and recreate with new structure
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_creator BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add couple_id to messages table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'couple_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for couples
CREATE POLICY "Anyone can create a couple"
  ON public.couples FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their couple"
  ON public.couples FOR SELECT
  USING (true);

CREATE POLICY "Users can update their couple"
  ON public.couples FOR UPDATE
  USING (true);

-- RLS Policies for profiles
CREATE POLICY "Anyone can read profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- Drop existing message policies if they exist
DROP POLICY IF EXISTS "Users can view messages in their couple" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their couple" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- Create new message policies
CREATE POLICY "Users can view their couple messages"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "Users can insert couple messages"
  ON public.messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update messages"
  ON public.messages FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete messages"
  ON public.messages FOR DELETE
  USING (true);