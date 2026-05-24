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

interface ClaimedNotifyRequest {
  businessName: string;
  ownerEmail: string;
  ownerName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!gmailUser || !gmailPassword) {
    console.error("[NOTIFY-BUSINESS-CLAIMED] Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { businessName, ownerEmail, ownerName }: ClaimedNotifyRequest = await req.json();
    
    console.log(`[NOTIFY-BUSINESS-CLAIMED] Sending welcome email to:`, ownerEmail);

    const firstName = ownerName ? ownerName.split(' ')[0] : 'there';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to ${COMPANY_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F5F5F5; line-height: 1.6;">
<div style="padding: 24px;">
<div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
<div style="background: linear-gradient(135deg, #2D5A3D 0%, #1E3D2A 100%); padding: 32px 24px; text-align: center;">
<img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" style="max-width: 180px; height: auto;">
</div>
<div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 24px; text-align: center;">
<h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to ${COMPANY_NAME}!</h1>
</div>
<div style="padding: 40px 32px;">
<p style="font-size: 18px; color: #374151; margin-bottom: 20px;">Hi ${firstName},</p>

<p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Great news! Your business <strong>"${businessName}"</strong> has been automatically linked to your new account.</p>

<div style="background-color: #F9FAFB; border-left: 4px solid #16A34A; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
<h3 style="margin: 0 0 12px 0; color: #16A34A;">You now have full access to:</h3>
<ul style="margin: 0; padding-left: 20px; color: #374151;">
<li style="margin-bottom: 8px;">Edit your business details and description</li>
<li style="margin-bottom: 8px;">Upload photos and certifications</li>
<li style="margin-bottom: 8px;">Respond to leads and enquiries</li>
<li style="margin-bottom: 8px;">Manage your subscription plan</li>
<li style="margin-bottom: 0;">Track your listing performance</li>
</ul>
</div>

<div style="text-align: center; margin: 32px 0;">
<a href="https://wellingtonecobuild.nz/dashboard" style="display: inline-block; background: linear-gradient(135deg, #2D5A3D 0%, #1E3D2A 100%); color: #FFFFFF; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Your Dashboard</a>
</div>

<p style="font-size: 16px; color: #374151; margin-top: 24px;">Thank you for being part of Wellington's sustainable building community!</p>

<p style="font-size: 14px; color: #6B7280; margin-top: 24px;">If you have any questions, please contact us at <a href="mailto:${PRIMARY_EMAIL}" style="color: #2D5A3D;">${PRIMARY_EMAIL}</a></p>
</div>
<div style="background-color: #F9FAFB; padding: 24px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
<p style="font-size: 16px; font-weight: 600; color: #2D5A3D; margin: 0 0 4px 0;">${COMPANY_NAME}</p>
<a href="mailto:${PRIMARY_EMAIL}" style="font-size: 14px; color: #2D5A3D; text-decoration: none;">${PRIMARY_EMAIL}</a>
<p style="font-size: 12px; color: #9CA3AF; margin-top: 16px;">&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
</div>
</div>
</div>
</body>
</html>`;

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
      subject: `🎉 Welcome! Your business "${businessName}" is now linked to your account`,
      mimeContent: [
        {
          mimeType: 'text/html; charset="utf-8"',
          content: html,
          transferEncoding: "8bit",
        },
      ],
    });

    await client.close();
    console.log("[NOTIFY-BUSINESS-CLAIMED] Welcome email sent successfully to:", ownerEmail);

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[NOTIFY-BUSINESS-CLAIMED] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
