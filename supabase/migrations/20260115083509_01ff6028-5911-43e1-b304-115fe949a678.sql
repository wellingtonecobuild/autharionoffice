-- Fix remaining security issues - drop all existing policies first

-- Drop ALL existing policies on revenue_transactions
DROP POLICY IF EXISTS "Admins can insert revenue transactions" ON public.revenue_transactions;
DROP POLICY IF EXISTS "Admins can update revenue transactions" ON public.revenue_transactions;
DROP POLICY IF EXISTS "Admins can delete revenue transactions" ON public.revenue_transactions;
DROP POLICY IF EXISTS "Admins can view all revenue transactions" ON public.revenue_transactions;

-- Recreate admin-only policies for revenue_transactions
CREATE POLICY "Admin select revenue_transactions"
ON public.revenue_transactions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insert revenue_transactions"
ON public.revenue_transactions FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update revenue_transactions"
ON public.revenue_transactions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete revenue_transactions"
ON public.revenue_transactions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop ALL existing policies on portal_users
DROP POLICY IF EXISTS "Portal users can view their own data" ON public.portal_users;
DROP POLICY IF EXISTS "Portal users can update their own data" ON public.portal_users;
DROP POLICY IF EXISTS "Admins can insert portal users" ON public.portal_users;
DROP POLICY IF EXISTS "Admins can delete portal users" ON public.portal_users;

-- Recreate policies for portal_users
CREATE POLICY "Portal user select own or admin"
ON public.portal_users FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Portal user update own or admin"
ON public.portal_users FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insert portal_users"
ON public.portal_users FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete portal_users"
ON public.portal_users FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));