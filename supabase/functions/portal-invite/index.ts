// Wellington EcoBuild Internal Portal - Invitation System
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
const COMPANY_WEBSITE = "https://wellingtonecobuild.nz";
const COMPANY_TAGLINE = "Wellington's Verified Directory for Qualified Builders & Construction Companies";

interface InviteRequest {
  email: string;
  role: "contractor" | "employee";
  invitedBy: string;
}

const generateToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

const createInvitationEmail = (role: string, portalUrl: string, email: string): string => {
  const roleLabel = role === "contractor" ? "Independent Contractor" : "Employee";
  const features = role === "contractor" ? `
    <li style="margin-bottom: 12px; padding-left: 8px;">
      <strong style="color: #1A1A1A;">Submit Timesheets</strong>
      <span style="color: #6B7280;"> — Log your weekly hours for approval</span>
    </li>
    <li style="margin-bottom: 12px; padding-left: 8px;">
      <strong style="color: #1A1A1A;">Create Invoices</strong>
      <span style="color: #6B7280;"> — Generate and submit invoices for services</span>
    </li>
    <li style="margin-bottom: 12px; padding-left: 8px;">
      <strong style="color: #1A1A1A;">Track Payments</strong>
      <span style="color: #6B7280;"> — View real-time payment status and history</span>
    </li>
    <li style="margin-bottom: 12px; padding-left: 8px;">
      <strong style="color: #1A1A1A;">Download Records</strong>
      <span style="color: #6B7280;"> — Export payment summaries as proof of income for IRD</span>
    </li>
  ` : `
    <li style="margin-bottom: 12px; padding-left: 8px;">
      <strong style="color: #1A1A1A;">View Payslips</strong>
      <span style="color: #6B7280;"> — Access your pay records anytime</span>
    </li>
    <li style="margin-bottom: 12px; padding-left: 8px;">
      <strong style="color: #1A1A1A;">Employment Records</strong>
      <span style="color: #6B7280;"> — View your employment documentation</span>
    </li>
    <li style="margin-bottom: 12px; padding-left: 8px;">
      <strong style="color: #1A1A1A;">Tax Documents</strong>
      <span style="color: #6B7280;"> — Download IR documents as needed</span>
    </li>
    <li style="margin-bottom: 12px; padding-left: 8px;">
      <strong style="color: #1A1A1A;">Manage Profile</strong>
      <span style="color: #6B7280;"> — Update your personal and banking details</span>
    </li>
  `;

  // Contractor responsibilities section (only for contractors)
  const contractorResponsibilities = role === "contractor" ? `
  <!-- IMPORTANT: Contractor Responsibilities -->
  <div style="background: linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%); border: 2px solid #EF4444; border-radius: 12px; padding: 24px 28px; margin: 32px 0;">
    <p style="font-size: 14px; font-weight: 700; color: #991B1B; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
      ⚠️ Important: Your Responsibilities as an Independent Contractor
    </p>
    <div style="color: #7F1D1D; font-size: 14px; line-height: 1.7;">
      <p style="margin: 0 0 12px 0;">
        As an <strong>independent contractor</strong>, you are <strong>self-employed</strong> and operating your own business. This means you have certain legal and tax obligations that differ from employees:
      </p>
      <ul style="margin: 12px 0; padding-left: 20px;">
        <li style="margin-bottom: 10px;"><strong>Tax Returns:</strong> You must file your own annual tax return (IR3) with Inland Revenue. We do not deduct PAYE from your payments.</li>
        <li style="margin-bottom: 10px;"><strong>GST Registration:</strong> If your turnover exceeds $60,000 per year, you must register for GST and file GST returns.</li>
        <li style="margin-bottom: 10px;"><strong>ACC Levies:</strong> You are responsible for paying your own ACC levies as a self-employed person.</li>
        <li style="margin-bottom: 10px;"><strong>Provisional Tax:</strong> You may need to pay provisional tax if your residual income tax is over $5,000.</li>
        <li style="margin-bottom: 10px;"><strong>Record Keeping:</strong> Keep all invoices and payment records for at least 7 years for IRD purposes.</li>
        <li style="margin-bottom: 10px;"><strong>No Employee Benefits:</strong> As a contractor, you are not entitled to annual leave, sick leave, or other employee benefits.</li>
        <li style="margin-bottom: 10px;"><strong>Insurance:</strong> We recommend you have your own public liability insurance and consider income protection insurance.</li>
      </ul>
      <p style="margin: 16px 0 0 0; padding-top: 12px; border-top: 1px solid rgba(239, 68, 68, 0.3);">
        <strong>Need help?</strong> We recommend consulting with an accountant or visiting <a href="https://www.ird.govt.nz/roles/self-employed" style="color: #DC2626; font-weight: 600;">ird.govt.nz/roles/self-employed</a> for detailed guidance on your tax obligations.
      </p>
    </div>
  </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Portal Invitation - ${COMPANY_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F1F5F9; line-height: 1.6;">
<div style="padding: 32px 16px;">
<div style="max-width: 640px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); table-layout: fixed; word-wrap: break-word; overflow-wrap: break-word;">

<!-- Header -->
<div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 32px; text-align: center;">
  <img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" style="max-width: 200px; height: auto; margin-bottom: 16px;">
  <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0; letter-spacing: 0.5px;">${COMPANY_TAGLINE}</p>
</div>

<!-- Main Content -->
<div style="padding: 48px 40px;">
  
  <!-- Welcome Badge -->
  <div style="text-align: center; margin-bottom: 32px;">
    <span style="display: inline-block; background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); color: #047857; font-size: 12px; font-weight: 600; padding: 8px 16px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #A7F3D0;">
      Official Invitation
    </span>
  </div>

  <h1 style="font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 16px 0; text-align: center; line-height: 1.3;">
    Welcome to the ${COMPANY_NAME}<br>Internal Portal
  </h1>
  
  <p style="font-size: 16px; color: #4B5563; margin: 0 0 32px 0; text-align: center;">
    You have been invited to join as a <strong style="color: #059669;">${roleLabel}</strong>
  </p>

  <!-- Accept Button -->
  <div style="text-align: center; margin: 32px 0;">
    <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #FFFFFF; text-decoration: none; padding: 18px 48px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4); transition: all 0.2s;">
      Accept Invitation & Set Password
    </a>
  </div>

  <!-- Features Box -->
  <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px 28px; margin: 32px 0;">
    <p style="font-size: 14px; font-weight: 600; color: #111827; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
      What You Can Do
    </p>
    <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; list-style-type: none; padding-left: 0;">
      ${features}
    </ul>
  </div>

  ${contractorResponsibilities}

  <!-- How to Login Section -->
  <div style="background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border: 1px solid #93C5FD; border-radius: 12px; padding: 24px 28px; margin: 32px 0;">
    <p style="font-size: 14px; font-weight: 700; color: #1E40AF; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
      📋 Getting Started - First Time Setup
    </p>
    <div style="color: #1E3A8A; font-size: 14px;">
      <p style="margin: 0 0 12px 0;"><strong>Step 1:</strong> Click the "Accept Invitation" button above</p>
      <p style="margin: 0 0 12px 0;"><strong>Step 2:</strong> Create your password (minimum 8 characters)</p>
      <p style="margin: 0 0 12px 0;"><strong>Step 3:</strong> Accept the terms and contractor agreement</p>
      <p style="margin: 0 0 12px 0;"><strong>Step 4:</strong> Complete your profile with IRD and bank details</p>
      <p style="margin: 0 0 20px 0;"><strong>Step 5:</strong> Start submitting timesheets and invoices!</p>
    </div>
  </div>

  <!-- Future Login Instructions -->
  <div style="background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); border: 2px solid #22C55E; border-radius: 12px; padding: 24px 28px; margin: 32px 0;">
    <p style="font-size: 14px; font-weight: 700; color: #166534; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
      🔑 How to Login in the Future
    </p>
    <div style="color: #166534; font-size: 14px;">
      <p style="margin: 0 0 16px 0;">After your account is activated, access your portal by logging into the main website:</p>
      
      <div style="background: #FFFFFF; border-radius: 8px; padding: 20px; border: 2px solid #22C55E;">
        <p style="margin: 0 0 12px 0; font-weight: 700; color: #15803D; font-size: 14px;">✅ Login via Main Website</p>
        <ol style="margin: 0 0 16px 0; padding-left: 20px; color: #166534; line-height: 1.8;">
          <li style="margin-bottom: 8px;">Go to <a href="${COMPANY_WEBSITE}" style="color: #166534; font-weight: 700; text-decoration: underline;">${COMPANY_WEBSITE}</a></li>
          <li style="margin-bottom: 8px;">Click <strong>"Contractor Login"</strong> in the website header</li>
          <li style="margin-bottom: 8px;">Enter your email and password to sign in</li>
          <li>Click <strong>"Contractor Portal"</strong> in the top menu to access your portal</li>
        </ol>
        <p style="margin: 0; font-size: 12px; color: #16A34A; background: #DCFCE7; padding: 10px; border-radius: 6px;">
          💡 <strong>Tip:</strong> Bookmark <strong>${COMPANY_WEBSITE}</strong> for quick access!
        </p>
      </div>
      
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #86EFAC;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #15803D;">🔐 Your Login Details:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #166534;"><strong>Email:</strong></td>
            <td style="padding: 6px 0; color: #166534; font-family: monospace; background: #F0FDF4; padding: 4px 8px; border-radius: 4px;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #166534;"><strong>Password:</strong></td>
            <td style="padding: 6px 0; color: #166534;">The password you create during activation</td>
          </tr>
        </table>
      </div>
    </div>
  </div>

  <!-- Expiry Notice -->
  <div style="text-align: center; padding: 20px; background-color: #FEF3C7; border-radius: 8px; border: 1px solid #FCD34D;">
    <p style="font-size: 14px; color: #92400E; margin: 0;">
      ⏰ <strong>This invitation expires in 7 days.</strong><br>
      <span style="font-size: 13px;">Please accept before the expiry date to activate your account.</span>
    </p>
  </div>

  <!-- Fallback Link -->
  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
    <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin: 0; word-wrap: break-word; overflow-wrap: break-word;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${portalUrl}" style="color: #059669; word-break: break-all; overflow-wrap: break-word; font-size: 11px; display: inline-block; max-width: 100%;">${portalUrl}</a>
    </p>
  </div>
</div>

<!-- Footer -->
<div style="background-color: #F9FAFB; padding: 32px 40px; text-align: center; border-top: 1px solid #E5E7EB;">
  <p style="font-size: 18px; font-weight: 700; color: #059669; margin: 0 0 4px 0;">${COMPANY_NAME}</p>
  <p style="font-size: 13px; color: #6B7280; margin: 0 0 16px 0;">${COMPANY_TAGLINE}</p>
  
  <div style="margin: 16px 0;">
    <a href="mailto:${PRIMARY_EMAIL}" style="font-size: 14px; color: #059669; text-decoration: none; font-weight: 500;">${PRIMARY_EMAIL}</a>
  </div>
  
  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
    <p style="font-size: 11px; color: #9CA3AF; margin: 0;">
      This is an automated message from ${COMPANY_NAME}. Please do not reply directly to this email.<br>
      If you did not expect this invitation, please contact us immediately at ${PRIMARY_EMAIL}.
    </p>
  </div>
  
  <p style="font-size: 11px; color: #9CA3AF; margin-top: 16px;">
    © ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
  </p>
</div>

</div>
</div>
</body>
</html>`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!gmailUser || !gmailPassword) {
    console.error("[Portal Invite] Missing Gmail credentials");
    return new Response(
      JSON.stringify({ error: "Email service not configured - missing Gmail credentials" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { email, role, invitedBy }: InviteRequest = await req.json();

    console.log(`[Portal Invite] Creating invitation for ${email} as ${role}`);

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("portal_users")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "User with this email already exists in the portal" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up orphaned invitations (no portal_user_id linked)
    await supabase
      .from("portal_invitations")
      .delete()
      .eq("email", email.toLowerCase())
      .is("portal_user_id", null);

    // Check for existing pending invitation (with valid portal user)
    const { data: existingInvite } = await supabase
      .from("portal_invitations")
      .select("id")
      .eq("email", email.toLowerCase())
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "An invitation is already pending for this email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create portal user record (status: invited)
    const { data: portalUser, error: userError } = await supabase
      .from("portal_users")
      .insert({
        email: email.toLowerCase(),
        role,
        status: "invited",
        created_by: invitedBy,
      })
      .select()
      .single();

    if (userError) {
      console.error("[Portal Invite] Error creating portal user:", userError);
      throw userError;
    }

    // Generate invitation token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation record
    const { error: inviteError } = await supabase
      .from("portal_invitations")
      .insert({
        email: email.toLowerCase(),
        role,
        token,
        expires_at: expiresAt.toISOString(),
        portal_user_id: portalUser.id,
        invited_by: invitedBy,
      });

    if (inviteError) {
      console.error("[Portal Invite] Error creating invitation:", inviteError);
      throw inviteError;
    }

    // Build invitation URL
    const portalUrl = `https://wellingtonecobuild.nz/portal/accept-invitation?token=${token}`;
    const htmlEmail = createInvitationEmail(role, portalUrl, email.toLowerCase());

    // Send email via Gmail SMTP
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
      to: email,
      replyTo: PRIMARY_EMAIL,
      subject: `You've been invited to ${COMPANY_NAME} Portal`,
      mimeContent: [
        {
          mimeType: 'text/html; charset="utf-8"',
          content: htmlEmail,
          transferEncoding: "8bit",
        },
      ],
    });

    await client.close();
    console.log(`[Portal Invite] Email sent successfully to ${email}`);

    // Log the invitation
    await supabase.from("portal_audit_log").insert({
      portal_user_id: portalUser.id,
      action: "invitation_sent",
      new_value: { email, role },
      performed_by: invitedBy,
    });

    // Log email
    await supabase.from("email_logs").insert({
      email_type: "portal_invitation",
      to_email: email,
      subject: `You've been invited to ${COMPANY_NAME} Portal`,
      status: "sent",
      sent_by: invitedBy,
      metadata: { role, portal_user_id: portalUser.id },
    });

    console.log(`[Portal Invite] Successfully sent invitation to ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation sent successfully",
        portalUserId: portalUser.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Portal Invite] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
