
-- Add professional profile fields to portal_users
ALTER TABLE public.portal_users 
ADD COLUMN IF NOT EXISTS profile_photo_url text,
ADD COLUMN IF NOT EXISTS profile_photo_hd_url text,
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS qualifications text[],
ADD COLUMN IF NOT EXISTS profile_completion_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS photo_status text DEFAULT 'pending' CHECK (photo_status IN ('pending', 'processing', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified')),
ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'away', 'offline')),
ADD COLUMN IF NOT EXISTS last_active_at timestamptz,
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS agreement_signed_at timestamptz;

-- Create staff ID cards table
CREATE TABLE IF NOT EXISTS public.staff_id_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id uuid REFERENCES public.portal_users(id) ON DELETE CASCADE NOT NULL,
  card_number text UNIQUE NOT NULL,
  qr_code_data text,
  issued_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create email signature settings table
CREATE TABLE IF NOT EXISTS public.email_signature_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id uuid REFERENCES public.portal_users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  include_photo boolean DEFAULT true,
  include_phone boolean DEFAULT false,
  include_qualifications boolean DEFAULT true,
  custom_tagline text,
  signature_template text DEFAULT 'professional',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_id_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_signature_settings ENABLE ROW LEVEL SECURITY;

-- Staff ID cards policies
CREATE POLICY "Users can view their own ID card"
ON public.staff_id_cards FOR SELECT
USING (
  portal_user_id IN (
    SELECT id FROM public.portal_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all ID cards"
ON public.staff_id_cards FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Email signature settings policies
CREATE POLICY "Users can view their own signature settings"
ON public.email_signature_settings FOR SELECT
USING (
  portal_user_id IN (
    SELECT id FROM public.portal_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own signature settings"
ON public.email_signature_settings FOR UPDATE
USING (
  portal_user_id IN (
    SELECT id FROM public.portal_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own signature settings"
ON public.email_signature_settings FOR INSERT
WITH CHECK (
  portal_user_id IN (
    SELECT id FROM public.portal_users WHERE user_id = auth.uid()
  )
);

-- Create storage bucket for staff photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-photos', 'staff-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for staff photos
CREATE POLICY "Anyone can view staff photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'staff-photos');

CREATE POLICY "Authenticated users can upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'staff-photos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'staff-photos' AND
  auth.role() = 'authenticated'
);

-- Function to calculate profile completion score
CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_portal_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score integer := 0;
  pu portal_users%ROWTYPE;
BEGIN
  SELECT * INTO pu FROM portal_users WHERE id = p_portal_user_id;
  
  IF pu.legal_full_name IS NOT NULL AND pu.legal_full_name != '' THEN score := score + 15; END IF;
  IF pu.profile_photo_hd_url IS NOT NULL THEN score := score + 20; END IF;
  IF pu.job_title IS NOT NULL AND pu.job_title != '' THEN score := score + 10; END IF;
  IF pu.phone_number IS NOT NULL AND pu.phone_number != '' THEN score := score + 10; END IF;
  IF pu.ird_number IS NOT NULL AND pu.ird_number != '' THEN score := score + 15; END IF;
  IF pu.bank_account_number IS NOT NULL AND pu.bank_account_number != '' THEN score := score + 15; END IF;
  IF pu.bio IS NOT NULL AND pu.bio != '' THEN score := score + 5; END IF;
  IF pu.qualifications IS NOT NULL AND array_length(pu.qualifications, 1) > 0 THEN score := score + 10; END IF;
  
  UPDATE portal_users SET profile_completion_score = score WHERE id = p_portal_user_id;
  
  RETURN score;
END;
$$;

-- Trigger to auto-calculate profile completion
CREATE OR REPLACE FUNCTION public.trigger_calculate_profile_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM calculate_profile_completion(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_portal_user_update_calc_completion ON public.portal_users;
CREATE TRIGGER on_portal_user_update_calc_completion
AFTER INSERT OR UPDATE ON public.portal_users
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_profile_completion();

-- Function to generate unique staff card number
CREATE OR REPLACE FUNCTION public.generate_staff_card_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_number text;
  year_prefix text;
BEGIN
  year_prefix := 'WEB-' || to_char(now(), 'YY');
  SELECT year_prefix || '-' || lpad((COALESCE(MAX(NULLIF(regexp_replace(card_number, '[^0-9]', '', 'g'), '')::integer), 0) + 1)::text, 4, '0')
  INTO new_number
  FROM staff_id_cards
  WHERE card_number LIKE year_prefix || '%';
  
  RETURN new_number;
END;
$$;
