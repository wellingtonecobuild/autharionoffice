-- Remove the public SELECT policy that exposes sensitive data
DROP POLICY IF EXISTS "Anyone can view approved businesses" ON public.businesses;

-- Public access should only be through the businesses_public view
-- The businesses table should only be directly accessible to:
-- 1. Owners (for their own business)
-- 2. Admins (for all businesses)
-- These policies already exist, so no need to recreate them