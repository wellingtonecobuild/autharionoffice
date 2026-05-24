-- Add source attribution and publishing control fields to articles table
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS source_name text,
ADD COLUMN IF NOT EXISTS source_url text,
ADD COLUMN IF NOT EXISTS is_rss_import boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_summary text;

-- Add source_type to rss_sources for categorization/validation
ALTER TABLE public.rss_sources 
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'news' CHECK (source_type IN ('government', 'industry', 'news', 'trade')),
ADD COLUMN IF NOT EXISTS description text;