-- Drop the problematic trigger
DROP TRIGGER IF EXISTS on_portal_user_update_calc_completion ON public.portal_users;

-- Recreate the function to avoid recursion by checking if we're already updating the score
CREATE OR REPLACE FUNCTION public.trigger_calculate_profile_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  score integer := 0;
BEGIN
  -- Calculate score inline to avoid recursion
  IF NEW.legal_full_name IS NOT NULL AND NEW.legal_full_name != '' THEN score := score + 15; END IF;
  IF NEW.profile_photo_hd_url IS NOT NULL THEN score := score + 20; END IF;
  IF NEW.job_title IS NOT NULL AND NEW.job_title != '' THEN score := score + 10; END IF;
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN score := score + 10; END IF;
  IF NEW.ird_number IS NOT NULL AND NEW.ird_number != '' THEN score := score + 15; END IF;
  IF NEW.bank_account_number IS NOT NULL AND NEW.bank_account_number != '' THEN score := score + 15; END IF;
  IF NEW.bio IS NOT NULL AND NEW.bio != '' THEN score := score + 5; END IF;
  IF NEW.qualifications IS NOT NULL AND array_length(NEW.qualifications, 1) > 0 THEN score := score + 10; END IF;
  
  -- Set the score directly on NEW instead of doing a separate UPDATE
  NEW.profile_completion_score := score;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger as BEFORE trigger to modify NEW directly
CREATE TRIGGER on_portal_user_calc_completion 
  BEFORE INSERT OR UPDATE ON public.portal_users 
  FOR EACH ROW 
  EXECUTE FUNCTION trigger_calculate_profile_completion();