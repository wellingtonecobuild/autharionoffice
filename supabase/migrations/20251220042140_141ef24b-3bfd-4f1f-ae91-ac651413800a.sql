-- Fix businesses_public view filter to match actual business statuses
DROP VIEW IF EXISTS public.businesses_public;

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
WHERE status = 'active';

GRANT SELECT ON public.businesses_public TO anon;
GRANT SELECT ON public.businesses_public TO authenticated;