import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusNotificationRequest {
  bookingId: string;
  status: string;
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

    const { bookingId, status }: StatusNotificationRequest = await req.json();

    console.log("Processing status notification:", { bookingId, status });

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("project_bookings")
      .select(`
        *,
        businesses:business_id (name)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingError);
      throw new Error("Booking not found");
    }

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      console.log("Gmail credentials not configured");
      return new Response(
        JSON.stringify({ success: true, message: "Email service not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusMessages: Record<string, { subject: string; emoji: string; message: string; color: string }> = {
      quoted: {
        subject: "Quote Ready",
        emoji: "💰",
        message: `Great news! ${(booking.businesses as any)?.name} has sent you a quote for your ${booking.project_type} project.`,
        color: "#3b82f6",
      },
      accepted: {
        subject: "Project Accepted",
        emoji: "✅",
        message: `Your project has been accepted by ${(booking.businesses as any)?.name}! They will be in touch soon to discuss next steps.`,
        color: "#10b981",
      },
      in_progress: {
        subject: "Project Started",
        emoji: "🚧",
        message: `Work has officially begun on your ${booking.project_type} project with ${(booking.businesses as any)?.name}!`,
        color: "#8b5cf6",
      },
      completed: {
        subject: "Project Completed",
        emoji: "🎉",
        message: `Congratulations! Your ${booking.project_type} project with ${(booking.businesses as any)?.name} has been completed!`,
        color: "#059669",
      },
      declined: {
        subject: "Request Update",
        emoji: "ℹ️",
        message: `${(booking.businesses as any)?.name} was unable to take on your project at this time.${booking.decline_reason ? ` Reason: ${booking.decline_reason}` : ""}`,
        color: "#ef4444",
      },
    };

    const statusInfo = statusMessages[status];
    if (!statusInfo) {
      console.log("No notification configured for status:", status);
      return new Response(
        JSON.stringify({ success: true, message: "No notification for this status" }),
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
            <td style="background: ${statusInfo.color}; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${statusInfo.emoji} ${statusInfo.subject}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Hi ${booking.customer_name},
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                ${statusInfo.message}
              </p>
              
              <table width="100%" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px;">
                    <strong style="color: #059669;">Project:</strong> ${booking.project_type}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px;">
                    <strong style="color: #059669;">Builder:</strong> ${(booking.businesses as any)?.name}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px;">
                    <strong style="color: #059669;">Tracking Code:</strong> 
                    <span style="font-family: monospace; font-size: 16px;">${booking.tracking_code}</span>
                  </td>
                </tr>
                ${booking.quoted_amount ? `
                <tr>
                  <td style="padding: 10px;">
                    <strong style="color: #059669;">Quoted Amount:</strong> 
                    <span style="font-size: 20px; font-weight: bold;">$${booking.quoted_amount.toLocaleString()}</span>
                  </td>
                </tr>
                ` : ""}
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; padding: 20px 0;">
                    <a href="https://wellingtonecobuild.nz/track-project?code=${booking.tracking_code}" 
                       style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                      Track Your Project
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
      to: booking.customer_email,
      subject: `${statusInfo.emoji} ${statusInfo.subject} - ${booking.project_type}`,
      html: htmlContent,
    });

    await client.close();

    console.log("Status notification sent to:", booking.customer_email);

    // Log the email
    await supabase.from("email_logs").insert({
      to_email: booking.customer_email,
      to_name: booking.customer_name,
      subject: `${statusInfo.subject} - ${booking.project_type}`,
      email_type: "project_status_update",
      status: "sent",
      metadata: { bookingId, status, trackingCode: booking.tracking_code },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in status notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
