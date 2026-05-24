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

interface LeadNotificationRequest {
  businessId: string;
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
  leadMessage: string;
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
    console.error("[NOTIFY-LEAD] Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { businessId, leadName, leadEmail, leadPhone, leadMessage }: LeadNotificationRequest = await req.json();
    
    console.log("[NOTIFY-LEAD] Processing lead notification for business:", businessId);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("name, email")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      console.error("[NOTIFY-LEAD] Business not found:", bizError);
      return new Response(
        JSON.stringify({ error: "Business not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!business.email) {
      console.log("[NOTIFY-LEAD] Business has no email configured, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No business email configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[NOTIFY-LEAD] Sending lead notification to:", business.email);

    // Format timestamp in NZ time
    const nzTime = new Date().toLocaleString('en-NZ', { 
      timeZone: 'Pacific/Auckland',
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New Customer Enquiry via Wellington EcoBuild</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0;">
<div style="padding: 20px;">
<div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); table-layout: fixed; word-wrap: break-word; overflow-wrap: break-word;">

<!-- Header with Logo -->
<div style="background: linear-gradient(135deg, #2D5A3D 0%, #1E3D2A 100%); padding: 30px; text-align: center;">
<img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" style="max-width: 160px; height: auto; margin-bottom: 16px;">
<h1 style="color: white; margin: 0; font-size: 24px;">New Customer Enquiry</h1>
</div>

<!-- Divider Line -->
<div style="height: 4px; background: linear-gradient(90deg, #2D5A3D, #4A7C59, #2D5A3D);"></div>

<!-- Main Content -->
<div style="padding: 30px; background: #ffffff;">

<!-- MANDATORY: Platform identification -->
<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
<p style="margin: 0; color: #166534; font-weight: 600; font-size: 15px;">
You received this message via Wellington EcoBuild
</p>
</div>

<p style="margin: 0 0 20px 0; color: #374151;">You have received a new enquiry for <strong>${business.name}</strong>.</p>

<!-- Sender Details -->
<div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
<h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Contact Details</h3>

<div style="margin-bottom: 12px;">
<div style="font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Sender Name</div>
<div style="margin-top: 4px; color: #1f2937; font-size: 15px;">${leadName}</div>
</div>

<div style="margin-bottom: 12px;">
<div style="font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Sender Email</div>
<div style="margin-top: 4px; color: #1f2937; font-size: 15px;"><a href="mailto:${leadEmail}" style="color: #2D5A3D; text-decoration: none;">${leadEmail}</a></div>
</div>

${leadPhone ? `<div style="margin-bottom: 12px;">
<div style="font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Phone</div>
<div style="margin-top: 4px; color: #1f2937; font-size: 15px;"><a href="tel:${leadPhone}" style="color: #2D5A3D; text-decoration: none;">${leadPhone}</a></div>
</div>` : ''}

<div>
<div style="font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Timestamp (NZ)</div>
<div style="margin-top: 4px; color: #1f2937; font-size: 15px;">${nzTime}</div>
</div>
</div>

<!-- Message Content -->
<div style="margin-bottom: 24px;">
<div style="font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Message</div>
<div style="padding: 16px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #2D5A3D; white-space: pre-wrap; color: #1f2937; font-size: 15px; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; max-width: 100%;">${leadMessage}</div>
</div>

<!-- Reply Button -->
<div style="text-align: center;">
<a href="mailto:${leadEmail}?subject=Re: Your enquiry to ${business.name}" style="display: inline-block; background: #2D5A3D; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Reply to ${leadName}</a>
</div>

</div>

<!-- Divider Line -->
<div style="height: 1px; background: #e5e7eb;"></div>

<!-- Footer -->
<div style="background: #f9fafb; padding: 24px; text-align: center;">
<img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" style="max-width: 100px; height: auto; margin-bottom: 12px; opacity: 0.8;">
<p style="font-size: 14px; font-weight: 600; color: #2D5A3D; margin: 0 0 4px 0;">${COMPANY_NAME}</p>
<p style="font-size: 13px; color: #6b7280; margin: 0 0 4px 0;">
<a href="https://wellingtonecobuild.nz" style="color: #6b7280; text-decoration: none;">wellingtonecobuild.nz</a>
</p>
<p style="font-size: 13px; color: #6b7280; margin: 0 0 16px 0;">
<a href="mailto:${PRIMARY_EMAIL}" style="color: #6b7280; text-decoration: none;">${PRIMARY_EMAIL}</a>
</p>

<!-- Mandatory Disclaimer -->
<div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 8px;">
<p style="font-size: 11px; color: #9ca3af; margin: 0; line-height: 1.5;">
This message was sent via Wellington EcoBuild's verified lead system.
</p>
</div>
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
      replyTo: leadEmail,
      subject: `New Enquiry from ${leadName} - Wellington EcoBuild`,
      // IMPORTANT: Avoid quoted-printable to prevent visible "=20" artifacts
      mimeContent: [
        {
          mimeType: 'text/html; charset="utf-8"',
          content: html,
          transferEncoding: "8bit",
        },
      ],
    });

    await client.close();
    console.log("[NOTIFY-LEAD] Lead notification sent successfully to:", business.email);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent to business" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[NOTIFY-LEAD] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
