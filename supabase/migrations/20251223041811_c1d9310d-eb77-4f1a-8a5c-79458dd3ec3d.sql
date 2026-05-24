-- Add new columns to reviews table for comprehensive review system
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS project_type text,
ADD COLUMN IF NOT EXISTS business_response text,
ADD COLUMN IF NOT EXISTS response_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS response_by uuid,
ADD COLUMN IF NOT EXISTS reviewer_ip text,
ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS flag_reason text,
ADD COLUMN IF NOT EXISTS flagged_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_verified_client boolean DEFAULT false;

-- Add unique constraint: one review per user per business
ALTER TABLE public.reviews 
ADD CONSTRAINT unique_user_business_review UNIQUE (user_id, business_id);

-- Update RLS policy for business owners to respond to reviews on their business
CREATE POLICY "Business owners can respond to reviews on their business"
ON public.reviews
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM businesses b 
    WHERE b.id = reviews.business_id 
    AND b.owner_id = auth.uid()
    AND b.subscription_plan IN ('premium', 'elite')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses b 
    WHERE b.id = reviews.business_id 
    AND b.owner_id = auth.uid()
    AND b.subscription_plan IN ('premium', 'elite')
  )
);

-- Add comment for project_type allowed values
COMMENT ON COLUMN public.reviews.project_type IS 'Allowed values: new_build, renovation, retrofit, supply_only, design_planning';