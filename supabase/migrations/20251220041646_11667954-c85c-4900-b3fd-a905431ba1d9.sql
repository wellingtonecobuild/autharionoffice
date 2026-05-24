-- Fix businesses_public view to allow anonymous access
-- Remove security_invoker so the view owner's permissions are used instead
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
FROM businesses
WHERE status = 'approved';

-- Grant SELECT access to anonymous and authenticated users
GRANT SELECT ON public.businesses_public TO anon;
GRANT SELECT ON public.businesses_public TO authenticated;