-- Add new blog categories to the enum
ALTER TYPE public.blog_category ADD VALUE IF NOT EXISTS 'construction_opportunities';
ALTER TYPE public.blog_category ADD VALUE IF NOT EXISTS 'finance_construction';

-- Add new columns to articles table for enhanced submission form
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS gallery_images text[];
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS author_avatar text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS word_count integer DEFAULT 0;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id);
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Update RLS policies for contributor access
CREATE POLICY "Writers can create articles" 
ON public.articles 
FOR INSERT 
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'writer'::app_role) OR
  has_role(auth.uid(), 'editor'::app_role) OR
  has_role(auth.uid(), 'journalist'::app_role)
);

CREATE POLICY "Writers can update own articles" 
ON public.articles 
FOR UPDATE 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (submitted_by = auth.uid() AND status IN ('draft', 'pending'))
);

CREATE POLICY "Writers can view own articles" 
ON public.articles 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'editor'::app_role) OR
  submitted_by = auth.uid() OR
  (status = 'published' AND published_at <= now())
);