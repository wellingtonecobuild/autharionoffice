-- Create storage bucket for review proof documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-proofs', 'review-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for review proofs
CREATE POLICY "Users can upload their own review proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'review-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own review proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'review-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own review proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'review-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all review proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'review-proofs' 
  AND has_role(auth.uid(), 'admin')
);

-- Add proof document columns to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS proof_document_url TEXT,
ADD COLUMN IF NOT EXISTS proof_document_name TEXT,
ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_processed_by UUID;