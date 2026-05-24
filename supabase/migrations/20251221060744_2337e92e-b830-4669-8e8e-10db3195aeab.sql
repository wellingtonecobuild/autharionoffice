-- Allow service role to insert jobs for pay-per-listing (bypasses RLS via service role key)
-- But we need a policy for paid listings that don't have a premium/elite subscription
CREATE POLICY "Allow insert for paid job listings"
ON public.jobs
FOR INSERT
WITH CHECK (
  is_paid_listing = true AND
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = jobs.business_id
    AND businesses.status IN ('approved', 'active')
  )
);