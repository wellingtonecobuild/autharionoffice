-- =====================================================
-- SECURITY HARDENING MIGRATION - PART 2 (CORRECTED)
-- Fix remaining security issues
-- =====================================================

-- 1. Fix the SECURITY DEFINER VIEW issue
-- =====================================================

DROP VIEW IF EXISTS public.reviews_public;

CREATE VIEW public.reviews_public 
WITH (security_invoker = true)
AS
SELECT 
  r.id,
  r.business_id,
  r.rating,
  r.text,
  r.created_at,
  r.project_type,
  r.business_response,
  r.response_at,
  r.is_verified_client,
  r.guest_name,
  r.guest_initial,
  CASE WHEN r.user_id IS NOT NULL THEN true ELSE false END as is_registered_user
FROM public.reviews r
WHERE r.status = 'approved';

GRANT SELECT ON public.reviews_public TO anon, authenticated;

-- 2. Fix mask_email function to have explicit search_path
-- =====================================================

DROP FUNCTION IF EXISTS public.mask_email(text);

CREATE OR REPLACE FUNCTION public.mask_email(email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  at_pos integer;
  domain text;
  username text;
  masked_username text;
BEGIN
  IF email IS NULL OR email = '' THEN
    RETURN NULL;
  END IF;
  
  at_pos := POSITION('@' IN email);
  IF at_pos = 0 THEN
    RETURN '***';
  END IF;
  
  username := LEFT(email, at_pos - 1);
  domain := SUBSTRING(email FROM at_pos);
  
  IF LENGTH(username) <= 2 THEN
    masked_username := '***';
  ELSE
    masked_username := LEFT(username, 2) || REPEAT('*', LEAST(LENGTH(username) - 2, 5));
  END IF;
  
  RETURN masked_username || domain;
END;
$$;

-- 3. Fix remaining overly permissive INSERT policies
-- =====================================================

-- blog_views: Keep public insert but add IP tracking field
ALTER TABLE public.blog_views ADD COLUMN IF NOT EXISTS ip_hash text;

-- event_registrations: Require authenticated users or allow guest with email
DROP POLICY IF EXISTS "Anyone can register" ON public.event_registrations;
CREATE POLICY "Authenticated users can register for events" 
ON public.event_registrations 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anonymous can register with email" 
ON public.event_registrations 
FOR INSERT 
TO anon
WITH CHECK (user_id IS NULL AND email IS NOT NULL);

-- events: Only authenticated users should submit events
DROP POLICY IF EXISTS "Anyone can submit events" ON public.events;
CREATE POLICY "Authenticated users can submit events" 
ON public.events 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = organizer_id OR organizer_id IS NULL);

-- partner_referrals: Use correct column name (referrer_user_id)
DROP POLICY IF EXISTS "Anyone can submit referrals" ON public.partner_referrals;
CREATE POLICY "Authenticated users can submit referrals" 
ON public.partner_referrals 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = referrer_user_id OR referrer_user_id IS NULL);

-- partners: Use correct column (user_id exists)
DROP POLICY IF EXISTS "Anyone can apply as partner" ON public.partners;
CREATE POLICY "Authenticated users can apply as partner" 
ON public.partners 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- project_estimates: Keep public but tracked
ALTER TABLE public.project_estimates ADD COLUMN IF NOT EXISTS ip_hash text;

-- 4. Fix security_audit_log insert policy
-- =====================================================

DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;

CREATE POLICY "Authenticated users create audit logs" 
ON public.security_audit_log 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 5. Add rate limiting trigger for contact submissions
-- =====================================================

CREATE OR REPLACE FUNCTION public.enforce_contact_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  submission_count integer;
  max_per_hour integer := 3;
BEGIN
  SELECT COUNT(*) INTO submission_count
  FROM public.contact_submissions
  WHERE email = NEW.email
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF submission_count >= max_per_hour THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before submitting again.';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_contact_rate_limit_trigger ON public.contact_submissions;
CREATE TRIGGER enforce_contact_rate_limit_trigger
BEFORE INSERT ON public.contact_submissions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_contact_rate_limit();

-- 6. Add rate limiting for review submissions
-- =====================================================

CREATE OR REPLACE FUNCTION public.enforce_review_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  review_count integer;
  max_per_day integer := 3;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO review_count
    FROM public.reviews
    WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '24 hours';
  ELSIF NEW.guest_email IS NOT NULL THEN
    SELECT COUNT(*) INTO review_count
    FROM public.reviews
    WHERE guest_email = NEW.guest_email
    AND created_at > NOW() - INTERVAL '24 hours';
  ELSE
    review_count := 0;
  END IF;
  
  IF review_count >= max_per_day THEN
    RAISE EXCEPTION 'You have reached the maximum number of reviews for today.';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_review_rate_limit_trigger ON public.reviews;
CREATE TRIGGER enforce_review_rate_limit_trigger
BEFORE INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.enforce_review_rate_limit();

COMMENT ON FUNCTION public.enforce_contact_rate_limit IS 'Prevents spam by limiting contact form submissions to 3 per hour per email';
COMMENT ON FUNCTION public.enforce_review_rate_limit IS 'Prevents review bombing by limiting to 3 reviews per day per user/email';