-- Drop the old constraint and add new one that includes 'pending' status
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_status_check;

ALTER TABLE public.articles ADD CONSTRAINT articles_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'pending'::text, 'published'::text, 'archived'::text]));