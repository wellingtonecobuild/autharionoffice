-- Add spotlight and pay-per-listing fields to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS is_spotlight boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS spotlight_until timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_paid_listing boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS paid_listing_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS stripe_payment_id text;

-- Create index for spotlight jobs (faster queries)
CREATE INDEX IF NOT EXISTS idx_jobs_spotlight ON public.jobs (is_spotlight, spotlight_until) WHERE is_spotlight = true;

-- Update platform_settings with job monetization config
INSERT INTO public.platform_settings (key, value)
VALUES (
  'job_settings',
  '{
    "enabled": true,
    "premium_job_limit": 2,
    "elite_job_limit": 999,
    "pay_per_listing_price_nzd": 199,
    "pay_per_listing_duration_days": 30,
    "spotlight_price_per_week_nzd": 99,
    "spotlight_weekly_price_id": "price_1SgF56IAePQl2zAw6z1MUZiR",
    "pay_per_listing_price_id": "price_1SgF55IAePQl2zAwTqVMmw6Z"
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();