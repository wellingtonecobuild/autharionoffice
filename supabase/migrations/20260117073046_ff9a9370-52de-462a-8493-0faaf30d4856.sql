-- =====================================================
-- PRO-LEVEL FEATURES: Database Tables & Infrastructure
-- =====================================================

-- 1. AUTOMATED EMAIL SEQUENCES TABLE
CREATE TABLE public.email_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.email_sequence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 1,
  delay_days INTEGER NOT NULL DEFAULT 0,
  delay_hours INTEGER NOT NULL DEFAULT 0,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.email_sequence_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_type TEXT NOT NULL DEFAULT 'lead',
  recipient_id UUID,
  current_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  next_email_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.email_sequence_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.email_sequence_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.email_sequence_steps(id),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- 2. REAL-TIME NOTIFICATIONS TABLE
CREATE TABLE public.realtime_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  action_url TEXT,
  action_label TEXT,
  is_read BOOLEAN DEFAULT false,
  is_pushed BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. SAVED FILTER PRESETS TABLE
CREATE TABLE public.saved_filter_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. CONTRACTOR PERFORMANCE METRICS TABLE
CREATE TABLE public.contractor_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_leads INTEGER DEFAULT 0,
  responded_leads INTEGER DEFAULT 0,
  avg_response_time_hours NUMERIC(10,2),
  projects_quoted INTEGER DEFAULT 0,
  projects_won INTEGER DEFAULT 0,
  win_rate NUMERIC(5,2),
  total_revenue NUMERIC(12,2) DEFAULT 0,
  customer_rating_avg NUMERIC(3,2),
  review_count INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  contact_clicks INTEGER DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, period_start, period_end)
);

-- 5. BULK OPERATIONS LOG TABLE
CREATE TABLE public.bulk_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_ids UUID[] NOT NULL,
  total_count INTEGER NOT NULL,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  parameters JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  error_log JSONB DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  performed_by UUID REFERENCES auth.users(id)
);

-- 6. CUSTOM REPORT DEFINITIONS TABLE
CREATE TABLE public.custom_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL,
  data_sources JSONB NOT NULL DEFAULT '[]',
  columns JSONB NOT NULL DEFAULT '[]',
  filters JSONB DEFAULT '{}',
  grouping JSONB DEFAULT '{}',
  chart_config JSONB DEFAULT '{}',
  schedule TEXT,
  email_recipients TEXT[],
  last_run_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.report_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.custom_reports(id) ON DELETE CASCADE,
  execution_type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pending',
  row_count INTEGER,
  file_path TEXT,
  file_size_bytes INTEGER,
  execution_time_ms INTEGER,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  triggered_by UUID REFERENCES auth.users(id)
);

-- 7. ROLE-BASED PERMISSIONS TABLE
CREATE TABLE public.permission_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_template_id UUID REFERENCES public.permission_templates(id),
  custom_permissions JSONB DEFAULT '{}',
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id)
);

-- 8. ACTIVITY STREAM TABLE
CREATE TABLE public.activity_stream (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  actor_name TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  action_category TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  geo_location TEXT,
  session_id TEXT,
  request_id TEXT,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for fast queries
CREATE INDEX idx_activity_stream_actor ON public.activity_stream(actor_id, created_at DESC);
CREATE INDEX idx_activity_stream_entity ON public.activity_stream(entity_type, entity_id);
CREATE INDEX idx_activity_stream_action ON public.activity_stream(action, created_at DESC);
CREATE INDEX idx_activity_stream_category ON public.activity_stream(action_category, created_at DESC);
CREATE INDEX idx_realtime_notifications_user ON public.realtime_notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_email_sequence_enrollments_next ON public.email_sequence_enrollments(next_email_at, status);
CREATE INDEX idx_contractor_performance_business ON public.contractor_performance_metrics(business_id, period_start DESC);
CREATE INDEX idx_bulk_operations_status ON public.bulk_operations(status, started_at DESC);

-- Enable RLS
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_filter_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_stream ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin access
CREATE POLICY "Admins can manage email sequences" ON public.email_sequences
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage email sequence steps" ON public.email_sequence_steps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage enrollments" ON public.email_sequence_enrollments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can view sequence logs" ON public.email_sequence_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view own notifications" ON public.realtime_notifications
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can update own notifications" ON public.realtime_notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage notifications" ON public.realtime_notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete notifications" ON public.realtime_notifications
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can manage own filter presets" ON public.saved_filter_presets
  FOR ALL USING (user_id = auth.uid() OR is_shared = true);

CREATE POLICY "Admins can view performance metrics" ON public.contractor_performance_metrics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage bulk operations" ON public.bulk_operations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage custom reports" ON public.custom_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage report executions" ON public.report_executions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage permission templates" ON public.permission_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage user permissions" ON public.user_permissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can view activity stream" ON public.activity_stream
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert activity" ON public.activity_stream
  FOR INSERT WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_stream;

-- Insert default permission templates
INSERT INTO public.permission_templates (name, description, permissions, is_system) VALUES
('super_admin', 'Full system access', '{"all": true}', true),
('admin', 'Administrative access', '{"dashboard": true, "businesses": true, "users": true, "content": true, "finance": {"view": true, "edit": false}, "settings": {"view": true, "edit": false}}', true),
('finance_manager', 'Financial operations access', '{"dashboard": {"view": true}, "finance": true, "reports": true}', true),
('content_manager', 'Content management access', '{"dashboard": {"view": true}, "content": true, "blog": true}', true),
('support_agent', 'Customer support access', '{"dashboard": {"view": true}, "businesses": {"view": true}, "communications": true, "leads": true}', true),
('viewer', 'Read-only access', '{"dashboard": {"view": true}, "businesses": {"view": true}, "reports": {"view": true}}', true);

-- Create function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  p_action TEXT,
  p_action_category TEXT,
  p_description TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
  v_actor_id UUID;
  v_actor_email TEXT;
  v_actor_name TEXT;
  v_actor_role TEXT;
  v_activity_id UUID;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NOT NULL THEN
    SELECT email, full_name INTO v_actor_email, v_actor_name
    FROM profiles WHERE id = v_actor_id;
    
    SELECT role::TEXT INTO v_actor_role
    FROM user_roles WHERE user_id = v_actor_id LIMIT 1;
  END IF;
  
  INSERT INTO activity_stream (
    actor_id, actor_email, actor_name, actor_role,
    action, action_category, entity_type, entity_id, entity_name,
    description, metadata, severity
  ) VALUES (
    v_actor_id, v_actor_email, v_actor_name, v_actor_role,
    p_action, p_action_category, p_entity_type, p_entity_id, p_entity_name,
    p_description, p_metadata, p_severity
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;