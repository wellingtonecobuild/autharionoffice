-- Add DELETE policy for admins on leads table
CREATE POLICY "Admins can delete leads"
ON public.leads
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for admins on saved_businesses table
CREATE POLICY "Admins can delete saved businesses"
ON public.saved_businesses
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for admins on verification_submissions table
CREATE POLICY "Admins can delete verification submissions"
ON public.verification_submissions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for admins on dunning_records table
CREATE POLICY "Admins can delete dunning records"
ON public.dunning_records
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for admins on partner_referrals related to business
CREATE POLICY "Admins can delete partner referrals"
ON public.partner_referrals
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));