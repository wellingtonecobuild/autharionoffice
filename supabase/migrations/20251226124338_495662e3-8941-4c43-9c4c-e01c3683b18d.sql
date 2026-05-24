-- Add new columns for enhanced verification status tracking
ALTER TABLE public.verification_submissions 
ADD COLUMN IF NOT EXISTS is_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS document_category text DEFAULT 'credential',
ADD COLUMN IF NOT EXISTS expiry_reminder_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Create index on expiry_date for efficient querying
CREATE INDEX IF NOT EXISTS idx_verification_submissions_expiry 
ON public.verification_submissions (expiry_date) 
WHERE expiry_date IS NOT NULL;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_verification_submissions_status 
ON public.verification_submissions (status);

-- Add verification_suspended status to businesses for when credentials expire
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS verification_suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verification_suspension_reason text;

-- Create a table to track verification requirements per category
CREATE TABLE IF NOT EXISTS public.verification_requirements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_category text NOT NULL,
    document_type text NOT NULL,
    is_required boolean DEFAULT false,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(business_category, document_type)
);

-- Enable RLS on verification_requirements
ALTER TABLE public.verification_requirements ENABLE ROW LEVEL SECURITY;

-- Admins can manage verification requirements
CREATE POLICY "Admins can manage verification requirements"
ON public.verification_requirements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view verification requirements
CREATE POLICY "Anyone can view verification requirements"
ON public.verification_requirements
FOR SELECT
USING (true);

-- Insert default verification requirements for each category
INSERT INTO public.verification_requirements (business_category, document_type, is_required, description)
VALUES 
    ('builders', 'lbp_registration', true, 'Licensed Building Practitioner registration is required for builders'),
    ('builders', 'nzbn', true, 'NZ Business Number required for all businesses'),
    ('architects', 'nzrab', true, 'Registered Architect certification required'),
    ('architects', 'nzbn', true, 'NZ Business Number required for all businesses'),
    ('engineers', 'nzbn', true, 'NZ Business Number required for all businesses'),
    ('suppliers', 'nzbn', true, 'NZ Business Number required for all businesses'),
    ('consultants', 'nzbn', true, 'NZ Business Number required for all businesses')
ON CONFLICT (business_category, document_type) DO NOTHING;

-- Create function to check if a business has all required verified documents
CREATE OR REPLACE FUNCTION public.business_has_valid_credentials(business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    business_category text;
    required_count integer;
    verified_count integer;
    has_expired boolean;
BEGIN
    -- Get the business category
    SELECT category INTO business_category
    FROM businesses WHERE id = business_id;
    
    IF business_category IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check for any expired required documents
    SELECT EXISTS (
        SELECT 1 FROM verification_submissions vs
        JOIN verification_requirements vr ON vs.document_type = vr.document_type
        WHERE vs.business_id = business_id
        AND vr.business_category = business_category
        AND vr.is_required = true
        AND vs.status = 'approved'
        AND vs.expiry_date IS NOT NULL
        AND vs.expiry_date < CURRENT_DATE
    ) INTO has_expired;
    
    IF has_expired THEN
        RETURN false;
    END IF;
    
    -- Count required document types for this category
    SELECT COUNT(*) INTO required_count
    FROM verification_requirements
    WHERE business_category = business_category AND is_required = true;
    
    -- Count approved non-expired required documents for this business
    SELECT COUNT(DISTINCT vs.document_type) INTO verified_count
    FROM verification_submissions vs
    JOIN verification_requirements vr ON vs.document_type = vr.document_type
    WHERE vs.business_id = business_id
    AND vr.business_category = business_category
    AND vr.is_required = true
    AND vs.status = 'approved'
    AND (vs.expiry_date IS NULL OR vs.expiry_date >= CURRENT_DATE);
    
    RETURN verified_count >= required_count;
END;
$$;