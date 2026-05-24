-- Create a function that will be called via a trigger to send the claimed notification
-- We'll use pg_net extension for HTTP calls from within PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Update the handle_new_user function to call the notification edge function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  matching_business RECORD;
  thread_id UUID;
  supabase_url TEXT;
BEGIN
  -- Get Supabase URL from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  
  -- Add default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Check for unclaimed business with matching email
  SELECT * INTO matching_business
  FROM public.businesses
  WHERE LOWER(email) = LOWER(NEW.email)
    AND claimed = false
  LIMIT 1;
  
  -- If found, link the business to this new user
  IF matching_business.id IS NOT NULL THEN
    -- Update business ownership
    UPDATE public.businesses
    SET owner_id = NEW.id,
        claimed = true,
        claimed_at = now(),
        updated_at = now()
    WHERE id = matching_business.id;
    
    -- Create admin notification
    INSERT INTO public.admin_notifications (type, title, message, metadata)
    VALUES (
      'business_claimed',
      'Business Listing Claimed',
      'Business "' || matching_business.name || '" has been auto-linked to new user ' || NEW.email,
      jsonb_build_object(
        'business_id', matching_business.id,
        'business_name', matching_business.name,
        'user_id', NEW.id,
        'user_email', NEW.email
      )
    );
    
    -- Create welcome message in communications hub
    INSERT INTO public.communication_threads (
      channel_type,
      subject,
      initiator_id,
      initiator_email,
      initiator_name,
      initiator_role,
      related_entity_type,
      related_entity_id,
      status,
      priority
    ) VALUES (
      'internal',
      'Welcome! Your Business Listing is Now Active',
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
      'user',
      'business',
      matching_business.id,
      'unread',
      'normal'
    )
    RETURNING id INTO thread_id;
    
    INSERT INTO public.communication_messages (
      thread_id,
      sender_role,
      sender_name,
      content,
      is_system_message
    ) VALUES (
      thread_id,
      'admin',
      'Wellington EcoBuild',
      'Welcome to Wellington EcoBuild! 🎉

Your business listing "' || matching_business.name || '" has been automatically linked to your new account. You now have full access to:

• Edit your business details and description
• Upload photos and certifications
• Respond to leads and enquiries
• Manage your subscription plan
• Track your listing performance

Visit your Dashboard to get started managing your business listing.

If you have any questions, feel free to reply to this message.',
      true
    );
    
    -- Send welcome email via edge function using pg_net
    -- Note: This runs async and won't block the signup
    PERFORM net.http_post(
      url := 'https://duumxykzcliujgyrmzvn.supabase.co/functions/v1/notify-business-claimed',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'businessName', matching_business.name,
        'ownerEmail', NEW.email,
        'ownerName', COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User')
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;