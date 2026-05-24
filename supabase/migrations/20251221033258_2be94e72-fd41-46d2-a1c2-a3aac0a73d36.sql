-- Create referral status enum
CREATE TYPE public.referral_status AS ENUM ('pending', 'approved', 'paid', 'rejected');

-- Create referral plan enum
CREATE TYPE public.referral_plan AS ENUM ('premium', 'elite');

-- Create partner_referrals table
CREATE TABLE public.partner_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_name TEXT NOT NULL,
  referrer_email TEXT NOT NULL,
  referrer_phone TEXT,
  referrer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_company_name TEXT NOT NULL,
  referred_company_email TEXT NOT NULL,
  referral_plan referral_plan NOT NULL,
  referral_code TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  status referral_status NOT NULL DEFAULT 'pending',
  reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID,
  admin_notes TEXT,
  converted_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage all referrals"
ON public.partner_referrals
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Anyone can insert referrals (public form)
CREATE POLICY "Anyone can submit referrals"
ON public.partner_referrals
FOR INSERT
WITH CHECK (true);

-- Policy: Users can view their own referrals
CREATE POLICY "Users can view their own referrals"
ON public.partner_referrals
FOR SELECT
USING (referrer_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR referrer_user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_partner_referrals_updated_at
BEFORE UPDATE ON public.partner_referrals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_partner_referrals_status ON public.partner_referrals(status);
CREATE INDEX idx_partner_referrals_referrer_email ON public.partner_referrals(referrer_email);
CREATE INDEX idx_partner_referrals_referral_code ON public.partner_referrals(referral_code);