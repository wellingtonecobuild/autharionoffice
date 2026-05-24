// Wellington EcoBuild Internal Portal - Generate Invoice PDF
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BRAND } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeneratePDFRequest {
  invoiceId: string;
  type: "invoice" | "payment_summary";
  portalUserId?: string;
  startDate?: string;
  endDate?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { invoiceId, type, portalUserId, startDate, endDate }: GeneratePDFRequest = await req.json();

    console.log(`[Generate PDF] Type: ${type}, Invoice: ${invoiceId || 'N/A'}`);

    let htmlContent = "";

    if (type === "invoice" && invoiceId) {
      // Get invoice with line items and portal user
      const { data: invoice, error } = await supabase
        .from("contractor_invoices")
        .select(`
          *,
          portal_user:portal_users(*),
          line_items:invoice_line_items(*)
        `)
        .eq("id", invoiceId)
        .single();

      if (error || !invoice) {
        throw new Error("Invoice not found");
      }

      const portalUser = invoice.portal_user;
      const lineItems = invoice.line_items || [];

      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1A1A1A; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 3px solid ${BRAND.colors.primary}; padding-bottom: 20px; }
    .logo { max-width: 180px; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { color: ${BRAND.colors.primary}; font-size: 28px; margin-bottom: 8px; }
    .invoice-title .number { font-size: 18px; color: #666; }
    .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info-box { width: 48%; }
    .info-box h3 { color: ${BRAND.colors.primary}; font-size: 14px; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; }
    .info-box p { font-size: 14px; margin-bottom: 4px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .table th { background: ${BRAND.colors.primary}; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
    .table td { padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 14px; }
    .table .amount { text-align: right; }
    .totals { width: 300px; margin-left: auto; }
    .totals .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E5E7EB; }
    .totals .row.total { font-weight: bold; font-size: 18px; color: ${BRAND.colors.primary}; border-top: 2px solid ${BRAND.colors.primary}; border-bottom: none; padding-top: 12px; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .status-paid { background: #DCFCE7; color: #166534; }
    .status-approved { background: #DBEAFE; color: #1E40AF; }
    .status-submitted { background: #FEF3C7; color: #92400E; }
    .status-draft { background: #F3F4F6; color: #4B5563; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; color: #666; font-size: 12px; }
    .payment-info { background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .payment-info h3 { color: ${BRAND.colors.primary}; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <img src="${BRAND.logoUrl}" alt="${BRAND.name}" class="logo">
      <p style="margin-top: 8px; color: #666; font-size: 14px;">${BRAND.tagline}</p>
    </div>
    <div class="invoice-title">
      <h1>INVOICE</h1>
      <p class="number">${invoice.invoice_number}</p>
      <p style="margin-top: 8px;"><span class="status status-${invoice.status}">${invoice.status}</span></p>
    </div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h3>From</h3>
      <p><strong>${portalUser.legal_full_name || 'Contractor'}</strong></p>
      <p>${portalUser.email}</p>
      ${portalUser.ird_number ? `<p>IRD: ${portalUser.ird_number}</p>` : ''}
      ${portalUser.gst_registered ? `<p>GST Registered: Yes</p>` : ''}
    </div>
    <div class="info-box">
      <h3>Bill To</h3>
      <p><strong>${BRAND.name}</strong></p>
      <p>${BRAND.email}</p>
      <p>${BRAND.website}</p>
    </div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h3>Invoice Details</h3>
      <p><strong>Invoice Date:</strong> ${invoice.invoice_date}</p>
      ${invoice.due_date ? `<p><strong>Due Date:</strong> ${invoice.due_date}</p>` : ''}
      ${invoice.period_start && invoice.period_end ? `<p><strong>Period:</strong> ${invoice.period_start} - ${invoice.period_end}</p>` : ''}
    </div>
    ${invoice.status === 'paid' ? `
    <div class="info-box">
      <h3>Payment Details</h3>
      <p><strong>Payment Date:</strong> ${invoice.payment_date || 'N/A'}</p>
      ${invoice.payment_reference ? `<p><strong>Reference:</strong> ${invoice.payment_reference}</p>` : ''}
    </div>
    ` : ''}
  </div>

  ${invoice.description ? `<p style="margin-bottom: 20px;"><strong>Description:</strong> ${invoice.description}</p>` : ''}

  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Date</th>
        <th>Qty</th>
        <th>Rate</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItems.map((item: any) => `
        <tr>
          <td>${item.description}</td>
          <td>${item.date_of_service || '-'}</td>
          <td>${item.quantity}</td>
          <td>$${Number(item.unit_price).toFixed(2)}</td>
          <td class="amount">$${Number(item.amount).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="row">
      <span>Subtotal</span>
      <span>$${Number(invoice.subtotal).toFixed(2)}</span>
    </div>
    ${portalUser.gst_registered ? `
    <div class="row">
      <span>GST (15%)</span>
      <span>$${Number(invoice.gst_amount).toFixed(2)}</span>
    </div>
    ` : ''}
    <div class="row total">
      <span>Total</span>
      <span>$${Number(invoice.total_amount).toFixed(2)}</span>
    </div>
  </div>

  ${portalUser.bank_account_number ? `
  <div class="payment-info">
    <h3>Payment Details</h3>
    <p><strong>Bank Account:</strong> ${portalUser.bank_account_number}</p>
    <p><strong>Account Name:</strong> ${portalUser.legal_full_name || 'Contractor'}</p>
    <p><strong>Reference:</strong> ${invoice.invoice_number}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p><strong>${BRAND.name}</strong></p>
    <p>${BRAND.website} | ${BRAND.email}</p>
    <p style="margin-top: 8px;">This document serves as an official tax invoice for services rendered.</p>
  </div>
</body>
</html>
      `;
    } else if (type === "payment_summary" && portalUserId) {
      // Get payment records for the portal user
      const query = supabase
        .from("portal_payment_records")
        .select(`
          *,
          invoice:contractor_invoices(invoice_number)
        `)
        .eq("portal_user_id", portalUserId)
        .order("payment_date", { ascending: false });

      if (startDate) query.gte("payment_date", startDate);
      if (endDate) query.lte("payment_date", endDate);

      const { data: payments, error: paymentsError } = await query;

      if (paymentsError) throw paymentsError;

      // Get portal user
      const { data: portalUser } = await supabase
        .from("portal_users")
        .select("*")
        .eq("id", portalUserId)
        .single();

      const totalAmount = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalGST = payments?.reduce((sum, p) => sum + Number(p.gst_amount || 0), 0) || 0;

      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Summary - ${portalUser?.legal_full_name || 'Contractor'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1A1A1A; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 3px solid ${BRAND.colors.primary}; padding-bottom: 20px; }
    .logo { max-width: 180px; }
    .title { text-align: right; }
    .title h1 { color: ${BRAND.colors.primary}; font-size: 24px; margin-bottom: 8px; }
    .info-box { background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .info-box h3 { color: ${BRAND.colors.primary}; margin-bottom: 12px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .table th { background: ${BRAND.colors.primary}; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
    .table td { padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 14px; }
    .table .amount { text-align: right; }
    .summary { background: ${BRAND.colors.primary}; color: white; padding: 20px; border-radius: 8px; }
    .summary h3 { margin-bottom: 12px; }
    .summary .row { display: flex; justify-content: space-between; padding: 4px 0; }
    .summary .row.total { font-size: 20px; font-weight: bold; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 12px; margin-top: 8px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; color: #666; font-size: 12px; }
    .proof-notice { background: #DCFCE7; color: #166534; padding: 16px; border-radius: 8px; margin-bottom: 30px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <img src="${BRAND.logoUrl}" alt="${BRAND.name}" class="logo">
    </div>
    <div class="title">
      <h1>PAYMENT SUMMARY</h1>
      <p style="color: #666;">Proof of Income Statement</p>
      <p style="color: #666; font-size: 14px;">Generated: ${new Date().toLocaleDateString('en-NZ')}</p>
    </div>
  </div>

  <div class="proof-notice">
    <strong>Official Proof of Income Document</strong><br>
    This document confirms payments made by ${BRAND.name} to the contractor listed below.
  </div>

  <div class="info-box">
    <h3>Contractor Details</h3>
    <p><strong>Name:</strong> ${portalUser?.legal_full_name || 'N/A'}</p>
    <p><strong>Email:</strong> ${portalUser?.email || 'N/A'}</p>
    ${portalUser?.ird_number ? `<p><strong>IRD Number:</strong> ${portalUser.ird_number}</p>` : ''}
    ${startDate && endDate ? `<p><strong>Period:</strong> ${startDate} to ${endDate}</p>` : ''}
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Invoice</th>
        <th>Description</th>
        <th>Reference</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${payments?.map((p: any) => `
        <tr>
          <td>${p.payment_date}</td>
          <td>${p.invoice?.invoice_number || '-'}</td>
          <td>${p.description || '-'}</td>
          <td>${p.payment_reference || '-'}</td>
          <td class="amount">$${Number(p.amount).toFixed(2)}</td>
        </tr>
      `).join('') || '<tr><td colspan="5">No payments found</td></tr>'}
    </tbody>
  </table>

  <div class="summary">
    <h3>Payment Summary</h3>
    <div class="row">
      <span>Total Payments</span>
      <span>${payments?.length || 0}</span>
    </div>
    <div class="row">
      <span>Total GST Included</span>
      <span>$${totalGST.toFixed(2)}</span>
    </div>
    <div class="row total">
      <span>Total Amount Paid</span>
      <span>$${totalAmount.toFixed(2)}</span>
    </div>
  </div>

  <div class="footer">
    <p><strong>${BRAND.name}</strong></p>
    <p>${BRAND.website} | ${BRAND.email}</p>
    <p style="margin-top: 8px;">This document is issued as proof of income for the contractor listed above.</p>
    <p style="margin-top: 4px;">For verification, please contact ${BRAND.email}</p>
  </div>
</body>
</html>
      `;
    } else {
      throw new Error("Invalid request parameters");
    }

    console.log(`[Generate PDF] Generated HTML content for ${type}`);

    // Return HTML - the frontend will use html2pdf or similar to convert
    return new Response(
      JSON.stringify({ 
        success: true, 
        html: htmlContent 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Generate PDF] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
