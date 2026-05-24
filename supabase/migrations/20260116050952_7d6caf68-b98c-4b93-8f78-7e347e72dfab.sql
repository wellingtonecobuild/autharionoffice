-- Add legal acceptance columns to portal_users for NZ Privacy Act 2020 and contractor compliance
-- These columns store when users accepted various legal agreements for audit purposes

ALTER TABLE public.portal_users 
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS contractor_agreement_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contractor_agreement_accepted_at TIMESTAMP WITH TIME ZONE;

-- Add trading_name column if not exists (for IRD compliance)
ALTER TABLE public.portal_users 
ADD COLUMN IF NOT EXISTS trading_name TEXT;

-- Add GST number column if not exists (distinct from gst_registered boolean)
ALTER TABLE public.portal_users 
ADD COLUMN IF NOT EXISTS gst_number TEXT;

-- Add comment explaining the legal compliance purpose
COMMENT ON COLUMN public.portal_users.terms_accepted IS 'Records acceptance of Terms of Service - required for NZ contract law compliance';
COMMENT ON COLUMN public.portal_users.terms_accepted_at IS 'Timestamp of Terms acceptance - audit trail for NZ Privacy Act 2020';
COMMENT ON COLUMN public.portal_users.privacy_accepted IS 'Records acceptance of Privacy Policy - NZ Privacy Act 2020 compliance';
COMMENT ON COLUMN public.portal_users.privacy_accepted_at IS 'Timestamp of Privacy Policy acceptance - audit trail for NZ Privacy Act 2020';
COMMENT ON COLUMN public.portal_users.contractor_agreement_accepted IS 'Records acknowledgment of independent contractor status and tax obligations';
COMMENT ON COLUMN public.portal_users.contractor_agreement_accepted_at IS 'Timestamp of contractor agreement acceptance - IRD audit compliance';
COMMENT ON COLUMN public.portal_users.trading_name IS 'Business trading name for IRD documentation';
COMMENT ON COLUMN public.portal_users.gst_number IS 'GST registration number if registered (distinct from gst_registered flag)';