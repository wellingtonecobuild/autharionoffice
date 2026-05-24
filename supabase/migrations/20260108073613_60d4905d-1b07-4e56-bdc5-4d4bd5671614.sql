-- Add status column to leads table for better tracking
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';

-- Create index for faster status filtering
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

-- Update existing leads to have 'new' or 'replied' status based on is_read
UPDATE public.leads SET status = CASE WHEN is_read = true THEN 'replied' ELSE 'new' END;