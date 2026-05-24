import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-HELD-PAYMENT] ${step}${detailsStr}`);
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
    
    const { businessId, action, notes } = await req.json();
    
    if (!businessId) {
      return new Response(
        JSON.stringify({ success: false, error: "Business ID is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    if (!action || !["approve", "decline", "resubmit"].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: "Valid action (approve, decline, resubmit) is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    logStep("Request received", { businessId, action });

    // Verify admin authentication
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
    
    const adminId = userData.user.id;

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Admin access required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Admin verified", { adminId });

    // Get business details
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

    logStep("Business found", { 
      businessName: business.name, 
      paymentStatus: business.payment_status,
      paymentIntentId: business.payment_intent_id,
      stripeCustomerId: business.stripe_customer_id,
      subscriptionId: business.stripe_subscription_id 
    });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Stripe configuration missing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2025-08-27.basil" 
    });

    let result: any = {};
    let refundDetails: any = null;

    if (action === "approve") {
      // APPROVE & COLLECT: Activate subscription and business
      logStep("Approving and collecting payment");

      // Update business status to active
      const { error: updateError } = await supabaseClient
        .from("businesses")
        .update({
          status: "active",
          payment_status: "captured",
          payment_captured_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
          approved_by: adminId,
          rejection_reason: null,
          resubmission_notes: null,
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

      // Record revenue transaction (payment now collected)
      const { error: revenueError } = await supabaseClient
        .from("revenue_transactions")
        .insert({
          transaction_id: business.payment_intent_id || `manual_${businessId}_${Date.now()}`,
          amount_nzd: business.payment_amount || 0,
          payment_type: "subscription",
          business_name: business.name,
          business_email: business.email,
          business_id: businessId,
          stripe_customer_id: business.stripe_customer_id,
          subscription_tier: business.subscription_plan,
          payment_status: "paid",
          gst_amount: (business.payment_amount || 0) * 0.15,
        });

      if (revenueError) {
        logStep("Warning: Error recording revenue", { error: revenueError.message });
      }

      // Send approval email
      try {
        await supabaseClient.functions.invoke("notify-payment-status", {
          body: {
            businessId,
            status: "approved",
            businessName: business.name,
            businessEmail: business.email,
            plan: business.subscription_plan,
            amount: business.payment_amount,
          },
        });
        logStep("Approval email sent");
      } catch (emailError) {
        logStep("Warning: Error sending approval email", { error: String(emailError) });
      }

      // Log audit entry
      await supabaseClient
        .from("audit_logs")
        .insert({
          admin_id: adminId,
          action: "payment_approved",
          entity_type: "business",
          entity_id: businessId,
          new_data: { status: "active", payment_status: "captured", amount: business.payment_amount },
          old_data: { status: business.status, payment_status: business.payment_status },
        });

      // Create admin notification
      await supabaseClient
        .from("admin_notifications")
        .insert({
          type: "payment_approved",
          title: "Payment Approved & Collected",
          message: `${business.name} (${business.subscription_plan}) - $${business.payment_amount?.toFixed(2)} collected`,
          metadata: { business_id: businessId, amount: business.payment_amount, plan: business.subscription_plan },
        });

      result = { success: true, message: "Payment approved and business activated" };
      logStep("Payment approved successfully");

    } else if (action === "decline") {
      // DECLINE & REFUND: Cancel subscription and refund to original payment method
      logStep("Declining and refunding payment");

      // Cancel the subscription in Stripe if exists
      if (business.stripe_subscription_id) {
        try {
          await stripe.subscriptions.cancel(business.stripe_subscription_id);
          logStep("Stripe subscription cancelled", { subscriptionId: business.stripe_subscription_id });
        } catch (stripeError: any) {
          logStep("Warning: Error cancelling subscription (may already be cancelled)", { 
            error: stripeError.message,
            code: stripeError.code 
          });
        }
      }

      // Issue refund to original payment method
      let refundSuccessful = false;
      let refundId: string | null = null;
      let refundAmount: number = 0;

      // Try to refund using the stored payment_intent_id first
      if (business.payment_intent_id) {
        try {
          logStep("Attempting refund using stored payment_intent_id", { 
            paymentIntentId: business.payment_intent_id 
          });
          
          const refund = await stripe.refunds.create({
            payment_intent: business.payment_intent_id,
            reason: "requested_by_customer",
          });
          
          refundSuccessful = true;
          refundId = refund.id;
          refundAmount = refund.amount / 100; // Convert from cents
          
          refundDetails = {
            refundId: refund.id,
            amount: refundAmount,
            status: refund.status,
            paymentMethod: "original payment method",
          };
          
          logStep("Refund issued successfully", { 
            refundId: refund.id, 
            amount: refundAmount,
            status: refund.status 
          });
        } catch (refundError: any) {
          logStep("Error refunding with payment_intent_id", { 
            error: refundError.message,
            code: refundError.code 
          });
        }
      }

      // Fallback: Find and refund the latest successful payment for this customer
      if (!refundSuccessful && business.stripe_customer_id) {
        try {
          logStep("Attempting refund using customer's latest payment", { 
            customerId: business.stripe_customer_id 
          });
          
          const paymentIntents = await stripe.paymentIntents.list({
            customer: business.stripe_customer_id,
            limit: 5,
          });

          // Find the most recent succeeded payment
          const successfulPayment = paymentIntents.data.find((pi: any) => pi.status === "succeeded");
          
          if (successfulPayment) {
            const refund = await stripe.refunds.create({
              payment_intent: successfulPayment.id,
              reason: "requested_by_customer",
            });
            
            refundSuccessful = true;
            refundId = refund.id;
            refundAmount = refund.amount / 100;
            
            refundDetails = {
              refundId: refund.id,
              amount: refundAmount,
              status: refund.status,
              paymentMethod: "original payment method",
            };
            
            logStep("Fallback refund issued successfully", { 
              refundId: refund.id, 
              amount: refundAmount,
              originalPaymentIntent: successfulPayment.id 
            });
          } else {
            logStep("No successful payments found to refund");
          }
        } catch (fallbackError: any) {
          logStep("Error with fallback refund", { 
            error: fallbackError.message,
            code: fallbackError.code 
          });
        }
      }

      // Update business status (even if refund failed, we still decline)
      const updateData: any = {
        status: "declined",
        payment_status: refundSuccessful ? "refunded" : "refund_failed",
        rejection_reason: notes || "Application declined",
        stripe_subscription_id: null,
      };
      
      if (refundSuccessful) {
        updateData.payment_refunded_at = new Date().toISOString();
      }

      const { error: updateError } = await supabaseClient
        .from("businesses")
        .update(updateData)
        .eq("id", businessId);

      if (updateError) {
        logStep("Error updating business after decline", { error: updateError.message });
        return new Response(
          JSON.stringify({ success: false, error: `Failed to update business: ${updateError.message}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Send decline email with refund receipt
      try {
        await supabaseClient.functions.invoke("notify-payment-status", {
          body: {
            businessId,
            status: "declined",
            businessName: business.name,
            businessEmail: business.email,
            plan: business.subscription_plan,
            amount: business.payment_amount,
            notes: notes,
            refundDetails: refundDetails,
          },
        });
        logStep("Decline email sent");
      } catch (emailError) {
        logStep("Warning: Error sending decline email", { error: String(emailError) });
      }

      // Log audit entry with refund details
      await supabaseClient
        .from("audit_logs")
        .insert({
          admin_id: adminId,
          action: "payment_declined_refunded",
          entity_type: "business",
          entity_id: businessId,
          new_data: { 
            status: "declined", 
            payment_status: refundSuccessful ? "refunded" : "refund_failed", 
            notes,
            refundId,
            refundAmount,
          },
          old_data: { status: business.status, payment_status: business.payment_status },
        });

      // Create admin notification
      await supabaseClient
        .from("admin_notifications")
        .insert({
          type: "payment_declined",
          title: refundSuccessful ? "Payment Declined & Refunded" : "Payment Declined (Refund Failed)",
          message: `${business.name} - ${refundSuccessful ? `$${refundAmount.toFixed(2)} refunded` : 'Manual refund required'}`,
          metadata: { 
            business_id: businessId, 
            refund_id: refundId,
            refund_amount: refundAmount,
            refund_successful: refundSuccessful,
          },
        });

      if (refundSuccessful) {
        result = { 
          success: true, 
          message: `Payment refunded ($${refundAmount.toFixed(2)}) and application declined`,
          refundDetails,
        };
      } else {
        result = { 
          success: true, 
          message: "Application declined. Manual refund may be required - no successful payment found to refund.",
          warning: "No payment found to refund",
        };
      }
      
      logStep("Decline process completed", { refundSuccessful, refundId });

    } else if (action === "resubmit") {
      // REQUEST RESUBMISSION: Keep payment held, request new documents
      logStep("Requesting resubmission");

      // Update business status
      const { error: updateError } = await supabaseClient
        .from("businesses")
        .update({
          status: "resubmission_required",
          payment_status: "held",
          resubmission_requested_at: new Date().toISOString(),
          resubmission_notes: notes || "Please resubmit your verification documents",
        })
        .eq("id", businessId);

      if (updateError) {
        logStep("Error updating business", { error: updateError.message });
        return new Response(
          JSON.stringify({ success: false, error: `Failed to update business: ${updateError.message}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Send resubmission email
      try {
        await supabaseClient.functions.invoke("notify-payment-status", {
          body: {
            businessId,
            status: "resubmission_required",
            businessName: business.name,
            businessEmail: business.email,
            plan: business.subscription_plan,
            amount: business.payment_amount,
            notes: notes,
          },
        });
        logStep("Resubmission email sent");
      } catch (emailError) {
        logStep("Warning: Error sending resubmission email", { error: String(emailError) });
      }

      // Log audit entry
      await supabaseClient
        .from("audit_logs")
        .insert({
          admin_id: adminId,
          action: "resubmission_requested",
          entity_type: "business",
          entity_id: businessId,
          new_data: { status: "resubmission_required", notes },
          old_data: { status: business.status },
        });

      // Create admin notification
      await supabaseClient
        .from("admin_notifications")
        .insert({
          type: "resubmission_requested",
          title: "Resubmission Requested",
          message: `${business.name} has been asked to resubmit documents`,
          metadata: { business_id: businessId, notes },
        });

      result = { success: true, message: "Resubmission requested, payment remains held" };
      logStep("Resubmission requested successfully");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("CRITICAL ERROR", { message: errorMessage });
    
    // Still return 200 with error in body for graceful handling
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
