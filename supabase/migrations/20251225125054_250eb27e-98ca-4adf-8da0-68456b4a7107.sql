-- Wellington Suburbs for SEO landing pages
CREATE TABLE public.wellington_suburbs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL DEFAULT 'Wellington City',
  description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  featured_image TEXT,
  population INTEGER,
  median_house_price INTEGER,
  growth_rate NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Market Data for insights dashboard
CREATE TABLE public.market_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_type TEXT NOT NULL, -- 'building_consents', 'project_costs', 'material_prices', 'labor_rates'
  category TEXT, -- construction category
  suburb TEXT,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  unit TEXT,
  period_start DATE,
  period_end DATE,
  source TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Expert Leaderboard
CREATE TABLE public.expert_leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL DEFAULT 0,
  review_score INTEGER DEFAULT 0,
  response_rate INTEGER DEFAULT 0, -- percentage
  projects_completed INTEGER DEFAULT 0,
  years_experience INTEGER DEFAULT 0,
  certifications_count INTEGER DEFAULT 0,
  community_contributions INTEGER DEFAULT 0,
  rank_position INTEGER,
  rank_change INTEGER DEFAULT 0, -- positive = moved up, negative = moved down
  badge_level TEXT DEFAULT 'bronze', -- bronze, silver, gold, platinum
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

-- Resource Library
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  content TEXT,
  resource_type TEXT NOT NULL, -- 'guide', 'checklist', 'template', 'calculator', 'video'
  category TEXT, -- 'planning', 'budgeting', 'hiring', 'permits', 'maintenance'
  featured_image TEXT,
  file_url TEXT,
  video_url TEXT,
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  tags TEXT[],
  meta_title TEXT,
  meta_description TEXT,
  created_by UUID,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Events Calendar
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  event_type TEXT NOT NULL, -- 'workshop', 'webinar', 'networking', 'conference', 'open_home', 'trade_show'
  location TEXT,
  venue_name TEXT,
  address TEXT,
  city TEXT DEFAULT 'Wellington',
  latitude NUMERIC,
  longitude NUMERIC,
  is_online BOOLEAN DEFAULT false,
  online_url TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  registration_url TEXT,
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  price NUMERIC DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  featured_image TEXT,
  organizer_name TEXT,
  organizer_id UUID,
  is_featured BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending', -- pending, approved, cancelled
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event Registrations
CREATE TABLE public.event_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  status TEXT DEFAULT 'registered', -- registered, attended, cancelled
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  attended_at TIMESTAMP WITH TIME ZONE
);

-- Partner/Affiliate Program
CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  partner_type TEXT NOT NULL, -- 'architect', 'real_estate', 'supplier', 'insurance', 'bank', 'media'
  website TEXT,
  referral_code TEXT UNIQUE,
  commission_rate NUMERIC DEFAULT 10, -- percentage
  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  pending_earnings NUMERIC DEFAULT 0,
  paid_earnings NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, approved, active, suspended
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Partner Payouts
CREATE TABLE public.partner_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payout_method TEXT, -- 'bank_transfer', 'paypal'
  bank_account TEXT,
  reference TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project Showcase / Case Studies
CREATE TABLE public.project_showcases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  project_type TEXT, -- 'renovation', 'new_build', 'extension', 'commercial'
  suburb TEXT,
  budget_range TEXT,
  duration TEXT,
  completion_date DATE,
  before_images TEXT[],
  after_images TEXT[],
  gallery_images TEXT[],
  video_url TEXT,
  client_testimonial TEXT,
  client_name TEXT,
  challenges TEXT,
  solutions TEXT,
  materials_used TEXT[],
  sustainability_features TEXT[],
  is_featured BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Saved Searches for alerts
