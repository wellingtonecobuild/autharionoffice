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

interface NotifyRequest {
  type: "application_submitted" | "application_status_changed" | "new_message";
  applicationId: string;
  newStatus?: string;
  messageContent?: string;
}

const wrapEmail = (title: string, content: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} - ${COMPANY_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F5F5F5; line-height: 1.6;">
<div style="padding: 24px;">
<div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
<div style="background: linear-gradient(135deg, #2D5A3D 0%, #1E3D2A 100%); padding: 32px 24px; text-align: center;">
<img src="${COMPANY_LOGO}" alt="${COMPANY_NAME}" style="max-width: 180px; height: auto;">
<p style="color: #FFFFFF; font-size: 12px; margin: 12px 0 0 0; opacity: 0.9;">Job Opportunities</p>
</div>
<div style="padding: 40px 32px;">
${content}
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!gmailUser || !gmailPassword) {
      console.log("[JOB-NOTIFY] Email credentials not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "Email skipped - no credentials" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { type, applicationId, newStatus, messageContent } = await req.json() as NotifyRequest;

    console.log(`[JOB-NOTIFY] Processing notification: ${type} for application ${applicationId}`);

    // Fetch application with related data
    const { data: application, error: appError } = await supabase
      .from("job_applications")
      .select(`
        *,
        job:jobs!inner(id, title, business_id),
        applicant:job_seeker_profiles!job_applications_applicant_id_fkey(full_name, email)
      `)
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      console.error("[JOB-NOTIFY] Application not found:", appError);
      return new Response(
        JSON.stringify({ error: "Application not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch business details
    const { data: business } = await supabase
      .from("businesses")
      .select("name, email, owner_id")
      .eq("id", application.job.business_id)
      .single();

    // Fetch business owner email
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", business?.owner_id)
      .single();

    let subject = "";
    let recipientEmail = "";
    let recipientName = "";
    let htmlContent = "";
    let replyToEmail = PRIMARY_EMAIL;

    const baseUrl = "https://wellingtonecobuild.nz";

    switch (type) {
      case "application_submitted":
        // Email to employer
        recipientEmail = business?.email || ownerProfile?.email || "";
        recipientName = business?.name || "Employer";
        subject = `New Application: ${application.job.title}`;
        htmlContent = wrapEmail("New Application", `
<h2 style="font-size: 22px; font-weight: 700; color: #1A1A1A; margin: 0 0 20px 0;">New Application Received</h2>

<p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
You have received a new application for <strong>${application.job.title}</strong>.
</p>

<div style="background: #F9FAFB; border-radius: 8px; padding: 20px; margin: 24px 0;">
<table style="width: 100%; border-collapse: collapse;">
<tr><td style="padding: 8px 0; color: #6B7280;">Applicant:</td>
<td style="padding: 8px 0; text-align: right; font-weight: 600;">${application.applicant?.full_name || "Unknown"}</td></tr>
<tr><td style="padding: 8px 0; color: #6B7280;">Applied:</td>
<td style="padding: 8px 0; text-align: right;">${new Date(application.created_at).toLocaleDateString('en-NZ')}</td></tr>
</table>
</div>

<div style="text-align: center; margin: 32px 0;">
<a href="${baseUrl}/employer/applications" style="display: inline-block; background: linear-gradient(135deg, #2D5A3D 0%, #1E3D2A 100%); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Application</a>
</div>
        `);
        if (application.applicant?.email) {
          replyToEmail = application.applicant.email;
        }
        break;

      case "application_status_changed":
        // Email to applicant
        recipientEmail = application.applicant?.email || "";
        recipientName = application.applicant?.full_name || "Applicant";
        
        const statusLabels: Record<string, { title: string; color: string; bg: string }> = {
          viewed: { title: "Your application has been viewed", color: "#2563EB", bg: "#DBEAFE" },
          shortlisted: { title: "You've been shortlisted! 🎉", color: "#16A34A", bg: "#DCFCE7" },
          interview: { title: "Interview invitation", color: "#7C3AED", bg: "#EDE9FE" },
          rejected: { title: "Application update", color: "#DC2626", bg: "#FEE2E2" },
          hired: { title: "Congratulations! You've been hired 🎉", color: "#16A34A", bg: "#DCFCE7" },
        };
        
        const statusInfo = statusLabels[newStatus || ""] || { title: "Application Update", color: "#6B7280", bg: "#F3F4F6" };
        
        subject = `${statusInfo.title}: ${application.job.title}`;
        htmlContent = wrapEmail(statusInfo.title, `
<h2 style="font-size: 22px; font-weight: 700; color: #1A1A1A; margin: 0 0 20px 0;">${statusInfo.title}</h2>

<p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
Your application for <strong>${application.job.title}</strong> at <strong>${business?.name}</strong> has been updated.
</p>

<div style="background: ${statusInfo.bg}; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
<p style="margin: 0; font-size: 18px; font-weight: 600; color: ${statusInfo.color};">
Status: ${newStatus?.charAt(0).toUpperCase()}${newStatus?.slice(1)}
</p>
</div>

<div style="text-align: center; margin: 32px 0;">
<a href="${baseUrl}/jobs/my-applications" style="display: inline-block; background: linear-gradient(135deg, #2D5A3D 0%, #1E3D2A 100%); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">View My Applications</a>
</div>
        `);
        break;

      case "new_message":
        recipientEmail = application.applicant?.email || "";
        recipientName = application.applicant?.full_name || "User";
        subject = `New message about your application: ${application.job.title}`;
        htmlContent = wrapEmail("New Message", `
<h2 style="font-size: 22px; font-weight: 700; color: #1A1A1A; margin: 0 0 20px 0;">New Message</h2>

<p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
You have a new message regarding your application for <strong>${application.job.title}</strong>.
</p>

<div style="background: #F9FAFB; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #2D5A3D;">
<p style="color: #374151; font-style: italic; margin: 0;">"${messageContent?.substring(0, 200)}${(messageContent?.length || 0) > 200 ? '...' : ''}"</p>
</div>

<div style="text-align: center; margin: 32px 0;">
<a href="${baseUrl}/jobs/my-applications?chat=${applicationId}" style="display: inline-block; background: linear-gradient(135deg, #2D5A3D 0%, #1E3D2A 100%); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Conversation</a>
</div>
        `);
        break;
    }

    if (!recipientEmail) {
      console.log("[JOB-NOTIFY] No recipient email found, skipping");
      return new Response(
        JSON.stringify({ success: true, message: "No recipient email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email using Gmail SMTP
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
      to: recipientEmail,
      replyTo: replyToEmail,
      subject,
      mimeContent: [
        {
          mimeType: 'text/html; charset="utf-8"',
          content: htmlContent,
          transferEncoding: "8bit",
        },
      ],
    });

    await client.close();
    console.log(`[JOB-NOTIFY] Email sent successfully to: ${recipientEmail}`);

    // Log the email
    await supabase.from("email_logs").insert({
      email_type: `job_${type}`,
      to_email: recipientEmail,
      to_name: recipientName,
      subject,
      status: "sent",
      metadata: { applicationId, type },
    });

    return new Response(
      JSON.stringify({ success: true, type, recipientEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[JOB-NOTIFY] Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
