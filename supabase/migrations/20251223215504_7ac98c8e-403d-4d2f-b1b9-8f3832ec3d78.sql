-- Create AI Agent Settings table for admin controls
CREATE TABLE public.ai_agent_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ai_agent_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write settings
CREATE POLICY "Admins can manage AI agent settings"
  ON public.ai_agent_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Insert default settings
INSERT INTO public.ai_agent_settings (setting_key, setting_value) VALUES
  ('auto_fix_enabled', '{"broken_links": false, "missing_images": false, "cache_cleanup": false, "webhook_retry": false}'::jsonb),
  ('scan_frequency', '{"value": "daily", "last_scheduled_scan": null, "next_scheduled_scan": null}'::jsonb),
  ('monitoring_active', '{"enabled": true, "paused_at": null, "paused_by": null}'::jsonb),
  ('alert_thresholds', '{"critical_immediate": true, "high_within_hour": true, "email_notifications": false}'::jsonb),
  ('scope_limitations', '{"can_modify_pricing": false, "can_approve_businesses": false, "can_issue_refunds": false, "can_modify_subscriptions": false}'::jsonb);

-- Create AI Agent Action Log for detailed audit trail
CREATE TABLE public.ai_agent_action_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL,
  action_status TEXT NOT NULL DEFAULT 'pending',
  description TEXT NOT NULL,
  affected_resource TEXT,
  affected_resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  requires_approval BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agent_action_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read action logs
CREATE POLICY "Admins can view AI agent action logs"
  ON public.ai_agent_action_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Admins can insert/update action logs
CREATE POLICY "Admins can manage AI agent action logs"
  ON public.ai_agent_action_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX idx_ai_agent_action_log_status ON public.ai_agent_action_log(action_status);
CREATE INDEX idx_ai_agent_action_log_created ON public.ai_agent_action_log(created_at DESC);