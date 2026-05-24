import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND = {
  name: "Wellington EcoBuild",
  tagline: "Wellington's Trusted Network for Sustainable Construction",
  website: "https://wellingtonecobuild.nz",
  logoUrl: "https://duumxykzcliujgyrmzvn.supabase.co/storage/v1/object/public/avatars/wellington-ecobuild-logo.png",
  colors: {
    primary: "#2D5A3D",
    secondary: "#C4A962",
    background: "#FFFFFF",
    text: "#1A1A1A",
    muted: "#6B7280",
  },
};

const createAdminPasswordResetEmail = (resetLink: string, recipientName?: string): string => {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - ${BRAND.name}</title>
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
          Password Reset
        </h1>
        <p style="font-size: 16px; color: ${BRAND.colors.muted}; margin: 0 0 24px 0; text-align: center;">
          ${greeting}<br><br>
          Our support team has initiated a password reset for your ${BRAND.name} account. 
          Click the button below to create a new password.
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, #1E3D2A 100%); color: #FFFFFF !important; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>
        
        <!-- Fallback Link -->
        <p style="font-size: 14px; color: ${BRAND.colors.muted}; text-align: center; word-break: break-all; margin-top: 16px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetLink}" style="color: ${BRAND.colors.primary};">${resetLink}</a>
        </p>
        
        <!-- Security Note -->
        <div style="background-color: #DBEAFE; border-left: 4px solid #3B82F6; padding: 16px; margin: 24px 0; font-size: 14px; color: #1E40AF; border-radius: 0 8px 8px 0;">
          <strong>Need Help?</strong> This password reset was triggered by an administrator to help you regain access to your account. 
          If you didn't request this, please contact our support team. This link will expire in 1 hour.
        </div>
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
          © ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;
};

interface AdminResetRequest {
  targetEmail: string;
  redirectUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!gmailUser || !gmailPassword) {
    console.error("Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    return new Response(
      JSON.stringify({ error: "Service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    // Get authorization header to verify admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify the requesting user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Error verifying user:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user has admin role
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      console.error("User is not an admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { targetEmail, redirectUrl }: AdminResetRequest = await req.json();
    
    console.log(`Admin ${user.email} initiating password reset for: ${targetEmail}`);

    // Check if target user exists
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("email", targetEmail)
      .maybeSingle();

    if (profileError || !targetProfile) {
      console.error("Target user not found:", targetEmail);
      return new Response(
        JSON.stringify({ error: "User not found with this email address" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate password reset link using Supabase Admin API
    const { data, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: targetEmail,
      options: {
        redirectTo: redirectUrl,
      }
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      return new Response(
        JSON.stringify({ error: "Failed to generate password reset link" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!data?.properties?.action_link) {
      console.error("No action link generated");
      return new Response(
        JSON.stringify({ error: "Failed to generate password reset link" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create the branded email
    const html = createAdminPasswordResetEmail(data.properties.action_link, targetProfile.full_name || undefined);

    // Send via Gmail SMTP
    const client = new SmtpClient();

    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: gmailUser,
      password: gmailPassword,
    });

    await client.send({
      from: `Wellington EcoBuild <${gmailUser}>`,
      to: targetEmail,
      subject: "Password Reset - Wellington EcoBuild",
      content: "Reset your password by visiting the link in this email. Please view this email in an HTML-capable email client.",
      html: html,
    });

    console.log(`Password reset email sent successfully to ${targetEmail} by admin ${user.email}`);

    await client.close();

    // Log the admin action
    await supabaseAdmin.from("audit_logs").insert({
      admin_id: user.id,
      action: "admin_password_reset",
      entity_type: "user",
      entity_id: targetProfile.id,
      metadata: {
        target_email: targetEmail,
        initiated_by: user.email
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Password reset email sent to ${targetEmail}` 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in admin password reset:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
