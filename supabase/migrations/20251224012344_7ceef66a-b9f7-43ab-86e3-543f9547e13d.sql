-- Fix security issue: Remove phone and email from businesses_public table
-- These should only be accessible via authenticated queries to the main businesses table

-- First, drop the columns from businesses_public
ALTER TABLE public.businesses_public 
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS email;

-- Update the sync function to no longer copy phone/email
CREATE OR REPLACE FUNCTION public.sync_businesses_public()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.businesses_public WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  -- Sync to public table if status is 'active' OR 'approved'
  IF (NEW.status = 'active' OR NEW.status = 'approved') THEN
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
$function$;