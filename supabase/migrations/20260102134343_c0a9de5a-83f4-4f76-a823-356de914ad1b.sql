-- Email identities table for multi-address system
CREATE TABLE public.email_identities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_address TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- info, support, verification, partnerships, advertising, legal, leadership, admin
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- whether it appears on public pages
  auto_response_enabled BOOLEAN DEFAULT false,
  auto_response_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add email identity reference to communication threads
ALTER TABLE public.communication_threads 
ADD COLUMN IF NOT EXISTS email_identity_id UUID REFERENCES public.email_identities(id),
ADD COLUMN IF NOT EXISTS email_category TEXT DEFAULT 'info';

-- Add identity to messages for tracking which address was used
ALTER TABLE public.communication_messages
ADD COLUMN IF NOT EXISTS sent_from_identity UUID REFERENCES public.email_identities(id);

-- Enable RLS
ALTER TABLE public.email_identities ENABLE ROW LEVEL SECURITY;

-- Only admins can manage email identities
CREATE POLICY "Admins can manage email identities"
ON public.email_identities
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Public can view active public identities (for displaying on website)
CREATE POLICY "Anyone can view public email identities"
ON public.email_identities
FOR SELECT
USING (is_active = true AND is_public = true);

-- Insert default email identities
INSERT INTO public.email_identities (email_address, display_name, description, category, is_public) VALUES
('info@wellingtonecobuild.nz', 'Wellington EcoBuild', 'General enquiries, public questions, media contact', 'info', true),
('support@wellingtonecobuild.nz', 'Wellington EcoBuild Support', 'Platform & account support, login issues, billing', 'support', true),
('verification@wellingtonecobuild.nz', 'Wellington EcoBuild Verification', 'Listing approvals, rejections, document requests, compliance', 'verification', true),
('partnerships@wellingtonecobuild.nz', 'Wellington EcoBuild Partnerships', 'Councils, developers, training providers, industry organisations', 'partnerships', true),
('advertising@wellingtonecobuild.nz', 'Wellington EcoBuild Advertising', 'Premium & Elite plan enquiries, sponsored placements', 'advertising', true),
('legal@wellingtonecobuild.nz', 'Wellington EcoBuild Legal', 'Legal notices, complaints, compliance matters', 'legal', true),
('beveck@wellingtonecobuild.nz', 'Beveck - Wellington EcoBuild', 'Leadership communication, strategic conversations', 'leadership', true),
('admin@wellingtonecobuild.nz', 'Wellington EcoBuild Admin', 'Internal system alerts, security events', 'admin', false);

-- Create trigger for updated_at
CREATE TRIGGER update_email_identities_updated_at
BEFORE UPDATE ON public.email_identities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();