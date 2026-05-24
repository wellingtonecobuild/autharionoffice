import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SINGLE EMAIL SYSTEM - All communications use info@wellingtonecobuild.nz
const PRIMARY_EMAIL = "info@wellingtonecobuild.nz";
const COMPANY_NAME = "Wellington EcoBuild";
const COMPANY_LOGO = "https://duumxykzcliujgyrmzvn.supabase.co/storage/v1/object/public/avatars/wellington-ecobuild-logo-PQDk3oCl.png";

interface ReviewNotificationRequest {
  businessId: string;
  rating: number;
  reviewText?: string;
  reviewerName?: string;
  isAutoPublished?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!gmailUser || !gmailPassword) {
    console.error("[NOTIFY-REVIEW] Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { businessId, rating, reviewText, reviewerName, isAutoPublished }: ReviewNotificationRequest = await req.json();
    
    console.log("[NOTIFY-REVIEW] Processing review notification for business:", businessId);

    // Get business details
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("name, email")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      console.error("[NOTIFY-REVIEW] Business not found:", bizError);
      return new Response(
        JSON.stringify({ error: "Business not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!business.email) {
      console.log("[NOTIFY-REVIEW] Business has no email configured, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No business email configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[NOTIFY-REVIEW] Sending review notification to:", business.email);

    // Generate star display
    const filledStars = "★".repeat(rating);
    const emptyStars = "☆".repeat(5 - rating);
    const starsDisplay = filledStars + emptyStars;
    const ratingText = rating === 5 ? "Excellent" : rating === 4 ? "Very Good" : rating === 3 ? "Good" : rating === 2 ? "Fair" : "Poor";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New Review - ${COMPANY_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F5F5F5; line-height: 1.6;">
<div style="padding: 24px;">
<div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
<div style="background: linear-gradient(135deg, #2D5A3D 0%, #1E3D2A 100%); padding: 32px 24px; text-align: center;">
<img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" style="max-width: 180px; height: auto;">
</div>
<div style="padding: 40px 32px;">
<h1 style="font-size: 24px; font-weight: 700; color: #1A1A1A; margin: 0 0 8px 0; text-align: center;">⭐ New Review Submitted</h1>
<p style="font-size: 14px; color: #6B7280; margin: 0 0 24px 0; text-align: center;">for ${business.name}</p>

<p style="font-size: 16px; color: #374151; margin: 0 0 24px 0;">Great news! Someone has left a review for your business on Wellington EcoBuild.</p>

<div style="text-align: center; padding: 20px 0; background: #F9FAFB; border-radius: 8px; margin-bottom: 24px;">
<div style="font-size: 32px; color: #F59E0B; letter-spacing: 2px;">${starsDisplay}</div>
<div style="font-size: 14px; color: #6B7280; margin-top: 8px;">${rating} out of 5 stars - ${ratingText}</div>
</div>

${reviewText ? `
<div style="background-color: #F9FAFB; border-left: 4px solid #2D5A3D; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
<p style="font-size: 15px; color: #374151; margin: 0; white-space: pre-wrap; font-style: italic;">"${reviewText}"</p>
${reviewerName ? `<p style="font-size: 14px; color: #6B7280; margin: 12px 0 0 0;">— ${reviewerName}</p>` : ''}
</div>
` : '<p style="color: #6B7280; font-style: italic;">No written review provided.</p>'}

${isAutoPublished ? `
<div style="background-color: #D1FAE5; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
<p style="margin: 0; font-size: 14px; color: #065F46;"><strong>✅ Live Now:</strong> This review has been automatically published and is now visible on your listing.</p>
</div>
` : `
<div style="background-color: #FEF3C7; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
<p style="margin: 0; font-size: 14px; color: #92400E;"><strong>📋 Note:</strong> This review is currently pending moderation. Once approved by our team, it will appear on your public listing.</p>
</div>
`}

<div style="text-align: center; margin: 32px 0;">
<a href="https://wellingtonecobuild.nz/dashboard" style="display: inline-block; background: linear-gradient(135deg, #2D5A3D 0%, #1E3D2A 100%); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Dashboard</a>
</div>
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
      to: business.email,
      replyTo: PRIMARY_EMAIL,
      subject: `⭐ New ${rating}-Star Review - ${COMPANY_NAME}`,
      mimeContent: [
        {
          mimeType: 'text/html; charset="utf-8"',
          content: html,
          transferEncoding: "8bit",
        },
      ],
    });

    await client.close();
    console.log("[NOTIFY-REVIEW] Review notification sent successfully to:", business.email);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent to business" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[NOTIFY-REVIEW] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
