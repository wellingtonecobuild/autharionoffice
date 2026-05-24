-- Add phone, email to businesses_public table for Premium/Elite plans display
ALTER TABLE public.businesses_public 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text;

-- Update the sync function to include phone/email for paid plans
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

  -- Sync to public table if status is 'active' OR 'approved'
  IF (NEW.status = 'active' OR NEW.status = 'approved') THEN
    INSERT INTO public.businesses_public (
      id, name, description, full_description, category, sub_categories,
      address, city, website, hours, images, certifications, materials,
      social_links, is_featured, is_verified, rating, review_count,
      latitude, longitude, map_visible, pin_priority, subscription_plan,
      status, created_at, updated_at,
      -- Include phone and email for paid plans
      phone, email
    ) VALUES (
      NEW.id, NEW.name, NEW.description, NEW.full_description, NEW.category, NEW.sub_categories,
      NEW.address, NEW.city, NEW.website, NEW.hours, NEW.images, NEW.certifications, NEW.materials,
      NEW.social_links, NEW.is_featured, NEW.is_verified, NEW.rating, NEW.review_count,
      NEW.latitude, NEW.longitude, NEW.map_visible, NEW.pin_priority, NEW.subscription_plan,
      NEW.status, NEW.created_at, NEW.updated_at,
      -- Only include contact info for premium/elite plans
      CASE WHEN NEW.subscription_plan IN ('premium', 'elite') THEN NEW.phone ELSE NULL END,
      CASE WHEN NEW.subscription_plan IN ('premium', 'elite') THEN NEW.email ELSE NULL END
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
      updated_at = EXCLUDED.updated_at,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email;
  ELSE
    DELETE FROM public.businesses_public WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Add delete RLS policy for contact_submissions for admins
CREATE POLICY "Admins can delete contact submissions" 
ON public.contact_submissions 
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Resync all active businesses to populate phone/email
UPDATE public.businesses SET updated_at = now() WHERE status IN ('active', 'approved');