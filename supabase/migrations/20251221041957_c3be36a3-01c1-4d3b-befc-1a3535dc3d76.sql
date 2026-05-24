-- Create admin notifications table to track all submissions
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'contact', 'newsletter', 'referral', 'lead', 'business', 'job_application'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view notifications
CREATE POLICY "Admins can view all notifications"
  ON public.admin_notifications
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update notifications (mark as read)
CREATE POLICY "Admins can update notifications"
  ON public.admin_notifications
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert notifications (from triggers)
CREATE POLICY "Anyone can create notifications"
  ON public.admin_notifications
  FOR INSERT
  WITH CHECK (true);

-- Create function to notify admin on new contact submission
CREATE OR REPLACE FUNCTION public.notify_on_contact_submission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, metadata)
  VALUES (
    'contact',
    'New Contact Form Submission',
    'From: ' || NEW.name || ' (' || NEW.email || ')',
    jsonb_build_object('contact_id', NEW.id, 'name', NEW.name, 'email', NEW.email, 'subject', NEW.subject)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to notify admin on new newsletter subscription
CREATE OR REPLACE FUNCTION public.notify_on_newsletter_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, metadata)
  VALUES (
    'newsletter',
    'New Newsletter Subscriber',
    'Email: ' || NEW.email,
    jsonb_build_object('subscriber_id', NEW.id, 'email', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to notify admin on new referral
CREATE OR REPLACE FUNCTION public.notify_on_referral_submission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, metadata)
  VALUES (
    'referral',
    'New Partner Referral',
    'Referrer: ' || NEW.referrer_name || ' referred ' || NEW.referred_company_name,
    jsonb_build_object('referral_id', NEW.id, 'referrer_name', NEW.referrer_name, 'referred_company', NEW.referred_company_name, 'plan', NEW.referral_plan)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to notify admin on new lead
CREATE OR REPLACE FUNCTION public.notify_on_lead_submission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, metadata)
  VALUES (
    'lead',
    'New Business Lead',
    'From: ' || NEW.name || ' (' || NEW.email || ')',
    jsonb_build_object('lead_id', NEW.id, 'name', NEW.name, 'email', NEW.email, 'business_id', NEW.business_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
CREATE TRIGGER on_contact_submission
  AFTER INSERT ON public.contact_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_contact_submission();

CREATE TRIGGER on_newsletter_subscription
  AFTER INSERT ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_newsletter_subscription();

CREATE TRIGGER on_referral_submission
  AFTER INSERT ON public.partner_referrals
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_referral_submission();

CREATE TRIGGER on_lead_submission
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_lead_submission();