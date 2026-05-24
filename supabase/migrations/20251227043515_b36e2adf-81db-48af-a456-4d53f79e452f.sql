-- Create internal messages table for full email-like functionality
CREATE TABLE public.internal_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  html_body TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'read', 'replied', 'archived')),
  reply_to_id UUID REFERENCES public.internal_messages(id),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage all messages"
ON public.internal_messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Anyone can insert inbound messages (contact form)
CREATE POLICY "Anyone can send inbound messages"
ON public.internal_messages
FOR INSERT
WITH CHECK (direction = 'inbound');

-- Create index for faster queries
CREATE INDEX idx_internal_messages_direction ON public.internal_messages(direction);
CREATE INDEX idx_internal_messages_status ON public.internal_messages(status);
CREATE INDEX idx_internal_messages_created_at ON public.internal_messages(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_internal_messages_updated_at
BEFORE UPDATE ON public.internal_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();