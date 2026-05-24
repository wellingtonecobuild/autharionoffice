-- Create blog categories enum
CREATE TYPE public.blog_category AS ENUM (
  'wellington_construction_news',
  'sustainable_building',
  'supplier_updates',
  'projects_developments',
  'renovation_retrofit',
  'regulations_compliance',
  'market_trends',
  'eco_building_education'
);

-- Create articles table
CREATE TABLE public.articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  featured_image TEXT,
  categories blog_category[] NOT NULL DEFAULT '{}',
  author TEXT NOT NULL DEFAULT 'Wellington EcoBuild',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_trending BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  views INTEGER NOT NULL DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Public can view published articles
CREATE POLICY "Published articles are viewable by everyone"
ON public.articles
FOR SELECT
USING (status = 'published' AND published_at <= now());

-- Admins can manage all articles
CREATE POLICY "Admins can manage all articles"
ON public.articles
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create index for slug lookups
CREATE INDEX idx_articles_slug ON public.articles(slug);

-- Create index for category filtering
CREATE INDEX idx_articles_categories ON public.articles USING GIN(categories);

-- Create index for published articles sorting
CREATE INDEX idx_articles_published ON public.articles(published_at DESC) WHERE status = 'published';

-- Create trigger for updated_at
CREATE TRIGGER update_articles_updated_at
BEFORE UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment article views
CREATE OR REPLACE FUNCTION public.increment_article_views(article_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.articles
  SET views = views + 1
  WHERE id = article_id;
END;
$$;