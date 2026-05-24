-- Fix remaining permissive RLS policies

-- 1. blog_views - restrict to valid session tracking
DROP POLICY IF EXISTS "Anyone can insert blog views" ON public.blog_views;
CREATE POLICY "Valid session for blog views"
ON public.blog_views FOR INSERT
TO public
WITH CHECK (
  session_id IS NOT NULL AND length(session_id) >= 10
);

-- 2. contact_submissions - require valid data
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
CREATE POLICY "Valid contact form data required"
ON public.contact_submissions FOR INSERT
TO public
WITH CHECK (
  email IS NOT NULL AND length(email) >= 5 AND
  name IS NOT NULL AND length(name) >= 2 AND
  message IS NOT NULL AND length(message) >= 10
);

-- 3. contractor_matches - require valid contact info
DROP POLICY IF EXISTS "Anyone can create matches" ON public.contractor_matches;
CREATE POLICY "Valid contact for matches"
ON public.contractor_matches FOR INSERT
TO public
WITH CHECK (
  (user_id IS NOT NULL) OR 
  (user_email IS NOT NULL AND length(user_email) >= 5 AND user_name IS NOT NULL AND length(user_name) >= 2)
);

-- 5. newsletter_subscribers - require valid email
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Valid email for newsletter"
ON public.newsletter_subscribers FOR INSERT
TO public
WITH CHECK (
  email IS NOT NULL AND length(email) >= 5 AND position('@' in email) > 1
);

-- 6. page_views - require valid session
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Valid session for page views"
ON public.page_views FOR INSERT
TO public
WITH CHECK (
  session_id IS NOT NULL AND length(session_id) >= 10
);

-- 7. project_estimates - require valid session
DROP POLICY IF EXISTS "Anyone can create estimates" ON public.project_estimates;
CREATE POLICY "Valid session for estimates"
ON public.project_estimates FOR INSERT
TO public
WITH CHECK (
  session_id IS NOT NULL AND length(session_id) >= 10
);

-- 8. review_rate_limits - require tracking info
DROP POLICY IF EXISTS "Anyone can insert rate limits" ON public.review_rate_limits;
CREATE POLICY "Valid tracking for rate limits"
ON public.review_rate_limits FOR INSERT
TO public
WITH CHECK (
  ip_address IS NOT NULL OR email IS NOT NULL
);