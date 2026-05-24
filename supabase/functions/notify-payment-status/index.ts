import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SINGLE EMAIL SYSTEM - All communications use info@wellingtonecobuild.nz
const PRIMARY_EMAIL = "info@wellingtonecobuild.nz";
const COMPANY_NAME = "Wellington EcoBuild";
const COMPANY_LOGO = "https://duumxykzcliujgyrmzvn.supabase.co/storage/v1/object/public/avatars/wellington-ecobuild-logo-PQDk3oCl.png";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NOTIFY-PAYMENT-STATUS] ${step}${detailsStr}`);
};

interface RefundDetails {
  refundId: string;
  amount: number;
  status: string;
  paymentMethod: string;
}

interface PaymentStatusRequest {
  businessId: string;
  status: "payment_received" | "approved" | "declined" | "resubmission_required" | "resubmitted";
  businessName: string;
  businessEmail: string;
  plan: string;
  amount: number;
  notes?: string;
  transactionId?: string;
  paymentDate?: string;
  refundDetails?: RefundDetails;
}

// Shared email styles and header with logo
const getEmailStyles = () => `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
  .wrapper { padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
  .logo-header { background: linear-gradient(135deg, #2D5A3D 0%, #1E3D2A 100%); padding: 24px; text-align: center; }
  .logo { max-width: 180px; height: auto; }
  .header { padding: 24px 30px 0 30px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; color: #333; }
  .content { padding: 30px; }
  .receipt { background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px; }
  .receipt-header { border-bottom: 2px solid #2D5A3D; padding-bottom: 15px; margin-bottom: 15px; }
  .receipt-header h2 { margin: 0; color: #2D5A3D; }
  .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
  .receipt-row:last-child { border-bottom: none; }
  .receipt-total { font-size: 18px; font-weight: bold; color: #2D5A3D; background: #dcfce7; margin-top: 10px; padding: 15px; border-radius: 8px; }
  .highlight { background: #dcfce7; border-left: 4px solid #2D5A3D; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
  .success-box { background: #dcfce7; border: 2px solid #2D5A3D; padding: 20px; margin: 20px 0; border-radius: 12px; text-align: center; }
  .success-box h2 { color: #2D5A3D; margin: 0 0 10px 0; }
  .refund-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 12px; }
  .refund-box h3 { color: #b45309; margin: 0 0 10px 0; }
  .refund-receipt { background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px; }
  .reason-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
  .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
  .safe-box { background: #dcfce7; border: 1px solid #2D5A3D; padding: 15px; margin: 20px 0; border-radius: 8px; }
  .status-box { background: #dbeafe; border: 2px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 12px; text-align: center; }
  .status-box h2 { color: #1d4ed8; margin: 0 0 10px 0; }
  .btn { display: inline-block; background: #2D5A3D; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px; }
  .btn-warning { background: #f59e0b; }
  .btn-blue { background: #3b82f6; }
  .footer { background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb; }
  .footer-brand { font-size: 16px; font-weight: 600; color: #2D5A3D; margin: 0 0 4px 0; }
  .footer-tagline { font-size: 14px; color: #6b7280; margin: 0 0 12px 0; }
  .footer-email { font-size: 14px; color: #2D5A3D; text-decoration: none; }
  .footer-legal { font-size: 12px; color: #9CA3AF; margin-top: 16px; }
`;

const wrapEmail = (headerIcon: string, headerText: string, headerBgColor: string, bodyContent: string) => `
  <!DOCTYPE html>
  <html>
  <head>
    <style>${getEmailStyles()}</style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="logo-header">
          <img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" class="logo" />
        </div>
        <div class="header" style="background: ${headerBgColor}; padding: 24px;">
          <h1 style="color: white; margin: 0;">${headerIcon} ${headerText}</h1>
        </div>
        <div class="content">
          ${bodyContent}
        </div>
        <div class="footer">
          <p class="footer-brand">${COMPANY_NAME}</p>
          <p class="footer-tagline">Wellington's Trusted Network for Sustainable Construction</p>
          <a href="mailto:${PRIMARY_EMAIL}" class="footer-email">${PRIMARY_EMAIL}</a>
          <p class="footer-legal">&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
  </html>
`;

const getEmailContent = (data: PaymentStatusRequest) => {
  const { status, businessName, plan, amount, notes, transactionId, paymentDate, refundDetails } = data;
  const planDisplay = plan.charAt(0).toUpperCase() + plan.slice(1);
  const amountDisplay = `$${amount?.toFixed(2) || "0.00"} NZD`;
  const gstAmount = (amount * 0.15).toFixed(2);
  const amountExGst = (amount * 0.85).toFixed(2);
  const dateDisplay = paymentDate ? new Date(paymentDate).toLocaleDateString('en-NZ', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  }) : new Date().toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' });
  const txnId = transactionId || `WEB-${Date.now()}`;

  switch (status) {
    case "payment_received":
      return {
        subject: "Payment Received - Receipt & Verification in Progress",
        html: wrapEmail("✓", "Payment Received", "linear-gradient(135deg, #16a34a, #15803d)", `
          <p>Dear ${businessName},</p>
          <p>Thank you for your payment! We've received your subscription payment and your application is now under review.</p>
          
          <div class="receipt">
            <div class="receipt-header">
              <h2>Receipt / Tax Invoice</h2>
              <p style="margin: 5px 0; color: #666;">${COMPANY_NAME}</p>
              <p style="margin: 5px 0; color: #666; font-size: 12px;">${PRIMARY_EMAIL}</p>
            </div>
            <div class="receipt-row">
              <span>Transaction ID:</span>
              <span><strong>${txnId}</strong></span>
            </div>
            <div class="receipt-row">
              <span>Date:</span>
              <span>${dateDisplay}</span>
            </div>
            <div class="receipt-row">
              <span>Plan:</span>
              <span>${planDisplay} Monthly Subscription</span>
            </div>
            <div class="receipt-row">
              <span>Amount (excl. GST):</span>
              <span>$${amountExGst} NZD</span>
            </div>
            <div class="receipt-row">
              <span>GST (15%):</span>
              <span>$${gstAmount} NZD</span>
            </div>
            <div class="receipt-total">
              <div style="display: flex; justify-content: space-between;">
                <span>Total (incl. GST):</span>
                <span>${amountDisplay}</span>
              </div>
            </div>
          </div>
          
          <div class="highlight">
            <p><strong>Status:</strong> Payment Held - Verification in Progress</p>
            <p style="margin-bottom: 0;">Your payment is securely held until verification is complete.</p>
          </div>
          
          <p><strong>What happens next?</strong></p>
          <ul>
            <li>Our team will review your application and documents</li>
            <li>You'll receive an email once your listing is approved</li>
            <li>If we need additional information, we'll reach out</li>
          </ul>
        `),
      };

    case "approved":
      return {
        subject: "Congratulations! Your Business is Now Live",
        html: wrapEmail("🎉", "You're Approved!", "linear-gradient(135deg, #16a34a, #15803d)", `
          <p>Dear ${businessName},</p>
          
          <div class="success-box">
            <h2>Your Business is Now Live!</h2>
            <p>Your ${planDisplay} subscription is active and your listing is visible to customers.</p>
            <p><strong>Amount Charged:</strong> ${amountDisplay}</p>
          </div>
          
          <p><strong>What you can do now:</strong></p>
          <ul>
            <li>View your live listing on Wellington EcoBuild</li>
            <li>Access your business dashboard to manage leads</li>
            <li>Respond to customer inquiries</li>
            <li>Update your business information anytime</li>
          </ul>
          
          <p style="text-align: center;">
            <a href="https://wellingtonecobuild.nz/dashboard" class="btn">Go to Dashboard</a>
          </p>
        `),
      };

    case "declined":
      // Build refund receipt section if refund was processed
      const refundReceiptHtml = refundDetails ? `
        <div class="refund-receipt">
          <h3 style="color: #2D5A3D; margin: 0 0 15px 0;">✓ Refund Receipt</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px 0; color: #666;">Refund ID:</td>
              <td style="padding: 10px 0; text-align: right;"><strong>${refundDetails.refundId}</strong></td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px 0; color: #666;">Refund Date:</td>
              <td style="padding: 10px 0; text-align: right;">${dateDisplay}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px 0; color: #666;">Refund Amount:</td>
              <td style="padding: 10px 0; text-align: right;"><strong>$${refundDetails.amount.toFixed(2)} NZD</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #666;">Refunded To:</td>
              <td style="padding: 10px 0; text-align: right;">Original payment method</td>
            </tr>
          </table>
        </div>
      ` : '';

      return {
        subject: "Application Update - Full Refund Processed",
        html: wrapEmail("", "Application Update", "linear-gradient(135deg, #dc2626, #b91c1c)", `
          <p>Dear ${businessName},</p>
          <p>Thank you for your interest in listing with Wellington EcoBuild. After reviewing your application, we were unable to approve it at this time.</p>
          
          ${notes ? `
          <div class="reason-box">
            <strong>Reason for Decline:</strong>
            <p style="margin: 10px 0 0 0;">${notes}</p>
          </div>
          ` : ''}
          
          <div class="refund-box">
            <h3>✓ Full Refund Processed</h3>
            <p>A full refund of <strong>${amountDisplay}</strong> has been issued to your original payment method.</p>
            <p>Please allow 5-10 business days for the refund to appear in your account.</p>
          </div>
          
          ${refundReceiptHtml}
          
          <p><strong>You're welcome to reapply!</strong></p>
          <p>If you believe you can address the issues mentioned or have additional documentation, we encourage you to submit a new application.</p>
          
          <p style="text-align: center;">
            <a href="https://wellingtonecobuild.nz/list-business" class="btn">Apply Again</a>
          </p>
        `),
      };

    case "resubmission_required":
      return {
        subject: "Action Required - Additional Information Needed",
        html: wrapEmail("📋", "Additional Information Needed", "linear-gradient(135deg, #f59e0b, #d97706)", `
          <p>Dear ${businessName},</p>
          <p>Thank you for your application. We need some additional information or documents before we can complete your verification.</p>
          
          <div class="info-box">
            <strong>What we need:</strong>
            <p>${notes || "Please log in to your dashboard to see what additional documents are required."}</p>
          </div>
          
          <div class="safe-box">
            <strong>✓ Your payment is safe</strong>
            <p>Your payment of <strong>${amountDisplay}</strong> is securely held and will not be processed until your application is approved.</p>
          </div>
          
          <p><strong>Next steps:</strong></p>
          <ol>
            <li>Log in to your dashboard</li>
            <li>Review the requested information</li>
            <li>Upload the required documents</li>
            <li>Click "Update & Resubmit" to resubmit your application</li>
          </ol>
          
          <p style="text-align: center;">
            <a href="https://wellingtonecobuild.nz/dashboard" class="btn btn-warning">Go to Dashboard</a>
          </p>
        `),
      };

    case "resubmitted":
      return {
        subject: "Application Resubmitted - Under Review",
        html: wrapEmail("✓", "Resubmission Received", "linear-gradient(135deg, #3b82f6, #2563eb)", `
          <p>Dear ${businessName},</p>
          
          <div class="status-box">
            <h2>Your Application is Under Review</h2>
            <p>We've received your resubmission and our team is reviewing it now.</p>
          </div>
          
          ${amount && amount > 0 ? `
          <div class="safe-box">
            <strong>✓ Your payment is safe</strong>
            <p>Your payment of <strong>${amountDisplay}</strong> remains securely held until your application is approved.</p>
          </div>
          ` : ''}
          
          <p><strong>What happens next?</strong></p>
          <ul>
            <li>Our team will review your updated application</li>
            <li>You'll receive an email once a decision is made</li>
            <li>If approved, your listing will go live immediately</li>
          </ul>
          
          <p>Thank you for your patience!</p>
          
          <p style="text-align: center;">
            <a href="https://wellingtonecobuild.nz/dashboard" class="btn btn-blue">View Dashboard</a>
          </p>
        `),
      };

    default:
      return {
        subject: "Update on Your Wellington EcoBuild Application",
        html: wrapEmail("", "Status Update", "linear-gradient(135deg, #2D5A3D, #1E3D2A)", `
          <p>Status update for ${businessName}</p>
        `),
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: PaymentStatusRequest = await req.json();
    logStep("Sending email", { status: data.status, businessName: data.businessName });

    if (!data.businessEmail) {
      logStep("No email provided, skipping");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      logStep("Gmail credentials not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Email not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailContent = getEmailContent(data);

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
      from: `${COMPANY_NAME} <${gmailUser}>`,
      to: data.businessEmail,
      subject: emailContent.subject,
      // IMPORTANT: Avoid quoted-printable to prevent visible "=20" artifacts
      mimeContent: [
        {
          mimeType: 'text/html; charset="utf-8"',
          content: emailContent.html,
          transferEncoding: "8bit",
        },
      ],
    });

    await client.close();

    logStep("Email sent successfully", { to: data.businessEmail, status: data.status });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("Error sending email", { error: error.message });
    // Return 200 even on error to prevent blocking the main flow
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
