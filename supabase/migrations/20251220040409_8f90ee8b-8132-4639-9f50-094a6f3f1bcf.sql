-- Fix the businesses_public view to use 'active' status (which is the valid value per check constraint)
DROP VIEW IF EXISTS public.businesses_public;

CREATE VIEW public.businesses_public 
WITH (security_invoker = true)
AS SELECT 
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
WHERE status = 'active';