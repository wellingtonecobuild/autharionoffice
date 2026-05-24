-- Drop existing internal_messages table and create comprehensive communications system
DROP TABLE IF EXISTS public.internal_messages CASCADE;

-- Communication threads (conversations)
CREATE TABLE public.communication_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('internal', 'email', 'contact_form', 'system_notification', 'document_exchange')),
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'resolved', 'under_review', 'compliance_required', 'archived')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  category TEXT, -- 'support', 'verification', 'billing', 'general', 'dispute', etc.
  initiator_id UUID, -- User who started the thread (NULL for visitors)
  initiator_email TEXT, -- For non-registered users
  initiator_name TEXT,
  initiator_role TEXT NOT NULL CHECK (initiator_role IN ('visitor', 'user', 'professional', 'admin', 'system')),
  assigned_to UUID, -- Admin assigned to handle
  related_entity_type TEXT, -- 'business', 'verification', 'job', 'subscription', 'review'
  related_entity_id UUID,
  is_broadcast BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- Individual messages within threads
CREATE TABLE public.communication_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.communication_threads(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_email TEXT,
  sender_name TEXT,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('visitor', 'user', 'professional', 'admin', 'system')),
  content TEXT NOT NULL,
  html_content TEXT,
  is_system_message BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  read_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Message attachments with approval workflow
CREATE TABLE public.communication_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.communication_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'resubmit_requested')),
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES public.communication_attachments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comprehensive audit log for legal-grade logging
CREATE TABLE public.communication_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.communication_threads(id),
  message_id UUID REFERENCES public.communication_messages(id),
  attachment_id UUID REFERENCES public.communication_attachments(id),
  action TEXT NOT NULL,
  actor_id UUID,
  actor_email TEXT,
  actor_role TEXT,
  old_value JSONB,
  new_value JSONB,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Thread participants for tracking who can see what
CREATE TABLE public.communication_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.communication_threads(id) ON DELETE CASCADE,
  user_id UUID,
  user_email TEXT,
  user_role TEXT NOT NULL,
  can_reply BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(thread_id, user_id)
);

-- Enable RLS
ALTER TABLE public.communication_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_participants ENABLE ROW LEVEL SECURITY;

-- Admin policies (full access)
CREATE POLICY "Admins can manage all threads" ON public.communication_threads
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all messages" ON public.communication_messages
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all attachments" ON public.communication_attachments
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all audit logs" ON public.communication_audit_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs" ON public.communication_audit_log
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all participants" ON public.communication_participants
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User policies (only their threads)
CREATE POLICY "Users can view their threads" ON public.communication_threads
  FOR SELECT USING (
    initiator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.communication_participants 
      WHERE thread_id = communication_threads.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view messages in their threads" ON public.communication_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.communication_threads t
      WHERE t.id = communication_messages.thread_id
      AND (t.initiator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.communication_participants p
        WHERE p.thread_id = t.id AND p.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can send messages in their threads" ON public.communication_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.communication_participants p
      WHERE p.thread_id = communication_messages.thread_id 
      AND p.user_id = auth.uid() 
      AND p.can_reply = true
    )
  );

CREATE POLICY "Users can view attachments in their threads" ON public.communication_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.communication_messages m
      JOIN public.communication_threads t ON t.id = m.thread_id
      WHERE m.id = communication_attachments.message_id
      AND (t.initiator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.communication_participants p
        WHERE p.thread_id = t.id AND p.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can view their participation" ON public.communication_participants
  FOR SELECT USING (user_id = auth.uid());

-- Public insert for contact forms (visitors)
CREATE POLICY "Anyone can create contact threads" ON public.communication_threads
  FOR INSERT WITH CHECK (channel_type = 'contact_form');

CREATE POLICY "Anyone can insert contact messages" ON public.communication_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.communication_threads t
      WHERE t.id = communication_messages.thread_id
      AND t.channel_type = 'contact_form'
    )
  );

-- Indexes for performance
CREATE INDEX idx_threads_status ON public.communication_threads(status);
CREATE INDEX idx_threads_channel ON public.communication_threads(channel_type);
CREATE INDEX idx_threads_initiator ON public.communication_threads(initiator_id);
CREATE INDEX idx_threads_last_message ON public.communication_threads(last_message_at DESC);
CREATE INDEX idx_messages_thread ON public.communication_messages(thread_id);
CREATE INDEX idx_messages_created ON public.communication_messages(created_at DESC);
CREATE INDEX idx_attachments_message ON public.communication_attachments(message_id);
CREATE INDEX idx_audit_thread ON public.communication_audit_log(thread_id);
CREATE INDEX idx_audit_created ON public.communication_audit_log(created_at DESC);
CREATE INDEX idx_participants_thread ON public.communication_participants(thread_id);
CREATE INDEX idx_participants_user ON public.communication_participants(user_id);

-- Trigger to update thread's last_message_at
CREATE OR REPLACE FUNCTION public.update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.communication_threads
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_thread_on_message
  AFTER INSERT ON public.communication_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_thread_last_message();

-- Function to log actions
CREATE OR REPLACE FUNCTION public.log_communication_action(
  p_thread_id UUID,
  p_message_id UUID,
  p_attachment_id UUID,
  p_action TEXT,
  p_actor_id UUID,
  p_actor_email TEXT,
  p_actor_role TEXT,
  p_old_value JSONB,
  p_new_value JSONB,
  p_details JSONB
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.communication_audit_log (
    thread_id, message_id, attachment_id, action, 
    actor_id, actor_email, actor_role, 
    old_value, new_value, details
  ) VALUES (
    p_thread_id, p_message_id, p_attachment_id, p_action,
    p_actor_id, p_actor_email, p_actor_role,
    p_old_value, p_new_value, p_details
  ) RETURNING id INTO log_id;
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;