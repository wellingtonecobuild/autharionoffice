-- Add body column to email_logs to store the actual email content
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS body_html TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS body_text TEXT;

-- Update the to_name to use email as fallback display
COMMENT ON COLUMN public.email_logs.to_name IS 'Recipient name, will use email as display if null';