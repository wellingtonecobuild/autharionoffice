-- Drop the overly permissive public SELECT policy on businesses table
DROP POLICY IF EXISTS "Public can view approved businesses basic info" ON public.businesses;

-- Create restricted SELECT policies for businesses table
-- Only owners can see their own full business details
CREATE POLICY "Owners can view their own business" 
ON public.businesses 
FOR SELECT 
USING (auth.uid() = owner_id);

-- The businesses_public view already exists and excludes sensitive columns
-- Ensure it only shows approved businesses
DROP VIEW IF EXISTS public.businesses_public;

CREATE VIEW public.businesses_public AS
SELECT 
  id, name, description, full_description, category, sub_categories,
  address, city, website, social_links, certifications, materials,
  hours, images, subscription_plan, is_verified, is_featured,
  rating, review_count, created_at, updated_at, latitude, longitude, 
  map_visible, pin_priority, status
FROM public.businesses
WHERE status = 'approved';

-- Grant SELECT on the safe view to everyone
GRANT SELECT ON public.businesses_public TO anon, authenticated;