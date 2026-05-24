-- Create table to cache URL validation results
CREATE TABLE public.url_validation_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  is_valid BOOLEAN NOT NULL,
  status_code INTEGER,
  error_message TEXT,
  validated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Create index for faster lookups
CREATE INDEX idx_url_validation_cache_url ON public.url_validation_cache(url);
CREATE INDEX idx_url_validation_cache_expires ON public.url_validation_cache(expires_at);

-- Enable RLS
ALTER TABLE public.url_validation_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access (cache is not sensitive)
CREATE POLICY "Anyone can read URL validation cache"
  ON public.url_validation_cache
  FOR SELECT
  USING (true);

-- Only service role can insert/update (via edge function)
CREATE POLICY "Service role can manage cache"
  ON public.url_validation_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);