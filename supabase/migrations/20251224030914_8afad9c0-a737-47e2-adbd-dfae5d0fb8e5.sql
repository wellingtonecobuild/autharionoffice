-- 1. Make reviews.user_id nullable to allow guest reviews
ALTER TABLE public.reviews ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add guest reviewer fields
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS guest_initial text;

-- 3. Update RLS policies for reviews to allow guest submissions
DROP POLICY IF EXISTS "Users can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;

-- Allow anyone to insert reviews (guest or authenticated)
CREATE POLICY "Anyone can insert reviews"
ON public.reviews
FOR INSERT
WITH CHECK (true);

-- Allow users to update their own reviews (authenticated only)
CREATE POLICY "Users can update own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own reviews (authenticated only)
CREATE POLICY "Users can delete own reviews"
ON public.reviews
FOR DELETE
USING (auth.uid() = user_id);

-- 4. Fix jobs table RLS - allow Premium/Elite business owners to insert jobs
DROP POLICY IF EXISTS "Business owners with paid subscription can insert jobs" ON public.jobs;

CREATE POLICY "Business owners with paid subscription can insert jobs"
ON public.jobs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = jobs.business_id
    AND businesses.owner_id = auth.uid()
    AND businesses.subscription_plan IN ('premium', 'elite')
    AND businesses.status IN ('approved', 'active')
  )
);