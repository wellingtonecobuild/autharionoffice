-- Add government-grade verification fields to verification_submissions
ALTER TABLE public.verification_submissions 
ADD COLUMN IF NOT EXISTS verification_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS business_email TEXT,
ADD COLUMN IF NOT EXISTS business_phone TEXT,
ADD COLUMN IF NOT EXISTS business_type TEXT CHECK (business_type IN ('company', 'sole_trader', 'partnership', 'trust')),
ADD COLUMN IF NOT EXISTS qualification_type TEXT,
ADD COLUMN IF NOT EXISTS certificate_name TEXT,
ADD COLUMN IF NOT EXISTS file_format TEXT,
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS upload_timezone TEXT DEFAULT 'Pacific/Auckland',
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES public.verification_submissions(id),
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS flagged_by UUID,
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS flagged_reason TEXT,
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Create index for verification_id lookups
CREATE INDEX IF NOT EXISTS idx_verification_submissions_verification_id 
ON public.verification_submissions(verification_id);

-- Create index for business lookups
CREATE INDEX IF NOT EXISTS idx_verification_submissions_business_email 
ON public.verification_submissions(business_email);

-- Function to generate unique verification ID (format: VER-YYYYMMDD-XXXXX)
CREATE OR REPLACE FUNCTION public.generate_verification_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate ID: VER-YYYYMMDD-5 random alphanumeric chars
    new_id := 'VER-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
              UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 5));
    
    -- Check if exists
    SELECT EXISTS(SELECT 1 FROM public.verification_submissions WHERE verification_id = new_id) INTO id_exists;
    
    EXIT WHEN NOT id_exists;
  END LOOP;
  
  RETURN new_id;
END;
$$;

-- Trigger to auto-generate verification_id on insert
CREATE OR REPLACE FUNCTION public.set_verification_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_id IS NULL THEN
    NEW.verification_id := generate_verification_id();
  END IF;
  
  -- Extract file format from file name
  IF NEW.file_format IS NULL AND NEW.file_name IS NOT NULL THEN
    NEW.file_format := UPPER(SPLIT_PART(NEW.file_name, '.', -1));
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_verification_id ON public.verification_submissions;
CREATE TRIGGER trigger_set_verification_id
BEFORE INSERT ON public.verification_submissions
FOR EACH ROW
EXECUTE FUNCTION public.set_verification_id();

-- Function to track document version history
CREATE OR REPLACE FUNCTION public.increment_document_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_version INTEGER;
BEGIN
  IF NEW.previous_version_id IS NOT NULL THEN
    SELECT version_number INTO prev_version 
    FROM public.verification_submissions 
    WHERE id = NEW.previous_version_id;
    
    IF prev_version IS NOT NULL THEN
      NEW.version_number := prev_version + 1;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_increment_document_version ON public.verification_submissions;
CREATE TRIGGER trigger_increment_document_version
BEFORE INSERT ON public.verification_submissions
FOR EACH ROW
EXECUTE FUNCTION public.increment_document_version();

-- Backfill existing records with verification IDs
UPDATE public.verification_submissions 
SET verification_id = generate_verification_id() 
WHERE verification_id IS NULL;

-- Create verification audit log table for detailed tracking
CREATE TABLE IF NOT EXISTS public.verification_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES public.verification_submissions(id) ON DELETE SET NULL,
  verification_id TEXT,
  business_id UUID,
  action TEXT NOT NULL,
  action_by UUID,
  action_by_email TEXT,
  action_by_role TEXT,
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on verification_audit_log
ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for verification_audit_log
CREATE POLICY "Admins can manage verification audit logs"
ON public.verification_audit_log FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own verification audit logs"
ON public.verification_audit_log FOR SELECT
USING (
  action_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.verification_submissions vs
    WHERE vs.id = submission_id AND vs.user_id = auth.uid()
  )
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_submission_id 
ON public.verification_audit_log(submission_id);

CREATE INDEX IF NOT EXISTS idx_verification_audit_log_verification_id 
ON public.verification_audit_log(verification_id);

-- Function to automatically log verification actions
CREATE OR REPLACE FUNCTION public.log_verification_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.verification_audit_log (
      submission_id,
      verification_id,
      business_id,
      action,
      action_by,
      previous_status,
      new_status,
      notes,
      metadata
    ) VALUES (
      NEW.id,
      NEW.verification_id,
      NEW.business_id,
      'status_change',
      NEW.reviewed_by,
      OLD.status,
      NEW.status,
      NEW.admin_notes,
      jsonb_build_object(
        'document_name', NEW.document_name,
        'document_type', NEW.document_type,
        'company_name', NEW.company_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_verification_action ON public.verification_submissions;
CREATE TRIGGER trigger_log_verification_action
AFTER UPDATE ON public.verification_submissions
FOR EACH ROW
EXECUTE FUNCTION public.log_verification_action();