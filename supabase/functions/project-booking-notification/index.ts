import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingNotificationRequest {
  bookingId: string;
  businessId: string;
  customerName: string;
  customerEmail: string;
  projectType: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { bookingId, businessId, customerName, customerEmail, projectType }: BookingNotificationRequest = await req.json();

    console.log("Processing booking notification:", { bookingId, businessId, customerName, projectType });

    // Get business details
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("name, email, owner_id")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      console.error("Business not found:", bizError);
      throw new Error("Business not found");
    }

    // Get owner email from profiles if business email not set
    let recipientEmail = business.email;
    if (!recipientEmail && business.owner_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", business.owner_id)
        .single();
      recipientEmail = profile?.email;
    }

    if (!recipientEmail) {
      console.log("No recipient email found, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No email configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Gmail SMTP
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      console.log("Gmail credentials not configured");
      return new Response(
        JSON.stringify({ success: true, message: "Email service not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    const trackingUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/track-project?code=${bookingId}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🏗️ New Booking Request!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Great news! You have a new project inquiry from <strong>${customerName}</strong>.
              </p>
              
              <table width="100%" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px;">
                    <strong style="color: #059669;">Project Type:</strong><br>
                    <span style="color: #333;">${projectType}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px;">
                    <strong style="color: #059669;">Customer:</strong><br>
                    <span style="color: #333;">${customerName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px;">
                    <strong style="color: #059669;">Email:</strong><br>
                    <a href="mailto:${customerEmail}" style="color: #059669;">${customerEmail}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px;">
                    <strong style="color: #059669;">Tracking Code:</strong><br>
                    <span style="font-family: monospace; font-size: 18px; color: #333;">${bookingId}</span>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666; font-size: 14px;">
                Log in to your Wellington EcoBuild dashboard to review the full details and respond to this inquiry.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; padding: 20px 0;">
                    <a href="https://wellingtonecobuild.nz/business/dashboard" 
                       style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                      View in Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1a1a1a; padding: 20px; text-align: center;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Wellington EcoBuild. Building a sustainable future together.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await client.send({
      from: `Wellington EcoBuild <${gmailUser}>`,
      to: recipientEmail,
      subject: `🏗️ New Booking Request: ${projectType} from ${customerName}`,
      html: htmlContent,
    });

    await client.close();

    console.log("Notification email sent successfully to:", recipientEmail);

    // Also send confirmation to customer
    const customerClient = new SMTPClient({
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

    const customerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ Booking Request Received!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Hi ${customerName},
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Thank you for your booking request with <strong>${business.name}</strong>. They have been notified and will review your request shortly.
              </p>
              
              <table width="100%" style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <tr>
                  <td>
                    <p style="color: #065f46; margin: 0 0 10px 0;">Your Tracking Code</p>
                    <p style="font-family: monospace; font-size: 28px; color: #059669; margin: 0; font-weight: bold;">${bookingId}</p>
                    <p style="color: #065f46; font-size: 12px; margin-top: 10px;">Save this code to track your project</p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; padding: 20px 0;">
                    <a href="https://wellingtonecobuild.nz/track-project?code=${bookingId}" 
                       style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                      Track Your Project
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666; font-size: 14px;">
                You'll receive an email notification when ${business.name} responds to your request.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1a1a1a; padding: 20px; text-align: center;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Wellington EcoBuild. Building a sustainable future together.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await customerClient.send({
      from: `Wellington EcoBuild <${gmailUser}>`,
      to: customerEmail,
      subject: `✅ Your Booking Request with ${business.name} - Tracking Code: ${bookingId}`,
      html: customerHtml,
    });

    await customerClient.close();

    console.log("Customer confirmation email sent to:", customerEmail);

    // Log the email
    await supabase.from("email_logs").insert({
      to_email: recipientEmail,
      to_name: business.name,
      subject: `New Booking Request: ${projectType}`,
      email_type: "booking_notification",
      status: "sent",
      metadata: { bookingId, customerName, projectType },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Notifications sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in booking notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
