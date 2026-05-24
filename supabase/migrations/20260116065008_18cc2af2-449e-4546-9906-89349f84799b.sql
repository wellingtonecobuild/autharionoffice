
-- Fix search_path for generate_staff_card_number function
CREATE OR REPLACE FUNCTION public.generate_staff_card_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
