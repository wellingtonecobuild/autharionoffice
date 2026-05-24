-- Create enum for job types
CREATE TYPE public.job_type AS ENUM ('full_time', 'part_time', 'contract');

-- Create enum for job status
CREATE TYPE public.job_status AS ENUM ('pending', 'approved', 'rejected', 'expired', 'closed');

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Wellington',
  job_type job_type NOT NULL DEFAULT 'full_time',
  summary TEXT NOT NULL,
  responsibilities TEXT NOT NULL,
  requirements TEXT NOT NULL,
  sustainability_relevance TEXT,
  application_method TEXT NOT NULL DEFAULT 'email',
  application_email TEXT,
  application_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  featured_until TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  rejection_reason TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Policies for jobs
CREATE POLICY "Approved jobs are viewable by everyone"
ON public.jobs FOR SELECT
USING (status = 'approved' AND expires_at > now());

CREATE POLICY "Business owners can view their own jobs"
ON public.jobs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.businesses 
  WHERE businesses.id = jobs.business_id 
  AND businesses.owner_id = auth.uid()
));

CREATE POLICY "Business owners with paid subscription can insert jobs"
ON public.jobs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE businesses.id = business_id 
    AND businesses.owner_id = auth.uid()
    AND businesses.subscription_plan IN ('premium', 'elite')
    AND businesses.status = 'approved'
  )
);

CREATE POLICY "Business owners can update their own jobs"
ON public.jobs FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.businesses 
  WHERE businesses.id = jobs.business_id 
  AND businesses.owner_id = auth.uid()
));

CREATE POLICY "Business owners can delete their own jobs"
ON public.jobs FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.businesses 
  WHERE businesses.id = jobs.business_id 
  AND businesses.owner_id = auth.uid()
));

CREATE POLICY "Admins can manage all jobs"
ON public.jobs FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add job settings to platform_settings
INSERT INTO public.platform_settings (key, value) 
VALUES (
  'job_settings',
  '{
    "enabled": true,
    "premium_job_limit": 1,
    "elite_job_limit": 5,
    "featured_price_per_week": 50,
    "featured_duration_days": 7
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;