-- ============================================
-- FIX: revenue_transactions - Remove public role access
-- ============================================

-- Drop the problematic policy that allows 'public' role 
-- (unauthenticated users get access to the table even though has_role would fail)
DROP POLICY IF EXISTS "Admins can view revenue transactions" ON public.revenue_transactions;

-- The remaining policies correctly use 'authenticated' role:
-- - Admin select revenue_transactions
-- - Admin insert revenue_transactions  
-- - Admin update revenue_transactions
-- - Admin delete revenue_transactions

-- Add comment explaining the security model
COMMENT ON TABLE public.revenue_transactions IS 
'Financial transaction records. Access restricted to authenticated admins only. Contains sensitive payment data including amounts, Stripe IDs, and business details.';