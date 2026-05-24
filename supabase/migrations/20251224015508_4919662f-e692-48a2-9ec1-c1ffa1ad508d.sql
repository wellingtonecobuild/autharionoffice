-- Google Ads Integration Tables

-- Store Google Ads account connection settings
CREATE TABLE public.google_ads_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT,
  account_name TEXT,
  billing_profile_name TEXT,
  connection_status TEXT NOT NULL DEFAULT 'disconnected',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  developer_token TEXT,
  client_id TEXT,
  client_secret TEXT,
  daily_budget_limit NUMERIC(10,2) DEFAULT 0,
  monthly_budget_cap NUMERIC(10,2) DEFAULT 0,
  emergency_stop_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Store Google Ads campaigns
CREATE TABLE public.google_ads_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  google_campaign_id TEXT,
  name TEXT NOT NULL,
  campaign_goal TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'search',
  status TEXT NOT NULL DEFAULT 'draft',
  daily_budget NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_budget NUMERIC(10,2),
  start_date DATE,
  end_date DATE,
  target_locations TEXT[] DEFAULT ARRAY['New Zealand'],
  target_languages TEXT[] DEFAULT ARRAY['en'],
  target_devices TEXT[] DEFAULT ARRAY['desktop', 'mobile'],
  keywords TEXT[],
  negative_keywords TEXT[],
  audience_ids TEXT[],
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cost_spent NUMERIC(10,2) DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Store individual ads within campaigns
CREATE TABLE public.google_ads_creatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.google_ads_campaigns(id) ON DELETE CASCADE,
  google_ad_id TEXT,
  ad_type TEXT NOT NULL DEFAULT 'responsive_search',
  headlines TEXT[] NOT NULL,
  descriptions TEXT[] NOT NULL,
  display_url TEXT,
  final_url TEXT NOT NULL,
  images TEXT[],
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cost_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Track conversions for Google Ads
CREATE TABLE public.google_ads_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversion_type TEXT NOT NULL,
  conversion_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  google_conversion_id TEXT,
  conversion_count INTEGER DEFAULT 0,
  conversion_value NUMERIC(10,2) DEFAULT 0,
  last_conversion_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Store daily performance metrics
CREATE TABLE public.google_ads_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.google_ads_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(5,4) DEFAULT 0,
  cpc NUMERIC(10,2) DEFAULT 0,
  cost NUMERIC(10,2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, date)
);

-- Audit log for Google Ads actions
CREATE TABLE public.google_ads_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  admin_id UUID NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.google_ads_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_ads_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_ads_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_ads_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_ads_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_ads_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage google_ads_settings" ON public.google_ads_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage google_ads_campaigns" ON public.google_ads_campaigns
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage google_ads_creatives" ON public.google_ads_creatives
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage google_ads_conversions" ON public.google_ads_conversions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view google_ads_metrics" ON public.google_ads_metrics
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view google_ads_audit_log" ON public.google_ads_audit_log
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_google_ads_settings_updated_at
  BEFORE UPDATE ON public.google_ads_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_ads_campaigns_updated_at
  BEFORE UPDATE ON public.google_ads_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_ads_creatives_updated_at
  BEFORE UPDATE ON public.google_ads_creatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_ads_conversions_updated_at
  BEFORE UPDATE ON public.google_ads_conversions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default conversion types
INSERT INTO public.google_ads_conversions (conversion_type, conversion_name, is_enabled) VALUES
  ('business_signup', 'Business Sign-up', true),
  ('premium_subscription', 'Premium Subscription', true),
  ('elite_subscription', 'Elite Subscription', true),
  ('job_posting', 'Job Posting', true),
  ('lead_submission', 'Lead Submission', true);

-- Insert default settings row
INSERT INTO public.google_ads_settings (connection_status) VALUES ('disconnected');