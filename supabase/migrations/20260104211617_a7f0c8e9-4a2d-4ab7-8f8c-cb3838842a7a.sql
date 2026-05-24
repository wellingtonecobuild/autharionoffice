-- Allow public read access to contact info for premium/elite businesses
-- This enables displaying phone/email publicly for paid plans

CREATE POLICY "Public can view contact info for paid plans"
ON public.businesses
FOR SELECT
TO public
USING (
  subscription_plan IN ('premium', 'elite') 
  AND status = 'active'
);

-- Add comment to document this policy
COMMENT ON POLICY "Public can view contact info for paid plans" ON public.businesses 
IS 'Allows anonymous users to read business contact info (phone, email) for premium and elite subscription plans only. Free plan contact info remains hidden.';