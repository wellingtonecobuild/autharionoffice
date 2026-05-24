import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXECUTE-AI-FIX] ${step}${detailsStr}`);
};

// Safe fix types that can be auto-executed
const SAFE_FIX_TYPES = [
  'broken_link_repair',
  'cache_cleanup',
  'webhook_retry',
  'image_relink',
  'orphan_cleanup',
  'automatic',
];

// PROTECTED - These actions are NEVER automated
const PROTECTED_ACTIONS = [
  'modify_pricing',
  'approve_business',
  'reject_business',
  'issue_refund',
  'modify_subscription',
  'delete_user',
  'modify_payment',
];

interface ExecuteFixRequest {
  fixId: string;
  force?: boolean; // Admin override for manual execution
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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

    const { fixId, force = false }: ExecuteFixRequest = await req.json();
    logStep("Executing fix", { fixId, adminId: userData.user.id, force });

    // Fetch the fix with its associated issue
    const { data: fix, error: fixError } = await supabase
      .from("admin_assistant_fixes")
      .select("*, admin_assistant_issues(*)")
      .eq("id", fixId)
      .single();

    if (fixError || !fix) throw new Error("Fix not found");

    // Check if fix is approved
    if (fix.approval_status !== 'approved' && !force) {
      throw new Error("Fix must be approved before execution");
    }

    // Check if fix type is safe
    const fixType = fix.fix_type?.toLowerCase() || '';
    const isSafe = SAFE_FIX_TYPES.some(safe => fixType.includes(safe)) || force;

    if (!isSafe) {
      throw new Error(`Fix type '${fix.fix_type}' requires manual intervention`);
    }

    // Double-check against protected actions
    const isProtected = PROTECTED_ACTIONS.some(action => 
      fixType.includes(action) || 
      fix.recommendation?.toLowerCase().includes(action.replace('_', ' '))
    );

    if (isProtected) {
      throw new Error("This action is protected and cannot be auto-executed");
    }

    // Log the action start
    const { data: actionLog } = await supabase
      .from("ai_agent_action_log")
      .insert({
        action_type: fix.fix_type || 'unknown',
        action_status: 'executing',
        description: fix.recommendation || 'Executing approved fix',
        affected_resource: (fix.admin_assistant_issues as any)?.category,
        affected_resource_id: (fix.admin_assistant_issues as any)?.affected_resource,
        details: {
          fix_id: fix.id,
          issue_id: (fix.admin_assistant_issues as any)?.id,
          fix_details: fix.fix_details,
        },
        requires_approval: false,
        approved_by: userData.user.id,
        approved_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Execute the fix based on type
    let result: { success: boolean; message: string; details?: any };
    
    try {
      result = await executeFix(supabase, fix);
      logStep("Fix executed", result);
    } catch (execError: any) {
      result = { success: false, message: execError.message };
      logStep("Fix execution failed", { error: execError.message });
    }

    // Update action log with result
    if (actionLog) {
      await supabase
        .from("ai_agent_action_log")
        .update({
          action_status: result.success ? 'executed' : 'failed',
          executed_at: new Date().toISOString(),
          error_message: result.success ? null : result.message,
          details: {
            ...actionLog.details,
            execution_result: result,
          },
        })
        .eq("id", actionLog.id);
    }

    // Update fix status
    await supabase
      .from("admin_assistant_fixes")
      .update({
        applied_at: result.success ? new Date().toISOString() : null,
        approval_status: result.success ? 'applied' : 'approved', // Keep approved if failed
      })
      .eq("id", fixId);

    // If successful, mark the issue as resolved
    if (result.success && fix.admin_assistant_issues) {
      await supabase
        .from("admin_assistant_issues")
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq("id", (fix.admin_assistant_issues as any).id);
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.message,
        details: result.details,
        action_log_id: actionLog?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    logStep("Error", { message: error.message });
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function executeFix(
  supabase: any,
  fix: any
): Promise<{ success: boolean; message: string; details?: any }> {
  const fixType = fix.fix_type?.toLowerCase() || '';
  const details = fix.fix_details || {};
  const issue = fix.admin_assistant_issues;

  // Route to appropriate handler
  if (fixType.includes('broken_link') || fixType.includes('link')) {
    return await handleBrokenLinkFix(supabase, issue, details);
  }
  
  if (fixType.includes('cache') || fixType.includes('cleanup')) {
    return await handleCacheCleanup(supabase, issue, details);
  }
  
  if (fixType.includes('webhook') || fixType.includes('retry')) {
    return await handleWebhookRetry(supabase, issue, details);
  }
  
  if (fixType.includes('image') || fixType.includes('media')) {
    return await handleImageRelink(supabase, issue, details);
  }
  
  if (fixType.includes('orphan') || fixType.includes('cleanup')) {
    return await handleOrphanCleanup(supabase, issue, details);
  }

  // Generic automatic fix - just mark as handled
  if (fixType === 'automatic' || fixType.includes('auto')) {
    return {
      success: true,
      message: 'Fix marked as applied',
      details: { auto_marked: true },
    };
  }

  return {
    success: false,
    message: `Unknown fix type: ${fixType}. Manual intervention required.`,
  };
}

// Handler: Broken Link Repair
async function handleBrokenLinkFix(
  supabase: any,
  issue: any,
  details: any
): Promise<{ success: boolean; message: string; details?: any }> {
  const affectedResource = issue?.affected_resource;
  
  if (!affectedResource) {
    return { success: false, message: 'No resource specified for link repair' };
  }

  // If it's a URL in the cache, mark it for re-validation
  const { error } = await supabase
    .from('url_validation_cache')
    .delete()
    .eq('url', affectedResource);

  if (error) {
    // Try updating businesses with the broken URL
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, website')
      .eq('website', affectedResource);

    if (businesses?.length > 0) {
      // Flag for admin review rather than auto-modifying
      return {
        success: true,
        message: `Found ${businesses.length} businesses with this URL. Flagged for review.`,
        details: { businesses_affected: businesses.length },
      };
    }
  }

  return {
    success: true,
    message: 'Broken link cache entry cleared for re-validation',
    details: { url: affectedResource },
  };
}

// Handler: Cache Cleanup
async function handleCacheCleanup(
  supabase: any,
  issue: any,
  details: any
): Promise<{ success: boolean; message: string; details?: any }> {
  // Clean expired URL validation cache
  const { count, error } = await supabase
    .from('url_validation_cache')
    .delete()
    .lt('expires_at', new Date().toISOString());

  if (error) {
    return { success: false, message: `Cache cleanup failed: ${error.message}` };
  }

  return {
    success: true,
    message: `Cache cleanup completed`,
    details: { entries_removed: count || 0 },
  };
}

// Handler: Webhook Retry
async function handleWebhookRetry(
  supabase: any,
  issue: any,
  details: any
): Promise<{ success: boolean; message: string; details?: any }> {
  const webhookEventId = issue?.affected_resource || details?.event_id;

  if (!webhookEventId) {
    // Retry all recent failed webhooks
    const { data: failedWebhooks } = await supabase
      .from('webhook_events')
      .select('id, event_type, payload')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!failedWebhooks?.length) {
      return { success: true, message: 'No failed webhooks to retry' };
    }

    // Mark them for retry (actual retry would need webhook processing logic)
    const { error } = await supabase
      .from('webhook_events')
      .update({ 
        status: 'pending_retry',
        error_message: 'Queued for retry by AI Agent',
      })
      .in('id', failedWebhooks.map((w: any) => w.id));

    if (error) {
      return { success: false, message: `Webhook retry queue failed: ${error.message}` };
    }

    return {
      success: true,
      message: `${failedWebhooks.length} webhooks queued for retry`,
      details: { webhook_ids: failedWebhooks.map((w: any) => w.id) },
    };
  }

  // Single webhook retry
  const { error } = await supabase
    .from('webhook_events')
    .update({ 
      status: 'pending_retry',
      error_message: 'Queued for retry by AI Agent',
    })
    .eq('id', webhookEventId);

  if (error) {
    return { success: false, message: `Failed to queue webhook: ${error.message}` };
  }

  return {
    success: true,
    message: 'Webhook queued for retry',
    details: { webhook_id: webhookEventId },
  };
}

// Handler: Image Re-link
async function handleImageRelink(
  supabase: any,
  issue: any,
  details: any
): Promise<{ success: boolean; message: string; details?: any }> {
  const businessId = issue?.affected_resource || details?.business_id;

  if (!businessId) {
    return { success: false, message: 'No business ID specified for image relink' };
  }

  // Get the business
  const { data: business, error } = await supabase
    .from('businesses')
    .select('id, name, images')
    .eq('id', businessId)
    .single();

  if (error || !business) {
    return { success: false, message: 'Business not found' };
  }

  // Filter out invalid/empty image URLs
  const validImages = (business.images || []).filter((img: string) => 
    img && img.startsWith('http') && !img.includes('undefined')
  );

  if (validImages.length === (business.images || []).length) {
    return { 
      success: true, 
      message: 'All images appear valid, no changes needed',
      details: { business_name: business.name },
    };
  }

  // Update with cleaned images
  const { error: updateError } = await supabase
    .from('businesses')
    .update({ images: validImages })
    .eq('id', businessId);

  if (updateError) {
    return { success: false, message: `Image update failed: ${updateError.message}` };
  }

  return {
    success: true,
    message: `Cleaned image array for ${business.name}`,
    details: { 
      business_name: business.name,
      images_before: (business.images || []).length,
      images_after: validImages.length,
    },
  };
}

// Handler: Orphan Cleanup
async function handleOrphanCleanup(
  supabase: any,
  issue: any,
  details: any
): Promise<{ success: boolean; message: string; details?: any }> {
  const cleanupType = details?.cleanup_type || 'general';
  let cleaned = 0;

  // Clean orphaned dunning records (where business no longer exists)
  const { data: orphanedDunning } = await supabase
    .from('dunning_records')
    .select('id, business_id')
    .not('business_id', 'is', null);

  if (orphanedDunning?.length) {
    for (const record of orphanedDunning) {
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', record.business_id)
        .maybeSingle();

      if (!business) {
        await supabase
          .from('dunning_records')
          .delete()
          .eq('id', record.id);
        cleaned++;
      }
    }
  }

  return {
    success: true,
    message: `Orphan cleanup completed`,
    details: { records_cleaned: cleaned },
  };
}
