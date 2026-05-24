-- Fix warn-level finding: profiles_limited view missing access control context
-- Views don't have RLS policies; ensure RLS is enforced by making it SECURITY INVOKER.

DROP VIEW IF EXISTS public.profiles_limited;

CREATE VIEW public.profiles_limited
WITH (security_invoker = on)
AS
  SELECT
    id,
    full_name,
    avatar_url,
    created_at,
    updated_at
  FROM public.profiles;

COMMENT ON VIEW public.profiles_limited IS 'Limited profile fields; security_invoker ensures underlying RLS on profiles is always enforced.';