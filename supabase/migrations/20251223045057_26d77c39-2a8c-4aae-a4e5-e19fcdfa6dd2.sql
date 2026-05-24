-- Add new AdSense configuration columns to platform_settings
-- These will store more detailed ad configuration

-- Insert default AdSense settings if they don't exist
INSERT INTO public.platform_settings (key, value) VALUES
  ('adsense_enabled', 'false'::jsonb),
  ('adsense_auto_ads_code', '""'::jsonb),
  ('adsense_ad_positions', '{"after_first_paragraph": true, "mid_article": true, "end_of_article": true, "sidebar": true}'::jsonb),
  ('adsense_max_ads_per_page', '3'::jsonb),
  ('adsense_connection_status', '"not_connected"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Update articles table to add ad placement preferences
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS ad_placements jsonb DEFAULT '{"after_first_paragraph": true, "mid_article": true, "end_of_article": true}'::jsonb;