-- =====================================================
-- WELLINGTON ECOBUILD INTERNAL PORTAL SYSTEM
-- Complete contractor/employee management with invoicing
-- =====================================================

-- Portal Users Table (Contractors and Employees)
CREATE TABLE public.portal_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  legal_full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('contractor', 'employee')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'inactive', 'suspended')),
  
  -- Contractor-specific fields
  ird_number TEXT,
  gst_registered BOOLEAN DEFAULT false,
  bank_account_number TEXT,
  hourly_rate DECIMAL(10,2),
  
  -- Employee-specific fields (future-ready)
  employment_type TEXT CHECK (employment_type IN ('full_time', 'part_time', 'casual')),
  paye_tax_code TEXT,
  kiwisaver_rate DECIMAL(5,2),
  start_date DATE,
  
  -- Profile completion
  profile_completed BOOLEAN DEFAULT false,
  profile_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  notes TEXT
);

-- Portal Invitations Table
CREATE TABLE public.portal_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('contractor', 'employee')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  portal_user_id UUID REFERENCES public.portal_users(id) ON DELETE SET NULL,
  
  -- Audit
  invited_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contractor Invoices Table
CREATE TABLE public.contractor_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  portal_user_id UUID NOT NULL REFERENCES public.portal_users(id) ON DELETE CASCADE,
  
  -- Invoice details
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  period_start DATE,
  period_end DATE,
  description TEXT,
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled')),
  
  -- PDF upload (optional)
  uploaded_pdf_path TEXT,
  
  -- Admin fields
  admin_notes TEXT,
  rejection_reason TEXT,
  
  -- Status timestamps
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID,
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID,
  
  -- Payment details
  payment_date DATE,
  payment_reference TEXT,
  payment_method TEXT,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Invoice Line Items
CREATE TABLE public.invoice_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.contractor_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date_of_service DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payment Records (Proof of Income)
CREATE TABLE public.portal_payment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_user_id UUID NOT NULL REFERENCES public.portal_users(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.contractor_invoices(id) ON DELETE SET NULL,
  
  -- Payment details
  payment_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  gst_amount DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  
  payment_reference TEXT,
  payment_method TEXT,
  description TEXT,
  
  -- For employees (payslips)
  is_payslip BOOLEAN DEFAULT false,
  gross_pay DECIMAL(10,2),
  paye_deducted DECIMAL(10,2),
  kiwisaver_employee DECIMAL(10,2),
  kiwisaver_employer DECIMAL(10,2),
  other_deductions DECIMAL(10,2),
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Portal Audit Log
CREATE TABLE public.portal_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_user_id UUID REFERENCES public.portal_users(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.contractor_invoices(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  performed_by UUID,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portal_users
CREATE POLICY "Admins can manage all portal users"
  ON public.portal_users FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Portal users can view own profile"
  ON public.portal_users FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Portal users can update own profile"
  ON public.portal_users FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for portal_invitations
CREATE POLICY "Admins can manage invitations"
  ON public.portal_invitations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Anyone can read their invitation by token"
  ON public.portal_invitations FOR SELECT
  USING (true);

-- RLS Policies for contractor_invoices
CREATE POLICY "Admins can manage all invoices"
  ON public.contractor_invoices FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Contractors can view own invoices"
  ON public.contractor_invoices FOR SELECT
  USING (
    portal_user_id IN (SELECT id FROM public.portal_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Contractors can create own invoices"
  ON public.contractor_invoices FOR INSERT
  WITH CHECK (
    portal_user_id IN (SELECT id FROM public.portal_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Contractors can update own draft invoices"
  ON public.contractor_invoices FOR UPDATE
  USING (
    portal_user_id IN (SELECT id FROM public.portal_users WHERE user_id = auth.uid())
    AND status = 'draft'
  );

-- RLS Policies for invoice_line_items
CREATE POLICY "Admins can manage all line items"
  ON public.invoice_line_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Contractors can manage own invoice line items"
  ON public.invoice_line_items FOR ALL
  USING (
    invoice_id IN (
      SELECT ci.id FROM public.contractor_invoices ci
      JOIN public.portal_users pu ON ci.portal_user_id = pu.id
      WHERE pu.user_id = auth.uid()
    )
  );

-- RLS Policies for portal_payment_records
CREATE POLICY "Admins can manage all payment records"
  ON public.portal_payment_records FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Portal users can view own payment records"
  ON public.portal_payment_records FOR SELECT
  USING (
    portal_user_id IN (SELECT id FROM public.portal_users WHERE user_id = auth.uid())
  );

-- RLS Policies for portal_audit_log
CREATE POLICY "Admins can view all audit logs"
  ON public.portal_audit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can create audit logs"
  ON public.portal_audit_log FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Indexes for performance
CREATE INDEX idx_portal_users_email ON public.portal_users(email);
CREATE INDEX idx_portal_users_status ON public.portal_users(status);
CREATE INDEX idx_portal_users_role ON public.portal_users(role);
CREATE INDEX idx_portal_invitations_token ON public.portal_invitations(token);
CREATE INDEX idx_portal_invitations_email ON public.portal_invitations(email);
CREATE INDEX idx_contractor_invoices_portal_user ON public.contractor_invoices(portal_user_id);
CREATE INDEX idx_contractor_invoices_status ON public.contractor_invoices(status);
CREATE INDEX idx_contractor_invoices_invoice_date ON public.contractor_invoices(invoice_date);
CREATE INDEX idx_invoice_line_items_invoice ON public.invoice_line_items(invoice_id);
CREATE INDEX idx_portal_payment_records_portal_user ON public.portal_payment_records(portal_user_id);
CREATE INDEX idx_portal_payment_records_date ON public.portal_payment_records(payment_date);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_portal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_portal_users_updated_at
  BEFORE UPDATE ON public.portal_users
  FOR EACH ROW EXECUTE FUNCTION public.update_portal_updated_at();

CREATE TRIGGER update_contractor_invoices_updated_at
  BEFORE UPDATE ON public.contractor_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_portal_updated_at();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.contractor_invoices
  WHERE invoice_number LIKE year_prefix || '%';
  
  RETURN year_prefix || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to calculate invoice totals
CREATE OR REPLACE FUNCTION public.calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  item_total DECIMAL(10,2);
  gst_rate DECIMAL(5,2);
  portal_user_gst BOOLEAN;
BEGIN
  -- Get subtotal from line items
  SELECT COALESCE(SUM(amount), 0) INTO item_total
  FROM public.invoice_line_items
  WHERE invoice_id = COALESCE(NEW.id, OLD.id);
  
  -- Check if portal user is GST registered
  SELECT gst_registered INTO portal_user_gst
  FROM public.portal_users
  WHERE id = NEW.portal_user_id;
  
  -- Calculate GST (15% in NZ)
  IF portal_user_gst THEN
    gst_rate := 0.15;
  ELSE
    gst_rate := 0;
  END IF;
  
  NEW.subtotal := item_total;
  NEW.gst_amount := ROUND(item_total * gst_rate, 2);
  NEW.total_amount := item_total + NEW.gst_amount;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;