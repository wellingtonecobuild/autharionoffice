-- Fix: Add SECURITY INVOKER to the view (default is DEFINER which is a security issue)
DROP VIEW IF EXISTS public.businesses_public;

CREATE VIEW public.businesses_public 
WITH (security_invoker = true)
AS
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
  social_links,
  certifications,
  materials,
  hours,
  images,
  subscription_plan,
  is_verified,
  is_featured,
  rating,
  review_count,
  latitude,
  longitude,
  map_visible,
  pin_priority,
  status,
  created_at,
  updated_at
FROM public.businesses
WHERE status = 'approved';

-- Grant SELECT on the view to everyone
GRANT SELECT ON public.businesses_public TO anon, authenticated;