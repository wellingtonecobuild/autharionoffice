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
const ADMIN_URL = "https://wellingtonecobuild.nz/admin/communications";

interface NotificationRequest {
  type: "contact" | "newsletter" | "referral" | "lead";
  data: Record<string, any>;
}

const createBrandedAdminEmail = (subject: string, content: string, viewLink?: string): string => {
  const viewButton = viewLink ? `
<div style="text-align: center; margin: 24px 0;">
<a href="${viewLink}" style="display: inline-block; background: linear-gradient(135deg, #2D5A3D 0%, #1E3D2A 100%); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">View in Platform</a>
</div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F5F5F5; line-height: 1.6;">
<div style="padding: 24px;">
<div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
<div style="background: linear-gradient(135deg, #2D5A3D 0%, #1E3D2A 100%); padding: 24px; text-align: center;">
<img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" style="max-width: 140px; height: auto;">
<p style="color: #FFFFFF; font-size: 12px; margin: 12px 0 0 0; opacity: 0.9;">Admin Notification</p>
</div>
<div style="padding: 32px;">
<h1 style="font-size: 20px; font-weight: 700; color: #1A1A1A; margin: 0 0 24px 0;">${subject}</h1>
${content}
${viewButton}
</div>
<div style="background-color: #F9FAFB; padding: 16px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
<p style="font-size: 12px; color: #9CA3AF; margin: 0;">&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. Internal notification.</p>
</div>
</div>
</div>
</body>
</html>`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!gmailUser || !gmailPassword) {
    console.error("[Notify Admin] Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { type, data }: NotificationRequest = await req.json();
    
    console.log("[Notify Admin] Notification type:", type);

    let subject = "";
    let content = "";
    let viewLink = "";

    switch (type) {
      case "contact":
        subject = `New Contact: ${data.name}`;
        viewLink = `${ADMIN_URL}?thread=${data.thread_id || ''}`;
        content = `
<div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
<p style="font-size: 14px; color: #92400E; margin: 0; font-weight: 600;">📬 New Contact Form Submission</p>
</div>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
<tr>
<td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
<span style="font-size: 13px; color: #6B7280; display: block;">From</span>
<span style="font-size: 15px; color: #1A1A1A; font-weight: 600;">${data.name}</span>
</td>
</tr>
<tr>
<td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
<span style="font-size: 13px; color: #6B7280; display: block;">Email</span>
<a href="mailto:${data.email}" style="font-size: 15px; color: #2D5A3D; text-decoration: none;">${data.email}</a>
</td>
</tr>
<tr>
<td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
<span style="font-size: 13px; color: #6B7280; display: block;">Subject</span>
<span style="font-size: 15px; color: #1A1A1A;">${data.subject || "No subject"}</span>
</td>
</tr>
</table>
<div style="background-color: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
<p style="font-size: 13px; color: #6B7280; margin: 0 0 8px 0; font-weight: 600;">Message:</p>
<p style="font-size: 15px; color: #374151; margin: 0; white-space: pre-wrap; line-height: 1.6;">${data.message}</p>
</div>
<p style="font-size: 13px; color: #6B7280; margin: 0;">You can reply directly from your email or view and respond in the platform.</p>
        `;
        break;

      case "newsletter":
        subject = `New Subscriber: ${data.email}`;
        content = `
<div style="background-color: #DBEAFE; border-left: 4px solid #3B82F6; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
<p style="font-size: 14px; color: #1E40AF; margin: 0; font-weight: 600;">📧 New Newsletter Subscription</p>
</div>
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
<span style="font-size: 13px; color: #6B7280; display: block;">Email</span>
<a href="mailto:${data.email}" style="font-size: 15px; color: #2D5A3D; text-decoration: none;">${data.email}</a>
</td>
</tr>
<tr>
<td style="padding: 12px 0;">
<span style="font-size: 13px; color: #6B7280; display: block;">Subscribed at</span>
<span style="font-size: 15px; color: #1A1A1A;">${new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })}</span>
</td>
</tr>
</table>
        `;
        break;

      case "referral":
        subject = `New Referral: ${data.referredCompanyName}`;
        content = `
<div style="background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
<p style="font-size: 14px; color: #065F46; margin: 0; font-weight: 600;">🤝 New Partner Referral</p>
</div>
<h3 style="font-size: 16px; color: #1A1A1A; margin: 0 0 16px 0;">Referrer Details</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
<tr>
<td style="padding: 8px 0;"><span style="color: #6B7280;">Name:</span> <strong>${data.referrerName}</strong></td>
</tr>
<tr>
<td style="padding: 8px 0;"><span style="color: #6B7280;">Email:</span> <a href="mailto:${data.referrerEmail}" style="color: #2D5A3D;">${data.referrerEmail}</a></td>
</tr>
<tr>
<td style="padding: 8px 0;"><span style="color: #6B7280;">Phone:</span> ${data.referrerPhone || "Not provided"}</td>
</tr>
</table>
<h3 style="font-size: 16px; color: #1A1A1A; margin: 0 0 16px 0;">Referred Company</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
<tr>
<td style="padding: 8px 0;"><span style="color: #6B7280;">Company:</span> <strong>${data.referredCompanyName}</strong></td>
</tr>
<tr>
<td style="padding: 8px 0;"><span style="color: #6B7280;">Email:</span> <a href="mailto:${data.referredCompanyEmail}" style="color: #2D5A3D;">${data.referredCompanyEmail}</a></td>
</tr>
<tr>
<td style="padding: 8px 0;"><span style="color: #6B7280;">Plan:</span> ${data.referralPlan}</td>
</tr>
<tr>
<td style="padding: 8px 0;"><span style="color: #6B7280;">Potential Reward:</span> <strong style="color: #059669;">$${data.referralPlan === "premium" ? "50" : "100"}</strong></td>
</tr>
</table>
        `;
        break;

      case "lead":
        subject = `New Lead: ${data.businessName}`;
        content = `
<div style="background-color: #FEE2E2; border-left: 4px solid #EF4444; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
<p style="font-size: 14px; color: #991B1B; margin: 0; font-weight: 600;">🔥 New Business Lead</p>
</div>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
<tr>
<td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
<span style="font-size: 13px; color: #6B7280; display: block;">Business</span>
<span style="font-size: 15px; color: #1A1A1A; font-weight: 600;">${data.businessName}</span>
</td>
</tr>
<tr>
<td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
<span style="font-size: 13px; color: #6B7280; display: block;">From</span>
<span style="font-size: 15px; color: #1A1A1A;">${data.name}</span>
</td>
</tr>
<tr>
<td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
<span style="font-size: 13px; color: #6B7280; display: block;">Email</span>
<a href="mailto:${data.email}" style="font-size: 15px; color: #2D5A3D; text-decoration: none;">${data.email}</a>
</td>
</tr>
<tr>
<td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
<span style="font-size: 13px; color: #6B7280; display: block;">Phone</span>
<span style="font-size: 15px; color: #1A1A1A;">${data.phone || "Not provided"}</span>
</td>
</tr>
</table>
<div style="background-color: #F9FAFB; padding: 20px; border-radius: 8px;">
<p style="font-size: 13px; color: #6B7280; margin: 0 0 8px 0; font-weight: 600;">Message:</p>
<p style="font-size: 15px; color: #374151; margin: 0; white-space: pre-wrap;">${data.message}</p>
</div>
        `;
        break;

      default:
        throw new Error("Invalid notification type");
    }

    const htmlEmail = createBrandedAdminEmail(subject, content, viewLink);

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

    // Send to admin (the Gmail user)
    await client.send({
      from: `${COMPANY_NAME} Platform <${gmailUser}>`,
      to: gmailUser,
      replyTo: data.email || PRIMARY_EMAIL,
      subject: `[Platform] ${subject}`,
      mimeContent: [
        {
          mimeType: 'text/html; charset="utf-8"',
          content: htmlEmail,
          transferEncoding: "8bit",
        },
      ],
    });

    await client.close();
    console.log("[Notify Admin] Notification sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[Notify Admin] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
