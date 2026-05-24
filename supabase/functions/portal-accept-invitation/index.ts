// Wellington EcoBuild Internal Portal - Accept Invitation
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { BRAND, createEmailWrapper, createButton } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptInvitationRequest {
  token: string;
  password: string;
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
  acceptedContractorAgreement?: boolean | null;
  acceptedAt?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { 
      token, 
      password, 
      acceptedTerms, 
      acceptedPrivacy, 
      acceptedContractorAgreement,
      acceptedAt 
    }: AcceptInvitationRequest = await req.json();

    console.log(`[Accept Invitation] Processing token: ${token.substring(0, 8)}...`);
    console.log(`[Accept Invitation] Legal acceptances - Terms: ${acceptedTerms}, Privacy: ${acceptedPrivacy}, Contractor: ${acceptedContractorAgreement}`);

    // Find the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("portal_invitations")
      .select("*, portal_user:portal_users(*)")
      .eq("token", token)
      .is("accepted_at", null)
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired invitation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invitation has expired. Please contact admin for a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const portalUser = invitation.portal_user;
    let authUserId: string;
    let isExistingUser = false;

    // Try to create auth user, or link existing user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        portal_user_id: portalUser.id,
        role: invitation.role,
      },
    });

    if (authError) {
      console.log("[Accept Invitation] Auth error:", authError.message);
      
      // Check if user already exists - try to update their password and link them
      if (authError.message.includes("already registered") || authError.code === "email_exists") {
        console.log("[Accept Invitation] User exists, attempting to link existing account...");
        
        // Get the existing user by email
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
          console.error("[Accept Invitation] Error listing users:", listError);
          return new Response(
            JSON.stringify({ error: "Failed to process existing account. Please contact support." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const existingUser = existingUsers.users.find(
          (u) => u.email?.toLowerCase() === invitation.email.toLowerCase()
        );
        
        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: "Account verification failed. Please contact support." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Update the existing user's password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { 
            password: password,
            email_confirm: true,
            user_metadata: {
              ...existingUser.user_metadata,
              portal_user_id: portalUser.id,
              role: invitation.role,
            },
          }
        );
        
        if (updateError) {
          console.error("[Accept Invitation] Error updating existing user:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to activate account. Please try logging in instead." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        authUserId = existingUser.id;
        isExistingUser = true;
        console.log(`[Accept Invitation] Linked existing user: ${authUserId}`);
      } else {
        throw authError;
      }
    } else {
      authUserId = authData.user.id;
      console.log(`[Accept Invitation] Created new user: ${authUserId}`);
    }

    // Update portal user with auth user ID and legal acceptance records
    const legalAcceptanceData: Record<string, any> = {
      user_id: authUserId,
      status: "active",
    };
    
    // Record legal acceptances with timestamp for NZ Privacy Act 2020 compliance
    if (acceptedTerms !== undefined) {
      legalAcceptanceData.terms_accepted = acceptedTerms;
      legalAcceptanceData.terms_accepted_at = acceptedAt || new Date().toISOString();
    }
    if (acceptedPrivacy !== undefined) {
      legalAcceptanceData.privacy_accepted = acceptedPrivacy;
      legalAcceptanceData.privacy_accepted_at = acceptedAt || new Date().toISOString();
    }
    if (acceptedContractorAgreement !== undefined && acceptedContractorAgreement !== null) {
      legalAcceptanceData.contractor_agreement_accepted = acceptedContractorAgreement;
      legalAcceptanceData.contractor_agreement_accepted_at = acceptedAt || new Date().toISOString();
    }
    
    const { error: updateUserError } = await supabase
      .from("portal_users")
      .update(legalAcceptanceData)
      .eq("id", portalUser.id);

    if (updateUserError) {
      console.error("[Accept Invitation] Update portal user error:", updateUserError);
      throw updateUserError;
    }
    
    console.log("[Accept Invitation] Legal acceptance recorded for compliance audit trail");

    // Mark invitation as accepted
    const { error: updateInviteError } = await supabase
      .from("portal_invitations")
      .update({
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateInviteError) {
      console.error("[Accept Invitation] Update invitation error:", updateInviteError);
    }

    // Create or update user role (upsert to handle existing users)
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({
        user_id: authUserId,
        role: invitation.role === "contractor" ? "contractor" : "employee",
      }, { onConflict: 'user_id' });
    
    if (roleError) {
      console.error("[Accept Invitation] Role assignment error:", roleError);
    }

    // Log the action with legal acceptance details for NZ compliance audit
    await supabase.from("portal_audit_log").insert({
      portal_user_id: portalUser.id,
      action: isExistingUser ? "existing_account_linked" : "invitation_accepted",
      new_value: { 
        email: invitation.email, 
        role: invitation.role, 
        isExistingUser,
        legal_acceptance: {
          terms_accepted: acceptedTerms || false,
          privacy_accepted: acceptedPrivacy || false,
          contractor_agreement_accepted: acceptedContractorAgreement || null,
          accepted_at: acceptedAt || new Date().toISOString(),
          nz_privacy_act_2020_compliant: true,
          ip_address_recorded: false,
        }
      },
      performed_by: authUserId,
    });

    // Send welcome email via Gmail SMTP (non-blocking)
    if (gmailUser && gmailPassword) {
      try {
        const roleLabel = invitation.role === "contractor" ? "Contractor" : "Employee";
        
        const emailContent = `
          <h2 style="color: ${BRAND.colors.primary}; font-size: 24px; margin: 0 0 16px 0;">
            Welcome to Wellington EcoBuild!
          </h2>
          <p style="font-size: 16px; color: ${BRAND.colors.text};">
            Your account has been successfully activated. You now have access to the Wellington EcoBuild Internal Portal as a <strong>${roleLabel}</strong>.
          </p>
          
          <p style="font-size: 14px; color: ${BRAND.colors.text}; margin-top: 24px;">
            <strong>Next Steps:</strong>
          </p>
          <ol style="color: ${BRAND.colors.text}; padding-left: 20px;">
            <li>Complete your profile with your personal and payment details</li>
            ${invitation.role === "contractor" ? `
              <li>Add your IRD number and bank account details</li>
              <li>Start creating invoices for your services</li>
              <li>Log your call activities in the Call Log section</li>
            ` : `
              <li>Review your employment details</li>
              <li>Access your payslips when available</li>
            `}
          </ol>
          
          <div style="text-align: center; margin: 32px 0;">
            ${createButton("Complete Your Profile", "https://wellingtonecobuild.nz/portal/profile")}
          </div>
          
          <p style="font-size: 14px; color: ${BRAND.colors.muted};">
            If you have any questions, please contact us at ${BRAND.email}
          </p>
        `;

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
          from: `${BRAND.name} <${gmailUser}>`,
          to: invitation.email,
          replyTo: BRAND.email,
          subject: "Welcome to Wellington EcoBuild Portal",
          mimeContent: [
            {
              mimeType: 'text/html; charset="utf-8"',
              content: createEmailWrapper(emailContent, "Welcome to Wellington EcoBuild"),
              transferEncoding: "8bit",
            },
          ],
        });

        await client.close();
        console.log("[Accept Invitation] Welcome email sent successfully via Gmail");

        await supabase.from("email_logs").insert({
          email_type: "portal_welcome",
          to_email: invitation.email,
          subject: "Welcome to Wellington EcoBuild Portal",
          status: "sent",
          metadata: { role: invitation.role, portal_user_id: portalUser.id },
        });

        // Also notify admin about the new portal user
        try {
          await client.send({
            from: `${BRAND.name} <${gmailUser}>`,
            to: BRAND.email,
            subject: `New Portal User Activated: ${invitation.email}`,
            mimeContent: [
              {
                mimeType: 'text/html; charset="utf-8"',
                content: createEmailWrapper(`
                  <h2 style="color: ${BRAND.colors.primary}; font-size: 20px; margin: 0 0 16px 0;">
                    New Portal User Activated
                  </h2>
                  <p style="font-size: 16px; color: ${BRAND.colors.text};">
                    A new ${roleLabel.toLowerCase()} has accepted their portal invitation:
                  </p>
                  <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 0;"><strong>Email:</strong> ${invitation.email}</p>
                    <p style="margin: 8px 0 0 0;"><strong>Role:</strong> ${roleLabel}</p>
                    <p style="margin: 8px 0 0 0;"><strong>Activated:</strong> ${new Date().toLocaleString('en-NZ')}</p>
                  </div>
                  <div style="text-align: center; margin: 24px 0;">
                    ${createButton("View Portal Users", "https://wellingtonecobuild.nz/admin/portal-users")}
                  </div>
                `, "New Portal User"),
                transferEncoding: "8bit",
              },
            ],
          });
          console.log("[Accept Invitation] Admin notification sent");
        } catch (adminEmailError) {
          console.error("[Accept Invitation] Admin notification error:", adminEmailError);
        }

      } catch (emailError) {
        console.error("[Accept Invitation] Welcome email error:", emailError);
      }
    } else {
      console.log("[Accept Invitation] Gmail not configured, skipping welcome email");
    }

    console.log(`[Accept Invitation] Successfully activated account for ${invitation.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isExistingUser ? "Account linked successfully" : "Account activated successfully",
        userId: authUserId,
        portalUserId: portalUser.id,
        role: invitation.role,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Accept Invitation] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
