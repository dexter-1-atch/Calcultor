-- Create user status table for online/offline tracking
CREATE TABLE public.user_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- Create policies for user status
CREATE POLICY "Anyone can view user status" 
ON public.user_status 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own status" 
ON public.user_status 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own status" 
ON public.user_status 
FOR UPDATE 
USING (true);

-- Add message read status and image support
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS read_by JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- Create trigger for user status updated_at
CREATE TRIGGER update_user_status_updated_at
BEFORE UPDATE ON public.user_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for user_status
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_status;