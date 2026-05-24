import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createPasswordResetEmail,
  createVerificationEmail,
  createWelcomeEmail,
  createNotificationEmail,
  createArticleStatusEmail,
  EMAIL_SUBJECTS,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Official Wellington EcoBuild email
const BRANDED_EMAIL = "Info@wellingtonecobuild.nz";
const BRANDED_NAME = "Wellington EcoBuild";

interface AdminEmailRequest {
  to: string;
  type: 'password_reset' | 'verification' | 'welcome' | 'notification' | 'article_status';
  data: {
    recipientName?: string;
    resetLink?: string;
    verificationLink?: string;
    loginLink?: string;
    subject?: string;
    message?: string;
    ctaText?: string;
    ctaLink?: string;
    articleTitle?: string;
    status?: 'approved' | 'rejected';
    rejectionReason?: string;
    articleLink?: string;
  };
}

// Base64 encoding for SMTP AUTH
function base64Encode(str: string): string {
  return btoa(str);
}

// Send email using raw SMTP over TLS
async function sendEmailViaSMTP(
  gmailUser: string,
  gmailPassword: string,
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Connect to Gmail SMTP server
    const conn = await Deno.connectTls({
      hostname: "smtp.gmail.com",
      port: 465,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper to send a command and read response
    async function sendCommand(command: string): Promise<string> {
      await conn.write(encoder.encode(command + "\r\n"));
      const buffer = new Uint8Array(1024);
      const bytesRead = await conn.read(buffer);
      if (bytesRead === null) return "";
      return decoder.decode(buffer.subarray(0, bytesRead));
    }

    // Helper to read initial response
    async function readResponse(): Promise<string> {
      const buffer = new Uint8Array(1024);
      const bytesRead = await conn.read(buffer);
      if (bytesRead === null) return "";
      return decoder.decode(buffer.subarray(0, bytesRead));
    }

    // Read server greeting
    const greeting = await readResponse();
    console.log("SMTP Greeting:", greeting.trim());

    // Send EHLO
    const ehloResponse = await sendCommand(`EHLO smtp.gmail.com`);
    console.log("EHLO Response:", ehloResponse.substring(0, 100));

    // AUTH LOGIN
    const authResponse = await sendCommand("AUTH LOGIN");
    console.log("AUTH Response:", authResponse.trim());

    // Send username (base64 encoded)
    const userResponse = await sendCommand(base64Encode(gmailUser));
    console.log("User Response:", userResponse.trim());

    // Send password (base64 encoded)
    const passResponse = await sendCommand(base64Encode(gmailPassword));
    console.log("Pass Response:", passResponse.substring(0, 50));

    if (!passResponse.startsWith("235")) {
      throw new Error("SMTP Authentication failed: " + passResponse);
    }

    // MAIL FROM
    const mailFromResponse = await sendCommand(`MAIL FROM:<${gmailUser}>`);
    console.log("MAIL FROM Response:", mailFromResponse.trim());

    // RCPT TO
    const rcptToResponse = await sendCommand(`RCPT TO:<${to}>`);
    console.log("RCPT TO Response:", rcptToResponse.trim());

    // DATA
    const dataResponse = await sendCommand("DATA");
    console.log("DATA Response:", dataResponse.trim());

    // Generate message ID
    const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@wellingtonecobuild.nz>`;

    // Build email message with proper headers
    const boundary = "----=_Part_" + Math.random().toString(36).substring(2);
    const emailMessage = [
      `From: "${BRANDED_NAME}" <${gmailUser}>`,
      `Reply-To: ${BRANDED_EMAIL}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `X-Mailer: Wellington EcoBuild Admin`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      `${subject} - Please view this email in an HTML-capable email client.`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      htmlContent,
      ``,
      `--${boundary}--`,
      `.`,
    ].join("\r\n");

    // Send the email content
    await conn.write(encoder.encode(emailMessage + "\r\n"));
    const sendResponse = await readResponse();
    console.log("Send Response:", sendResponse.trim());

    // QUIT
    await sendCommand("QUIT");

    // Close connection
    conn.close();

    if (sendResponse.startsWith("250")) {
      return { success: true, messageId };
    } else {
      return { success: false, error: sendResponse };
    }
  } catch (error: any) {
    console.error("SMTP Error:", error);
    return { success: false, error: error.message };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!gmailUser || !gmailPassword) {
    console.error("Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD secrets." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Get the authorization header to identify the sender
  const authHeader = req.headers.get('authorization');
  let senderId: string | null = null;

  if (authHeader) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    senderId = user?.id || null;
  }

  let requestBody: AdminEmailRequest | null = null;

  try {
    requestBody = await req.json();
    const { to, type, data } = requestBody!;
    
    console.log("Sending admin email:", { to, type, senderId });

    let html: string;
    let subject: string;

    switch (type) {
      case 'password_reset':
        if (!data.resetLink) {
          throw new Error("resetLink is required for password reset emails");
        }
        html = createPasswordResetEmail({
          recipientName: data.recipientName,
          resetLink: data.resetLink,
        });
        subject = EMAIL_SUBJECTS.passwordReset;
        break;

      case 'verification':
        if (!data.verificationLink) {
          throw new Error("verificationLink is required for verification emails");
        }
        html = createVerificationEmail({
          recipientName: data.recipientName,
          verificationLink: data.verificationLink,
        });
        subject = EMAIL_SUBJECTS.verification;
        break;

      case 'welcome':
        html = createWelcomeEmail({
          recipientName: data.recipientName,
          loginLink: data.loginLink,
        });
        subject = EMAIL_SUBJECTS.welcome;
        break;

      case 'notification':
        if (!data.subject || !data.message) {
          throw new Error("subject and message are required for notification emails");
        }
        html = createNotificationEmail({
          recipientName: data.recipientName,
          subject: data.subject,
          message: data.message,
          ctaText: data.ctaText,
          ctaLink: data.ctaLink,
        });
        subject = data.subject;
        break;

      case 'article_status':
        if (!data.articleTitle || !data.status) {
          throw new Error("articleTitle and status are required for article status emails");
        }
        html = createArticleStatusEmail({
          recipientName: data.recipientName,
          articleTitle: data.articleTitle,
          status: data.status,
          rejectionReason: data.rejectionReason,
          articleLink: data.articleLink,
        });
        subject = data.status === 'approved' 
          ? EMAIL_SUBJECTS.articleApproved 
          : EMAIL_SUBJECTS.articleRejected;
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    // Send email using raw SMTP
    const result = await sendEmailViaSMTP(gmailUser, gmailPassword, to, subject, html);

    if (!result.success) {
      throw new Error(result.error || "Failed to send email");
    }

    console.log("Admin email sent successfully:", { messageId: result.messageId, to });

    // Log the email to the database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        to_email: to,
        to_name: data.recipientName || null,
        subject: subject,
        email_type: type,
        status: 'sent',
        sent_by: senderId,
        metadata: {
          ctaText: data.ctaText,
          ctaLink: data.ctaLink,
          messageId: result.messageId,
          brandedEmail: BRANDED_EMAIL,
        }
      });

    if (logError) {
      console.error("Failed to log email:", logError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully", messageId: result.messageId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending admin email:", error);

    // Log the failed email
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase
        .from('email_logs')
        .insert({
          to_email: requestBody?.to || 'unknown',
          to_name: requestBody?.data?.recipientName || null,
          subject: requestBody?.data?.subject || 'Unknown',
          email_type: requestBody?.type || 'unknown',
          status: 'failed',
          error_message: error.message,
          sent_by: senderId,
        });
    } catch (logErr) {
      console.error("Failed to log failed email:", logErr);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
