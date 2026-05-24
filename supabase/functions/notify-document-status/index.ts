import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createSystemThread } from "../_shared/communication-hub.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SINGLE EMAIL SYSTEM - All communications use info@wellingtonecobuild.nz
const PRIMARY_EMAIL = "info@wellingtonecobuild.nz";
const COMPANY_NAME = "Wellington EcoBuild";
const COMPANY_LOGO = "https://duumxykzcliujgyrmzvn.supabase.co/storage/v1/object/public/avatars/wellington-ecobuild-logo-PQDk3oCl.png";

interface NotifyRequest {
  businessName: string;
  ownerEmail: string;
  ownerId?: string;
  documentName: string;
  status: "approved" | "rejected" | "replacement_requested";
  reason?: string;
  instructions?: string;
  businessId?: string;
}

const createEmailHtml = (status: string, businessName: string, documentName: string, reason?: string, instructions?: string): { subject: string; html: string } => {
  const statusConfig: Record<string, { icon: string; title: string; gradient: string }> = {
    approved: { icon: "✅", title: "Document Approved!", gradient: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)" },
    rejected: { icon: "⚠️", title: "Document Review Update", gradient: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)" },
    replacement_requested: { icon: "📎", title: "Document Replacement Needed", gradient: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)" },
  };

  const config = statusConfig[status] || statusConfig.approved;
  let subject = "";
  let bodyContent = "";

  switch (status) {
    case "approved":
      subject = `${config.icon} Your verification document "${documentName}" has been approved`;
      bodyContent = `
        <p style="font-size: 18px; margin-bottom: 20px;">Great news! Your verification document has been approved for <strong>"${businessName}"</strong>.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #16a34a; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #16a34a;">Document Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Document Name:</td><td style="padding: 8px 0; font-weight: 600;">${documentName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Status:</td><td style="padding: 8px 0;"><span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">APPROVED</span></td></tr>
          </table>
        </div>
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <ul style="margin: 0; padding-left: 20px; color: #15803d;">
            <li>Your document has been verified and accepted</li>
            <li>This contributes to your professional verification status</li>
          </ul>
        </div>
        <a href="https://wellingtonecobuild.nz/dashboard" style="display: inline-block; background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Your Dashboard</a>
      `;
      break;
    case "rejected":
      subject = `⚠️ Your verification document "${documentName}" requires attention`;
      bodyContent = `
        <p style="font-size: 18px; margin-bottom: 20px;">We've reviewed your verification document for <strong>"${businessName}"</strong> and unfortunately it wasn't approved at this time.</p>
        ${reason ? `<div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;"><h3 style="margin: 0 0 10px 0; color: #b91c1c;">Reason:</h3><p style="margin: 0; color: #7f1d1d;">${reason}</p></div>` : ''}
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #92400e;">You can resubmit!</h3>
          <p style="margin: 0; color: #78350f;">Please upload a new document that meets our verification requirements from your dashboard.</p>
        </div>
        <a href="https://wellingtonecobuild.nz/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Upload New Document</a>
      `;
      break;
    case "replacement_requested":
      subject = `📎 New document required for "${businessName}"`;
      bodyContent = `
        <p style="font-size: 18px; margin-bottom: 20px;">We need you to submit a new document for <strong>"${businessName}"</strong>.</p>
        ${reason ? `<div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="margin: 0 0 10px 0; color: #92400e;">Why we need a new document:</h3><p style="margin: 0; color: #78350f;">${reason}</p></div>` : ''}
        ${instructions ? `<div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="margin: 0 0 10px 0; color: #1e40af;">Instructions:</h3><p style="margin: 0; color: #1e3a8a; white-space: pre-wrap;">${instructions}</p></div>` : ''}
        <a href="https://wellingtonecobuild.nz/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Upload Replacement Document</a>
      `;
      break;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
<div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
<div style="background: ${config.gradient}; padding: 30px; text-align: center;">
<img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" style="max-width: 160px; height: auto; margin-bottom: 16px;">
<h1 style="color: white; margin: 0; font-size: 24px;">${config.icon} ${config.title}</h1>
</div>
<div style="padding: 30px; background: #f9fafb;">
${bodyContent}
<p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
Questions? Contact us at <a href="mailto:${PRIMARY_EMAIL}" style="color: #2563eb;">${PRIMARY_EMAIL}</a>
</p>
</div>
<div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
<p style="font-size: 14px; font-weight: 600; color: #2D5A3D; margin: 0 0 4px 0;">${COMPANY_NAME}</p>
<p style="font-size: 12px; color: #6b7280; margin: 0;">&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
</div>
</div>
</body>
</html>`;

  return { subject, html };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!gmailUser || !gmailPassword) {
    console.error("[NOTIFY-DOCUMENT-STATUS] Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { businessName, ownerEmail, ownerId, documentName, status, reason, instructions, businessId }: NotifyRequest = await req.json();
    
    console.log(`[NOTIFY-DOCUMENT-STATUS] Sending ${status} notification to:`, ownerEmail);

    const { subject, html } = createEmailHtml(status, businessName, documentName, reason, instructions);

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
      to: ownerEmail,
      replyTo: PRIMARY_EMAIL,
      subject,
      // IMPORTANT: Avoid quoted-printable to prevent visible "=20" artifacts
      mimeContent: [
        {
          mimeType: 'text/html; charset="utf-8"',
          content: html,
          transferEncoding: "8bit",
        },
      ],
    });

    await client.close();
    console.log("[NOTIFY-DOCUMENT-STATUS] Email sent successfully to:", ownerEmail);

    // Log to Communications Hub
    const statusLabels: Record<string, string> = {
      approved: 'Document Approved',
      rejected: 'Document Rejected',
      replacement_requested: 'Document Replacement Requested'
    };

    await createSystemThread({
      subject: `${statusLabels[status] || 'Document Update'}: ${documentName}`,
      content: `Document "${documentName}" for "${businessName}" status: ${status}.${reason ? ` Reason: ${reason}` : ''}`,
      channel_type: 'system_notification',
      category: 'document_status',
      priority: status === 'rejected' ? 'high' : 'normal',
      recipient_email: ownerEmail,
      recipient_id: ownerId,
      related_entity_type: 'business',
      related_entity_id: businessId
    });

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[NOTIFY-DOCUMENT-STATUS] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
