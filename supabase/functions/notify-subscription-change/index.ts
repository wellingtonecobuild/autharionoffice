import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createSystemThread } from "../_shared/communication-hub.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SINGLE EMAIL SYSTEM - All communications use info@wellingtonecobuild.nz
const PRIMARY_EMAIL = "info@wellingtonecobuild.nz";
const COMPANY_NAME = "Wellington EcoBuild";
const COMPANY_LOGO = "https://duumxykzcliujgyrmzvn.supabase.co/storage/v1/object/public/avatars/wellington-ecobuild-logo-PQDk3oCl.png";

interface NotifyRequest {
  businessName: string;
  ownerEmail: string;
  changeType: "upgraded" | "downgraded" | "cancelled" | "created" | "paused" | "resumed";
  oldPlan?: string;
  newPlan?: string;
  reason?: string;
  effectiveDate?: string;
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  free: "Free",
  premium: "Premium",
  elite: "Elite",
};

const PLAN_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  free: { bg: "#f3f4f6", text: "#374151", gradient: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)" },
  premium: { bg: "#f3e8ff", text: "#7c3aed", gradient: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)" },
  elite: { bg: "#fef3c7", text: "#d97706", gradient: "linear-gradient(135deg, #f59e0b 0%, #eab308 100%)" },
};

const wrapEmail = (headerIcon: string, headerText: string, headerGradient: string, bodyContent: string) => `<!DOCTYPE html>
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
<div style="background: ${headerGradient}; padding: 24px; text-align: center;">
<h1 style="color: white; margin: 0; font-size: 24px;">${headerIcon} ${headerText}</h1>
</div>
<div style="padding: 32px;">
${bodyContent}
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!gmailUser || !gmailPassword) {
    console.error("[NOTIFY-SUBSCRIPTION-CHANGE] Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { 
      businessName, 
      ownerEmail, 
      changeType, 
      oldPlan = "free", 
      newPlan = "free", 
      reason,
      effectiveDate 
    }: NotifyRequest = await req.json();
    
    console.log(`[NOTIFY-SUBSCRIPTION-CHANGE] Sending ${changeType} notification to:`, ownerEmail);

    const oldPlanDisplay = PLAN_DISPLAY_NAMES[oldPlan] || oldPlan;
    const newPlanDisplay = PLAN_DISPLAY_NAMES[newPlan] || newPlan;
    const newPlanColors = PLAN_COLORS[newPlan] || PLAN_COLORS.free;
    const effectiveDateStr = effectiveDate || new Date().toLocaleDateString('en-NZ', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    let subject = "";
    let content = "";
    let gradient = "";

    switch (changeType) {
      case "upgraded":
        subject = `🎉 Subscription upgraded to ${newPlanDisplay}!`;
        gradient = newPlanColors.gradient;
        content = `
<p style="font-size: 18px; margin-bottom: 20px;">Great news! Your subscription for <strong>"${businessName}"</strong> has been upgraded.</p>

<div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
<table style="width: 100%; border-collapse: collapse;">
<tr><td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">Previous Plan:</td>
<td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #E5E7EB;"><span style="background: #F3F4F6; color: #6B7280; padding: 4px 12px; border-radius: 20px; font-size: 14px;">${oldPlanDisplay}</span></td></tr>
<tr><td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">New Plan:</td>
<td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #E5E7EB;"><span style="background: ${newPlanColors.bg}; color: ${newPlanColors.text}; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">${newPlanDisplay}</span></td></tr>
<tr><td style="padding: 10px 0; color: #6B7280;">Effective Date:</td>
<td style="padding: 10px 0; text-align: right; font-weight: 600;">${effectiveDateStr}</td></tr>
</table>
</div>

<div style="text-align: center; margin: 24px 0;">
<a href="https://wellingtonecobuild.nz/dashboard" style="display: inline-block; background: ${newPlanColors.gradient}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Dashboard</a>
</div>

<p style="font-size: 14px; color: #6B7280;">Thank you for upgrading! Questions? Contact us at <a href="mailto:${PRIMARY_EMAIL}" style="color: #2D5A3D;">${PRIMARY_EMAIL}</a></p>
        `;
        break;

      case "downgraded":
        subject = `Subscription changed to ${newPlanDisplay}`;
        gradient = "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)";
        content = `
<p style="font-size: 18px; margin-bottom: 20px;">Your subscription for <strong>"${businessName}"</strong> has been updated.</p>

<div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
<table style="width: 100%; border-collapse: collapse;">
<tr><td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">Previous Plan:</td>
<td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #E5E7EB;"><span style="text-decoration: line-through; color: #9CA3AF;">${oldPlanDisplay}</span></td></tr>
<tr><td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">New Plan:</td>
<td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #E5E7EB;"><span style="background: ${newPlanColors.bg}; color: ${newPlanColors.text}; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">${newPlanDisplay}</span></td></tr>
<tr><td style="padding: 10px 0; color: #6B7280;">Effective Date:</td>
<td style="padding: 10px 0; text-align: right; font-weight: 600;">${effectiveDateStr}</td></tr>
</table>
</div>

${reason ? `<div style="background: #FEF3C7; padding: 16px 20px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0; color: #78350F;"><strong>Note:</strong> ${reason}</p></div>` : ''}

