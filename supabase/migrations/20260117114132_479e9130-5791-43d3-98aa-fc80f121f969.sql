-- Create contractor call logs table
CREATE TABLE public.contractor_call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_user_id UUID NOT NULL REFERENCES public.portal_users(id) ON DELETE CASCADE,
  
  -- Contact details
  contact_type TEXT NOT NULL DEFAULT 'company' CHECK (contact_type IN ('company', 'individual')),
  company_name TEXT,
  contact_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  
  -- Call details
  call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_time TIME NOT NULL DEFAULT CURRENT_TIME,
  call_duration_minutes INTEGER,
  call_purpose TEXT NOT NULL CHECK (call_purpose IN ('cold_call', 'follow_up', 'listing_inquiry', 'partnership', 'other')),
  call_outcome TEXT NOT NULL CHECK (call_outcome IN ('interested', 'not_interested', 'callback_requested', 'no_answer', 'left_voicemail', 'wrong_number', 'other')),
  notes TEXT,
  
  -- Verification
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'disputed', 'failed')),
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  verification_notes TEXT,
  verification_method TEXT,
  
  -- Metadata
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contractor_call_logs ENABLE ROW LEVEL SECURITY;

-- Contractors can view and manage their own call logs
CREATE POLICY "Contractors can view own call logs"
  ON public.contractor_call_logs
  FOR SELECT
  USING (
    portal_user_id IN (
      SELECT id FROM portal_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Contractors can insert own call logs"
  ON public.contractor_call_logs
  FOR INSERT
  WITH CHECK (
    portal_user_id IN (
      SELECT id FROM portal_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Contractors can update own call logs"
  ON public.contractor_call_logs
  FOR UPDATE
  USING (
    portal_user_id IN (
      SELECT id FROM portal_users WHERE user_id = auth.uid()
    )
    AND verification_status = 'pending'
  );

CREATE POLICY "Contractors can delete own pending call logs"
  ON public.contractor_call_logs
  FOR DELETE
  USING (
    portal_user_id IN (
      SELECT id FROM portal_users WHERE user_id = auth.uid()
    )
    AND verification_status = 'pending'
  );

-- Admin full access policy using has_role function
CREATE POLICY "Admins have full access to call logs"
  ON public.contractor_call_logs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_call_logs_portal_user ON public.contractor_call_logs(portal_user_id);
CREATE INDEX idx_call_logs_date ON public.contractor_call_logs(call_date DESC);
CREATE INDEX idx_call_logs_verification ON public.contractor_call_logs(verification_status);
CREATE INDEX idx_call_logs_phone ON public.contractor_call_logs(phone_number);

-- Add trigger for updated_at
CREATE TRIGGER update_call_logs_updated_at
  BEFORE UPDATE ON public.contractor_call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();