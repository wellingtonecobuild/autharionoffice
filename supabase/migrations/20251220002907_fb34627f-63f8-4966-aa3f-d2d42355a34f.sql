-- Fix the security definer view issue by recreating with SECURITY INVOKER
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

-- Grant SELECT on the safe view to everyone
GRANT SELECT ON public.businesses_public TO anon, authenticated;

-- Add RLS policy to allow public SELECT on approved businesses through the base table
-- This is needed because SECURITY INVOKER views inherit RLS from the base table
CREATE POLICY "Anyone can view approved businesses via public view" 
ON public.businesses 
FOR SELECT 
USING (status = 'approved');