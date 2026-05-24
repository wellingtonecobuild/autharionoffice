-- 1. FIX: Business Owner Identity Exposure
-- Remove the policy that exposes full businesses table including owner_id
DROP POLICY IF EXISTS "Anyone can view approved businesses via public view" ON public.businesses;

-- The businesses_public view (without owner_id) already exists
-- Access should only be through that view, which is granted to anon/authenticated

-- 2. FIX: User Email Addresses Exposed to Business Owners
-- Create a limited profiles view without email for business owners
CREATE OR REPLACE VIEW public.profiles_limited AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the limited view
GRANT SELECT ON public.profiles_limited TO anon, authenticated;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Business owners can view applicant profiles" ON public.profiles;

-- Create a new policy that only allows viewing via the limited view
-- Business owners need access to applicant data but not emails directly
CREATE POLICY "Business owners can view limited applicant profiles" 
ON public.profiles 
FOR SELECT
USING (
  -- User can view their own profile
  auth.uid() = id
  OR
  -- Admins can view all profiles (already have separate policy, but include for safety)
  has_role(auth.uid(), 'admin')
);

-- 3. FIX: Leads table - Add explicit verification
-- The existing policies are correct, but let's make them more robust
DROP POLICY IF EXISTS "Business owners can view their leads" ON public.leads;
DROP POLICY IF EXISTS "Business owners can update their leads" ON public.leads;

-- Recreate with explicit ownership check
CREATE POLICY "Business owners can view their leads" 
ON public.leads 
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = leads.business_id 
    AND b.owner_id = auth.uid()
    AND b.status = 'approved'
  )
);

CREATE POLICY "Business owners can update their leads" 
ON public.leads 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = leads.business_id 
    AND b.owner_id = auth.uid()
    AND b.status = 'approved'
  )
);

-- Add admin access to leads for oversight
CREATE POLICY "Admins can view all leads" 
ON public.leads 
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 4. FIX: Contact submissions - Add backup protection
-- Verify the has_role function is being used correctly (already is)
-- Add explicit service role check as backup

-- The existing policies are correct, no changes needed for contact_submissions
-- has_role() is a SECURITY DEFINER function which is the correct approach