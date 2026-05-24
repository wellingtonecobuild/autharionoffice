-- Add referral_settings to platform_settings for admin-controlled commissions
INSERT INTO public.platform_settings (key, value)
VALUES (
  'referral_settings',
  '{
    "premium_commission": 50,
    "elite_commission": 100,
    "eligible_plans": ["premium", "elite"],
    "enabled": true
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- Add phone column to profiles table for phone-based login
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text UNIQUE;