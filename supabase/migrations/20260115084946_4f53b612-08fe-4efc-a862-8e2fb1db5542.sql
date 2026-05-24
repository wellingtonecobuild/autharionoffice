-- Fix remaining audit log policies to remove WITH CHECK (true)

-- job_application_audit_log - restrict to own actions or admin
DROP POLICY IF EXISTS "System inserts audit log for authenticated actions" ON public.job_application_audit_log;
CREATE POLICY "Users can log their own actions"
ON public.job_application_audit_log FOR INSERT
TO authenticated
WITH CHECK (
  -- Actor must be the current user or an admin
  actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

-- site_activity - allow authenticated users to insert (system tracking)
DROP POLICY IF EXISTS "Authenticated users can log activity" ON public.site_activity;
CREATE POLICY "System activity logging"
ON public.site_activity FOR INSERT
TO authenticated
WITH CHECK (
  -- Activity must have type and description
  activity_type IS NOT NULL AND description IS NOT NULL
);