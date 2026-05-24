import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Wellington EcoBuild Branding - Same as send-email
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

interface ForwardRequest {
  // Contractor's personal email (hidden from client)
  contractorEmail: string;
  contractorName: string;
  contractorId: string;
  
  // Client info (the person who replied)
  clientEmail: string;
  clientName: string;
  
  // Message content
  subject: string;
  messageText: string;
  messageHtml?: string;
  
  // Thread tracking
  threadId: string;
  messageId: string;
  
  // Reply tracking
  inReplyToMessageId?: string;
}

/**
 * Creates a branded HTML email for forwarding client replies to contractors
 * The client's actual email is HIDDEN - they only see the branded company email
 */
const createForwardEmailHTML = (params: {
  clientName: string;
  subject: string;
  content: string;
  threadId: string;
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
  Client reply from ${params.clientName}: ${params.content.substring(0, 100)}...
</div>

<table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.colors.surface}; padding: 40px 20px;">
<tr>
<td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="max-width: 640px; width: 100%; background-color: ${BRAND.colors.background}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

<!-- Header -->
<tr>
  <td style="background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, ${BRAND.colors.primaryDark} 100%); padding: 24px 40px; text-align: center;">
    <img src="${BRAND.logo}" alt="${BRAND.name}" width="160" height="auto" style="display: block; margin: 0 auto;">
  </td>
</tr>

<!-- Client Reply Badge -->
<tr>
  <td style="background-color: #DBEAFE; padding: 16px 40px; border-bottom: 1px solid #93C5FD;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <span style="display: inline-block; background-color: #2563EB; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
            📩 Client Reply
          </span>
        </td>
        <td align="right">
          <p style="font-size: 12px; color: #64748B; margin: 0;">${currentDate}</p>
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- From Info -->
<tr>
  <td style="padding: 24px 40px 16px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0; padding: 16px;">
      <tr>
        <td style="padding: 16px;">
          <p style="font-size: 14px; color: ${BRAND.colors.muted}; margin: 0 0 4px 0;">Message from:</p>
          <p style="font-size: 16px; color: ${BRAND.colors.text}; font-weight: 600; margin: 0;">
            ${params.clientName}
          </p>
          <p style="font-size: 12px; color: ${BRAND.colors.primary}; margin: 4px 0 0 0;">
            via ${BRAND.name} Communication Hub
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- Subject -->
<tr>
  <td style="padding: 0 40px 16px 40px;">
    <p style="font-size: 18px; font-weight: 600; color: ${BRAND.colors.text}; margin: 0;">
      ${params.subject}
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

<!-- Reply Instructions -->
<tr>
  <td style="padding: 0 40px 32px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF3C7; border-radius: 8px; border: 1px solid #FCD34D;">
      <tr>
        <td style="padding: 16px;">
          <p style="font-size: 14px; color: #92400E; margin: 0; font-weight: 600;">
            💡 How to Reply
          </p>
          <p style="font-size: 13px; color: #92400E; margin: 8px 0 0 0; line-height: 1.5;">
            Simply reply to this email. Your response will be delivered to your client with ${BRAND.name} branding - your personal email stays protected.
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- Quick Action Button -->
<tr>
  <td style="padding: 0 40px 32px 40px; text-align: center;">
    <a href="https://wellingtonecobuild.nz/portal/communication?thread=${params.threadId}" 
       style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, ${BRAND.colors.primaryDark} 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
      View Full Thread in Portal
    </a>
  </td>
</tr>

<!-- Footer -->
<tr>
  <td style="background-color: ${BRAND.colors.primaryDark}; padding: 24px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <p style="font-size: 12px; color: rgba(255,255,255,0.7); margin: 0;">
            Email managed by ${BRAND.name} Communication Hub<br>
            Your personal email is protected and never shared with clients.
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
    console.error("[FORWARD] Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const payload: ForwardRequest = await req.json();
    
    console.log("[FORWARD] Forwarding client reply to contractor:", {
      contractorEmail: payload.contractorEmail,
      clientName: payload.clientName,
      subject: payload.subject,
      threadId: payload.threadId
    });

    // Generate branded HTML
    const html = createForwardEmailHTML({
      clientName: payload.clientName,
      subject: payload.subject,
      content: payload.messageText,
      threadId: payload.threadId
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

    // IMPORTANT: The "from" is the company, the client email is HIDDEN
    // The "replyTo" uses a special relay format that includes the thread ID
    // When contractor replies, we intercept and route correctly
    await client.send({
      from: `${payload.clientName} via ${BRAND.name} <${gmailUser}>`,
      to: payload.contractorEmail,
      replyTo: `${BRAND.name} Relay <${BRAND.email}>`,
      subject: `[Client Reply] ${payload.subject}`,
      headers: {
        'Message-ID': emailMessageId,
        'X-WEB-Thread-ID': payload.threadId,
        'X-WEB-Client-Email': payload.clientEmail,
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
    console.log("[FORWARD] Email forwarded successfully to:", payload.contractorEmail);

    // Log the forwarded email
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase.from('email_logs').insert({
        email_type: 'forward_to_contractor',
        to_email: payload.contractorEmail,
        to_name: payload.contractorName,
        subject: `[Client Reply] ${payload.subject}`,
        body_html: html,
        body_text: payload.messageText,
        status: 'sent',
        metadata: {
          client_email: payload.clientEmail,
          client_name: payload.clientName,
          thread_id: payload.threadId,
          message_id: payload.messageId,
          email_message_id: emailMessageId,
          forward_type: 'client_to_contractor'
        }
      });

      // Log to audit trail
      await supabase.from('communication_audit_log').insert({
        thread_id: payload.threadId,
        message_id: payload.messageId,
        action: 'email_forwarded_to_contractor',
        actor_email: BRAND.email,
        actor_role: 'system',
        details: {
          contractor_email: payload.contractorEmail,
          client_email: payload.clientEmail,
          subject: payload.subject,
          email_message_id: emailMessageId
        }
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email forwarded to contractor" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[FORWARD] Error forwarding email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
