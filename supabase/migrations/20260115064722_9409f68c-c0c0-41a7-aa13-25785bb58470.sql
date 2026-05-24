-- =====================================================
-- SECURITY HARDENING MIGRATION - PART 3 (CORRECTED)
-- Add rate limiting to remaining public INSERT policies
-- =====================================================

-- 1. Rate limit newsletter subscriptions
-- =====================================================

CREATE OR REPLACE FUNCTION public.enforce_newsletter_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_count integer;
BEGIN
  SELECT COUNT(*) INTO sub_count
  FROM public.newsletter_subscribers
  WHERE email = NEW.email
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF sub_count >= 5 THEN
    RAISE EXCEPTION 'This email is already subscribed.';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_newsletter_rate_limit_trigger ON public.newsletter_subscribers;
CREATE TRIGGER enforce_newsletter_rate_limit_trigger
BEFORE INSERT ON public.newsletter_subscribers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_newsletter_rate_limit();

-- 2. Rate limit contractor match requests
-- =====================================================

CREATE OR REPLACE FUNCTION public.enforce_contractor_match_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_count integer;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO match_count
    FROM public.contractor_matches
    WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '24 hours';
  ELSIF NEW.user_email IS NOT NULL THEN
    SELECT COUNT(*) INTO match_count
    FROM public.contractor_matches
    WHERE user_email = NEW.user_email
    AND created_at > NOW() - INTERVAL '24 hours';
  ELSE
    match_count := 0;
  END IF;
  
  IF match_count >= 10 THEN
    RAISE EXCEPTION 'You have reached the maximum number of contractor requests for today.';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_contractor_match_rate_limit_trigger ON public.contractor_matches;
CREATE TRIGGER enforce_contractor_match_rate_limit_trigger
BEFORE INSERT ON public.contractor_matches
FOR EACH ROW
EXECUTE FUNCTION public.enforce_contractor_match_rate_limit();

-- 3. Rate limit project estimates (uses session_id, not email)
-- =====================================================

CREATE OR REPLACE FUNCTION public.enforce_estimate_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  estimate_count integer;
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    SELECT COUNT(*) INTO estimate_count
    FROM public.project_estimates
    WHERE session_id = NEW.session_id
    AND created_at > NOW() - INTERVAL '24 hours';
    
    IF estimate_count >= 20 THEN
      RAISE EXCEPTION 'You have reached the maximum number of estimates for today.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_estimate_rate_limit_trigger ON public.project_estimates;
CREATE TRIGGER enforce_estimate_rate_limit_trigger
BEFORE INSERT ON public.project_estimates
FOR EACH ROW
EXECUTE FUNCTION public.enforce_estimate_rate_limit();

-- 4. Add IP hash columns for abuse tracking
-- =====================================================

ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS ip_hash text;
ALTER TABLE public.contractor_matches ADD COLUMN IF NOT EXISTS ip_hash text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS submission_ip_hash text;
ALTER TABLE public.contact_submissions ADD COLUMN IF NOT EXISTS ip_hash text;

-- 5. Create indexes for rate limit queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_newsletter_email_created ON public.newsletter_subscribers(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contractor_matches_email_created ON public.contractor_matches(user_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contractor_matches_user_created ON public.contractor_matches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_estimates_session_created ON public.project_estimates(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_email_created ON public.reviews(guest_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user_created ON public.reviews(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email_created ON public.contact_submissions(email, created_at DESC);

-- 6. Documentation
-- =====================================================

COMMENT ON FUNCTION public.enforce_newsletter_rate_limit IS 'Prevents spam signups by limiting to 5 attempts per hour per email';
COMMENT ON FUNCTION public.enforce_contractor_match_rate_limit IS 'Prevents abuse by limiting to 10 contractor requests per day per user';
COMMENT ON FUNCTION public.enforce_estimate_rate_limit IS 'Prevents abuse by limiting to 20 estimates per day per session';