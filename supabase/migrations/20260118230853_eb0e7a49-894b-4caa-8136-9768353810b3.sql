-- Add email thread tracking to link outbound emails to threads for reply matching
-- When a contractor sends an email, we'll create a thread so replies can be matched

-- Add column to track which sent email created a thread
ALTER TABLE public.communication_threads 
ADD COLUMN IF NOT EXISTS original_email_log_id UUID REFERENCES email_logs(id),
ADD COLUMN IF NOT EXISTS external_recipient_email TEXT,
ADD COLUMN IF NOT EXISTS external_recipient_name TEXT;

-- Add message-id header tracking for email threading
ALTER TABLE public.communication_messages
ADD COLUMN IF NOT EXISTS email_message_id TEXT,
ADD COLUMN IF NOT EXISTS email_in_reply_to TEXT;

-- Add index for faster lookup of threads by external recipient
CREATE INDEX IF NOT EXISTS idx_threads_external_recipient ON public.communication_threads(external_recipient_email);

-- Add index for email message-id lookups
CREATE INDEX IF NOT EXISTS idx_messages_email_message_id ON public.communication_messages(email_message_id);

-- Create a function to generate unique message IDs for outbound emails
CREATE OR REPLACE FUNCTION generate_email_message_id()
RETURNS TEXT AS $$
BEGIN
  RETURN '<' || gen_random_uuid()::text || '@wellingtonecobuild.nz>';
END;
$$ LANGUAGE plpgsql;