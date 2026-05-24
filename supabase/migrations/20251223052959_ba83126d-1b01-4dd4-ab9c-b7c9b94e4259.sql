-- Add payment hold status tracking to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS payment_intent_id text,
ADD COLUMN IF NOT EXISTS payment_amount numeric,
ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_captured_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_refunded_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS resubmission_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS resubmission_notes text;

-- Create index for payment status queries
CREATE INDEX IF NOT EXISTS idx_businesses_payment_status ON public.businesses(payment_status);

-- Add comment for clarity
COMMENT ON COLUMN public.businesses.payment_status IS 'Payment status: none, held, captured, refunded, resubmission_requested';