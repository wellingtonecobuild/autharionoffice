-- Fix overly permissive RLS policy on activity_stream
DROP POLICY IF EXISTS "System can insert activity" ON public.activity_stream;

-- Create a proper insert policy - only authenticated users or system can insert
CREATE POLICY "Authenticated users can insert activity" ON public.activity_stream
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);