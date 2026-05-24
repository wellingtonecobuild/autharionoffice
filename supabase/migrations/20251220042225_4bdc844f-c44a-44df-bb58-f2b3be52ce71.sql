-- Replace SECURITY DEFINER view with a real table + RLS to safely allow public reads without exposing contact info
-- This removes the linter warning while keeping anonymous browsing working.

DROP VIEW IF EXISTS public.businesses_public;

CREATE TABLE IF NOT EXISTS public.businesses_public (
  id uuid PRIMARY KEY,
  name text,
  description text,
  full_description text,
  category public.business_category,
  sub_categories text[],
  address text,
  city text,
  website text,
  hours text,
  images text[],
  certifications text[],
  materials text[],
  social_links jsonb,
  is_featured boolean,
  is_verified boolean,
  rating numeric,
  review_count integer,
  latitude numeric,
  longitude numeric,
  map_visible boolean,
  pin_priority text,
  subscription_plan public.subscription_plan,
  status text,
  created_at timestamptz,
  updated_at timestamptz
);

ALTER TABLE public.businesses_public ENABLE ROW LEVEL SECURITY;

-- Public read-only access, only for active listings
DROP POLICY IF EXISTS "Public can view active businesses" ON public.businesses_public;
CREATE POLICY "Public can view active businesses"
ON public.businesses_public
FOR SELECT
USING (status = 'active');

-- Admins can manage the public projection table
DROP POLICY IF EXISTS "Admins can manage businesses_public" ON public.businesses_public;
CREATE POLICY "Admins can manage businesses_public"
ON public.businesses_public
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.businesses_public TO anon;
GRANT SELECT ON public.businesses_public TO authenticated;

-- Keep businesses_public in sync with businesses (non-sensitive projection)
CREATE OR REPLACE FUNCTION public.sync_businesses_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.businesses_public WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF (NEW.status = 'active') THEN
    INSERT INTO public.businesses_public (
      id, name, description, full_description, category, sub_categories,
      address, city, website, hours, images, certifications, materials,
      social_links, is_featured, is_verified, rating, review_count,
      latitude, longitude, map_visible, pin_priority, subscription_plan,
      status, created_at, updated_at
    ) VALUES (
      NEW.id, NEW.name, NEW.description, NEW.full_description, NEW.category, NEW.sub_categories,
      NEW.address, NEW.city, NEW.website, NEW.hours, NEW.images, NEW.certifications, NEW.materials,
      NEW.social_links, NEW.is_featured, NEW.is_verified, NEW.rating, NEW.review_count,
      NEW.latitude, NEW.longitude, NEW.map_visible, NEW.pin_priority, NEW.subscription_plan,
      NEW.status, NEW.created_at, NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      full_description = EXCLUDED.full_description,
      category = EXCLUDED.category,
      sub_categories = EXCLUDED.sub_categories,
      address = EXCLUDED.address,
      city = EXCLUDED.city,
      website = EXCLUDED.website,
      hours = EXCLUDED.hours,
      images = EXCLUDED.images,
      certifications = EXCLUDED.certifications,
      materials = EXCLUDED.materials,
      social_links = EXCLUDED.social_links,
      is_featured = EXCLUDED.is_featured,
      is_verified = EXCLUDED.is_verified,
      rating = EXCLUDED.rating,
      review_count = EXCLUDED.review_count,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      map_visible = EXCLUDED.map_visible,
      pin_priority = EXCLUDED.pin_priority,
      subscription_plan = EXCLUDED.subscription_plan,
      status = EXCLUDED.status,
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at;
  ELSE
    DELETE FROM public.businesses_public WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_businesses_public_insert ON public.businesses;
DROP TRIGGER IF EXISTS trg_sync_businesses_public_update ON public.businesses;
DROP TRIGGER IF EXISTS trg_sync_businesses_public_delete ON public.businesses;

CREATE TRIGGER trg_sync_businesses_public_insert
AFTER INSERT ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.sync_businesses_public();

CREATE TRIGGER trg_sync_businesses_public_update
AFTER UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.sync_businesses_public();

CREATE TRIGGER trg_sync_businesses_public_delete
AFTER DELETE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.sync_businesses_public();

-- Backfill
INSERT INTO public.businesses_public (
  id, name, description, full_description, category, sub_categories,
  address, city, website, hours, images, certifications, materials,
  social_links, is_featured, is_verified, rating, review_count,
  latitude, longitude, map_visible, pin_priority, subscription_plan,
  status, created_at, updated_at
)
SELECT
  id, name, description, full_description, category, sub_categories,
  address, city, website, hours, images, certifications, materials,
  social_links, is_featured, is_verified, rating, review_count,
  latitude, longitude, map_visible, pin_priority, subscription_plan,
  status, created_at, updated_at
FROM public.businesses
WHERE status = 'active'
ON CONFLICT (id) DO NOTHING;