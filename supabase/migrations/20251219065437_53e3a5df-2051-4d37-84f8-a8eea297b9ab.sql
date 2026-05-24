-- Create application status enum
CREATE TYPE public.application_status AS ENUM ('pending', 'reviewed', 'shortlisted', 'interviewed', 'offered', 'hired', 'rejected', 'withdrawn');

-- Create user work history table
CREATE TABLE public.user_work_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user education table
CREATE TABLE public.user_education (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field_of_study TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user certifications table
CREATE TABLE public.user_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuing_organization TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  credential_id TEXT,
  credential_url TEXT,
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user skills table
CREATE TABLE public.user_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  proficiency_level TEXT CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_name)
);

-- Create user documents table for CV/resume storage
CREATE TABLE public.user_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('resume', 'cv', 'portfolio', 'certificate', 'other')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job applications table
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter TEXT,
  resume_url TEXT,
  status application_status NOT NULL DEFAULT 'pending',
  business_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

-- Add accepts_in_platform_applications to jobs table
ALTER TABLE public.jobs ADD COLUMN accepts_in_platform_applications BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS on all new tables
ALTER TABLE public.user_work_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_work_history
CREATE POLICY "Users can manage their own work history" ON public.user_work_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Work history visible to businesses viewing applications" ON public.user_work_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.jobs j ON j.id = ja.job_id
      JOIN public.businesses b ON b.id = j.business_id
      WHERE ja.applicant_id = user_work_history.user_id
      AND b.owner_id = auth.uid()
    )
  );

-- RLS Policies for user_education
CREATE POLICY "Users can manage their own education" ON public.user_education
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Education visible to businesses viewing applications" ON public.user_education
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.jobs j ON j.id = ja.job_id
      JOIN public.businesses b ON b.id = j.business_id
      WHERE ja.applicant_id = user_education.user_id
      AND b.owner_id = auth.uid()
    )
  );

-- RLS Policies for user_certifications
CREATE POLICY "Users can manage their own certifications" ON public.user_certifications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Certifications visible to businesses viewing applications" ON public.user_certifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.jobs j ON j.id = ja.job_id
      JOIN public.businesses b ON b.id = j.business_id
      WHERE ja.applicant_id = user_certifications.user_id
      AND b.owner_id = auth.uid()
    )
  );

-- RLS Policies for user_skills
CREATE POLICY "Users can manage their own skills" ON public.user_skills
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Skills visible to businesses viewing applications" ON public.user_skills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.jobs j ON j.id = ja.job_id
      JOIN public.businesses b ON b.id = j.business_id
      WHERE ja.applicant_id = user_skills.user_id
      AND b.owner_id = auth.uid()
    )
  );

-- RLS Policies for user_documents
CREATE POLICY "Users can manage their own documents" ON public.user_documents
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Documents visible to businesses viewing applications" ON public.user_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.jobs j ON j.id = ja.job_id
      JOIN public.businesses b ON b.id = j.business_id
      WHERE ja.applicant_id = user_documents.user_id
      AND b.owner_id = auth.uid()
    )
  );

-- RLS Policies for job_applications
CREATE POLICY "Users can view their own applications" ON public.job_applications
  FOR SELECT USING (auth.uid() = applicant_id);

CREATE POLICY "Users can create applications" ON public.job_applications
  FOR INSERT WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Users can withdraw their applications" ON public.job_applications
  FOR UPDATE USING (auth.uid() = applicant_id);

CREATE POLICY "Business owners can view applications for their jobs" ON public.job_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.businesses b ON b.id = j.business_id
      WHERE j.id = job_applications.job_id
      AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update applications for their jobs" ON public.job_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.businesses b ON b.id = j.business_id
      WHERE j.id = job_applications.job_id
      AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all applications" ON public.job_applications
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for user documents
INSERT INTO storage.buckets (id, name, public) VALUES ('user-documents', 'user-documents', false);

-- Storage policies for user documents
CREATE POLICY "Users can upload their own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Business owners can view applicant documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-documents' AND
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.jobs j ON j.id = ja.job_id
      JOIN public.businesses b ON b.id = j.business_id
      WHERE ja.applicant_id::text = (storage.foldername(name))[1]
      AND b.owner_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX idx_job_applications_applicant_id ON public.job_applications(applicant_id);
CREATE INDEX idx_job_applications_status ON public.job_applications(status);
CREATE INDEX idx_user_work_history_user_id ON public.user_work_history(user_id);
CREATE INDEX idx_user_education_user_id ON public.user_education(user_id);
CREATE INDEX idx_user_certifications_user_id ON public.user_certifications(user_id);
CREATE INDEX idx_user_skills_user_id ON public.user_skills(user_id);
CREATE INDEX idx_user_documents_user_id ON public.user_documents(user_id);

-- Triggers for updated_at
CREATE TRIGGER update_user_work_history_updated_at
  BEFORE UPDATE ON public.user_work_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_education_updated_at
  BEFORE UPDATE ON public.user_education
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_certifications_updated_at
  BEFORE UPDATE ON public.user_certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_documents_updated_at
  BEFORE UPDATE ON public.user_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();