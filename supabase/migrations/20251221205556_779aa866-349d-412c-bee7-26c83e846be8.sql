-- Add status column to reviews for moderation
ALTER TABLE public.reviews 
ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Add admin_notes for rejection reasons
ALTER TABLE public.reviews 
ADD COLUMN admin_notes text;

-- Add reviewed_at and reviewed_by for tracking
ALTER TABLE public.reviews 
ADD COLUMN reviewed_at timestamp with time zone;

ALTER TABLE public.reviews 
ADD COLUMN reviewed_by uuid;

-- Create index for status filtering
CREATE INDEX idx_reviews_status ON public.reviews(status);

-- Drop old public viewing policy
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;

-- Create new policy: Only approved reviews are viewable by everyone
CREATE POLICY "Approved reviews are viewable by everyone" 
ON public.reviews 
FOR SELECT 
USING (status = 'approved');

-- Users can always view their own reviews regardless of status
CREATE POLICY "Users can view their own reviews" 
ON public.reviews 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all reviews for moderation
CREATE POLICY "Admins can view all reviews" 
ON public.reviews 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update any review (for moderation)
CREATE POLICY "Admins can update any review" 
ON public.reviews 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));