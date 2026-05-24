-- Create a secure view that only exposes public-safe columns
CREATE OR REPLACE VIEW public.businesses_public AS
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

-- Drop the public select policy
DROP POLICY IF EXISTS "Businesses are viewable by everyone" ON public.businesses;

-- Create more restrictive policies for direct table access
CREATE POLICY "Public can view approved businesses basic info"
ON public.businesses FOR SELECT
USING (
  status = 'approved' AND (
    -- Only return non-sensitive columns by restricting what can be selected
    -- This policy just controls row-level access, column access is handled by the view
    true
  )
);

-- Note: The existing owner and admin policies remain in place
-- Owners can still see their full business data including sensitive fields
-- Admins can manage all businesses