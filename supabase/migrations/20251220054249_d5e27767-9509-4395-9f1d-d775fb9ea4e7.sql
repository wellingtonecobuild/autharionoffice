-- Add ads_enabled column to articles table for per-article ad control
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS ads_enabled boolean NOT NULL DEFAULT true;

-- Add ad settings to platform_settings with defaults
INSERT INTO public.platform_settings (key, value)
VALUES 
  ('ads_enabled_globally', 'true'),
  ('ad_frequency_paragraphs', '5'),
  ('adsense_publisher_id', '""')
ON CONFLICT (key) DO NOTHING;

-- Add email notification settings
INSERT INTO public.platform_settings (key, value)
VALUES 
  ('email_notify_listing_approval', 'true'),
  ('email_notify_new_lead', 'true'),
  ('email_notify_job_application', 'true')
ON CONFLICT (key) DO NOTHING;