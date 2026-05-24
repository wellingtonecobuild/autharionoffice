-- =====================================================
-- SECURITY HARDENING MIGRATION
-- Fixes overly permissive RLS policies and protects sensitive data
-- =====================================================

-- 1. Fix INSERT policies that allow anyone to insert (potential spam/abuse)
-- =====================================================

-- Fix ad_ab_test_results: Only admins should insert test results
DROP POLICY IF EXISTS "Anyone can insert results" ON public.ad_ab_test_results;
CREATE POLICY "Admins can insert test results" 
ON public.ad_ab_test_results 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix admin_notifications: Only admins/system should create notifications
DROP POLICY IF EXISTS "Anyone can create notifications" ON public.admin_notifications;
CREATE POLICY "Admins can create notifications" 
ON public.admin_notifications 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Create a secure view for reviews that NEVER exposes guest_email
-- =====================================================

-- Drop existing public reviews view if exists
DROP VIEW IF EXISTS public.reviews_public;

-- Create a secure view that excludes sensitive fields
CREATE VIEW public.reviews_public AS
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
  -- NEVER expose: guest_email, reviewer_ip, admin_notes, proof_document_url
  CASE WHEN r.user_id IS NOT NULL THEN true ELSE false END as is_registered_user
FROM public.reviews r
WHERE r.status = 'approved';

-- Grant select on the view to public
GRANT SELECT ON public.reviews_public TO anon, authenticated;

-- 3. Create rate limiting for form submissions
-- =====================================================

-- Add rate limit tracking for contact submissions
ALTER TABLE public.contact_submissions 
ADD COLUMN IF NOT EXISTS ip_hash text,
ADD COLUMN IF NOT EXISTS submission_count_today integer DEFAULT 1;

-- Create function to check submission rate limits
CREATE OR REPLACE FUNCTION public.check_contact_submission_limit(p_ip_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  submission_count integer;
  max_per_day integer := 5;
BEGIN
  -- Count submissions from this IP hash in the last 24 hours
  SELECT COUNT(*) INTO submission_count
  FROM public.contact_submissions
  WHERE ip_hash = p_ip_hash
  AND created_at > NOW() - INTERVAL '24 hours';
  
  RETURN submission_count < max_per_day;
END;
$$;

-- 4. Fix url_validation_cache to restrict service role only
-- =====================================================

DROP POLICY IF EXISTS "Service role can manage cache" ON public.url_validation_cache;
-- Service role access is automatic via service_role key, no policy needed for public

-- Keep only the read policy for performance
-- The "Anyone can read URL validation cache" policy is fine for reads

-- 5. Create audit log for sensitive data access
-- =====================================================

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  user_id uuid,
  ip_address_hash text,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view security audit logs" 
ON public.security_audit_log 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs (via security definer functions)
CREATE POLICY "System can insert audit logs" 
ON public.security_audit_log 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- 6. Create function to log sensitive data access
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_data_access(
  p_event_type text,
  p_table_name text,
  p_record_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (event_type, table_name, record_id, user_id, details)
  VALUES (p_event_type, p_table_name, p_record_id, auth.uid(), p_details);
END;
$$;

-- 7. Add indexes for security-related queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON public.security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);

-- 8. Create function to mask email addresses in public responses
-- =====================================================

CREATE OR REPLACE FUNCTION public.mask_email(email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
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
  
  -- Show first 2 chars, mask rest
  IF LENGTH(username) <= 2 THEN
    masked_username := '***';
  ELSE
    masked_username := LEFT(username, 2) || REPEAT('*', LEAST(LENGTH(username) - 2, 5));
  END IF;
  
  RETURN masked_username || domain;
END;
$$;

-- 9. Restrict profile access more strictly
-- =====================================================

-- Drop overly permissive policies if they exist
DROP POLICY IF EXISTS "Businesses can view applicant profiles" ON public.profiles;

-- Ensure only owners and admins can see full profile data
-- (Keep existing "Users can view own profile" and "Admins can view all profiles" policies)

-- 10. Add comment explaining security measures
-- =====================================================

COMMENT ON VIEW public.reviews_public IS 'Secure public view of reviews - guest_email and other sensitive fields are never exposed';
COMMENT ON TABLE public.security_audit_log IS 'Audit log for tracking access to sensitive data';
COMMENT ON FUNCTION public.mask_email IS 'Masks email addresses for public display - never show full emails to unauthorized users';