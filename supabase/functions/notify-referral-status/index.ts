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

interface ReferralStatusRequest {
  referrerEmail: string;
  referrerName: string;
  referredCompanyName: string;
  referralPlan: string;
  rewardAmount: number;
  status: "approved" | "paid" | "rejected";
  rejectionReason?: string;
}

function getEmailContent(data: ReferralStatusRequest): { subject: string; html: string } {
  const { referrerName, referredCompanyName, referralPlan, rewardAmount, status, rejectionReason } = data;
  const firstName = referrerName.split(' ')[0];

  const wrapEmail = (headerIcon: string, headerText: string, gradient: string, content: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${headerText} - ${COMPANY_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F5F5F5; line-height: 1.6;">
<div style="padding: 24px;">
<div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
<div style="background: linear-gradient(135deg, #2D5A3D 0%, #1E3D2A 100%); padding: 24px; text-align: center;">
<img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" style="max-width: 160px; height: auto;">
</div>
<div style="background: ${gradient}; padding: 24px; text-align: center;">
<h1 style="color: white; margin: 0; font-size: 24px;">${headerIcon} ${headerText}</h1>
</div>
<div style="padding: 32px;">
${content}
</div>
<div style="background-color: #F9FAFB; padding: 24px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
<p style="font-size: 16px; font-weight: 600; color: #2D5A3D; margin: 0 0 4px 0;">${COMPANY_NAME}</p>
<a href="mailto:${PRIMARY_EMAIL}" style="font-size: 14px; color: #2D5A3D; text-decoration: none;">${PRIMARY_EMAIL}</a>
<p style="font-size: 12px; color: #9CA3AF; margin-top: 16px;">&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. Building a Sustainable Future.</p>
</div>
</div>
</div>
</body>
</html>`;

  if (status === "approved") {
    return {
      subject: `Great news! Your referral has been approved - ${COMPANY_NAME}`,
      html: wrapEmail("🎉", "Referral Approved!", "linear-gradient(135deg, #16a34a, #22c55e)", `
<p style="font-size: 16px; color: #374151;">Hi ${firstName},</p>
<p style="font-size: 16px; color: #374151;">Excellent news! Your referral for <strong>${referredCompanyName}</strong> has been approved.</p>

<div style="background: #DCFCE7; border-left: 4px solid #16a34a; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
<p style="margin: 0 0 8px 0; font-weight: 600; color: #166534;">Referral Details:</p>
<p style="margin: 4px 0; color: #166534;">Company: ${referredCompanyName}</p>
<p style="margin: 4px 0; color: #166534;">Plan: ${referralPlan.charAt(0).toUpperCase() + referralPlan.slice(1)}</p>
<p style="margin: 8px 0 0 0; font-size: 28px; font-weight: bold; color: #16a34a;">Reward: $${rewardAmount}</p>
</div>

<p style="font-size: 16px; color: #374151;">Your reward is now pending and will be processed once the referred business completes their first subscription payment.</p>
<p style="font-size: 16px; color: #374151;">Thank you for helping grow Wellington's sustainable construction network!</p>

<p style="font-size: 16px; color: #374151; margin-top: 24px;">Best regards,<br>The ${COMPANY_NAME} Team</p>
      `),
    };
  }

  if (status === "paid") {
    return {
      subject: `You've been paid! $${rewardAmount} reward - ${COMPANY_NAME}`,
      html: wrapEmail("💰", "Payment Sent!", "linear-gradient(135deg, #059669, #10b981)", `
<p style="font-size: 16px; color: #374151;">Hi ${firstName},</p>
<p style="font-size: 16px; color: #374151;">Great news! Your referral reward has been processed and sent.</p>

<div style="background: #D1FAE5; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
<p style="font-size: 48px; font-weight: bold; color: #059669; margin: 0;">$${rewardAmount}</p>
<p style="font-size: 16px; color: #065F46; margin: 8px 0 0 0;">for referring ${referredCompanyName}</p>
</div>

<p style="font-size: 16px; color: #374151;">Thank you for being an amazing referral partner! Keep referring businesses to earn more rewards.</p>

<p style="font-size: 16px; color: #374151; margin-top: 24px;">Best regards,<br>The ${COMPANY_NAME} Team</p>
      `),
    };
  }

  // Rejected status
  return {
    subject: `Update on your referral - ${COMPANY_NAME}`,
    html: wrapEmail("", "Referral Update", "linear-gradient(135deg, #6b7280, #9ca3af)", `
<p style="font-size: 16px; color: #374151;">Hi ${firstName},</p>
<p style="font-size: 16px; color: #374151;">We're writing to let you know about your referral for <strong>${referredCompanyName}</strong>.</p>

<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
<p style="margin: 0; font-weight: 600; color: #92400E;">Status: Unfortunately, this referral could not be approved.</p>
${rejectionReason ? `<p style="margin: 8px 0 0 0; color: #78350F;">Reason: ${rejectionReason}</p>` : ''}
</div>

<p style="font-size: 16px; color: #374151;">Don't be discouraged! We appreciate your efforts in growing our community. Please feel free to submit new referrals anytime.</p>
<p style="font-size: 16px; color: #374151;">If you have any questions, please don't hesitate to contact us.</p>

<p style="font-size: 16px; color: #374151; margin-top: 24px;">Best regards,<br>The ${COMPANY_NAME} Team</p>
    `),
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!gmailUser || !gmailPassword) {
    console.error("[NOTIFY-REFERRAL-STATUS] Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const data: ReferralStatusRequest = await req.json();
    
    console.log("[NOTIFY-REFERRAL-STATUS] Sending notification:", {
      to: data.referrerEmail,
      status: data.status,
      company: data.referredCompanyName,
    });

    const { subject, html } = getEmailContent(data);

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
      to: data.referrerEmail,
      replyTo: PRIMARY_EMAIL,
      subject: subject,
      mimeContent: [
        {
          mimeType: 'text/html; charset="utf-8"',
          content: html,
          transferEncoding: "8bit",
        },
      ],
    });

    await client.close();
    console.log("[NOTIFY-REFERRAL-STATUS] Email sent successfully to:", data.referrerEmail);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[NOTIFY-REFERRAL-STATUS] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
