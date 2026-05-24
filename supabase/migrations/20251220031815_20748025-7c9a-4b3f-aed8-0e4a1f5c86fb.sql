-- Drop existing views first to recreate with correct columns
DROP VIEW IF EXISTS public.profiles_limited;
DROP VIEW IF EXISTS public.profiles_public;
DROP VIEW IF EXISTS public.businesses_public;

-- Create a limited profiles view that excludes email for business owners viewing applicants
CREATE VIEW public.profiles_limited AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- Create a public profiles view (same as limited, no email)
CREATE VIEW public.profiles_public AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- Create a public-safe businesses view that excludes sensitive contact info (no email, phone, owner_id, admin_notes, etc.)
CREATE VIEW public.businesses_public AS
SELECT 
  id,
  name,
  description,
  full_description,
  category,
  sub_categories,
  address,
  city,
  website,
  hours,
  images,
  certifications,
  materials,
  social_links,
  is_featured,
  is_verified,
  rating,
  review_count,
  latitude,
  longitude,
  map_visible,
  pin_priority,
  subscription_plan,
  status,
  created_at,
  updated_at
FROM public.businesses
WHERE status = 'approved';

-- Drop existing overly permissive policies on profiles
DROP POLICY IF EXISTS "Business owners can view applicant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create more restrictive profile policies
-- Users can only view their own full profile (with email)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Admins can view all profiles for admin purposes
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update businesses table policies to be more restrictive
DROP POLICY IF EXISTS "Anyone can view approved businesses" ON public.businesses;
DROP POLICY IF EXISTS "Approved businesses are publicly visible" ON public.businesses;
DROP POLICY IF EXISTS "Authenticated users can view approved businesses basic info" ON public.businesses;
DROP POLICY IF EXISTS "Public can view approved businesses" ON public.businesses;
DROP POLICY IF EXISTS "Owners can view own business" ON public.businesses;
DROP POLICY IF EXISTS "Owners can view their own business" ON public.businesses;

-- Public can view approved businesses (public listing) - but through the view they won't see sensitive fields
CREATE POLICY "Anyone can view approved businesses"
ON public.businesses
FOR SELECT
USING (status = 'approved');

-- Owners can view their own business (including pending/rejected)
CREATE POLICY "Owners can view own business"
ON public.businesses
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Admins can view all businesses
DROP POLICY IF EXISTS "Admins can view all businesses" ON public.businesses;
CREATE POLICY "Admins can view all businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Ensure leads are properly protected with additional validation
DROP POLICY IF EXISTS "Business owners can view their leads" ON public.leads;
DROP POLICY IF EXISTS "Business owners can view their own business leads" ON public.leads;

CREATE POLICY "Business owners can view their own business leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_id 
    AND b.owner_id = auth.uid()
    AND b.status = 'approved'
  )
);