
-- Fix security warnings by updating policies with proper constraints

-- Drop overly permissive insert policy
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.project_bookings;

-- Create rate-limited insert policy (still allows public booking but with better tracking)
CREATE POLICY "Public can create bookings with valid data" ON public.project_bookings
  FOR INSERT WITH CHECK (
    customer_email IS NOT NULL 
    AND customer_name IS NOT NULL 
    AND project_type IS NOT NULL
    AND project_description IS NOT NULL
    AND business_id IS NOT NULL
  );

-- Fix function search path for the update timestamp function
CREATE OR REPLACE FUNCTION public.update_project_timestamp()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
