import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BUSINESS-RESUBMIT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");
    
    const { businessId, notes } = await req.json();
    
    if (!businessId) {
      return new Response(
        JSON.stringify({ success: false, error: "Business ID is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    logStep("Request received", { businessId });

    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization header required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: "User not authenticated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    // Get business details and verify ownership
    const { data: business, error: bizError } = await supabaseClient
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      return new Response(
        JSON.stringify({ success: false, error: "Business not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Verify the user owns this business
    if (business.owner_id !== userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: You do not own this business" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check if business is in a resubmittable state
    const resubmittableStatuses = ["resubmission_required", "declined", "rejected"];
    if (!resubmittableStatuses.includes(business.status)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Business cannot be resubmitted. Current status: ${business.status}` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Business verified for resubmission", { 
      businessName: business.name, 
      currentStatus: business.status,
      paymentStatus: business.payment_status,
    });

    // Update business status to pending_verification (ready for review)
    const { error: updateError } = await supabaseClient
      .from("businesses")
      .update({
        status: "pending_verification",
        // Keep payment held if it was held before
        payment_status: business.payment_status === "refunded" ? "none" : "held",
        // Clear resubmission notes but keep rejection reason for reference
        resubmission_notes: notes || "Resubmitted by business owner",
        resubmission_requested_at: null,
      })
      .eq("id", businessId);

    if (updateError) {
      logStep("Error updating business", { error: updateError.message });
      return new Response(
        JSON.stringify({ success: false, error: `Failed to update business: ${updateError.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Business status updated to pending_verification");

    // Create admin notification
    await supabaseClient
      .from("admin_notifications")
      .insert({
        type: "business_resubmission",
        title: "Business Resubmitted for Review",
        message: `${business.name} has resubmitted their application after ${business.status === "resubmission_required" ? "requested changes" : "decline"}`,
        metadata: { 
          business_id: businessId, 
          business_name: business.name,
          plan: business.subscription_plan,
          previous_status: business.status,
          notes,
        },
      });

    logStep("Admin notification created");

    // Send confirmation email to the business
    try {
      await supabaseClient.functions.invoke("notify-payment-status", {
        body: {
          businessId,
          status: "resubmitted",
          businessName: business.name,
          businessEmail: business.email,
          plan: business.subscription_plan,
          amount: business.payment_amount,
          notes: notes || "Your application has been resubmitted for review.",
        },
      });
      logStep("Confirmation email sent");
    } catch (emailError) {
      logStep("Warning: Error sending confirmation email", { error: String(emailError) });
    }

    // Log audit entry
    await supabaseClient
      .from("audit_logs")
      .insert({
        admin_id: userId, // The business owner who resubmitted
        action: "business_resubmitted",
        entity_type: "business",
        entity_id: businessId,
        new_data: { status: "pending_verification", notes },
        old_data: { status: business.status },
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Your application has been resubmitted for review. You will be notified once it is processed." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("CRITICAL ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
