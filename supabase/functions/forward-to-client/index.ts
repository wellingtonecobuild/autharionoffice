import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Wellington EcoBuild Branding
const BRAND = {
  name: "Wellington EcoBuild",
  email: "info@wellingtonecobuild.nz",
  website: "https://wellingtonecobuild.nz",
  tagline: "Wellington's Verified Directory for Qualified Builders & Construction Companies",
  logo: "https://duumxykzcliujgyrmzvn.supabase.co/storage/v1/object/public/avatars/wellington-ecobuild-logo-PQDk3oCl.png",
  colors: {
    primary: "#2D5A3D",
    primaryDark: "#1A3D2A",
    secondary: "#C4A962",
    background: "#FFFFFF",
    surface: "#F8FAFC",
    text: "#1E293B",
    muted: "#64748B",
    border: "#E2E8F0"
  }
};

interface ForwardToClientRequest {
  // Client's email (the original recipient)
  clientEmail: string;
  clientName: string;
  
  // Contractor info (hidden from client, they only see company branding)
  contractorName: string;
  contractorId: string;
  
  // Message content
  subject: string;
  messageText: string;
  messageHtml?: string;
  
  // Thread tracking
  threadId: string;
  messageId: string;
  
  // For threading
  inReplyToMessageId?: string;
}

/**
 * Creates a branded HTML email for contractor replies to clients
 * The contractor's personal email is HIDDEN - client only sees company branding
 */
