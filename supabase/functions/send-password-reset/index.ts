import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PASSWORD-RESET] ${step}${detailsStr}`);
};

// SINGLE EMAIL SYSTEM - All communications use info@wellingtonecobuild.nz
const PRIMARY_EMAIL = "info@wellingtonecobuild.nz";
const BRAND = {
  name: "Wellington EcoBuild",
  tagline: "Wellington's Verified Directory for Qualified Builders & Construction Companies",
  website: "https://wellingtonecobuild.nz",
  logoUrl: "https://duumxykzcliujgyrmzvn.supabase.co/storage/v1/object/public/avatars/wellington-ecobuild-logo-PQDk3oCl.png",
  colors: {
    primary: "#2D5A3D",
    secondary: "#C4A962",
    background: "#FFFFFF",
    text: "#1A1A1A",
    muted: "#6B7280",
  },
};

const createPasswordResetEmail = (resetLink: string, recipientName?: string): string => {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reset Your Password - ${BRAND.name}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: ${BRAND.colors.text}; background-color: #F5F5F5; margin: 0; padding: 0;">
  <div style="padding: 24px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: ${BRAND.colors.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <!-- Header with Logo -->
      <div style="background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, #1E3D2A 100%); padding: 32px 24px; text-align: center;">
        <img src="${BRAND.logoUrl}" alt="${BRAND.name}" style="max-width: 180px; height: auto;" />
      </div>
      
      <!-- Content -->
      <div style="padding: 40px 32px;">
        <h1 style="font-size: 24px; font-weight: 700; color: ${BRAND.colors.text}; margin: 0 0 16px 0; text-align: center;">
          Password Reset Request
        </h1>
        <p style="font-size: 16px; color: ${BRAND.colors.muted}; margin: 0 0 24px 0;">
          ${greeting}
        </p>
        <p style="font-size: 16px; color: ${BRAND.colors.text}; margin: 0 0 24px 0;">
          We received a request to reset your password for your ${BRAND.name} account. 
          Click the button below to create a new password.
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, #1E3D2A 100%); color: #FFFFFF; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>
        
        <!-- Expiry Notice -->
        <p style="font-size: 14px; color: ${BRAND.colors.muted}; text-align: center; margin-bottom: 16px;">
          <strong>This link expires in 60 minutes.</strong>
        </p>
        
        <!-- Fallback Link -->
        <p style="font-size: 14px; color: ${BRAND.colors.muted}; text-align: center; word-break: break-all; margin-top: 16px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetLink}" style="color: ${BRAND.colors.primary};">${resetLink}</a>
        </p>
        
        <!-- Security Note -->
        <div style="background-color: #FEF3C7; border-left: 4px solid ${BRAND.colors.secondary}; padding: 16px; margin: 24px 0; font-size: 14px; color: #92400E; border-radius: 0 8px 8px 0;">
          <strong>Security Note:</strong> If you didn't request a password reset, you can safely ignore this email. 
          Your password will remain unchanged.
        </div>
        
        <!-- Support -->
        <p style="font-size: 14px; color: ${BRAND.colors.muted}; text-align: center; margin-top: 24px;">
          Need help? Contact us at <a href="mailto:${PRIMARY_EMAIL}" style="color: ${BRAND.colors.primary};">${PRIMARY_EMAIL}</a>
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #F9FAFB; padding: 24px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
        <p style="font-size: 16px; font-weight: 600; color: ${BRAND.colors.primary}; margin: 0 0 4px 0;">
          ${BRAND.name}
        </p>
        <p style="font-size: 14px; color: ${BRAND.colors.muted}; margin: 0 0 12px 0;">
          ${BRAND.tagline}
        </p>
        <a href="${BRAND.website}" style="font-size: 14px; color: ${BRAND.colors.primary}; text-decoration: none;">
          wellingtonecobuild.nz
        </a>
        <p style="font-size: 12px; color: #9CA3AF; margin-top: 16px;">
          &copy; ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.<br>
          This email was sent because a password reset was requested for your account.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

interface PasswordResetRequest {
  email: string;
  redirectUrl: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!gmailUser || !gmailPassword) {
    logStep("ERROR", { message: "Missing Gmail credentials" });
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    logStep("ERROR", { message: "Missing Supabase credentials" });
    return new Response(
      JSON.stringify({ error: "Service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { email, redirectUrl }: PasswordResetRequest = await req.json();
    
    logStep("Processing password reset request", { email: email.substring(0, 5) + "***" });

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Generate password reset link using Supabase Admin API
    const { data, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectUrl,
      }
    });

    if (resetError) {
      logStep("Error generating reset link (user may not exist)", { error: resetError.message });
      // Don't reveal if email exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists with this email, a password reset link has been sent." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!data?.properties?.action_link) {
      logStep("No action link generated");
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists with this email, a password reset link has been sent." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logStep("Reset link generated successfully");

    // Get user's name if available
    let recipientName: string | undefined;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("email", email)
      .single();
    
    if (profile?.full_name) {
      recipientName = profile.full_name;
    }

    // Create the branded email
    const html = createPasswordResetEmail(data.properties.action_link, recipientName);

    // Send via Gmail SMTP using denomailer
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
      from: `Wellington EcoBuild <${gmailUser}>`,
      to: email,
      subject: "Reset Your Wellington EcoBuild Password",
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

    logStep("Password reset email sent successfully", { to: email.substring(0, 5) + "***" });

    // Log the email
    try {
      await supabaseAdmin.from("email_logs").insert({
        email_type: "password_reset",
        to_email: email,
        to_name: recipientName || null,
        subject: "Reset Your Wellington EcoBuild Password",
        status: "sent",
        metadata: { reset_requested_at: new Date().toISOString() }
      });
    } catch (logError) {
      logStep("Warning: Failed to log email", { error: logError });
    }

    return new Response(
      JSON.stringify({ success: true, message: "If an account exists with this email, a password reset link has been sent." }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    // Don't reveal details for security - always return success message
    return new Response(
      JSON.stringify({ success: true, message: "If an account exists with this email, a password reset link has been sent." }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
