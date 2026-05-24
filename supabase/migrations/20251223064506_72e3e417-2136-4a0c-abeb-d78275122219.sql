-- Drop the existing check constraint on businesses.status
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_status_check;

-- Add the correct check constraint with all valid status values
ALTER TABLE public.businesses ADD CONSTRAINT businesses_status_check 
CHECK (status IN ('draft', 'submitted', 'payment_received', 'pending_verification', 'pending', 'approved', 'active', 'rejected', 'suspended'));

-- Set default status to 'draft'
ALTER TABLE public.businesses ALTER COLUMN status SET DEFAULT 'draft';

-- Ensure status is NOT NULL
ALTER TABLE public.businesses ALTER COLUMN status SET NOT NULL;