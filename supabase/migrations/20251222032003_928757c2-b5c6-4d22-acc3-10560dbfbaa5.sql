-- Allow admins to view/download private verification documents (required for signed URLs)
CREATE POLICY "Admins can read verification documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'verification-documents'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow document owners to read their own verification documents (optional but helpful for user dashboard)
CREATE POLICY "Users can read own verification documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'verification-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
