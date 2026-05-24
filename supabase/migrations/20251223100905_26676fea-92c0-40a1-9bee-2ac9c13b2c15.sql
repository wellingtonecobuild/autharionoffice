-- Admin Assistant Scans - stores each scan run
CREATE TABLE public.admin_assistant_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_type TEXT NOT NULL DEFAULT 'full', -- 'full', 'links', 'forms', 'payments', 'security', 'qa'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  triggered_by UUID REFERENCES auth.users(id),
  summary JSONB DEFAULT '{}'::jsonb, -- Quick stats: issues_found, warnings, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Admin Assistant Issues - stores detected issues
CREATE TABLE public.admin_assistant_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID REFERENCES public.admin_assistant_scans(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'broken_link', 'failed_form', 'payment_error', 'missing_image', 'subscription_mismatch', 'performance', 'security'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low', 'info'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_resource TEXT, -- URL, table name, function name, etc.
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'acknowledged', 'resolved', 'ignored'
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Admin Assistant Fix Recommendations - stores AI-generated fix suggestions
CREATE TABLE public.admin_assistant_fixes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES public.admin_assistant_issues(id) ON DELETE CASCADE,
  recommendation TEXT NOT NULL,
  fix_type TEXT NOT NULL, -- 'automatic', 'manual', 'investigation_required'
  fix_details JSONB DEFAULT '{}'::jsonb, -- Steps, code changes, etc.
  estimated_effort TEXT, -- 'minutes', 'hours', 'days'
  approval_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'applied'
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  applied_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_assistant_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_assistant_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_assistant_fixes ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only
CREATE POLICY "Admins can manage scans" ON public.admin_assistant_scans
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage issues" ON public.admin_assistant_issues
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage fixes" ON public.admin_assistant_fixes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for faster queries
CREATE INDEX idx_issues_scan_id ON public.admin_assistant_issues(scan_id);
CREATE INDEX idx_issues_status ON public.admin_assistant_issues(status);
CREATE INDEX idx_issues_severity ON public.admin_assistant_issues(severity);
CREATE INDEX idx_fixes_issue_id ON public.admin_assistant_fixes(issue_id);
CREATE INDEX idx_fixes_approval ON public.admin_assistant_fixes(approval_status);