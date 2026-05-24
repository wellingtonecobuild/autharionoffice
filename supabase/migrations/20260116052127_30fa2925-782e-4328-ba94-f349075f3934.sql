-- =====================================================
-- PORTAL PRO FEATURES: Document Storage
-- =====================================================

-- 1. Create portal_documents table for contractor document uploads
CREATE TABLE IF NOT EXISTS public.portal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_user_id UUID NOT NULL REFERENCES public.portal_users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('ird_certificate', 'gst_certificate', 'insurance', 'contract', 'bank_verification', 'identification', 'other')),
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  expiry_date DATE,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create storage bucket for portal documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portal-documents',
  'portal-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 3. Enable RLS on portal_documents
ALTER TABLE public.portal_documents ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for portal_documents
CREATE POLICY "Contractors can view own documents"
ON public.portal_documents
FOR SELECT
USING (
  portal_user_id IN (
    SELECT id FROM public.portal_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Contractors can upload own documents"
ON public.portal_documents
FOR INSERT
WITH CHECK (
  portal_user_id IN (
    SELECT id FROM public.portal_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Contractors can delete own unverified documents"
ON public.portal_documents
FOR DELETE
USING (
  portal_user_id IN (
    SELECT id FROM public.portal_users WHERE user_id = auth.uid()
  )
  AND is_verified = false
);

-- 5. Storage policies for portal-documents bucket
CREATE POLICY "Portal users upload own documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'portal-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Portal users view own documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'portal-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Portal users delete own documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'portal-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 6. Create updated_at trigger for portal_documents
CREATE TRIGGER update_portal_documents_updated_at
BEFORE UPDATE ON public.portal_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_portal_documents_portal_user_id ON public.portal_documents(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_documents_expiry ON public.portal_documents(expiry_date) WHERE expiry_date IS NOT NULL;