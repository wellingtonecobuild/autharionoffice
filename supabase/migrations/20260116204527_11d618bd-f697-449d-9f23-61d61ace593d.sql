
-- Create project_bookings table for booking requests
CREATE TABLE public.project_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  project_type TEXT NOT NULL,
  project_description TEXT NOT NULL,
  preferred_start_date DATE,
  estimated_budget TEXT,
  property_address TEXT,
  property_type TEXT,
  urgency TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  quoted_amount DECIMAL(10,2),
  quoted_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  decline_reason TEXT,
  tracking_code TEXT UNIQUE DEFAULT upper(substring(md5(random()::text) from 1 for 8)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_milestones table for tracking progress
CREATE TABLE public.project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.project_bookings(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  estimated_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create builder_availability table for workload management
CREATE TABLE public.builder_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  current_projects INTEGER DEFAULT 0,
  max_projects INTEGER DEFAULT 5,
  average_project_days INTEGER DEFAULT 30,
  next_available_date DATE,
  is_accepting_bookings BOOLEAN DEFAULT true,
  booking_lead_time_days INTEGER DEFAULT 14,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_updates table for timeline updates
CREATE TABLE public.project_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.project_bookings(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  is_public BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.project_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;

-- Policies for project_bookings
CREATE POLICY "Anyone can create bookings" ON public.project_bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Customers can view their own bookings by tracking code" ON public.project_bookings
  FOR SELECT USING (true);

CREATE POLICY "Business owners can manage their bookings" ON public.project_bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = project_bookings.business_id 
      AND businesses.owner_id = auth.uid()
    )
  );

-- Policies for project_milestones
CREATE POLICY "Anyone can view milestones" ON public.project_milestones
  FOR SELECT USING (true);

CREATE POLICY "Business owners can manage milestones" ON public.project_milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_bookings pb
      JOIN public.businesses b ON b.id = pb.business_id
      WHERE pb.id = project_milestones.booking_id
      AND b.owner_id = auth.uid()
    )
  );

-- Policies for builder_availability
CREATE POLICY "Anyone can view availability" ON public.builder_availability
  FOR SELECT USING (true);

CREATE POLICY "Business owners can manage their availability" ON public.builder_availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = builder_availability.business_id 
      AND businesses.owner_id = auth.uid()
    )
  );

-- Policies for project_updates
CREATE POLICY "Public updates are viewable by anyone" ON public.project_updates
  FOR SELECT USING (is_public = true);

CREATE POLICY "Business owners can manage updates" ON public.project_updates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_bookings pb
      JOIN public.businesses b ON b.id = pb.business_id
      WHERE pb.id = project_updates.booking_id
      AND b.owner_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_project_bookings_business ON public.project_bookings(business_id);
CREATE INDEX idx_project_bookings_status ON public.project_bookings(status);
CREATE INDEX idx_project_bookings_tracking ON public.project_bookings(tracking_code);
CREATE INDEX idx_project_milestones_booking ON public.project_milestones(booking_id);
CREATE INDEX idx_builder_availability_business ON public.builder_availability(business_id);
CREATE INDEX idx_project_updates_booking ON public.project_updates(booking_id);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_updates;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_project_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_project_bookings_timestamp
  BEFORE UPDATE ON public.project_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_project_timestamp();

CREATE TRIGGER update_project_milestones_timestamp
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_project_timestamp();

CREATE TRIGGER update_builder_availability_timestamp
  BEFORE UPDATE ON public.builder_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_project_timestamp();
