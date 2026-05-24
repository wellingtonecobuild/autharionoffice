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
  businessId?: string;
  status: "approved" | "rejected" | "suspended" | "unsuspended";
  reason?: string;
  nextSteps?: string;
}

const createEmailHtml = (status: string, businessName: string, reason?: string, nextSteps?: string): { subject: string; html: string } => {
  const statusConfig: Record<string, { icon: string; title: string; gradient: string }> = {
    approved: { icon: "🎉", title: "Congratulations!", gradient: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)" },
    rejected: { icon: "📋", title: "Listing Update", gradient: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)" },
    suspended: { icon: "⚠️", title: "Listing Suspended", gradient: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)" },
    unsuspended: { icon: "✅", title: "Listing Restored!", gradient: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)" },
  };

  const config = statusConfig[status] || statusConfig.approved;
  let subject = "";
  let bodyContent = "";

  switch (status) {
    case "approved":
      subject = `${config.icon} Your business "${businessName}" has been approved!`;
      bodyContent = `
        <p style="font-size: 18px; margin-bottom: 20px;">Your business <strong>"${businessName}"</strong> has been approved and is now live on Wellington EcoBuild!</p>
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #16a34a; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #16a34a;">What happens next?</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Your listing is now visible to potential customers</li>
            <li>You can manage your listing from your dashboard</li>
            <li>Consider upgrading to Premium for more visibility</li>
          </ul>
        </div>
        <a href="https://wellingtonecobuild.nz/dashboard" style="display: inline-block; background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 10px;">View Your Dashboard</a>
      `;
      break;
    case "rejected":
      subject = `Business Listing Update: "${businessName}"`;
      bodyContent = `
        <p style="font-size: 18px; margin-bottom: 20px;">We've reviewed your business listing for <strong>"${businessName}"</strong> and unfortunately it wasn't approved at this time.</p>
        ${reason ? `<div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;"><h3 style="margin: 0 0 10px 0; color: #dc2626;">Reason:</h3><p style="margin: 0; color: #4b5563;">${reason}</p></div>` : ''}
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #92400e;">You can resubmit!</h3>
          <p style="margin: 0; color: #78350f;">After making the necessary changes, you can resubmit your listing for review from your dashboard.</p>
        </div>
        <a href="https://wellingtonecobuild.nz/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 10px;">Go to Dashboard</a>
      `;
      break;
    case "suspended":
      subject = `⚠️ Your business listing "${businessName}" has been suspended`;
      bodyContent = `
        <p style="font-size: 18px; margin-bottom: 20px;">Your business listing for <strong>"${businessName}"</strong> has been temporarily suspended and is no longer visible.</p>
        ${reason ? `<div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;"><h3 style="margin: 0 0 10px 0; color: #b91c1c;">Reason:</h3><p style="margin: 0; color: #7f1d1d;">${reason}</p></div>` : ''}
        ${nextSteps ? `<div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="margin: 0 0 10px 0; color: #1d4ed8;">Next Steps:</h3><p style="margin: 0; color: #1e40af;">${nextSteps}</p></div>` : ''}
        <a href="mailto:${PRIMARY_EMAIL}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 10px;">Contact Support</a>
      `;
      break;
    case "unsuspended":
      subject = `✅ Your business listing "${businessName}" has been restored!`;
      bodyContent = `
        <p style="font-size: 18px; margin-bottom: 20px;">Great news! Your business listing for <strong>"${businessName}"</strong> has been restored and is now live again!</p>
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #166534;">What this means:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #15803d;">
            <li>Your listing is now visible to potential customers</li>
            <li>All your business information has been preserved</li>
            <li>You can continue to manage your listing from your dashboard</li>
          </ul>
        </div>
        <a href="https://wellingtonecobuild.nz/dashboard" style="display: inline-block; background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 10px;">View Your Dashboard</a>
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
<h1 style="color: white; margin: 0; font-size: 28px;">${config.icon} ${config.title}</h1>
</div>
<div style="padding: 30px; background: #f9fafb;">
${bodyContent}
<p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
If you have any questions, please contact us at <a href="mailto:${PRIMARY_EMAIL}" style="color: #2563eb;">${PRIMARY_EMAIL}</a>
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
    console.error("[NOTIFY-BUSINESS-STATUS] Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { businessName, ownerEmail, ownerId, businessId, status, reason, nextSteps }: NotifyRequest = await req.json();
    
    console.log(`[NOTIFY-BUSINESS-STATUS] Sending ${status} notification to:`, ownerEmail);

    const { subject, html } = createEmailHtml(status, businessName, reason, nextSteps);

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
    console.log("[NOTIFY-BUSINESS-STATUS] Email sent successfully to:", ownerEmail);

    // Log to Communications Hub
    const statusLabels: Record<string, string> = {
      approved: 'Business Approved',
      rejected: 'Business Rejected',
      suspended: 'Business Suspended',
      unsuspended: 'Business Restored'
    };

    const statusMessages: Record<string, string> = {
      approved: `Great news! Your business "${businessName}" has been approved and is now live on Wellington EcoBuild.`,
      rejected: `Your business listing for "${businessName}" was not approved at this time.${reason ? ` Reason: ${reason}` : ''}`,
      suspended: `Your business listing for "${businessName}" has been temporarily suspended.${reason ? ` Reason: ${reason}` : ''}`,
      unsuspended: `Your business listing for "${businessName}" has been restored and is now live again.`
    };

    await createSystemThread({
      subject: `${statusLabels[status] || 'Business Status Update'}: ${businessName}`,
      content: statusMessages[status] || `Business status changed to "${status}" for ${businessName}.`,
      channel_type: 'system_notification',
      category: 'business_status',
      priority: status === 'suspended' ? 'high' : 'normal',
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
    console.error("[NOTIFY-BUSINESS-STATUS] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
