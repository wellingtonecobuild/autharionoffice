-- Add expiry_date column to verification_submissions
ALTER TABLE public.verification_submissions
ADD COLUMN expiry_date date DEFAULT NULL;

-- Add index for efficient expiry queries
CREATE INDEX idx_verification_submissions_expiry ON public.verification_submissions(expiry_date) WHERE expiry_date IS NOT NULL;