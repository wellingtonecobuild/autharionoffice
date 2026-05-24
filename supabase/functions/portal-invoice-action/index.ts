// Wellington EcoBuild Internal Portal - Invoice Actions
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BRAND, createEmailWrapper, createButton, createHighlightBox } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceActionRequest {
  invoiceId: string;
  action: "submit" | "approve" | "reject" | "mark_paid";
  adminId?: string;
  rejectionReason?: string;
  paymentReference?: string;
  paymentDate?: string;
  adminNotes?: string;
}

const sendEmailViaGmail = async (
  gmailUser: string,
  gmailPassword: string,
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> => {
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: {
        username: gmailUser,
        password: gmailPassword,
      },
    },
  });

  await client.send({
    from: `${BRAND.name} <${gmailUser}>`,
    to: to,
    replyTo: BRAND.email,
    subject: subject,
    mimeContent: [
      {
        mimeType: 'text/html; charset="utf-8"',
        content: htmlContent,
        transferEncoding: "8bit",
      },
    ],
  });

  await client.close();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { 
      invoiceId, 
      action, 
      adminId, 
      rejectionReason, 
      paymentReference, 
      paymentDate,
      adminNotes 
    }: InvoiceActionRequest = await req.json();

    console.log(`[Invoice Action] Processing ${action} for invoice ${invoiceId}`);

    // Get invoice with portal user details
    const { data: invoice, error: invoiceError } = await supabase
      .from("contractor_invoices")
      .select(`
        *,
        portal_user:portal_users(*)
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error("Invoice not found");
    }

    const portalUser = invoice.portal_user;
    let updateData: any = {};
    let emailSubject = "";
    let emailContent = "";
    let newStatus = invoice.status;

    switch (action) {
      case "submit":
        if (invoice.status !== "draft") {
          throw new Error("Only draft invoices can be submitted");
        }
        newStatus = "submitted";
        updateData = {
          status: "submitted",
          submitted_at: new Date().toISOString(),
        };
        
        emailSubject = `Invoice ${invoice.invoice_number} Submitted`;
        emailContent = `
          <h2 style="color: ${BRAND.colors.primary}; font-size: 24px; margin: 0 0 16px 0;">
            Invoice Submitted Successfully
          </h2>
          <p style="font-size: 16px; color: ${BRAND.colors.text};">
            Your invoice <strong>${invoice.invoice_number}</strong> has been submitted for review.
          </p>
          ${createHighlightBox(`
            <p style="margin: 0;"><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
            <p style="margin: 4px 0 0 0;"><strong>Total Amount:</strong> $${invoice.total_amount?.toFixed(2) || '0.00'}</p>
            <p style="margin: 4px 0 0 0;"><strong>Status:</strong> Pending Review</p>
          `)}
          <p style="color: ${BRAND.colors.muted}; margin-top: 16px;">
            We will review your invoice and notify you once it's been processed.
          </p>
        `;
        break;

      case "approve":
        if (invoice.status !== "submitted") {
          throw new Error("Only submitted invoices can be approved");
        }
        newStatus = "approved";
        updateData = {
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: adminId,
          admin_notes: adminNotes || invoice.admin_notes,
        };
        
        emailSubject = `✓ Invoice ${invoice.invoice_number} Approved - Wellington EcoBuild`;
        emailContent = `
          <h2 style="color: #22C55E; font-size: 24px; margin: 0 0 16px 0;">
            ✓ Invoice Approved
          </h2>
          <p style="font-size: 16px; color: ${BRAND.colors.text};">
            Great news! Your invoice <strong>${invoice.invoice_number}</strong> has been approved.
          </p>
          ${createHighlightBox(`
            <p style="margin: 0;"><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
            <p style="margin: 4px 0 0 0;"><strong>Total Amount:</strong> $${invoice.total_amount?.toFixed(2) || '0.00'}</p>
            <p style="margin: 4px 0 0 0;"><strong>Status:</strong> ✓ Approved - Awaiting Payment</p>
          `, '#22C55E')}
          <p style="color: ${BRAND.colors.muted}; margin-top: 16px;">
            Payment will be processed according to our standard payment schedule. You will receive another notification once payment is complete.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            ${createButton("View in Portal", "https://wellingtonecobuild.nz/portal/invoices")}
          </div>
        `;
        break;

      case "reject":
        if (invoice.status !== "submitted") {
          throw new Error("Only submitted invoices can be rejected");
        }
        newStatus = "rejected";
        updateData = {
          status: "rejected",
          rejected_at: new Date().toISOString(),
          rejected_by: adminId,
          rejection_reason: rejectionReason,
          admin_notes: adminNotes || invoice.admin_notes,
        };
        
        emailSubject = `Action Required: Invoice ${invoice.invoice_number} Requires Revision`;
        emailContent = `
          <h2 style="color: #EF4444; font-size: 24px; margin: 0 0 16px 0;">
            ⚠️ Invoice Requires Revision
          </h2>
          <p style="font-size: 16px; color: ${BRAND.colors.text};">
            Your invoice <strong>${invoice.invoice_number}</strong> requires some changes before it can be approved.
          </p>
          ${createHighlightBox(`
            <p style="margin: 0; font-weight: 600;">Reason for Revision:</p>
            <p style="margin: 8px 0 0 0;">${rejectionReason || 'Please contact admin for details.'}</p>
          `, '#EF4444')}
          <p style="margin-top: 16px;">
            Please review the feedback above, update your invoice accordingly, and resubmit it for review.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            ${createButton("Edit & Resubmit Invoice", "https://wellingtonecobuild.nz/portal/invoices")}
          </div>
          <p style="font-size: 13px; color: ${BRAND.colors.muted}; margin-top: 16px;">
            If you have any questions about the required changes, please contact us at ${BRAND.email}
          </p>
        `;
        break;

      case "mark_paid":
        if (invoice.status !== "approved") {
          throw new Error("Only approved invoices can be marked as paid");
        }
        newStatus = "paid";
        const pDate = paymentDate || new Date().toISOString().split('T')[0];
        updateData = {
          status: "paid",
          paid_at: new Date().toISOString(),
          paid_by: adminId,
          payment_date: pDate,
          payment_reference: paymentReference,
          admin_notes: adminNotes || invoice.admin_notes,
        };

        // Create payment record
        await supabase.from("portal_payment_records").insert({
          portal_user_id: portalUser.id,
          invoice_id: invoiceId,
          payment_date: pDate,
          amount: invoice.total_amount,
          gst_amount: invoice.gst_amount,
          net_amount: invoice.subtotal,
          payment_reference: paymentReference,
          description: `Payment for Invoice ${invoice.invoice_number}`,
          created_by: adminId,
        });
        
        emailSubject = `💰 Payment Processed - Invoice ${invoice.invoice_number}`;
        
        // Format dates for IRD compliance
        const formattedPaymentDate = new Date(pDate).toLocaleDateString('en-NZ', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
        const invoicePeriodStart = invoice.period_start ? new Date(invoice.period_start).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
        const invoicePeriodEnd = invoice.period_end ? new Date(invoice.period_end).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
        const periodDisplay = invoicePeriodStart && invoicePeriodEnd ? `${invoicePeriodStart} - ${invoicePeriodEnd}` : 'As per invoice';
        
        emailContent = `
          <!-- Official Payment Remittance Advice -->
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); color: #047857; font-size: 11px; font-weight: 600; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #A7F3D0;">
              Official Payment Remittance Advice
            </span>
          </div>
          
          <h2 style="color: #22C55E; font-size: 24px; margin: 0 0 16px 0; text-align: center;">
            💰 Payment Confirmed
          </h2>
          
          <p style="font-size: 16px; color: ${BRAND.colors.text}; text-align: center; margin-bottom: 8px;">
            Payment has been processed for your invoice <strong>${invoice.invoice_number}</strong>.
          </p>
          <p style="font-size: 14px; color: #6B7280; text-align: center; margin-bottom: 24px;">
            Funds should arrive in your nominated bank account within <strong>48 hours</strong>, unless there are delays from your bank.
          </p>

          <!-- IRD Compliant Payment Details -->
          <div style="background: #FFFFFF; border: 2px solid #22C55E; border-radius: 12px; overflow: hidden; margin: 24px 0;">
            <div style="background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%); padding: 12px 20px;">
              <p style="margin: 0; color: #FFFFFF; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                📄 Payment Summary for Tax Records
              </p>
            </div>
            <div style="padding: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280;">Invoice Number</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 600; color: #111827; font-family: monospace;">${invoice.invoice_number}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280;">Service Period</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 500; color: #111827;">${periodDisplay}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280;">Subtotal (excl. GST)</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 500; color: #111827;">$${invoice.subtotal?.toFixed(2) || '0.00'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280;">GST (15%)</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 500; color: #111827;">$${invoice.gst_amount?.toFixed(2) || '0.00'}</td>
                </tr>
                <tr style="background-color: #F0FDF4;">
                  <td style="padding: 14px 10px; color: #047857; font-weight: 700; font-size: 15px;">Total Amount Paid</td>
                  <td style="padding: 14px 10px; text-align: right; font-weight: 700; color: #22C55E; font-size: 20px;">$${invoice.total_amount?.toFixed(2) || '0.00'} NZD</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280;">Payment Date</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 600; color: #111827;">${formattedPaymentDate}</td>
                </tr>
                ${paymentReference ? `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280;">Payment Reference</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; text-align: right; font-family: monospace; font-weight: 500; color: #111827;">${paymentReference}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 10px 0; color: #6B7280;">Payer</td>
                  <td style="padding: 10px 0; text-align: right; font-weight: 500; color: #111827;">${BRAND.name}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Payee Details for IRD -->
          <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; font-weight: 700; color: #111827; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
              👤 Payee Details
            </p>
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #6B7280; width: 40%;">Legal Name</td>
                <td style="padding: 6px 0; color: #111827; font-weight: 500;">${portalUser.legal_full_name || portalUser.email}</td>
              </tr>
              ${portalUser.trading_name ? `
              <tr>
                <td style="padding: 6px 0; color: #6B7280;">Trading As</td>
                <td style="padding: 6px 0; color: #111827; font-weight: 500;">${portalUser.trading_name}</td>
              </tr>
              ` : ''}
              ${portalUser.ird_number ? `
              <tr>
                <td style="padding: 6px 0; color: #6B7280;">IRD Number</td>
                <td style="padding: 6px 0; color: #111827; font-weight: 500; font-family: monospace;">${portalUser.ird_number}</td>
              </tr>
              ` : ''}
              ${portalUser.gst_number ? `
              <tr>
                <td style="padding: 6px 0; color: #6B7280;">GST Number</td>
                <td style="padding: 6px 0; color: #111827; font-weight: 500; font-family: monospace;">${portalUser.gst_number}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- Important Notice -->
          <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border: 1px solid #F59E0B; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-weight: 700; color: #92400E; font-size: 14px;">
              📋 Important: Keep This for Your Records
            </p>
            <p style="margin: 0; color: #78350F; font-size: 13px; line-height: 1.6;">
              This payment confirmation serves as an official remittance advice. As an independent contractor, you are responsible for declaring this income to the IRD in your annual tax return. We recommend downloading your full payment history from the portal for your records.
            </p>
          </div>

          <p style="margin-top: 16px; text-align: center; color: ${BRAND.colors.muted}; font-size: 14px;">
            This payment record is now available in your portal for download as proof of income for IRD or other purposes.
          </p>
          
          <div style="text-align: center; margin: 24px 0;">
            ${createButton("Download Payment Records", "https://wellingtonecobuild.nz/portal/payments")}
          </div>
        `;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Update invoice
    const { error: updateError } = await supabase
      .from("contractor_invoices")
      .update(updateData)
      .eq("id", invoiceId);

    if (updateError) {
      console.error("[Invoice Action] Update error:", updateError);
      throw updateError;
    }

    // Log the action
    await supabase.from("portal_audit_log").insert({
      portal_user_id: portalUser.id,
      invoice_id: invoiceId,
      action: `invoice_${action}`,
      old_value: { status: invoice.status },
      new_value: { status: newStatus, ...updateData },
      performed_by: adminId || portalUser.user_id,
    });

    // Send notification email via Gmail
    if (gmailUser && gmailPassword && portalUser.email) {
      try {
        const htmlEmail = createEmailWrapper(emailContent, emailSubject);
        
        await sendEmailViaGmail(gmailUser, gmailPassword, portalUser.email, emailSubject, htmlEmail);
        console.log(`[Invoice Action] Email sent to ${portalUser.email} for action: ${action}`);

        await supabase.from("email_logs").insert({
          email_type: `invoice_${action}`,
          to_email: portalUser.email,
          subject: emailSubject,
          status: "sent",
          sent_by: adminId,
          metadata: { invoice_id: invoiceId, action },
        });
      } catch (emailError) {
        console.error("[Invoice Action] Email error:", emailError);
        // Log failed email attempt
        await supabase.from("email_logs").insert({
          email_type: `invoice_${action}`,
          to_email: portalUser.email,
          subject: emailSubject,
          status: "failed",
          error_message: emailError instanceof Error ? emailError.message : String(emailError),
          sent_by: adminId,
          metadata: { invoice_id: invoiceId, action },
        });
        // Don't fail the action if email fails
      }
    } else {
      console.warn("[Invoice Action] Gmail credentials not configured, skipping email notification");
    }

    // If invoice submitted, notify admin
    if (action === "submit" && gmailUser && gmailPassword) {
      try {
        const adminEmailContent = `
          <h2 style="color: ${BRAND.colors.primary}; font-size: 24px; margin: 0 0 16px 0;">
            📋 New Invoice Submitted
          </h2>
          <p style="font-size: 16px; color: ${BRAND.colors.text};">
            A new invoice requires your review.
          </p>
          ${createHighlightBox(`
            <p style="margin: 0;"><strong>Contractor:</strong> ${portalUser.legal_full_name || portalUser.email}</p>
            <p style="margin: 4px 0 0 0;"><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
            <p style="margin: 4px 0 0 0;"><strong>Total Amount:</strong> $${invoice.total_amount?.toFixed(2) || '0.00'}</p>
          `)}
          <div style="text-align: center; margin: 24px 0;">
            ${createButton("Review Invoice", "https://wellingtonecobuild.nz/admin/portal/invoices")}
          </div>
        `;

        const adminHtmlEmail = createEmailWrapper(adminEmailContent, "New Invoice Submitted");
        await sendEmailViaGmail(gmailUser, gmailPassword, BRAND.email, `New Invoice Submitted - ${invoice.invoice_number}`, adminHtmlEmail);
        console.log("[Invoice Action] Admin notification sent");
      } catch (emailError) {
        console.error("[Invoice Action] Admin notification error:", emailError);
      }
    }

    console.log(`[Invoice Action] Successfully processed ${action} for invoice ${invoiceId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invoice ${action} completed`,
        newStatus 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Invoice Action] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
