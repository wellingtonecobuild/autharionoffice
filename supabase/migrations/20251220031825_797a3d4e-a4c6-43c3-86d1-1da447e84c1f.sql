-- Drop and recreate views with SECURITY INVOKER (the safe default)
DROP VIEW IF EXISTS public.profiles_limited;
DROP VIEW IF EXISTS public.profiles_public;
DROP VIEW IF EXISTS public.businesses_public;

-- Create views with explicit SECURITY INVOKER to respect RLS of querying user
CREATE VIEW public.profiles_limited 
WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

CREATE VIEW public.profiles_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

CREATE VIEW public.businesses_public 
WITH (security_invoker = true) AS
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