CREATE TABLE public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  search_type TEXT NOT NULL, -- 'business', 'job', 'resource', 'event'
  filters JSONB NOT NULL DEFAULT '{}',
  notify_email BOOLEAN DEFAULT true,
  notify_frequency TEXT DEFAULT 'daily', -- 'instant', 'daily', 'weekly'
  last_notified_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.wellington_suburbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_showcases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Wellington Suburbs - public read
CREATE POLICY "Anyone can view suburbs" ON public.wellington_suburbs FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage suburbs" ON public.wellington_suburbs FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Market Data - public read
CREATE POLICY "Anyone can view market data" ON public.market_data FOR SELECT USING (true);
CREATE POLICY "Admins can manage market data" ON public.market_data FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Expert Leaderboard - public read
CREATE POLICY "Anyone can view leaderboard" ON public.expert_leaderboard FOR SELECT USING (true);
CREATE POLICY "Admins can manage leaderboard" ON public.expert_leaderboard FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Resources - public read published
CREATE POLICY "Anyone can view published resources" ON public.resources FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage resources" ON public.resources FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Events - public read approved
CREATE POLICY "Anyone can view approved events" ON public.events FOR SELECT USING (is_approved = true AND status = 'approved');
CREATE POLICY "Admins can manage events" ON public.events FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can submit events" ON public.events FOR INSERT WITH CHECK (true);

-- Event Registrations
CREATE POLICY "Users can view own registrations" ON public.event_registrations FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Anyone can register" ON public.event_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage registrations" ON public.event_registrations FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Partners
CREATE POLICY "Partners can view own profile" ON public.partners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can apply as partner" ON public.partners FOR INSERT WITH CHECK (true);
CREATE POLICY "Partners can update own profile" ON public.partners FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage partners" ON public.partners FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Partner Payouts
CREATE POLICY "Partners can view own payouts" ON public.partner_payouts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.partners WHERE id = partner_payouts.partner_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage payouts" ON public.partner_payouts FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Project Showcases
CREATE POLICY "Anyone can view approved showcases" ON public.project_showcases FOR SELECT USING (is_approved = true AND status = 'approved');
CREATE POLICY "Business owners can manage own showcases" ON public.project_showcases FOR ALL USING (
  EXISTS (SELECT 1 FROM public.businesses WHERE id = project_showcases.business_id AND owner_id = auth.uid())
);
CREATE POLICY "Admins can manage showcases" ON public.project_showcases FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Saved Searches
CREATE POLICY "Users can manage own saved searches" ON public.saved_searches FOR ALL USING (auth.uid() = user_id);

-- Insert default Wellington suburbs
INSERT INTO public.wellington_suburbs (name, slug, region, description) VALUES
('Wellington Central', 'wellington-central', 'Wellington City', 'The heart of Wellington with commercial and residential developments'),
('Te Aro', 'te-aro', 'Wellington City', 'Vibrant inner-city suburb with heritage buildings and modern apartments'),
('Thorndon', 'thorndon', 'Wellington City', 'Historic suburb near Parliament with character homes'),
('Kelburn', 'kelburn', 'Wellington City', 'Hillside suburb home to Victoria University'),
('Karori', 'karori', 'Wellington City', 'Family-friendly suburb with excellent schools'),
('Miramar', 'miramar', 'Wellington City', 'Eastern suburb near the airport and film studios'),
('Island Bay', 'island-bay', 'Wellington City', 'Coastal suburb with stunning beach views'),
('Newtown', 'newtown', 'Wellington City', 'Diverse multicultural suburb with vibrant community'),
('Brooklyn', 'brooklyn', 'Wellington City', 'Hillside suburb with panoramic harbour views'),
('Johnsonville', 'johnsonville', 'Wellington City', 'Northern suburb with shopping hub'),
('Lower Hutt', 'lower-hutt', 'Hutt Valley', 'Major city in the Hutt Valley'),
('Upper Hutt', 'upper-hutt', 'Hutt Valley', 'Gateway to the Rimutaka ranges'),
('Petone', 'petone', 'Hutt Valley', 'Historic waterfront suburb with Jackson Street shops'),
('Porirua', 'porirua', 'Porirua City', 'Northern city with diverse communities'),
('Kapiti Coast', 'kapiti-coast', 'Kapiti Coast', 'Coastal region including Paraparaumu and Waikanae'),
('Wainuiomata', 'wainuiomata', 'Hutt Valley', 'Valley community with strong local identity'),
('Eastbourne', 'eastbourne', 'Hutt Valley', 'Seaside suburb on the eastern harbour'),
('Tawa', 'tawa', 'Wellington City', 'Northern suburb with strong community'),
('Churton Park', 'churton-park', 'Wellington City', 'Growing suburb in northern Wellington'),
('Khandallah', 'khandallah', 'Wellington City', 'Leafy hillside suburb with village feel');

