-- Create table to store webhook events for real-time monitoring
CREATE TABLE public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'received',
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for dunning management
CREATE TABLE public.dunning_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  dunning_type TEXT NOT NULL, -- 'renewal_reminder', 'payment_failed', 'final_notice'
  email_sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_reminder_at TIMESTAMP WITH TIME ZONE,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'resolved', 'escalated'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dunning_records ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY "Admins can view webhook events"
  ON public.webhook_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage dunning records"
  ON public.dunning_records FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for webhook events
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_events;

-- Add updated_at trigger for dunning_records
CREATE TRIGGER update_dunning_records_updated_at
  BEFORE UPDATE ON public.dunning_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for efficient queries
CREATE INDEX idx_webhook_events_created_at ON public.webhook_events(created_at DESC);
CREATE INDEX idx_webhook_events_event_type ON public.webhook_events(event_type);
CREATE INDEX idx_dunning_records_business_id ON public.dunning_records(business_id);
CREATE INDEX idx_dunning_records_status ON public.dunning_records(status);