<div style="text-align: center; margin: 24px 0;">
<a href="https://wellingtonecobuild.nz/dashboard" style="display: inline-block; background: #2563EB; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Manage Your Plan</a>
</div>
        `;
        break;

      case "cancelled":
        subject = `⚠️ Subscription cancelled`;
        gradient = "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)";
        content = `
<p style="font-size: 18px; margin-bottom: 20px;">Your subscription for <strong>"${businessName}"</strong> has been cancelled.</p>

<div style="background: #F9FAFB; padding: 20px; border-radius: 8px; border-left: 4px solid #DC2626; margin: 20px 0;">
<table style="width: 100%; border-collapse: collapse;">
<tr><td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">Previous Plan:</td>
<td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #E5E7EB;">${oldPlanDisplay}</td></tr>
<tr><td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">Status:</td>
<td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #E5E7EB;"><span style="background: #FEE2E2; color: #DC2626; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">Cancelled</span></td></tr>
<tr><td style="padding: 10px 0; color: #6B7280;">Date:</td>
<td style="padding: 10px 0; text-align: right; font-weight: 600;">${effectiveDateStr}</td></tr>
</table>
</div>

${reason ? `<div style="background: #FEF2F2; padding: 16px 20px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0; color: #991B1B;"><strong>Reason:</strong> ${reason}</p></div>` : ''}

<div style="background: #F0FDF4; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
<p style="margin: 0; color: #166534;"><strong>Your listing remains on Free plan</strong><br>Your business is still listed with Free plan features. Resubscribe anytime to unlock premium benefits.</p>
</div>

<div style="text-align: center; margin: 24px 0;">
<a href="https://wellingtonecobuild.nz/pricing" style="display: inline-block; background: #16A34A; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Plans</a>
</div>

<p style="font-size: 14px; color: #6B7280;">We're sorry to see you go. Feedback? Let us know at <a href="mailto:${PRIMARY_EMAIL}" style="color: #2D5A3D;">${PRIMARY_EMAIL}</a></p>
        `;
        break;

      case "created":
        subject = `🎉 Welcome to ${newPlanDisplay}!`;
        gradient = newPlanColors.gradient;
        content = `
<p style="font-size: 18px; margin-bottom: 20px;">Your <strong>${newPlanDisplay}</strong> subscription for <strong>"${businessName}"</strong> is now active!</p>

<div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
<table style="width: 100%; border-collapse: collapse;">
<tr><td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">Plan:</td>
<td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #E5E7EB;"><span style="background: ${newPlanColors.bg}; color: ${newPlanColors.text}; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">${newPlanDisplay}</span></td></tr>
<tr><td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">Status:</td>
<td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #E5E7EB;"><span style="background: #DCFCE7; color: #16A34A; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">Active</span></td></tr>
<tr><td style="padding: 10px 0; color: #6B7280;">Start Date:</td>
<td style="padding: 10px 0; text-align: right; font-weight: 600;">${effectiveDateStr}</td></tr>
</table>
</div>

<div style="text-align: center; margin: 24px 0;">
<a href="https://wellingtonecobuild.nz/dashboard" style="display: inline-block; background: ${newPlanColors.gradient}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Go to Dashboard</a>
</div>

<p style="font-size: 14px; color: #6B7280;">Thank you for joining! Questions? Contact us at <a href="mailto:${PRIMARY_EMAIL}" style="color: #2D5A3D;">${PRIMARY_EMAIL}</a></p>
        `;
        break;

      case "paused":
        subject = `⏸️ Subscription paused`;
        gradient = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
        content = `
<p style="font-size: 18px; margin-bottom: 20px;">Your subscription for <strong>"${businessName}"</strong> has been paused.</p>

<div style="background: #FEF3C7; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
<p style="margin: 0; color: #92400E;">Your listing will remain visible but premium features are temporarily disabled. Resume anytime from your dashboard.</p>
</div>

<div style="text-align: center; margin: 24px 0;">
<a href="https://wellingtonecobuild.nz/dashboard" style="display: inline-block; background: #F59E0B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Resume Subscription</a>
</div>
        `;
        break;

      case "resumed":
        subject = `▶️ Subscription resumed!`;
        gradient = "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)";
        content = `
<p style="font-size: 18px; margin-bottom: 20px;">Welcome back! Your subscription for <strong>"${businessName}"</strong> has been resumed.</p>

<div style="background: #DCFCE7; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
<p style="margin: 0; color: #166534;">Your ${newPlanDisplay} plan is now active. All premium features have been restored.</p>
</div>

<div style="text-align: center; margin: 24px 0;">
<a href="https://wellingtonecobuild.nz/dashboard" style="display: inline-block; background: #16A34A; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Dashboard</a>
</div>
        `;
        break;
    }

    const html = wrapEmail(changeType === 'upgraded' ? '🎉' : changeType === 'cancelled' ? '⚠️' : changeType === 'paused' ? '⏸️' : changeType === 'resumed' ? '▶️' : '', subject.replace(/^[^\s]+\s/, ''), gradient, content);

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
    console.log("[NOTIFY-SUBSCRIPTION-CHANGE] Email sent successfully to:", ownerEmail);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[NOTIFY-SUBSCRIPTION-CHANGE] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
