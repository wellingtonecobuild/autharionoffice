import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
  }
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-DUNNING-EMAIL] ${step}${detailsStr}`);
};

interface DunningRequest {
  businessId: string;
  businessName: string;
  businessEmail: string;
  dunningType: 'renewal_reminder' | 'payment_failed' | 'final_notice';
  subscriptionPlan?: string;
  amount?: number;
  daysUntilRenewal?: number;
  attemptCount?: number;
}

const createBrandedEmail = (
  headerIcon: string,
  headerTitle: string,
  headerGradient: string,
  bodyContent: string,
  subject: string
): string => {
  const currentDate = new Date().toLocaleDateString('en-NZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">

<div style="display: none; max-height: 0; overflow: hidden;">${subject}</div>

<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 40px 20px;">
<tr>
<td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="max-width: 640px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); table-layout: fixed;">

<!-- Header with Logo -->
<tr>
  <td style="background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, ${BRAND.colors.primaryDark} 100%); padding: 32px 40px; text-align: center;">
    <img src="${BRAND.logo}" alt="${BRAND.name}" width="180" height="auto" style="display: block; margin: 0 auto; max-width: 180px; height: auto;">
  </td>
</tr>

<!-- Status Banner -->
<tr>
  <td style="background: ${headerGradient}; padding: 20px 40px; text-align: center;">
    <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 22px; font-weight: 700; color: #FFFFFF; margin: 0;">
      ${headerIcon} ${headerTitle}
    </h1>
  </td>
</tr>

<!-- Date Bar -->
<tr>
  <td style="background-color: #F1F5F9; padding: 12px 40px; text-align: right; border-bottom: 1px solid #E2E8F0;">
    <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #64748B; margin: 0;">
      ${currentDate}
    </p>
  </td>
</tr>

<!-- Main Content -->
<tr>
  <td style="padding: 40px; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word;">
    ${bodyContent}
  </td>
</tr>

<!-- Footer -->
<tr>
  <td style="background-color: ${BRAND.colors.primaryDark}; padding: 32px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <img src="${BRAND.logo}" alt="${BRAND.name}" width="120" height="auto" style="display: block; margin: 0 auto 16px auto; max-width: 120px; height: auto; opacity: 0.9;">
          
          <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #FFFFFF; margin: 0 0 4px 0;">
            ${BRAND.name}
          </p>
          <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; color: rgba(255,255,255,0.7); margin: 0 0 16px 0;">
            ${BRAND.tagline}
          </p>
          
          <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="padding: 0 12px;">
                <a href="${BRAND.website}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; color: rgba(255,255,255,0.7); text-decoration: none;">Visit Website</a>
              </td>
              <td style="border-left: 1px solid rgba(255,255,255,0.3); padding: 0 12px;">
                <a href="mailto:${BRAND.email}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; color: rgba(255,255,255,0.7); text-decoration: none;">${BRAND.email}</a>
              </td>
            </tr>
          </table>
          
          <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; color: rgba(255,255,255,0.5); margin: 20px 0 0 0; line-height: 1.6;">
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

const getDunningContent = (data: DunningRequest): { subject: string; html: string } => {
  const { businessName, dunningType, subscriptionPlan, amount, daysUntilRenewal, attemptCount } = data;
  const amountDisplay = amount ? `$${amount.toFixed(2)} NZD` : '';

  switch (dunningType) {
    case "renewal_reminder":
      return {
        subject: `Subscription Renewal Reminder - ${daysUntilRenewal} days remaining`,
        html: createBrandedEmail(
          "🔔",
          "Subscription Renewal Reminder",
          "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          `
            <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 16px; color: #1E293B; margin: 0 0 20px 0;">
              Hello <strong>${businessName}</strong>,
            </p>
            <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 15px; color: #374151; margin: 0 0 24px 0; line-height: 1.7;">
              This is a friendly reminder that your <strong>${subscriptionPlan}</strong> subscription will renew in <strong>${daysUntilRenewal} days</strong>.
            </p>
            ${amount ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0FDF4; border-radius: 12px; margin: 24px 0;">
              <tr>
                <td style="padding: 20px 24px;">
                  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #166534; margin: 0 0 8px 0; font-weight: 600;">
                    Subscription Amount
                  </p>
                  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 24px; color: #166534; margin: 0; font-weight: 700;">
                    ${amountDisplay}
                  </p>
                </td>
              </tr>
            </table>
            ` : ''}
            <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 15px; color: #374151; margin: 0 0 24px 0; line-height: 1.7;">
              No action is required if you want to continue your subscription. Your payment method on file will be charged automatically.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #DBEAFE; border-left: 4px solid #2563EB; border-radius: 0 8px 8px 0; margin: 24px 0;">
              <tr>
                <td style="padding: 16px 20px;">
                  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #1E40AF; margin: 0; font-weight: 600;">
                    Need to update your payment method?
                  </p>
                  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #1E40AF; margin: 8px 0 0 0;">
                    Log in to your dashboard and visit the subscription settings.
                  </p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
              <tr>
                <td align="center">
                  <a href="${BRAND.website}/dashboard" style="display: inline-block; background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, ${BRAND.colors.primaryDark} 100%); color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-weight: 600; font-size: 14px;">
                    Go to Dashboard
                  </a>
                </td>
              </tr>
            </table>
          `,
          `Subscription Renewal Reminder - ${daysUntilRenewal} days remaining`
        )
      };

    case "payment_failed":
      return {
        subject: `Action Required: Payment Failed for ${businessName}`,
        html: createBrandedEmail(
          "⚠️",
          "Payment Issue",
          "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          `
            <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 16px; color: #1E293B; margin: 0 0 20px 0;">
              Hello <strong>${businessName}</strong>,
            </p>
            <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 15px; color: #374151; margin: 0 0 24px 0; line-height: 1.7;">
              We were unable to process your subscription payment. This is attempt <strong>#${attemptCount || 1}</strong>.
            </p>
            ${amount ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF3C7; border-radius: 12px; margin: 24px 0;">
              <tr>
                <td style="padding: 20px 24px;">
                  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #92400E; margin: 0 0 8px 0; font-weight: 600;">
                    Amount Due
                  </p>
                  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 24px; color: #92400E; margin: 0; font-weight: 700;">
                    ${amountDisplay}
                  </p>
                </td>
              </tr>
            </table>
            ` : ''}
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 0 8px 8px 0; margin: 24px 0;">
              <tr>
                <td style="padding: 16px 20px;">
                  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #92400E; margin: 0; font-weight: 600;">
                    ⚡ Action Required
                  </p>
                  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #92400E; margin: 8px 0 0 0;">
                    Please update your payment method to avoid service interruption.
                  </p>
                </td>
              </tr>
            </table>
            <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #374151; margin: 24px 0 8px 0; font-weight: 600;">
              Common reasons for payment failure:
            </p>
            <ul style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #64748B; margin: 0 0 24px 0; padding-left: 20px; line-height: 1.8;">
              <li>Expired credit card</li>
              <li>Insufficient funds</li>
              <li>Card declined by issuer</li>
            </ul>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
              <tr>
                <td align="center">
                  <a href="${BRAND.website}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-weight: 600; font-size: 14px;">
                    Update Payment Method
                  </a>
                </td>
              </tr>
            </table>
          `,
          `Action Required: Payment Failed for ${businessName}`
        )
      };

    case "final_notice":
      return {
        subject: `FINAL NOTICE: Subscription Suspension Imminent - ${businessName}`,
        html: createBrandedEmail(
          "🚨",
          "Final Notice",
          "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          `
            <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 16px; color: #1E293B; margin: 0 0 20px 0;">
              Hello <strong>${businessName}</strong>,
            </p>
            <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 15px; color: #374151; margin: 0 0 24px 0; line-height: 1.7;">
              <strong>This is your final notice.</strong> We have attempted to process your subscription payment multiple times without success.
            </p>
            ${amount ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEE2E2; border-radius: 12px; margin: 24px 0;">
              <tr>
                <td style="padding: 20px 24px;">
                  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #991B1B; margin: 0 0 8px 0; font-weight: 600;">
                    Outstanding Amount
                  </p>
                  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 24px; color: #991B1B; margin: 0; font-weight: 700;">
                    ${amountDisplay}
                  </p>
                </td>
              </tr>
            </table>
            ` : ''}
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEE2E2; border-left: 4px solid #EF4444; border-radius: 0 8px 8px 0; margin: 24px 0;">
              <tr>
                <td style="padding: 16px 20px;">
                  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #991B1B; margin: 0; font-weight: 600;">
                    ⏰ Immediate Action Required
                  </p>
                  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #991B1B; margin: 8px 0 0 0;">
                    Your subscription will be suspended within 24 hours if payment is not received.
                  </p>
                </td>
              </tr>
            </table>
            <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 15px; color: #374151; margin: 0 0 24px 0; line-height: 1.7;">
              To maintain your listing and avoid service interruption, please update your payment method immediately.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
              <tr>
                <td align="center">
                  <a href="${BRAND.website}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-weight: 600; font-size: 14px;">
                    Update Payment Now
                  </a>
                </td>
              </tr>
            </table>
            <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #64748B; margin: 24px 0 0 0; text-align: center;">
              If you believe this is an error or need assistance, please contact us urgently at <a href="mailto:${BRAND.email}" style="color: ${BRAND.colors.primary};">${BRAND.email}</a>
            </p>
          `,
          `FINAL NOTICE: Subscription Suspension Imminent - ${businessName}`
        )
      };

    default:
      return {
        subject: `Subscription Update - ${BRAND.name}`,
        html: createBrandedEmail(
          "📋",
          "Subscription Update",
          `linear-gradient(135deg, ${BRAND.colors.primary} 0%, ${BRAND.colors.primaryDark} 100%)`,
          `<p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 15px; color: #374151;">Status update for ${businessName}</p>`,
          `Subscription Update - ${BRAND.name}`
        )
      };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const data: DunningRequest = await req.json();

    logStep("Processing dunning email", { businessId: data.businessId, dunningType: data.dunningType, businessEmail: data.businessEmail });

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("Gmail credentials not configured");
    }

    if (!data.businessEmail) {
      throw new Error("Business email is required");
    }

    const { subject, html } = getDunningContent(data);

    // Send email via Gmail SMTP
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailAppPassword,
        },
      },
    });

    await client.send({
      from: `${BRAND.name} <${gmailUser}>`,
      to: data.businessEmail,
      replyTo: BRAND.email,
      subject,
      mimeContent: [
        {
          mimeType: 'text/html; charset="utf-8"',
          content: html,
          transferEncoding: "8bit",
        },
      ],
    });

    await client.close();

    logStep("Dunning email sent via Gmail", { to: data.businessEmail, subject });

    // Record dunning attempt
    const { error: dunningError } = await supabaseClient
      .from("dunning_records")
      .insert({
        business_id: data.businessId,
        dunning_type: data.dunningType,
        attempt_count: data.attemptCount || 1,
        status: "sent",
        next_reminder_at: data.dunningType === "payment_failed" 
          ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      });

    if (dunningError) {
      logStep("Error recording dunning", { error: dunningError.message });
    }

    logStep("Dunning email sent successfully", { dunningType: data.dunningType, businessEmail: data.businessEmail });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
