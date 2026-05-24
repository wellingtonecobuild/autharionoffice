-- Create subscription plan status enum
CREATE TYPE public.plan_status AS ENUM ('active', 'hidden', 'archived', 'paused');

-- Create subscription_plans table for dynamic plan management
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT NOT NULL UNIQUE, -- 'free', 'premium', 'elite' or custom
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  gst_included BOOLEAN NOT NULL DEFAULT true,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of feature objects
  feature_toggles JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"show_phone": true, "show_email": true}
  visibility_rules JSONB NOT NULL DEFAULT '{}'::jsonb, -- Who sees this plan
  status plan_status NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  scarcity_label TEXT, -- e.g. "Only 12 spots left"
  scarcity_count INTEGER, -- Dynamic count
  max_subscribers INTEGER, -- Limit for this plan
  badge_text TEXT, -- e.g. "Most Popular", "Limited"
  badge_color TEXT, -- hex color
  cta_text TEXT NOT NULL DEFAULT 'Get Started',
  icon TEXT DEFAULT 'zap', -- lucide icon name
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans
FOR SELECT
USING (status = 'active');

CREATE POLICY "Admins can manage all plans"
ON public.subscription_plans
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create plan_change_logs for audit trail
CREATE TABLE public.plan_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'archive', 'pause', 'activate'
  field_changed TEXT,
  old_value JSONB,
  new_value JSONB,
  admin_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.plan_change_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view plan change logs"
ON public.plan_change_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert plan change logs"
ON public.plan_change_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default plans
INSERT INTO public.subscription_plans (plan_key, name, description, price_monthly, features, feature_toggles, status, sort_order, is_popular, cta_text, icon) VALUES
('free', 'Free', 'Visibility only. No lead generation.', 0, 
  '[{"text": "Business name", "included": true}, {"text": "Category listing", "included": true}, {"text": "Suburb / Wellington region", "included": true}, {"text": "Logo or representative image", "included": true}, {"text": "Listed in search results", "included": true}, {"text": "Phone number", "included": false}, {"text": "Email address", "included": false}, {"text": "Website link", "included": false}, {"text": "Job postings", "included": false}]'::jsonb,
  '{"show_phone": false, "show_email": false, "show_website": false, "show_verified_badge": false, "show_reviews": false, "priority_placement": false, "job_postings": 0}'::jsonb,
  'active', 1, false, 'Get Listed Free', 'zap'),
('premium', 'Premium', 'Lead generation + credibility', 149, 
  '[{"text": "Everything in Free", "included": true}, {"text": "Phone number displayed", "included": true}, {"text": "Email address displayed", "included": true}, {"text": "Website link", "included": true}, {"text": "Verified business badge", "included": true}, {"text": "Reviews & ratings", "included": true}, {"text": "Priority placement in category", "included": true}, {"text": "Up to 2 active job postings", "included": true}, {"text": "Eligible for featured rotation", "included": true}]'::jsonb,
  '{"show_phone": true, "show_email": true, "show_website": true, "show_verified_badge": true, "show_reviews": true, "priority_placement": true, "job_postings": 2}'::jsonb,
  'active', 2, true, 'Upgrade to Premium', 'sparkles'),
('elite', 'Elite', 'Category dominance & maximum exposure', 349, 
  '[{"text": "Everything in Premium", "included": true}, {"text": "Unlimited job postings", "included": true}, {"text": "Spotlight job rotation (sponsored)", "included": true}, {"text": "Top-tier category placement", "included": true}, {"text": "Featured employer badge", "included": true}, {"text": "Employer analytics dashboard", "included": true}, {"text": "Priority support", "included": true}, {"text": "Visual elevation across platform", "included": true}]'::jsonb,
  '{"show_phone": true, "show_email": true, "show_website": true, "show_verified_badge": true, "show_reviews": true, "priority_placement": true, "job_postings": -1, "spotlight_jobs": true, "top_tier_placement": true, "featured_badge": true, "analytics": true, "priority_support": true}'::jsonb,
  'active', 3, false, 'Apply for Elite', 'crown');