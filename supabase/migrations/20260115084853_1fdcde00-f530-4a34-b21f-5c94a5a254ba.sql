-- Fix remaining permissive RLS policies (correct column names)

-- 9. reviews - require valid content
DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;
CREATE POLICY "Valid review content required"
ON public.reviews FOR INSERT
TO public
WITH CHECK (
  -- Must have rating and business_id, plus either user_id or guest info
  rating IS NOT NULL AND rating >= 1 AND rating <= 5 AND
  business_id IS NOT NULL AND
  (user_id IS NOT NULL OR (guest_name IS NOT NULL AND length(guest_name) >= 2))
);

-- 10. site_activity - only authenticated users
DROP POLICY IF EXISTS "System can insert activity" ON public.site_activity;
CREATE POLICY "Authenticated users can log activity"
ON public.site_activity FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. job_application_audit_log - only authenticated users
DROP POLICY IF EXISTS "System can insert audit log" ON public.job_application_audit_log;
CREATE POLICY "System inserts audit log for authenticated actions"
ON public.job_application_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);