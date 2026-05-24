import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PASSWORD-CHANGED] ${step}${detailsStr}`);
};

// SINGLE EMAIL SYSTEM - All communications use info@wellingtonecobuild.nz
const PRIMARY_EMAIL = "info@wellingtonecobuild.nz";
const BRAND = {
  name: "Wellington EcoBuild",
  tagline: "Wellington's Trusted Network for Sustainable Construction",
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

const createPasswordChangedEmail = (recipientName?: string, ipAddress?: string): string => {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";
  const changeTime = new Date().toLocaleString('en-NZ', { 
    timeZone: 'Pacific/Auckland',
    dateStyle: 'full',
    timeStyle: 'short'
  });
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Password Was Changed - ${BRAND.name}</title>
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
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 64px; height: 64px; background-color: #D1FAE5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
            <span style="font-size: 32px;">✓</span>
          </div>
        </div>
        
        <h1 style="font-size: 24px; font-weight: 700; color: ${BRAND.colors.text}; margin: 0 0 16px 0; text-align: center;">
          Your Password Was Changed
        </h1>
        <p style="font-size: 16px; color: ${BRAND.colors.muted}; margin: 0 0 24px 0;">
          ${greeting}
        </p>
        <p style="font-size: 16px; color: ${BRAND.colors.text}; margin: 0 0 24px 0;">
          Your ${BRAND.name} account password was successfully changed.
        </p>
        
        <!-- Details Box -->
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>When:</strong> ${changeTime}</p>
          ${ipAddress ? `<p style="margin: 0; font-size: 14px;"><strong>IP Address:</strong> ${ipAddress}</p>` : ''}
        </div>
        
        <!-- Security Alert -->
        <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px; margin: 24px 0; font-size: 14px; color: #991B1B; border-radius: 0 8px 8px 0;">
          <strong>Didn't make this change?</strong><br>
          If you did not change your password, your account may have been compromised. Please:
          <ol style="margin: 8px 0 0 0; padding-left: 20px;">
            <li>Reset your password immediately at <a href="${BRAND.website}/auth" style="color: #991B1B;">wellingtonecobuild.nz/auth</a></li>
            <li>Contact us at <a href="mailto:${PRIMARY_EMAIL}" style="color: #991B1B;">${PRIMARY_EMAIL}</a></li>
          </ol>
        </div>
        
        <p style="font-size: 14px; color: ${BRAND.colors.muted}; margin-top: 24px;">
          If you made this change, no action is required. You can now sign in with your new password.
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${BRAND.website}/auth" style="display: inline-block; background: linear-gradient(135deg, ${BRAND.colors.primary} 0%, #1E3D2A 100%); color: #FFFFFF; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Sign In Now
          </a>
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
          &copy; ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.<br>
          This is a security notification for your account.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

interface PasswordChangedRequest {
  email: string;
  userId?: string;
  ipAddress?: string;
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
    const { email, userId, ipAddress }: PasswordChangedRequest = await req.json();
    
    logStep("Processing password changed confirmation", { email: email.substring(0, 5) + "***" });

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user's name if available
    let recipientName: string | undefined;
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();
      
      if (profile?.full_name) {
        recipientName = profile.full_name;
      }
    } else {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("email", email)
        .single();
      
      if (profile?.full_name) {
        recipientName = profile.full_name;
      }
    }

    // Create the branded email
    const html = createPasswordChangedEmail(recipientName, ipAddress);

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
      subject: "Your Password Was Changed",
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

    logStep("Password changed confirmation email sent", { to: email.substring(0, 5) + "***" });

    // Log the email
    try {
      await supabaseAdmin.from("email_logs").insert({
        email_type: "password_changed",
        to_email: email,
        to_name: recipientName || null,
        subject: "Your Password Was Changed",
        status: "sent",
        metadata: { 
          changed_at: new Date().toISOString(),
          ip_address: ipAddress || null
        }
      });
    } catch (logError) {
      logStep("Warning: Failed to log email", { error: logError });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
