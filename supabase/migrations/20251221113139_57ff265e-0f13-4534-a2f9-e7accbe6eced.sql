-- First drop the storage policy that depends on job_applications
DROP POLICY IF EXISTS "Business owners can view applicant documents" ON storage.objects;

-- Remove RLS policies that reference job_applications table
DROP POLICY IF EXISTS "Certifications visible to businesses viewing applications" ON public.user_certifications;
DROP POLICY IF EXISTS "Documents visible to businesses viewing applications" ON public.user_documents;
DROP POLICY IF EXISTS "Education visible to businesses viewing applications" ON public.user_education;
DROP POLICY IF EXISTS "Skills visible to businesses viewing applications" ON public.user_skills;
DROP POLICY IF EXISTS "Work history visible to businesses viewing applications" ON public.user_work_history;

-- Drop all policies on job_applications table first
DROP POLICY IF EXISTS "Admins can manage all applications" ON public.job_applications;
DROP POLICY IF EXISTS "Business owners can update applications for their jobs" ON public.job_applications;
DROP POLICY IF EXISTS "Business owners can view applications for their jobs" ON public.job_applications;
DROP POLICY IF EXISTS "Users can create applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can view their own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can withdraw their applications" ON public.job_applications;

-- Drop the job_applications table (no longer needed)
DROP TABLE IF EXISTS public.job_applications;

-- Drop the application_status enum type
DROP TYPE IF EXISTS public.application_status;

-- Remove the accepts_in_platform_applications column from jobs table since it's no longer used
ALTER TABLE public.jobs DROP COLUMN IF EXISTS accepts_in_platform_applications;