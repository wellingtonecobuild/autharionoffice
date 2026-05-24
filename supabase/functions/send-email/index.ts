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

interface Attachment {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

interface LinkAttachment {
  title: string;
  url: string;
}

interface EmailRequest {
  to: string | string[];
  toName?: string;
  subject: string;
  html?: string;
  text?: string;
  body?: string;
  senderName?: string;
  attachments?: string[] | Attachment[];
  links?: LinkAttachment[];
}

const getFileIcon = (type: string): string => {
  if (type?.includes('pdf')) return '📄';
  if (type?.includes('word') || type?.includes('doc')) return '📝';
  if (type?.includes('excel') || type?.includes('sheet') || type?.includes('xls')) return '📊';
  if (type?.includes('image') || type?.includes('png') || type?.includes('jpg') || type?.includes('jpeg')) return '🖼️';
  if (type?.includes('video') || type?.includes('mp4') || type?.includes('mov')) return '🎬';
  return '📎';
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const createBrandedEmailHTML = (params: {
  recipientName?: string;
  subject: string;
  content: string;
  senderName?: string;
  attachments?: Attachment[];
  links?: LinkAttachment[];
}): string => {
  const currentDate = new Date().toLocaleDateString('en-NZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const greeting = params.recipientName 
    ? `Dear ${params.recipientName.split(' ')[0]},`
    : 'Dear Valued Client,';

  // Format content - preserve line breaks
  const formattedContent = params.content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  // Build attachments section
  const hasAttachments = params.attachments && params.attachments.length > 0;
  const hasLinks = params.links && params.links.length > 0;

  const attachmentsHTML = hasAttachments ? `
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0FDF4; border-radius: 12px; border: 1px solid #BBF7D0; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, ${BRAND.colors.primaryDark} 100%); padding: 14px 20px;">
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; font-weight: 600; color: #FFFFFF; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                📎 Attachments (${params.attachments!.length})
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${params.attachments!.map((att, index) => `
                  <tr>
                    <td style="padding: ${index > 0 ? '12px' : '0'} 0 0 0;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; border: 1px solid #D1FAE5; overflow: hidden;">
                        <tr>
                          <td style="padding: 14px 16px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td width="40" style="vertical-align: middle;">
                                  <div style="width: 36px; height: 36px; background-color: #ECFDF5; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">
                                    ${getFileIcon(att.type || att.name)}
                                  </div>
                                </td>
                                <td style="padding-left: 12px; vertical-align: middle;">
                                  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: ${BRAND.colors.text}; margin: 0; font-weight: 500;">
                                    ${att.name}
                                  </p>
                                  ${att.size ? `<p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: ${BRAND.colors.muted}; margin: 4px 0 0 0;">${formatFileSize(att.size)}</p>` : ''}
                                </td>
                                <td width="100" style="text-align: right; vertical-align: middle;">
                                  <a href="${att.url}" target="_blank" style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, ${BRAND.colors.primaryDark} 100%); color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                                    Download
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                `).join('')}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  const linksHTML = hasLinks ? `
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFBEB; border-radius: 12px; border: 1px solid #FDE68A; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #D97706 0%, #B45309 100%); padding: 14px 20px;">
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; font-weight: 600; color: #FFFFFF; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                🔗 Related Links (${params.links!.length})
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 20px;">
              ${params.links!.map((link, index) => `
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: ${index > 0 ? '12px' : '0'};">
                  <tr>
                    <td style="padding: 12px 16px; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #FDE68A;">
                      <a href="${link.url}" target="_blank" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #D97706; text-decoration: none; font-weight: 500;">
                        ${link.title} →
                      </a>
                    </td>
                  </tr>
                </table>
              `).join('')}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  // Signature
  const senderSignature = params.senderName ? `
    <tr>
      <td style="padding: 0 40px 32px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid ${BRAND.colors.border};">
          <tr>
            <td style="padding-top: 24px;">
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 15px; color: ${BRAND.colors.muted}; margin: 0; line-height: 1.8;">
                Kind regards,<br>
                <strong style="color: ${BRAND.colors.text}; font-size: 16px;">${params.senderName}</strong><br>
                <span style="color: ${BRAND.colors.primary}; font-size: 13px; font-weight: 500;">${BRAND.name}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : `
    <tr>
      <td style="padding: 0 40px 32px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid ${BRAND.colors.border};">
          <tr>
            <td style="padding-top: 24px; text-align: center;">
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: ${BRAND.colors.muted}; margin: 0; line-height: 1.8;">
                Yours sincerely,<br>
                <strong style="color: ${BRAND.colors.primary}; font-size: 16px;">${BRAND.name}</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

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
<body style="margin: 0; padding: 0; background-color: ${BRAND.colors.surface}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">

<!-- Preheader -->
<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
  ${params.content.substring(0, 120).replace(/\n/g, ' ')}...
</div>

<!-- Main Container -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: ${BRAND.colors.surface}; padding: 40px 20px;">
<tr>
<td align="center">
<table width="640" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 640px; width: 100%; background-color: ${BRAND.colors.background}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); table-layout: fixed;">

<!-- Header with Logo -->
<tr>
  <td style="background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, ${BRAND.colors.primaryDark} 100%); padding: 0;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="padding: 32px 40px; text-align: center;">
          <img src="${BRAND.logo}" alt="${BRAND.name}" width="200" height="auto" style="display: block; margin: 0 auto; max-width: 200px; height: auto;">
        </td>
      </tr>
      <tr>
        <td style="padding: 0 40px 24px 40px; text-align: center;">
          <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: rgba(255,255,255,0.85); margin: 0; letter-spacing: 0.75px; text-transform: uppercase;">
            ${BRAND.tagline}
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- Subject Banner -->
<tr>
  <td style="background-color: ${BRAND.colors.surface}; padding: 20px 40px; border-bottom: 1px solid ${BRAND.colors.border};">
    <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
      <tr>
        <td style="width: 100%; padding-right: 16px;">
          <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 18px; font-weight: 600; color: ${BRAND.colors.text}; margin: 0; word-wrap: break-word; overflow-wrap: break-word; word-break: normal; hyphens: none; -webkit-hyphens: none; -ms-hyphens: none;">
            ${params.subject}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 8px;">
          <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: ${BRAND.colors.muted}; margin: 0;">
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
    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 16px; color: ${BRAND.colors.text}; margin: 0; font-weight: 500;">
      ${greeting}
    </p>
  </td>
</tr>

<!-- Message Content -->
<tr>
  <td style="padding: 0 40px 24px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFAFA; border-radius: 12px; border: 1px solid ${BRAND.colors.border}; table-layout: fixed; max-width: 100%;">
      <tr>
        <td style="padding: 24px 28px; word-wrap: break-word; overflow-wrap: break-word; word-break: normal; hyphens: auto; -webkit-hyphens: auto;">
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 15px; color: ${BRAND.colors.text}; margin: 0; line-height: 1.7; word-wrap: break-word; overflow-wrap: break-word; word-break: normal; max-width: 100%; white-space: pre-wrap;">
            ${formattedContent}
          </div>
        </td>
      </tr>
    </table>
  </td>
</tr>

${attachmentsHTML}
${linksHTML}
${senderSignature}

<!-- Footer -->
<tr>
  <td style="background-color: ${BRAND.colors.primaryDark}; padding: 32px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <img src="${BRAND.logo}" alt="${BRAND.name}" width="140" height="auto" style="display: block; margin: 0 auto 16px auto; max-width: 140px; height: auto; opacity: 0.95;">
          
          <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #FFFFFF; margin: 0 0 12px 0;">
            ${BRAND.name}
          </p>
          
          <table cellpadding="0" cellspacing="0" style="margin: 0 auto 20px auto;">
            <tr>
              <td style="padding: 0 12px;">
                <a href="${BRAND.website}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; color: rgba(255,255,255,0.7); text-decoration: none;">Visit Website</a>
              </td>
              <td style="border-left: 1px solid rgba(255,255,255,0.3); padding: 0 12px;">
                <a href="mailto:${BRAND.email}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; color: rgba(255,255,255,0.7); text-decoration: none;">${BRAND.email}</a>
              </td>
            </tr>
          </table>
          
          <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; color: rgba(255,255,255,0.5); margin: 0; line-height: 1.6;">
            This email was sent via ${BRAND.name}.<br>
            You may reply directly to this email to continue the conversation.<br>
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
    console.error("[SEND-EMAIL] Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const payload: EmailRequest = await req.json();
    
    console.log("[SEND-EMAIL] Processing email request:", {
      to: payload.to,
      subject: payload.subject,
      senderName: payload.senderName,
      attachmentCount: payload.attachments?.length || 0,
      linkCount: payload.links?.length || 0
    });

    // Normalize attachments - handle both string[] and Attachment[]
    let normalizedAttachments: Attachment[] = [];
    if (payload.attachments) {
      normalizedAttachments = payload.attachments.map((att: any) => {
        if (typeof att === 'string') {
          // Legacy format: just a URL string
          const fileName = att.split('/').pop() || 'attachment';
          return { name: fileName, url: att, type: '', size: 0 };
        }
        return att;
      });
    }

    // Get the content - prefer body over html
    const messageContent = payload.body || payload.text || 
      (payload.html ? payload.html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '') : '');

    // Generate branded HTML
    const html = createBrandedEmailHTML({
      recipientName: payload.toName,
      subject: payload.subject,
      content: messageContent,
      senderName: payload.senderName,
      attachments: normalizedAttachments,
      links: payload.links
    });

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

    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    const displayName = payload.senderName 
      ? `${payload.senderName} via ${BRAND.name}` 
      : BRAND.name;

    // Generate a unique message-id for threading
    const emailMessageId = `<${crypto.randomUUID()}@wellingtonecobuild.nz>`;
    
    // Get contractor's personal email to CC (so they receive replies directly)
    const senderEmail = (payload as any).senderEmail;
    const ccList: string[] = [];
    
    // If sender has a personal email, add it to CC so they receive replies
    if (senderEmail && senderEmail !== gmailUser && senderEmail !== BRAND.email) {
      ccList.push(senderEmail);
      console.log("[SEND-EMAIL] Adding contractor CC:", senderEmail);
    }
    
    for (const recipient of recipients) {
      const sendOptions: any = {
        from: `${displayName} <${gmailUser}>`,
        to: recipient,
        replyTo: BRAND.email,
        subject: payload.subject,
        headers: {
          'Message-ID': emailMessageId,
        },
        mimeContent: [
          {
            mimeType: 'text/html; charset="utf-8"',
            content: html,
            transferEncoding: "8bit",
          },
        ],
      };
      
      // Add CC if we have one (contractor's personal email)
      if (ccList.length > 0) {
        sendOptions.cc = ccList;
      }
      
      await client.send(sendOptions);
      console.log("[SEND-EMAIL] Email sent successfully to:", recipient, ccList.length > 0 ? `(CC: ${ccList.join(', ')})` : '');
    }

    await client.close();

    // Log to database and create communication thread for reply tracking
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      try {
        // First log the email
        const { data: emailLog, error: logError } = await supabase.from('email_logs').insert({
          email_type: 'portal_direct',
          to_email: recipients[0],
          to_name: payload.toName || null,
          subject: payload.subject,
          body_html: html,
          body_text: messageContent,
          status: 'sent',
          sent_by: (payload as any).senderId || null,
          metadata: {
            sender_name: payload.senderName,
            attachment_count: normalizedAttachments.length,
            link_count: payload.links?.length || 0,
            branded: true,
            email_message_id: emailMessageId
          }
        }).select('id').single();

        if (logError) {
          console.error("[SEND-EMAIL] Failed to log email:", logError);
        } else {
          console.log("[SEND-EMAIL] Email logged:", emailLog?.id);
        }

        // Create a communication thread so replies can be tracked
        const senderId = (payload as any).senderId;
        const senderEmail = (payload as any).senderEmail;
        
        if (senderId) {
          // Create thread for this outbound email
          const { data: thread, error: threadError } = await supabase
            .from('communication_threads')
            .insert({
              subject: `RE: ${payload.subject}`,
              channel_type: 'email',
              initiator_id: senderId,
              initiator_email: senderEmail || BRAND.email,
              initiator_name: payload.senderName || BRAND.name,
              initiator_role: 'contractor',
              status: 'sent',
              priority: 'normal',
              category: 'client_email',
              external_recipient_email: recipients[0].toLowerCase().trim(),
              external_recipient_name: payload.toName || null,
              original_email_log_id: emailLog?.id || null,
              last_message_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (threadError) {
            console.error("[SEND-EMAIL] Failed to create thread:", threadError);
          } else if (thread) {
            console.log("[SEND-EMAIL] Communication thread created:", thread.id);

            // Add the outbound message to the thread
            await supabase.from('communication_messages').insert({
              thread_id: thread.id,
              sender_id: senderId,
              sender_email: senderEmail || BRAND.email,
              sender_name: payload.senderName || BRAND.name,
              sender_role: 'contractor',
              content: messageContent,
              html_content: html,
              email_message_id: emailMessageId
            });

            // Add sender as participant
            await supabase.from('communication_participants').insert({
              thread_id: thread.id,
              user_id: senderId,
              user_email: senderEmail,
              user_role: 'contractor',
              can_reply: true
            });

            // Log audit trail
            await supabase.from('communication_audit_log').insert({
              thread_id: thread.id,
              action: 'outbound_email_sent',
              actor_id: senderId,
              actor_email: senderEmail,
              actor_role: 'contractor',
              details: {
                to_email: recipients[0],
                to_name: payload.toName,
                subject: payload.subject,
                email_message_id: emailMessageId
              }
            });
          }
        }
      } catch (dbError) {
        console.error("[SEND-EMAIL] Database error:", dbError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[SEND-EMAIL] Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
