-- ============================================
-- CONSTRUCTION OPPORTUNITIES - JOB MARKETPLACE
-- Full internal application system (Mode A)
-- ============================================

-- 1. Job Seeker Profiles Table
CREATE TABLE public.job_seeker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  trade_role TEXT, -- Builder, Apprentice, Foreman, Site Manager, etc.
  work_eligibility TEXT DEFAULT 'nz_citizen', -- nz_citizen, nz_resident, work_visa, other
  cv_url TEXT,
  cv_file_name TEXT,
  cover_letter_default TEXT,
  bio TEXT,
  years_experience INTEGER,
  certifications TEXT[],
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Job Applications Table
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  cover_letter TEXT,
  cv_url TEXT,
  cv_file_name TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'shortlisted', 'interview', 'rejected', 'hired', 'withdrawn')),
  status_notes TEXT,
  status_changed_at TIMESTAMPTZ,
  status_changed_by UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

-- 3. Job Messages Table (Chat between employer and applicant)
CREATE TABLE public.job_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('applicant', 'employer', 'admin')),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Job Application Audit Log
CREATE TABLE public.job_application_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.job_applications(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  actor_id UUID,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add application_method options to jobs table (if not exists)
-- Adding 'internal' as an option for Mode A
ALTER TABLE public.jobs 
  DROP CONSTRAINT IF EXISTS jobs_application_method_check,
  ADD CONSTRAINT jobs_application_method_check 
  CHECK (application_method IN ('url', 'email', 'internal'));

-- Add salary range to jobs (optional enhancement)
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS salary_min INTEGER,
  ADD COLUMN IF NOT EXISTS salary_max INTEGER,
  ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'annual' CHECK (salary_type IN ('hourly', 'annual', 'contract')),
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general', -- Builder, Apprentice, Foreman, etc.
  ADD COLUMN IF NOT EXISTS applications_count INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.job_seeker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_application_audit_log ENABLE ROW LEVEL SECURITY;

-- Enable realtime for job messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_applications;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Job Seeker Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON public.job_seeker_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
  ON public.job_seeker_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.job_seeker_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Employers can view applicant profiles for their jobs
CREATE POLICY "Employers can view applicant profiles"
  ON public.job_seeker_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.businesses b ON ja.business_id = b.id
      WHERE ja.applicant_id = job_seeker_profiles.user_id
      AND b.owner_id = auth.uid()
    )
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.job_seeker_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Job Applications Policies
CREATE POLICY "Applicants can view their own applications"
  ON public.job_applications FOR SELECT
  USING (auth.uid() = applicant_id);

CREATE POLICY "Applicants can create applications"
  ON public.job_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Applicants can update their own applications"
  ON public.job_applications FOR UPDATE
  USING (auth.uid() = applicant_id AND status IN ('new', 'withdrawn'));

-- Business owners can view applications to their jobs
CREATE POLICY "Employers can view applications to their jobs"
  ON public.job_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = job_applications.business_id
      AND b.owner_id = auth.uid()
    )
  );

-- Business owners can update application status
CREATE POLICY "Employers can update application status"
  ON public.job_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = job_applications.business_id
      AND b.owner_id = auth.uid()
    )
  );

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
  ON public.job_applications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all applications"
  ON public.job_applications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Job Messages Policies
CREATE POLICY "Participants can view messages"
  ON public.job_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      WHERE ja.id = job_messages.application_id
      AND (
        ja.applicant_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.businesses b
          WHERE b.id = ja.business_id
          AND b.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.job_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.job_applications ja
      WHERE ja.id = job_messages.application_id
      AND (
        ja.applicant_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.businesses b
          WHERE b.id = ja.business_id
          AND b.owner_id = auth.uid()
        )
      )
    )
  );

-- Admins can view all messages (audit access)
CREATE POLICY "Admins can view all messages"
  ON public.job_messages FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Audit Log Policies
CREATE POLICY "Admins can view audit log"
  ON public.job_application_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit log"
  ON public.job_application_audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Update timestamps
CREATE TRIGGER update_job_seeker_profiles_updated_at
  BEFORE UPDATE ON public.job_seeker_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update application count on jobs
CREATE OR REPLACE FUNCTION public.update_job_applications_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.jobs 
    SET applications_count = COALESCE(applications_count, 0) + 1 
    WHERE id = NEW.job_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.jobs 
    SET applications_count = GREATEST(0, COALESCE(applications_count, 0) - 1) 
    WHERE id = OLD.job_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_applications_count
  AFTER INSERT OR DELETE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_job_applications_count();

-- Function to log application status changes
CREATE OR REPLACE FUNCTION public.log_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.job_application_audit_log (
      application_id, job_id, actor_id, action,
      old_value, new_value, metadata
    ) VALUES (
      NEW.id, NEW.job_id, auth.uid(), 'status_change',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      jsonb_build_object('notes', NEW.status_notes)
    );
    
    NEW.status_changed_at := now();
    NEW.status_changed_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_status_change
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.log_application_status_change();