import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import {
  createPasswordResetEmail,
  createVerificationEmail,
  createWelcomeEmail,
  createNotificationEmail,
  createArticleStatusEmail,
  createContractorOnboardingEmail,
  EMAIL_SUBJECTS,
} from "../_shared/email-templates.ts";

// Official company branding
const COMPANY_EMAIL = "info@wellingtonecobuild.nz";
const COMPANY_NAME = "Wellington EcoBuild";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BrandedEmailRequest {
  to: string;
  type: 'password_reset' | 'verification' | 'welcome' | 'notification' | 'article_status' | 'contractor_onboarding';
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!gmailUser || !gmailPassword) {
    console.error("Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { to, type, data }: BrandedEmailRequest = await req.json();
    
    console.log("Sending branded email:", { to, type });

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

      case 'contractor_onboarding':
        html = createContractorOnboardingEmail({
          recipientName: data.recipientName,
        });
        subject = EMAIL_SUBJECTS.contractorOnboarding;
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

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

    // Send with Wellington EcoBuild branding
    await client.send({
      from: `${COMPANY_NAME} <${gmailUser}>`,
      to: to,
      subject: subject,
      content: `${subject} - Please view this email in an HTML-capable email client.`,
      html: html,
    });

    console.log("Branded email sent successfully to:", to);

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending branded email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
