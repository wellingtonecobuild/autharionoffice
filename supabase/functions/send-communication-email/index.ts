import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// SINGLE EMAIL SYSTEM - All communications use info@wellingtonecobuild.nz
const PRIMARY_EMAIL = "info@wellingtonecobuild.nz";
const COMPANY_NAME = "Wellington EcoBuild";
const COMPANY_LOGO = "https://duumxykzcliujgyrmzvn.supabase.co/storage/v1/object/public/avatars/wellington-ecobuild-logo-PQDk3oCl.png";
const COMPANY_WEBSITE = "https://wellingtonecobuild.nz";
const COMPANY_TAGLINE = "Wellington's Verified Directory for Qualified Builders & Construction Companies";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SenderMode = 'company' | 'admin';

interface CommunicationEmailRequest {
  thread_id: string;
  message_id: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  message_content: string;
  sender_name: string;
  sender_email: string;
  sender_mode?: SenderMode; // 'company' or 'admin'
  attachments?: { name: string; url: string }[];
  reply_type: 'admin_reply' | 'contact_form_confirmation' | 'chat_notification' | 'document_exchange' | 'broadcast' | 'system';
}

const createBrandedEmail = (params: {
  recipientName?: string;
  subject: string;
  content: string;
  senderName: string;
  senderEmail: string;
  senderMode: SenderMode;
  replyType: string;
  attachments?: { name: string; url: string }[];
}): string => {
  const isCompanyMode = params.senderMode === 'company';
  
  // Extract first name from full name for professional greeting
  const firstName = params.recipientName 
    ? params.recipientName.split(' ')[0] 
    : null;
  
  const greeting = firstName 
    ? `Dear ${firstName},` 
    : "Dear Valued Recipient,";
  
  // Format content - escape HTML but preserve line breaks
  const formattedContent = params.content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  
  // Professional attachment section
  const attachmentSection = params.attachments && params.attachments.length > 0 ? `
<tr>
  <td style="padding: 0 48px 32px 48px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0;">
      <tr>
        <td style="padding: 20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom: 12px; border-bottom: 1px solid #BBF7D0;">
                <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; font-weight: 600; color: #166534; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                  Attached Documents
                </p>
              </td>
            </tr>
          </table>
          ${params.attachments.map(att => `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 12px;">
            <tr>
              <td style="padding: 12px 16px; background-color: #FFFFFF; border-radius: 6px; border: 1px solid #D1FAE5;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                  <td style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #1E293B; font-weight: 500; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 300px;">
                      ${att.name}
                    </td>
                    <td align="right">
                      <a href="${att.url}" style="display: inline-block; padding: 6px 16px; background-color: #2D5A3D; color: #FFFFFF; font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 4px;">Download</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          `).join('')}
        </td>
      </tr>
    </table>
  </td>
</tr>` : '';

  // Reply notice for admin mode
  const replyNotice = !isCompanyMode && params.replyType === 'admin_reply' ? `
<tr>
  <td style="padding: 0 48px 32px 48px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #EFF6FF; border-left: 4px solid #2563EB; border-radius: 0 8px 8px 0;">
      <tr>
        <td style="padding: 16px 20px;">
          <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #1E40AF; margin: 0; font-weight: 500;">
            You may reply directly to this email to continue the conversation.
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>` : '';

  // Professional signature based on sender mode
  const signatureBlock = isCompanyMode ? `
<tr>
  <td style="padding: 0 48px 40px 48px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid #E2E8F0; padding-top: 24px;">
      <tr>
        <td style="padding-top: 24px; text-align: center;">
          <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #64748B; margin: 0; line-height: 1.8;">
            Yours sincerely,<br>
            <strong style="color: #2D5A3D; font-size: 16px; font-weight: 600;">${COMPANY_NAME}</strong><br>
            <span style="font-size: 12px; color: #94A3B8;">Official Correspondence</span>
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>` : `
<tr>
  <td style="padding: 0 48px 40px 48px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid #E2E8F0; padding-top: 24px;">
      <tr>
        <td style="padding-top: 24px;">
          <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #64748B; margin: 0; line-height: 1.8;">
            Kind regards,<br>
            <strong style="color: #1E293B; font-size: 15px;">${params.senderName}</strong><br>
            <span style="color: #2D5A3D; font-size: 13px; font-weight: 500;">${COMPANY_NAME}</span>
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>`;

  // Professional legal footer
  const legalFooter = isCompanyMode ? `
<tr>
  <td style="padding-top: 16px; border-top: 1px solid #E2E8F0;">
    <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; color: #94A3B8; margin: 0; line-height: 1.6; text-align: center;">
      This is an official communication from ${COMPANY_NAME}.<br>
      Please do not reply directly to this email unless instructed.<br>
      &copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
    </p>
  </td>
</tr>` : `
<tr>
  <td style="padding-top: 16px; border-top: 1px solid #E2E8F0;">
    <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; color: #94A3B8; margin: 0; line-height: 1.6; text-align: center;">
      You may reply directly to this email to continue your conversation.<br>
      &copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
    </p>
  </td>
</tr>`;

  // Current date formatted professionally
  const currentDate = new Date().toLocaleDateString('en-NZ', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, address=no, email=no, date=no">
<title>${params.subject}</title>
<!--[if mso]>
<style type="text/css">
  table { border-collapse: collapse; }
  td { padding: 0; }
</style>
<![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">

<!-- Preheader text (hidden) -->
<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
  ${params.content.substring(0, 100).replace(/\n/g, ' ')}...
</div>

<!-- Email Container -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #F8FAFC; padding: 48px 24px;">
<tr>
<td align="center">
<table width="640" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 640px; width: 100%; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04); table-layout: fixed;">

<!-- Official Header Banner -->
<tr>
<td style="background: linear-gradient(135deg, #2D5A3D 0%, #1A3D2A 100%); padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td style="padding: 28px 48px; text-align: center;">
        <img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" width="180" height="auto" style="display: block; margin: 0 auto; max-width: 180px; height: auto; border: 0;">
      </td>
    </tr>
    <tr>
      <td style="padding: 0 48px 20px 48px; text-align: center;">
        <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; color: rgba(255,255,255,0.85); margin: 0; letter-spacing: 1px; text-transform: uppercase; font-weight: 500;">
          ${COMPANY_TAGLINE}
        </p>
      </td>
    </tr>
  </table>
</td>
</tr>

<!-- Date Banner -->
<tr>
<td style="background-color: #F1F5F9; padding: 12px 48px; border-bottom: 1px solid #E2E8F0;">
  <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #64748B; margin: 0; text-align: right;">
    ${currentDate}
  </p>
</td>
</tr>

<!-- Greeting Section -->
<tr>
<td style="padding: 40px 48px 20px 48px;">
  <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 16px; color: #1E293B; margin: 0; line-height: 1.6; font-weight: 500;">
    ${greeting}
  </p>
</td>
</tr>

<!-- Main Message Content -->
<tr>
<td style="padding: 0 48px 32px 48px;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #FAFAFA; border-radius: 8px; border: 1px solid #E5E7EB; table-layout: fixed;">
    <tr>
      <td style="padding: 28px 32px; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word;">
        <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 15px; color: #374151; margin: 0; line-height: 1.75; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%;">
          ${formattedContent}
        </p>
      </td>
    </tr>
  </table>
</td>
</tr>

${attachmentSection}
${replyNotice}
${signatureBlock}

<!-- Professional Footer -->
<tr>
<td style="background-color: #1E293B; padding: 32px 48px;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center">
        <img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" width="120" height="auto" style="display: block; margin: 0 auto 16px auto; max-width: 120px; height: auto; opacity: 0.9;">
        
        <p style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #FFFFFF; margin: 0 0 8px 0;">
          ${COMPANY_NAME}
        </p>
        
        <!-- Contact Links -->
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
        
        ${legalFooter}
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
    console.error("[COMM-EMAIL] Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const payload: CommunicationEmailRequest = await req.json();
    
    // Default to company mode for system emails, admin mode for manual replies
    const senderMode: SenderMode = payload.sender_mode || 
      (payload.reply_type === 'admin_reply' ? 'admin' : 'company');
    
    const displayName = senderMode === 'admin' 
      ? payload.sender_name 
      : COMPANY_NAME;
    
    console.log("[COMM-EMAIL] Sending email:", {
      thread_id: payload.thread_id,
      recipient: payload.recipient_email,
      type: payload.reply_type,
      sender_name: displayName,
      sender_email: payload.sender_email,
      sender_mode: senderMode
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create branded email HTML
    const html = createBrandedEmail({
      recipientName: payload.recipient_name,
      subject: payload.subject,
      content: payload.message_content,
      senderName: displayName,
      senderEmail: payload.sender_email,
      senderMode: senderMode,
      replyType: payload.reply_type,
      attachments: payload.attachments
    });

    // Send email via SMTP using denomailer
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

    // Gmail SMTP requires authenticated email as sender, but we use Reply-To for routing
    await client.send({
      from: `${displayName} <${gmailUser}>`,
      to: payload.recipient_email,
      replyTo: payload.sender_email, // Reply goes back to the correct inbox
      subject: payload.subject,
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
    console.log("[COMM-EMAIL] Email sent successfully:", {
      to: payload.recipient_email,
      from: displayName,
      replyTo: payload.sender_email,
      mode: senderMode
    });

    // Log to email_logs table
    await supabase.from('email_logs').insert({
      email_type: payload.reply_type,
      to_email: payload.recipient_email,
      to_name: payload.recipient_name,
      subject: payload.subject,
      status: 'sent',
      metadata: {
        thread_id: payload.thread_id,
        message_id: payload.message_id,
        sender_name: displayName,
        sender_email: payload.sender_email,
        sender_mode: senderMode,
        reply_to: payload.sender_email
      }
    });

    // Log to communication audit
    await supabase.from('communication_audit_log').insert({
      thread_id: payload.thread_id,
      message_id: payload.message_id,
      action: 'email_sent',
      actor_email: payload.sender_email,
      actor_role: senderMode === 'admin' ? 'admin' : 'system',
      details: {
        recipient: payload.recipient_email,
        type: payload.reply_type,
        subject: payload.subject,
        from_display: displayName,
        sender_mode: senderMode,
        reply_to: payload.sender_email
      }
    });

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[COMM-EMAIL] Error sending email:", error);
    
    // Log failure
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    await supabase.from('email_logs').insert({
      email_type: 'communication_error',
      to_email: 'unknown',
      subject: 'Communication Email Failed',
      status: 'failed',
      error_message: error.message
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
