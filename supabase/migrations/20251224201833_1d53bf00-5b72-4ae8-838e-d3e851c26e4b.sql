
-- Create elite_category_caps table for configurable caps per category
CREATE TABLE public.elite_category_caps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  max_slots integer NOT NULL DEFAULT 10,
  current_count integer NOT NULL DEFAULT 0,
  is_accepting_new boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.elite_category_caps ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view elite caps" ON public.elite_category_caps
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage elite caps" ON public.elite_category_caps
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default caps for each category
INSERT INTO public.elite_category_caps (category, max_slots) VALUES
  ('builders', 10),
  ('renovators', 10),
  ('architects', 10),
  ('suppliers', 10),
  ('consultants', 10),
  ('energy', 10),
  ('landscaping', 10),
  ('interior', 10),
  ('waste', 10),
  ('other', 10);

-- Create elite_waitlist table
CREATE TABLE public.elite_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category text NOT NULL,
  current_plan text NOT NULL,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  notified_at timestamp with time zone,
  status text NOT NULL DEFAULT 'waiting',
  admin_notes text,
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamp with time zone,
  UNIQUE(business_id)
);

-- Enable RLS
ALTER TABLE public.elite_waitlist ENABLE ROW LEVEL SECURITY;

-- RLS policies for waitlist
CREATE POLICY "Business owners can view their own waitlist entry" ON public.elite_waitlist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses b 
      WHERE b.id = elite_waitlist.business_id 
      AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can join waitlist" ON public.elite_waitlist
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b 
      WHERE b.id = elite_waitlist.business_id 
      AND b.owner_id = auth.uid()
      AND b.subscription_plan IN ('premium', 'elite')
    )
  );

CREATE POLICY "Admins can manage waitlist" ON public.elite_waitlist
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to update elite category counts (called by trigger)
CREATE OR REPLACE FUNCTION public.update_elite_category_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle INSERT or UPDATE to elite
  IF (TG_OP = 'INSERT' AND NEW.subscription_plan = 'elite' AND NEW.status IN ('approved', 'active')) OR
     (TG_OP = 'UPDATE' AND NEW.subscription_plan = 'elite' AND NEW.status IN ('approved', 'active') AND 
      (OLD.subscription_plan != 'elite' OR OLD.status NOT IN ('approved', 'active'))) THEN
    UPDATE public.elite_category_caps
    SET current_count = current_count + 1,
        updated_at = now()
    WHERE category = NEW.category::text;
  END IF;
  
  -- Handle DELETE or downgrade from elite
  IF (TG_OP = 'DELETE' AND OLD.subscription_plan = 'elite' AND OLD.status IN ('approved', 'active')) OR
     (TG_OP = 'UPDATE' AND OLD.subscription_plan = 'elite' AND OLD.status IN ('approved', 'active') AND 
      (NEW.subscription_plan != 'elite' OR NEW.status NOT IN ('approved', 'active'))) THEN
    UPDATE public.elite_category_caps
    SET current_count = GREATEST(0, current_count - 1),
        updated_at = now()
    WHERE category = OLD.category::text;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for automatic count updates
CREATE TRIGGER trigger_update_elite_count
  AFTER INSERT OR UPDATE OR DELETE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_elite_category_count();

-- Function to check if elite is available for a category
CREATE OR REPLACE FUNCTION public.is_elite_available(p_category text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT current_count < max_slots AND is_accepting_new 
     FROM public.elite_category_caps 
     WHERE category = p_category),
    false
  );
$$;

-- Initialize current counts from existing data
UPDATE public.elite_category_caps ec
SET current_count = (
  SELECT COUNT(*) 
  FROM public.businesses b 
  WHERE b.category::text = ec.category 
  AND b.subscription_plan = 'elite'
  AND b.status IN ('approved', 'active')
);
