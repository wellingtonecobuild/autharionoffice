-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION generate_email_message_id()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN '<' || gen_random_uuid()::text || '@wellingtonecobuild.nz>';
END;
$$;