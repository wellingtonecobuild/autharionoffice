-- Also allow users to update their portal record by email match (for linking their account)
-- This is needed when a user logs in and their portal record needs to be linked to their auth user

-- First drop the existing update policy
DROP POLICY IF EXISTS "Portal user update own or admin" ON public.portal_users;

-- Create a new policy that also allows updating by email match
CREATE POLICY "Portal user update own or email or admin"
ON public.portal_users FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR email = auth.email() 
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  user_id = auth.uid() 
  OR email = auth.email() 
  OR public.has_role(auth.uid(), 'admin')
);