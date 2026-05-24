-- Add listing status to businesses
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'active', 'rejected', 'suspended'));

-- Add rejection reason and admin notes
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS admin_notes text,
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);

-- Add verification fields
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS verification_documents jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS verification_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verification_processed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verification_processed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verification_rejection_reason text;

-- Create audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create platform_settings table for system config
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings, only admins can modify
CREATE POLICY "Anyone can view settings"
ON public.platform_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage settings"
ON public.platform_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Update existing businesses to active status
UPDATE public.businesses SET status = 'active' WHERE status = 'pending';