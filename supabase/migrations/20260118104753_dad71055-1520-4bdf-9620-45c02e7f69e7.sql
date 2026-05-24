-- Allow portal users to find and claim their record by email
-- This enables users who log in via the main website to link their portal account

-- First drop the existing select policy
DROP POLICY IF EXISTS "Portal user select own or admin" ON public.portal_users;

-- Create a new policy that also allows selecting by email match
CREATE POLICY "Portal user select own or email or admin"
ON public.portal_users FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR email = auth.email() 
  OR public.has_role(auth.uid(), 'admin')
);