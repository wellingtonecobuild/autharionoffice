-- Create storage bucket for communication attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('communication-attachments', 'communication-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for communication attachments bucket
-- Admins can do everything
CREATE POLICY "Admins can manage all attachments"
ON storage.objects FOR ALL
USING (
  bucket_id = 'communication-attachments' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Users can upload attachments to their threads
CREATE POLICY "Users can upload to their threads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'communication-attachments'
  AND auth.uid() IS NOT NULL
);

-- Users can view attachments in threads they're part of
CREATE POLICY "Users can view their thread attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'communication-attachments'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR auth.uid() IS NOT NULL
  )
);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'communication-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);