const createContractorReplyHTML = (params: {
  clientName: string;
  contractorName: string;
  subject: string;
  content: string;
}): string => {
  const currentDate = new Date().toLocaleDateString('en-NZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedContent = params.content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.colors.surface}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">

<!-- Preheader -->
<div style="display: none; max-height: 0; overflow: hidden;">
  ${params.contractorName} has replied to your message...
</div>

<table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.colors.surface}; padding: 40px 20px;">
<tr>
<td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="max-width: 640px; width: 100%; background-color: ${BRAND.colors.background}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

<!-- Header -->
<tr>
  <td style="background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, ${BRAND.colors.primaryDark} 100%); padding: 32px 40px; text-align: center;">
    <img src="${BRAND.logo}" alt="${BRAND.name}" width="180" height="auto" style="display: block; margin: 0 auto 16px auto;">
    <p style="font-size: 12px; color: rgba(255,255,255,0.85); margin: 0; letter-spacing: 0.5px; text-transform: uppercase;">
      ${BRAND.tagline}
    </p>
  </td>
</tr>

<!-- Subject Banner -->
<tr>
  <td style="background-color: ${BRAND.colors.surface}; padding: 20px 40px; border-bottom: 1px solid ${BRAND.colors.border};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="font-size: 18px; font-weight: 600; color: ${BRAND.colors.text}; margin: 0;">
            ${params.subject}
          </p>
        </td>
        <td align="right">
          <p style="font-size: 12px; color: ${BRAND.colors.muted}; margin: 0;">
            ${currentDate}
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- Greeting -->
<tr>
  <td style="padding: 32px 40px 16px 40px;">
    <p style="font-size: 16px; color: ${BRAND.colors.text}; margin: 0; font-weight: 500;">
      Dear ${params.clientName.split(' ')[0]},
    </p>
  </td>
</tr>

<!-- Message Content -->
<tr>
  <td style="padding: 0 40px 24px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFAFA; border-radius: 12px; border: 1px solid ${BRAND.colors.border};">
      <tr>
        <td style="padding: 24px;">
          <p style="font-size: 15px; color: ${BRAND.colors.text}; margin: 0; line-height: 1.7;">
            ${formattedContent}
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- Signature -->
<tr>
  <td style="padding: 0 40px 32px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid ${BRAND.colors.border};">
      <tr>
        <td style="padding-top: 24px;">
          <p style="font-size: 15px; color: ${BRAND.colors.muted}; margin: 0; line-height: 1.8;">
            Kind regards,<br>
            <strong style="color: ${BRAND.colors.text}; font-size: 16px;">${params.contractorName}</strong><br>
            <span style="color: ${BRAND.colors.primary}; font-size: 13px; font-weight: 500;">${BRAND.name}</span>
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- Reply Info Box -->
<tr>
  <td style="padding: 0 40px 32px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0;">
      <tr>
        <td style="padding: 16px;">
          <p style="font-size: 13px; color: #166534; margin: 0; line-height: 1.5;">
            ✉️ <strong>Need to respond?</strong> Simply reply to this email. Your message will be delivered directly to ${params.contractorName}.
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- Footer -->
<tr>
  <td style="background-color: ${BRAND.colors.primaryDark}; padding: 32px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <img src="${BRAND.logo}" alt="${BRAND.name}" width="120" height="auto" style="display: block; margin: 0 auto 16px auto; opacity: 0.95;">
          
          <p style="font-size: 14px; font-weight: 600; color: #FFFFFF; margin: 0 0 12px 0;">
            ${BRAND.name}
          </p>
          
          <table cellpadding="0" cellspacing="0" style="margin: 0 auto 20px auto;">
            <tr>
              <td style="padding: 0 12px;">
                <a href="${BRAND.website}" style="font-size: 13px; color: rgba(255,255,255,0.7); text-decoration: none;">Visit Website</a>
              </td>
              <td style="border-left: 1px solid rgba(255,255,255,0.3); padding: 0 12px;">
                <a href="mailto:${BRAND.email}" style="font-size: 13px; color: rgba(255,255,255,0.7); text-decoration: none;">${BRAND.email}</a>
              </td>
            </tr>
          </table>
          
          <p style="font-size: 11px; color: rgba(255,255,255,0.5); margin: 0; line-height: 1.6;">
            This email was sent via ${BRAND.name}.<br>
            © ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
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
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!gmailUser || !gmailPassword) {
    console.error("[FORWARD-CLIENT] Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const payload: ForwardToClientRequest = await req.json();
    
    console.log("[FORWARD-CLIENT] Forwarding contractor reply to client:", {
      clientEmail: payload.clientEmail,
      contractorName: payload.contractorName,
      subject: payload.subject,
      threadId: payload.threadId
    });

    // Generate branded HTML
    const html = createContractorReplyHTML({
      clientName: payload.clientName,
      contractorName: payload.contractorName,
      subject: payload.subject,
      content: payload.messageText
    });

    // Generate unique message-id for threading
    const emailMessageId = `<${crypto.randomUUID()}@wellingtonecobuild.nz>`;

    // Connect to Gmail SMTP
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

    // IMPORTANT: The "from" shows contractor name but uses company email
    // The contractor's personal email is NEVER shown to the client
    await client.send({
      from: `${payload.contractorName} via ${BRAND.name} <${gmailUser}>`,
      to: payload.clientEmail,
      replyTo: BRAND.email,
      subject: payload.subject,
      headers: {
        'Message-ID': emailMessageId,
        'X-WEB-Thread-ID': payload.threadId,
        'X-WEB-Contractor-ID': payload.contractorId,
        ...(payload.inReplyToMessageId ? { 'In-Reply-To': payload.inReplyToMessageId, 'References': payload.inReplyToMessageId } : {})
      },
      mimeContent: [
        {
          mimeType: 'text/html; charset="utf-8"',
          content: html,
          transferEncoding: "8bit",
        },
      ],
    });

    await client.close();
    console.log("[FORWARD-CLIENT] Email sent successfully to:", payload.clientEmail);

    // Log and update thread
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Log the email
      await supabase.from('email_logs').insert({
        email_type: 'contractor_reply_to_client',
        to_email: payload.clientEmail,
        to_name: payload.clientName,
        subject: payload.subject,
        body_html: html,
        body_text: payload.messageText,
        status: 'sent',
        sent_by: payload.contractorId,
        metadata: {
          contractor_name: payload.contractorName,
          thread_id: payload.threadId,
          message_id: payload.messageId,
          email_message_id: emailMessageId,
          forward_type: 'contractor_to_client'
        }
      });

      // Update thread with last message time
      await supabase
        .from('communication_threads')
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.threadId);

      // Update message with email_message_id for threading
      await supabase
        .from('communication_messages')
        .update({
          email_message_id: emailMessageId
        })
        .eq('id', payload.messageId);

      // Log to audit trail
      await supabase.from('communication_audit_log').insert({
        thread_id: payload.threadId,
        message_id: payload.messageId,
        action: 'contractor_reply_sent_to_client',
        actor_id: payload.contractorId,
        actor_role: 'contractor',
        details: {
          client_email: payload.clientEmail,
          subject: payload.subject,
          email_message_id: emailMessageId
        }
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Reply sent to client", emailMessageId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[FORWARD-CLIENT] Error sending reply:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
