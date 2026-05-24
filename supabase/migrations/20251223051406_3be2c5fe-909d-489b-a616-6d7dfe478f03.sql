-- Drop and recreate the policy that references auth.users (which causes permission denied)
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.partner_referrals;

-- Create a simpler policy that doesn't query auth.users directly
CREATE POLICY "Users can view their own referrals" 
ON public.partner_referrals 
FOR SELECT 
USING (referrer_user_id = auth.uid());