-- Create table for RSS feed sources management
CREATE TABLE public.rss_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'wellington_construction_news',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  fetch_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rss_sources ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage RSS sources" 
ON public.rss_sources 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_rss_sources_updated_at
BEFORE UPDATE ON public.rss_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default NZ construction RSS sources
INSERT INTO public.rss_sources (name, url, category) VALUES
  ('Stuff Business', 'https://www.stuff.co.nz/rss/business', 'wellington_construction_news'),
  ('Stuff Property', 'https://www.stuff.co.nz/rss/life-style/homed/latest-news', 'projects_developments'),
  ('NZ Herald Property', 'https://www.nzherald.co.nz/business/property/rss.xml', 'market_trends'),
  ('BRANZ Updates', 'https://www.branz.co.nz/rss', 'regulations_compliance'),
  ('Architecture Now', 'https://architecturenow.co.nz/rss/', 'sustainable_building'),
  ('Scoop Business', 'https://www.scoop.co.nz/rss/business.rss', 'supplier_updates')
ON CONFLICT (url) DO NOTHING;