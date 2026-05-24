import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMPANY_NAME = "Wellington EcoBuild";
const COMPANY_LOGO = "https://duumxykzcliujgyrmzvn.supabase.co/storage/v1/object/public/avatars/wellington-ecobuild-logo-PQDk3oCl.png";
const PRIMARY_EMAIL = "info@wellingtonecobuild.nz";
const BASE_URL = "https://wellingtonecobuild.nz";

interface NotificationRequest {
  type: 
    | 'new_message'           // New message/thread created
    | 'reply_received'        // Reply to existing thread
    | 'contractor_email'      // Contractor sent external email
    | 'client_reply'          // Client replied to contractor email
    | 'admin_reply'           // Admin replied to thread
    | 'user_message';         // User sent message via inbox
  
  recipient_email: string;
  recipient_name?: string;
  recipient_type: 'admin' | 'contractor' | 'user';
  
  sender_name: string;
  sender_email?: string;
  
  subject: string;
  message_preview?: string;
  thread_id?: string;
  
  // Additional metadata
  metadata?: Record<string, any>;
}

const createNotificationEmail = (
  type: string,
  recipientName: string,
  senderName: string,
  subject: string,
  messagePreview: string,
  viewLink: string
): string => {
  const typeLabels: Record<string, { title: string; color: string; icon: string }> = {
    new_message: { title: 'New Message', color: '#3B82F6', icon: '📨' },
    reply_received: { title: 'New Reply', color: '#10B981', icon: '💬' },
    contractor_email: { title: 'Contractor Email', color: '#8B5CF6', icon: '📧' },
    client_reply: { title: 'Client Reply', color: '#F59E0B', icon: '📩' },
    admin_reply: { title: 'Admin Response', color: '#2D5A3D', icon: '✉️' },
    user_message: { title: 'User Message', color: '#EC4899', icon: '📝' },
  };

  const config = typeLabels[type] || typeLabels.new_message;
  const truncatedPreview = messagePreview.length > 200 
    ? messagePreview.substring(0, 200) + '...' 
    : messagePreview;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${config.title}: ${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F5F5F5; line-height: 1.6;">
<div style="padding: 24px;">
<div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

<!-- Header -->
<div style="background: linear-gradient(135deg, #2D5A3D 0%, #1E3D2A 100%); padding: 24px; text-align: center;">
<img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" style="max-width: 140px; height: auto;">
<p style="color: #FFFFFF; font-size: 12px; margin: 12px 0 0 0; opacity: 0.9;">${config.icon} ${config.title}</p>
</div>

<!-- Content -->
<div style="padding: 32px;">

<!-- Greeting -->
<p style="font-size: 16px; color: #374151; margin: 0 0 24px 0;">
Hi ${recipientName || 'there'},
</p>

<!-- Notification Banner -->
<div style="background-color: ${config.color}15; border-left: 4px solid ${config.color}; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
<p style="font-size: 14px; color: ${config.color}; margin: 0; font-weight: 600;">${config.icon} ${config.title}</p>
</div>

<!-- Message Details -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
<tr>
<td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
<span style="font-size: 13px; color: #6B7280; display: block;">From</span>
<span style="font-size: 15px; color: #1A1A1A; font-weight: 600;">${senderName}</span>
</td>
</tr>
<tr>
<td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB;">
<span style="font-size: 13px; color: #6B7280; display: block;">Subject</span>
<span style="font-size: 15px; color: #1A1A1A;">${subject}</span>
</td>
</tr>
</table>

<!-- Message Preview -->
<div style="background-color: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
<p style="font-size: 13px; color: #6B7280; margin: 0 0 8px 0; font-weight: 600;">Message Preview:</p>
<p style="font-size: 14px; color: #374151; margin: 0; white-space: pre-wrap; line-height: 1.6;">${truncatedPreview}</p>
</div>

<!-- CTA Button -->
<div style="text-align: center; margin: 24px 0;">
<a href="${viewLink}" style="display: inline-block; background: linear-gradient(135deg, #2D5A3D 0%, #1E3D2A 100%); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">View & Reply</a>
</div>

<p style="font-size: 13px; color: #6B7280; margin: 0; text-align: center;">
You can also reply directly to this email.
</p>

</div>

<!-- Footer -->
<div style="background-color: #F9FAFB; padding: 16px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
<p style="font-size: 12px; color: #9CA3AF; margin: 0;">&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
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
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!gmailUser || !gmailPassword) {
    console.error("[Send-Notification] Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const payload: NotificationRequest = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[Send-Notification] Processing:", payload.type, "to:", payload.recipient_email);

    const {
      type,
      recipient_email,
      recipient_name,
      recipient_type,
      sender_name,
      subject,
      message_preview,
      thread_id,
      metadata
    } = payload;

    // Determine view link based on recipient type
    let viewLink = BASE_URL;
    if (recipient_type === 'admin') {
      viewLink = `${BASE_URL}/admin/communications${thread_id ? `?thread=${thread_id}` : ''}`;
    } else if (recipient_type === 'contractor') {
      viewLink = `${BASE_URL}/portal/messages${thread_id ? `?thread=${thread_id}` : ''}`;
    } else {
      viewLink = `${BASE_URL}/inbox${thread_id ? `?thread=${thread_id}` : ''}`;
    }

    // Create email content
    const emailHtml = createNotificationEmail(
      type,
      recipient_name || recipient_email.split('@')[0],
      sender_name,
      subject,
      message_preview || '',
      viewLink
    );

    // Send email via Gmail SMTP
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
      to: recipient_email,
      replyTo: PRIMARY_EMAIL,
      subject: `[${COMPANY_NAME}] ${subject}`,
      mimeContent: [
        {
          mimeType: 'text/html; charset="utf-8"',
          content: emailHtml,
          transferEncoding: "8bit",
        },
      ],
    });

    await client.close();

    // Create admin notification record if notifying admin
    if (recipient_type === 'admin') {
      await supabase.from('admin_notifications').insert({
        type: type,
        title: subject,
        message: `From: ${sender_name}${message_preview ? ` - ${message_preview.substring(0, 100)}` : ''}`,
        metadata: {
          thread_id,
          sender_name,
          ...metadata
        }
      });
    }

    // Log the notification
    await supabase.from('email_logs').insert({
      to_email: recipient_email,
      to_name: recipient_name,
      subject: `[Notification] ${subject}`,
      email_type: `notification_${type}`,
      status: 'sent',
      metadata: {
        type,
        thread_id,
        recipient_type
      }
    });

    console.log("[Send-Notification] Notification sent successfully to:", recipient_email);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[Send-Notification] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
