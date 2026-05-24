-- Add location_scope column to articles table
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS location_scope text DEFAULT 'national_nz' 
CHECK (location_scope IN ('wellington', 'national_nz'));

-- Add comment for clarity
COMMENT ON COLUMN public.articles.location_scope IS 'Geographic scope of article: wellington (local news) or national_nz (NZ-wide industry content)';