-- Insert sample market data
INSERT INTO public.market_data (data_type, category, suburb, metric_name, metric_value, unit, source, is_verified) VALUES
('building_consents', 'residential', 'Wellington City', 'Monthly Consents Issued', 145, 'consents', 'Stats NZ', true),
('building_consents', 'commercial', 'Wellington City', 'Monthly Consents Issued', 28, 'consents', 'Stats NZ', true),
('project_costs', 'renovation', NULL, 'Average Kitchen Renovation', 35000, 'NZD', 'Industry Survey', true),
('project_costs', 'renovation', NULL, 'Average Bathroom Renovation', 25000, 'NZD', 'Industry Survey', true),
('project_costs', 'new_build', NULL, 'Average Build Cost per sqm', 3500, 'NZD/sqm', 'Industry Survey', true),
('material_prices', 'timber', NULL, 'Framing Timber H1.2', 8.50, 'NZD/m', 'Supplier Average', true),
('material_prices', 'concrete', NULL, 'Ready Mix 25MPa', 280, 'NZD/m3', 'Supplier Average', true),
('labor_rates', 'builder', NULL, 'Average Hourly Rate', 85, 'NZD/hr', 'Industry Survey', true),
('labor_rates', 'electrician', NULL, 'Average Hourly Rate', 95, 'NZD/hr', 'Industry Survey', true),
('labor_rates', 'plumber', NULL, 'Average Hourly Rate', 90, 'NZD/hr', 'Industry Survey', true);

-- Insert sample resources
INSERT INTO public.resources (title, slug, description, resource_type, category, is_published, is_featured, tags) VALUES
('Complete Home Renovation Planning Guide', 'home-renovation-planning-guide', 'Step-by-step guide to planning your renovation project', 'guide', 'planning', true, true, ARRAY['renovation', 'planning', 'budget']),
('Building Consent Checklist', 'building-consent-checklist', 'Everything you need to prepare for your building consent application', 'checklist', 'permits', true, true, ARRAY['consent', 'permits', 'council']),
('How to Choose a Builder', 'how-to-choose-builder', 'Tips for finding and vetting the right builder for your project', 'guide', 'hiring', true, false, ARRAY['builder', 'hiring', 'tips']),
('Home Maintenance Calendar', 'home-maintenance-calendar', 'Monthly checklist to keep your home in top condition', 'checklist', 'maintenance', true, false, ARRAY['maintenance', 'calendar', 'home']),
('Budget Planning Template', 'budget-planning-template', 'Excel template to track your renovation budget', 'template', 'budgeting', true, true, ARRAY['budget', 'template', 'planning']);

-- Add triggers for updated_at
CREATE TRIGGER update_wellington_suburbs_updated_at BEFORE UPDATE ON public.wellington_suburbs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_market_data_updated_at BEFORE UPDATE ON public.market_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expert_leaderboard_updated_at BEFORE UPDATE ON public.expert_leaderboard FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_showcases_updated_at BEFORE UPDATE ON public.project_showcases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_saved_searches_updated_at BEFORE UPDATE ON public.saved_searches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();