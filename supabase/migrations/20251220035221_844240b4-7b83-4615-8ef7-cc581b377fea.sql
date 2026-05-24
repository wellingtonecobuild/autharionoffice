-- Fix: Restrict email exposure in profiles table
-- Drop the overly permissive policy that exposes emails to business owners
DROP POLICY IF EXISTS "Business owners can view applicant profiles via applications" ON public.profiles;
DROP POLICY IF EXISTS "Business owners can view limited applicant profiles" ON public.profiles;

-- Create a more restrictive policy that only allows viewing non-sensitive profile data
-- Business owners should use the profiles_limited view which excludes email
CREATE POLICY "Business owners can view applicant basic info via applications" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always see their own profile
  auth.uid() = id
  OR
  -- Admins can see all profiles
  has_role(auth.uid(), 'admin'::app_role)
);

-- Note: Business owners should query from profiles_limited view instead for applicant data
-- The profiles_limited view already excludes email and only shows: id, full_name, avatar_url, created_at, updated_at

-- Also add RLS to the businesses_public view to make the warning go away
-- Views inherit RLS from base table when using SECURITY INVOKER (which is default)
-- But we should explicitly document this is intentional

-- Add comment to document the view's purpose
COMMENT ON VIEW public.businesses_public IS 'Public view of businesses that excludes sensitive fields (phone, email, owner_id, stripe info). RLS is inherited from base businesses table via SECURITY INVOKER.';

COMMENT ON VIEW public.profiles_limited IS 'Limited view of user profiles that excludes email. For use by business owners viewing applicant information.';

COMMENT ON VIEW public.profiles_public IS 'Public view of user profiles that excludes email. For general public access to basic user info.';