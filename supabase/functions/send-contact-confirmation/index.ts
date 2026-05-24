import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SINGLE EMAIL SYSTEM - All communications use info@wellingtonecobuild.nz
const PRIMARY_EMAIL = "info@wellingtonecobuild.nz";
const COMPANY_NAME = "Wellington EcoBuild";
const COMPANY_LOGO = "https://duumxykzcliujgyrmzvn.supabase.co/storage/v1/object/public/avatars/wellington-ecobuild-logo-PQDk3oCl.png";
const COMPANY_WEBSITE = "https://wellingtonecobuild.nz";
const COMPANY_TAGLINE = "Wellington's Verified Directory for Qualified Builders & Construction Companies";

interface ContactConfirmationRequest {
  name: string;
  email: string;
  subject?: string;
  message: string;
  thread_id?: string;
}

const createConfirmationEmail = (name: string, originalMessage: string): string => {
  const currentDate = new Date().toLocaleDateString('en-NZ', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const firstName = name.split(' ')[0];
  
  // Escape HTML in message
  const sanitizedMessage = originalMessage
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, address=no, email=no, date=no">
<title>Enquiry Confirmation - ${COMPANY_NAME}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">

<!-- Preheader -->
<div style="display: none; max-height: 0; overflow: hidden;">
  Thank you for contacting ${COMPANY_NAME}. Your enquiry has been received and logged.
</div>

<!-- Email Container -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #F8FAFC; padding: 48px 24px;">
<tr>
<td align="center">
<table width="640" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 640px; width: 100%; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04); table-layout: fixed;">

<!-- Official Header -->
<tr>
<td style="background: linear-gradient(135deg, #2D5A3D 0%, #1A3D2A 100%); padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td style="padding: 32px 48px; text-align: center;">
        <img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" width="180" height="auto" style="display: block; margin: 0 auto; max-width: 180px; height: auto; border: 0;">
      </td>
    </tr>
    <tr>
      <td style="padding: 0 48px 24px 48px; text-align: center;">
        <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; color: rgba(255,255,255,0.85); margin: 0; letter-spacing: 1px; text-transform: uppercase; font-weight: 500;">
          ${COMPANY_TAGLINE}
        </p>
      </td>
    </tr>
  </table>
</td>
</tr>

<!-- Confirmation Banner -->
<tr>
<td style="background-color: #ECFDF5; padding: 16px 48px; border-bottom: 1px solid #BBF7D0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td>
        <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #166534; margin: 0; font-weight: 600;">
          ✓ Enquiry Successfully Received
        </p>
      </td>
      <td align="right">
        <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #166534; margin: 0;">
          ${currentDate}
        </p>
      </td>
    </tr>
  </table>
</td>
</tr>

<!-- Main Content -->
<tr>
<td style="padding: 40px 48px;">
  <h1 style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 24px; font-weight: 700; color: #1E293B; margin: 0 0 24px 0; text-align: center;">
    Thank You for Contacting Us
  </h1>
  
  <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 15px; color: #374151; margin: 0 0 20px 0; line-height: 1.7;">
    Dear ${firstName},
  </p>
  
  <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 15px; color: #374151; margin: 0 0 24px 0; line-height: 1.7;">
    Thank you for contacting ${COMPANY_NAME}. Your enquiry has been received and logged in our system. A member of our team will review your message and respond within <strong>1–2 business days</strong>.
  </p>
  
  <!-- Message Reference Box -->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0; margin: 24px 0;">
    <tr>
      <td style="padding: 20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="padding-bottom: 12px; border-bottom: 1px solid #E2E8F0;">
              <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #64748B; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                Your Message for Reference
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 16px;">
              <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #374151; margin: 0; line-height: 1.7;">
                ${sanitizedMessage}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  
  <!-- What Happens Next -->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #EFF6FF; border-left: 4px solid #2563EB; border-radius: 0 8px 8px 0; margin: 24px 0;">
    <tr>
      <td style="padding: 16px 20px;">
        <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; font-weight: 600; color: #1E40AF; margin: 0 0 8px 0;">
          What Happens Next?
        </p>
        <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; color: #1E40AF; margin: 0; line-height: 1.6;">
          Our team will review your enquiry and respond via email. For urgent matters, please include "URGENT" in your subject line when replying.
        </p>
      </td>
    </tr>
  </table>
  
  <!-- CTA Button -->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin: 32px 0;">
    <tr>
      <td align="center">
        <a href="${COMPANY_WEBSITE}" style="display: inline-block; background: linear-gradient(135deg, #2D5A3D 0%, #1A3D2A 100%); color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-weight: 600; font-size: 14px;">
          Visit Our Website
        </a>
      </td>
    </tr>
  </table>
</td>
</tr>

<!-- Signature -->
<tr>
<td style="padding: 0 48px 40px 48px;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top: 2px solid #E2E8F0; padding-top: 24px;">
    <tr>
      <td style="padding-top: 24px; text-align: center;">
        <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #64748B; margin: 0; line-height: 1.8;">
          Yours sincerely,<br>
          <strong style="color: #2D5A3D; font-size: 15px; font-weight: 600;">The ${COMPANY_NAME} Team</strong>
        </p>
      </td>
    </tr>
  </table>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="background-color: #1E293B; padding: 32px 48px;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center">
        <img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" width="120" height="auto" style="display: block; margin: 0 auto 16px auto; max-width: 120px; height: auto; opacity: 0.9;">
        
        <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #FFFFFF; margin: 0 0 8px 0;">
          ${COMPANY_NAME}
        </p>
        
        <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 16px auto;">
          <tr>
            <td style="padding: 0 16px;">
              <a href="${COMPANY_WEBSITE}" style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; color: #94A3B8; text-decoration: none;">Visit Website</a>
            </td>
            <td style="padding: 0 16px; border-left: 1px solid #475569;">
              <a href="mailto:${PRIMARY_EMAIL}" style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; color: #94A3B8; text-decoration: none;">${PRIMARY_EMAIL}</a>
            </td>
          </tr>
        </table>
        
        <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; color: #94A3B8; margin: 20px 0 0 0; line-height: 1.6;">
          This is an automated confirmation. Please do not reply directly to this email.<br>
          &copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</td>
</tr>

</table>
</td>
</tr>
</table>

</body>
</html>`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!gmailUser || !gmailPassword) {
    console.error("[CONTACT-CONFIRM] Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const payload: ContactConfirmationRequest = await req.json();
    
    console.log("[CONTACT-CONFIRM] Sending confirmation to:", payload.email);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const html = createConfirmationEmail(payload.name, payload.message);

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
      to: payload.email,
      replyTo: PRIMARY_EMAIL,
      subject: `Thank You for Contacting ${COMPANY_NAME}`,
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
    console.log("[CONTACT-CONFIRM] Confirmation email sent to:", payload.email);

    // Log to email_logs
    await supabase.from('email_logs').insert({
      email_type: 'contact_form_confirmation',
      to_email: payload.email,
      to_name: payload.name,
      subject: `Thank You for Contacting ${COMPANY_NAME}`,
      status: 'sent',
      metadata: {
        thread_id: payload.thread_id,
        original_subject: payload.subject
      }
    });

    return new Response(
      JSON.stringify({ success: true, message: "Confirmation email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[CONTACT-CONFIRM] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
