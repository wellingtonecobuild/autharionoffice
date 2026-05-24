import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-ASSISTANT] ${step}${detailsStr}`);
};

interface ScanRequest {
  scanType?: 'full' | 'links' | 'forms' | 'payments' | 'security' | 'qa';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Authenticate admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) throw new Error("Admin access required");

    const { scanType = 'full' }: ScanRequest = await req.json().catch(() => ({}));
    logStep("Starting scan", { scanType, userId: userData.user.id });

    // Create scan record
    const { data: scan, error: scanError } = await supabase
      .from("admin_assistant_scans")
      .insert({
        scan_type: scanType,
        status: "running",
        triggered_by: userData.user.id,
      })
      .select()
      .single();

    if (scanError) throw scanError;
    logStep("Scan record created", { scanId: scan.id });

    // Gather system data for analysis
    const systemData = await gatherSystemData(supabase, scanType);
    logStep("System data gathered", { dataPoints: Object.keys(systemData).length });

    // Use AI to analyze and generate recommendations
    const aiAnalysis = await analyzeWithAI(lovableApiKey, systemData, scanType);
    logStep("AI analysis complete", { issuesFound: aiAnalysis.issues?.length || 0 });

    // Store issues and recommendations
    let issuesCreated = 0;
    let fixesCreated = 0;

    for (const issue of aiAnalysis.issues || []) {
      const { data: issueRecord, error: issueError } = await supabase
        .from("admin_assistant_issues")
        .insert({
          scan_id: scan.id,
          category: issue.category,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affected_resource: issue.affected_resource,
          metadata: issue.metadata || {},
        })
        .select()
        .single();

      if (!issueError && issueRecord) {
        issuesCreated++;

        // Store fix recommendations
        for (const fix of issue.fixes || []) {
          const { error: fixError } = await supabase
            .from("admin_assistant_fixes")
            .insert({
              issue_id: issueRecord.id,
              recommendation: fix.recommendation,
              fix_type: fix.fix_type,
              fix_details: fix.details || {},
              estimated_effort: fix.estimated_effort,
            });

          if (!fixError) fixesCreated++;
        }
      }
    }

    // Update scan with summary
    await supabase
      .from("admin_assistant_scans")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        summary: {
          issues_found: issuesCreated,
          fixes_recommended: fixesCreated,
          critical_count: aiAnalysis.issues?.filter((i: any) => i.severity === 'critical').length || 0,
          high_count: aiAnalysis.issues?.filter((i: any) => i.severity === 'high').length || 0,
          categories_scanned: Object.keys(systemData),
        },
      })
      .eq("id", scan.id);

    logStep("Scan completed", { issuesCreated, fixesCreated });

    return new Response(
      JSON.stringify({
        success: true,
        scan_id: scan.id,
        issues_found: issuesCreated,
        fixes_recommended: fixesCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    logStep("Error", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function gatherSystemData(supabase: any, scanType: string) {
  const data: Record<string, any> = {};

  // Always gather basic stats
  const { count: businessCount } = await supabase
    .from("businesses")
    .select("*", { count: "exact", head: true });
  data.total_businesses = businessCount;

  const { count: activeBusinesses } = await supabase
    .from("businesses")
    .select("*", { count: "exact", head: true })
    .in("status", ["active", "approved"]);
  data.active_businesses = activeBusinesses;

  if (scanType === 'full' || scanType === 'payments') {
    // Check for payment issues
    const { data: failedPayments } = await supabase
      .from("businesses")
      .select("id, name, payment_status, stripe_subscription_id")
      .eq("payment_status", "failed")
      .limit(20);
    data.failed_payments = failedPayments || [];

    // Check subscription mismatches
    const { data: subscriptionIssues } = await supabase
      .from("businesses")
      .select("id, name, subscription_plan, status, stripe_subscription_id")
      .in("subscription_plan", ["premium", "elite"])
      .is("stripe_subscription_id", null)
      .eq("status", "approved");
    data.subscription_mismatches = subscriptionIssues || [];

    // Dunning records
    const { data: dunningRecords } = await supabase
      .from("dunning_records")
      .select("*")
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(10);
    data.active_dunning = dunningRecords || [];
  }

  if (scanType === 'full' || scanType === 'security') {
    // Check for suspicious activity
    const { data: recentLogins } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    data.recent_audit_logs = recentLogins || [];

    // Check webhook events for errors
    const { data: failedWebhooks } = await supabase
      .from("webhook_events")
      .select("*")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(20);
    data.failed_webhooks = failedWebhooks || [];
  }

  if (scanType === 'full' || scanType === 'qa') {
    // Check for businesses with missing images
    const { data: noImages } = await supabase
      .from("businesses")
      .select("id, name, images, status")
      .in("status", ["active", "approved"])
      .or("images.is.null,images.eq.{}");
    data.businesses_without_images = noImages || [];

    // Check for pending reviews
    const { data: pendingReviews } = await supabase
      .from("reviews")
      .select("id, business_id, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    data.pending_reviews = pendingReviews || [];

    // Check for unread contacts
    const { data: unreadContacts } = await supabase
      .from("contact_submissions")
      .select("id, created_at")
      .eq("is_read", false);
    data.unread_contacts = unreadContacts || [];

    // Check for pending jobs
    const { data: pendingJobs } = await supabase
      .from("jobs")
      .select("id, title, created_at")
      .eq("status", "pending");
    data.pending_jobs = pendingJobs || [];
  }

  if (scanType === 'full' || scanType === 'links') {
    // Check URL validation cache for broken links
    const { data: brokenUrls } = await supabase
      .from("url_validation_cache")
      .select("*")
      .eq("is_valid", false)
      .order("validated_at", { ascending: false })
      .limit(20);
    data.broken_urls = brokenUrls || [];
  }

  return data;
}

async function analyzeWithAI(apiKey: string, systemData: Record<string, any>, scanType: string) {
  const prompt = `You are an AI admin assistant for Wellington EcoBuild, a sustainable construction business directory. Analyze the following system data and identify issues that need attention. For each issue, provide actionable fix recommendations.

IMPORTANT: You are a MONITORING system only. Do NOT automatically fix anything. Generate recommendations that require admin approval.

System Data:
${JSON.stringify(systemData, null, 2)}

Scan Type: ${scanType}

Analyze this data and return a JSON response with the following structure:
{
  "issues": [
    {
      "category": "payment_error|broken_link|missing_image|subscription_mismatch|security|performance|failed_form|qa_failure",
      "severity": "critical|high|medium|low|info",
      "title": "Brief issue title",
      "description": "Detailed description of the issue",
      "affected_resource": "Specific resource affected (ID, URL, etc.)",
      "metadata": { "additional": "context" },
      "fixes": [
        {
          "recommendation": "What should be done",
          "fix_type": "automatic|manual|investigation_required",
          "details": { "steps": ["Step 1", "Step 2"] },
          "estimated_effort": "minutes|hours|days"
        }
      ]
    }
  ]
}

Focus on:
1. Payment failures and subscription mismatches
2. Security anomalies in audit logs
3. Broken URLs and missing images
4. Pending items that need attention (reviews, jobs, contacts)
5. Webhook failures
6. Data integrity issues

Be specific and actionable. Only report genuine issues that need attention.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a system monitoring AI. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return { issues: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { issues: [] };
  } catch (error) {
    console.error("AI analysis error:", error);
    return { issues: [] };
  }
}
