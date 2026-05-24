-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-documents', 
  'verification-documents', 
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- RLS policy: Users can upload their own verification documents
CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy: Users can view their own verification documents
CREATE POLICY "Users can view own verification documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy: Users can update their own verification documents
CREATE POLICY "Users can update own verification documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy: Users can delete their own verification documents
CREATE POLICY "Users can delete own verification documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy: Admins can view all verification documents
CREATE POLICY "Admins can view all verification documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- RLS policy: Admins can manage all verification documents
CREATE POLICY "Admins can manage all verification documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'verification-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create a table for tracking verification document submissions
CREATE TABLE public.verification_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "Users can view own verification submissions"
ON public.verification_submissions FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own submissions
CREATE POLICY "Users can create verification submissions"
ON public.verification_submissions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their pending submissions
CREATE POLICY "Users can update pending submissions"
ON public.verification_submissions FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Users can delete their pending submissions
CREATE POLICY "Users can delete pending submissions"
ON public.verification_submissions FOR DELETE
USING (auth.uid() = user_id AND status = 'pending');

-- Admins can manage all submissions
CREATE POLICY "Admins can manage all verification submissions"
ON public.verification_submissions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_verification_submissions_updated_at
BEFORE UPDATE ON public.verification_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();