-- Add tags/hashtags column to articles table
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add video_url for embedded videos
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS video_url text;

-- Add image_caption for featured image
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS image_caption text;

-- Add image_credit for attribution
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS image_credit text;

-- Add call_to_action JSON for CTA blocks
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS call_to_action jsonb DEFAULT '{}';

-- Create index for tags for fast filtering
CREATE INDEX IF NOT EXISTS idx_articles_tags ON public.articles USING GIN(tags);

-- Create index for faster hashtag page queries
CREATE INDEX IF NOT EXISTS idx_articles_status_published ON public.articles(status, published_at) WHERE status = 'published';