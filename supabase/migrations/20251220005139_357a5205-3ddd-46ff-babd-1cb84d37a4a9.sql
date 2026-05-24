-- Fix Security Definer View issue by using SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_limited;

CREATE VIEW public.profiles_limited 
WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the limited view
GRANT SELECT ON public.profiles_limited TO anon, authenticated;

-- Also fix the businesses_public view to use SECURITY INVOKER if not already
DROP VIEW IF EXISTS public.businesses_public;

CREATE VIEW public.businesses_public 
WITH (security_invoker = true) AS
SELECT 
  id, name, description, full_description, category, sub_categories,
  address, city, website, social_links, certifications, materials,
  hours, images, subscription_plan, is_verified, is_featured,
  rating, review_count, created_at, updated_at, latitude, longitude, 
  map_visible, pin_priority, status
FROM public.businesses
WHERE status = 'approved';

-- Grant access to the view
GRANT SELECT ON public.businesses_public TO anon, authenticated;

-- Since we're using SECURITY INVOKER, we need RLS policies on the base table
-- Re-add public access policy for approved businesses (limited to approved only)
CREATE POLICY "Public can view approved businesses" 
ON public.businesses 
FOR SELECT
USING (status = 'approved');

-- Now business owners viewing applicant profiles need a way to get limited data
-- Create a policy that allows viewing profiles of applicants (but RLS will limit fields via view)
CREATE POLICY "Business owners can view applicant profiles via applications" 
ON public.profiles 
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM job_applications ja
    JOIN jobs j ON j.id = ja.job_id
    JOIN businesses b ON b.id = j.business_id
    WHERE ja.applicant_id = profiles.id 
    AND b.owner_id = auth.uid()
  )
);