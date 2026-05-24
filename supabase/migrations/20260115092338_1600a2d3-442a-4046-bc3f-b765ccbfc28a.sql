
-- ============================================
-- FIX ALL SECURITY ISSUES COMPREHENSIVELY
-- ============================================

-- ===========================================
-- FIX 1: portal_users - Remove public access
-- ===========================================
-- Drop policies that allow 'public' role access (unauthenticated)
DROP POLICY IF EXISTS "Admins can manage all portal users" ON public.portal_users;
DROP POLICY IF EXISTS "Portal users can update own profile" ON public.portal_users;
DROP POLICY IF EXISTS "Portal users can view own profile" ON public.portal_users;

-- The remaining policies use 'authenticated' role which is correct:
-- - "Admin delete portal_users" 
-- - "Admin insert portal_users"
-- - "Portal user select own or admin"
-- - "Portal user update own or admin"

-- ===========================================
-- FIX 2: dunning_records - Admin only access
-- ===========================================
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage dunning records" ON public.dunning_records;
DROP POLICY IF EXISTS "Admins can delete dunning records" ON public.dunning_records;

-- Create strict admin-only policies (authenticated role only)
CREATE POLICY "Admin select dunning_records"
ON public.dunning_records
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin insert dunning_records"
ON public.dunning_records
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin update dunning_records"
ON public.dunning_records
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin delete dunning_records"
ON public.dunning_records
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===========================================
-- FIX 3: communication_messages - Stronger INSERT validation
-- ===========================================
-- Drop the weak "Anyone can insert contact messages" policy
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.communication_messages;

-- Create a more secure policy that requires either:
-- 1. Authenticated user with proper sender_id, OR
-- 2. Anonymous contact form submission with mandatory validation fields
CREATE POLICY "Validated contact form submissions"
ON public.communication_messages
FOR INSERT
TO public
WITH CHECK (
  -- Either authenticated user inserting properly
  (
    auth.uid() IS NOT NULL 
    AND sender_id = auth.uid()
    AND content IS NOT NULL 
    AND length(trim(content)) >= 5
  )
  OR
  -- Or anonymous contact form with required validation
  (
    auth.uid() IS NULL
    AND sender_role = 'user'
    AND content IS NOT NULL 
    AND length(trim(content)) >= 5
    AND sender_email IS NOT NULL
    AND sender_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND sender_name IS NOT NULL
    AND length(trim(sender_name)) >= 2
    AND EXISTS (
      SELECT 1 FROM communication_threads t
      WHERE t.id = communication_messages.thread_id 
      AND t.channel_type = 'contact_form'
    )
  )
);

-- Add comment explaining the security model
COMMENT ON POLICY "Validated contact form submissions" ON public.communication_messages IS 
'Allows contact form submissions only when: authenticated users provide valid content, or anonymous users provide valid email, name, content, and target a contact_form thread.';
