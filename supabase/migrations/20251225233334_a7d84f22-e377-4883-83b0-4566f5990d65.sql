-- Add guest email to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS guest_email text;

-- Create index for guest email lookups
CREATE INDEX IF NOT EXISTS idx_reviews_guest_email ON public.reviews(guest_email);

-- Create rate limiting table for review spam prevention
CREATE TABLE IF NOT EXISTS public.review_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text,
  email text,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_review_rate_limits_ip ON public.review_rate_limits(ip_address, business_id);
CREATE INDEX IF NOT EXISTS idx_review_rate_limits_email ON public.review_rate_limits(email, business_id);

-- Enable RLS
ALTER TABLE public.review_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for rate limits
CREATE POLICY "Anyone can insert rate limits" 
ON public.review_rate_limits 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage rate limits" 
ON public.review_rate_limits 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));