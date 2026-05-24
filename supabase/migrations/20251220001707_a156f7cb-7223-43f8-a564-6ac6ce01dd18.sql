-- Create a public view for profiles that excludes sensitive email field
CREATE OR REPLACE VIEW public.profiles_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  avatar_url,
  full_name,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create new restricted policies for the profiles table
-- Users can view their own profile (including email)
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Business owners can view profiles of job applicants
CREATE POLICY "Business owners can view applicant profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM job_applications ja
    JOIN jobs j ON j.id = ja.job_id
    JOIN businesses b ON b.id = j.business_id
    WHERE ja.applicant_id = profiles.id 
    AND b.owner_id = auth.uid()
  )
);