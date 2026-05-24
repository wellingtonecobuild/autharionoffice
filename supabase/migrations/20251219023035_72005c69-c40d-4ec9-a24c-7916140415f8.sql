
-- Create revenue transactions table (immutable record of all payments)
CREATE TABLE public.revenue_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text UNIQUE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  amount_nzd numeric NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('subscription', 'spotlight', 'manual')),
  subscription_tier text CHECK (subscription_tier IN ('premium', 'elite', 'spotlight', NULL)),
  business_id uuid REFERENCES public.businesses(id),
  business_name text NOT NULL,
  business_email text,
  stripe_invoice_id text,
  stripe_customer_id text,
  payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'failed', 'refunded', 'pending')),
  is_manual boolean NOT NULL DEFAULT false,
  manual_notes text,
  gst_amount numeric DEFAULT 0,
  recorded_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create financial audit logs table
CREATE TABLE public.financial_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text
);

-- Create company financial settings table
CREATE TABLE public.financial_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO public.financial_settings (key, value) VALUES
  ('company_name', '"Wellington EcoBuild"'),
  ('company_domain', '"wellingtonecobuild.nz"'),
  ('gst_enabled', 'false'),
  ('gst_rate', '0.15'),
  ('currency', '"NZD"');

-- Enable RLS
ALTER TABLE public.revenue_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only
CREATE POLICY "Admins can view revenue transactions" 
  ON public.revenue_transactions FOR SELECT 
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert revenue transactions" 
  ON public.revenue_transactions FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- No update/delete policies - transactions are immutable

CREATE POLICY "Admins can view audit logs" 
  ON public.financial_audit_logs FOR SELECT 
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs" 
  ON public.financial_audit_logs FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view financial settings" 
  ON public.financial_settings FOR SELECT 
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage financial settings" 
  ON public.financial_settings FOR ALL 
  USING (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_revenue_transactions_created_at ON public.revenue_transactions(created_at);
CREATE INDEX idx_revenue_transactions_payment_type ON public.revenue_transactions(payment_type);
CREATE INDEX idx_revenue_transactions_business_id ON public.revenue_transactions(business_id);
CREATE INDEX idx_financial_audit_logs_admin_id ON public.financial_audit_logs(admin_id);
CREATE INDEX idx_financial_audit_logs_created_at ON public.financial_audit_logs(created_at);
