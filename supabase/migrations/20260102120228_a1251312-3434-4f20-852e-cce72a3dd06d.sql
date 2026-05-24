-- Elite Regional Caps with Traffic-Based Scaling
CREATE TABLE IF NOT EXISTS public.elite_region_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_name TEXT NOT NULL DEFAULT 'wellington',
  base_cap INTEGER NOT NULL DEFAULT 100,
  current_cap INTEGER NOT NULL DEFAULT 100,
  traffic_threshold_1 INTEGER DEFAULT 10000,
  traffic_threshold_2 INTEGER DEFAULT 25000,
  traffic_threshold_3 INTEGER DEFAULT 50000,
  cap_at_threshold_1 INTEGER DEFAULT 150,
  cap_at_threshold_2 INTEGER DEFAULT 250,
  cap_at_threshold_3 INTEGER DEFAULT 500,
  current_monthly_traffic INTEGER DEFAULT 0,
  last_traffic_update TIMESTAMPTZ,
  is_rotation_enabled BOOLEAN DEFAULT true,
  rotation_frequency TEXT DEFAULT 'daily',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  UNIQUE(region_name)
);

INSERT INTO public.elite_region_settings (region_name) 
VALUES ('wellington')
ON CONFLICT (region_name) DO NOTHING;

-- Location-based Elite multipliers
CREATE TABLE IF NOT EXISTS public.elite_location_multipliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  suburb TEXT,
  size_tier TEXT NOT NULL DEFAULT 'medium',
  slot_multiplier DECIMAL(3,2) DEFAULT 1.0,
  max_elite_slots INTEGER DEFAULT 10,
  current_elite_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(city, suburb)
);

INSERT INTO public.elite_location_multipliers (city, suburb, size_tier, slot_multiplier, max_elite_slots)
VALUES 
  ('Wellington', NULL, 'large', 2.0, 20),
  ('Lower Hutt', NULL, 'large', 2.0, 20),
  ('Upper Hutt', NULL, 'medium', 1.0, 10),
  ('Porirua', NULL, 'medium', 1.0, 10),
  ('Kapiti Coast', NULL, 'medium', 1.0, 10),
  ('Wellington', 'CBD', 'large', 2.0, 20),
  ('Wellington', 'Johnsonville', 'medium', 1.0, 10),
  ('Wellington', 'Tawa', 'medium', 1.0, 10),
  ('Wellington', 'Khandallah', 'small', 0.5, 5),
  ('Lower Hutt', 'Petone', 'medium', 1.0, 10)
ON CONFLICT (city, suburb) DO NOTHING;

-- Add priority fields to waitlist
ALTER TABLE public.elite_waitlist 
ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS months_on_platform INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS activity_score INTEGER DEFAULT 0;

-- Elite rotation tracking
CREATE TABLE IF NOT EXISTS public.elite_rotation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  rotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  display_order INTEGER DEFAULT 0,
  impressions_today INTEGER DEFAULT 0,
  clicks_today INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_elite_rotation_date ON public.elite_rotation_log(rotation_date, category);
CREATE INDEX IF NOT EXISTS idx_elite_rotation_business ON public.elite_rotation_log(business_id);

-- Enable RLS
ALTER TABLE public.elite_region_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elite_location_multipliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elite_rotation_log ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Anyone can view region settings" ON public.elite_region_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can view location multipliers" ON public.elite_location_multipliers FOR SELECT USING (true);
CREATE POLICY "Anyone can view rotation log" ON public.elite_rotation_log FOR SELECT USING (true);

-- Admin write policies using has_role function
CREATE POLICY "Admins can manage region settings" ON public.elite_region_settings 
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage location multipliers" ON public.elite_location_multipliers 
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage rotation log" ON public.elite_rotation_log 
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Function to calculate waitlist priority score
CREATE OR REPLACE FUNCTION calculate_waitlist_priority(
  p_is_verified BOOLEAN,
  p_review_count INTEGER,
  p_average_rating DECIMAL,
  p_months_on_platform INTEGER,
  p_activity_score INTEGER
) RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  IF p_is_verified THEN score := score + 30; END IF;
  score := score + LEAST(p_review_count, 10) * 2;
  score := score + FLOOR(COALESCE(p_average_rating, 0) * 2)::INTEGER;
  score := score + LEAST(p_months_on_platform, 24);
  score := score + LEAST(p_activity_score, 25);
  RETURN score;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-expand region cap based on traffic
CREATE OR REPLACE FUNCTION update_region_cap_by_traffic() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_monthly_traffic >= NEW.traffic_threshold_3 THEN
    NEW.current_cap := NEW.cap_at_threshold_3;
  ELSIF NEW.current_monthly_traffic >= NEW.traffic_threshold_2 THEN
    NEW.current_cap := NEW.cap_at_threshold_2;
  ELSIF NEW.current_monthly_traffic >= NEW.traffic_threshold_1 THEN
    NEW.current_cap := NEW.cap_at_threshold_1;
  ELSE
    NEW.current_cap := NEW.base_cap;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_region_cap ON public.elite_region_settings;
CREATE TRIGGER trigger_update_region_cap
  BEFORE UPDATE OF current_monthly_traffic ON public.elite_region_settings
  FOR EACH ROW EXECUTE FUNCTION update_region_cap_by_traffic();

-- Trigger to update waitlist priority scores
CREATE OR REPLACE FUNCTION update_waitlist_priority() RETURNS TRIGGER AS $$
BEGIN
  NEW.priority_score := calculate_waitlist_priority(
    NEW.is_verified, NEW.review_count, NEW.average_rating,
    NEW.months_on_platform, NEW.activity_score
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_waitlist_priority ON public.elite_waitlist;
CREATE TRIGGER trigger_update_waitlist_priority
  BEFORE INSERT OR UPDATE ON public.elite_waitlist
  FOR EACH ROW EXECUTE FUNCTION update_waitlist_priority();