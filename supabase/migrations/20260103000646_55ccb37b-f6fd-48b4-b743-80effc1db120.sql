-- Add trial tracking fields to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS trial_start_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_end_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS trial_reminder_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS has_used_trial boolean DEFAULT false;

-- Create index for trial queries
CREATE INDEX IF NOT EXISTS idx_businesses_trial_status ON public.businesses(trial_status);
CREATE INDEX IF NOT EXISTS idx_businesses_trial_end_at ON public.businesses(trial_end_at);

-- Add comment for documentation
COMMENT ON COLUMN public.businesses.trial_status IS 'none, active, expired, cancelled, converted';
COMMENT ON COLUMN public.businesses.has_used_trial IS 'Fraud prevention: one trial per business only';