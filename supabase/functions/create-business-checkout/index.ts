import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BUSINESS-CHECKOUT] ${step}${detailsStr}`);
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
    
    const { businessId, plan, billingCycle = 'monthly' } = await req.json();
    
    if (!businessId) throw new Error("Business ID is required");
    if (!plan || !["premium", "elite"].includes(plan)) {
      throw new Error("Valid plan (premium or elite) is required");
    }
    if (!['monthly', 'annual'].includes(billingCycle)) {
      throw new Error("Valid billing cycle (monthly or annual) is required");
    }
    
    logStep("Request received", { businessId, plan, billingCycle });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    
    const user = userData.user;
    logStep("User authenticated", { email: user.email, userId: user.id });

    // Verify the business belongs to this user
    const { data: business, error: bizError } = await supabaseClient
      .from("businesses")
      .select("id, name, owner_id, subscription_plan, category")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      throw new Error("Business not found");
    }

    if (business.owner_id !== user.id) {
      throw new Error("Unauthorized: Business does not belong to this user");
    }

    logStep("Business verified", { businessName: business.name, category: business.category });

    // CRITICAL: Check Elite availability if requesting Elite plan
    if (plan === "elite") {
      const { data: eliteCap, error: capError } = await supabaseClient
        .from("elite_category_caps")
        .select("*")
        .eq("category", business.category)
        .single();

      if (capError) {
        logStep("Error checking elite cap", { error: capError.message });
        throw new Error("Unable to verify Elite availability");
      }

      if (!eliteCap.is_accepting_new) {
        logStep("Elite applications closed for category", { category: business.category });
        throw new Error(`Elite applications are currently closed for ${business.category}. Please join the waitlist.`);
      }

      if (eliteCap.current_count >= eliteCap.max_slots) {
        logStep("Elite slots full for category", { 
          category: business.category, 
          current: eliteCap.current_count, 
          max: eliteCap.max_slots 
        });
        throw new Error(`All ${eliteCap.max_slots} Elite slots are filled for ${business.category}. Please join the waitlist.`);
      }

      logStep("Elite availability confirmed", { 
        category: business.category,
        slotsRemaining: eliteCap.max_slots - eliteCap.current_count 
      });
    }

    // CRITICAL: Fetch price from subscription_plans table (single source of truth)
    const { data: planData, error: planError } = await supabaseClient
      .from("subscription_plans")
      .select("id, plan_key, name, price_monthly, price_annual, stripe_price_id, stripe_price_id_annual, stripe_product_id, stripe_product_id_annual, gst_included")
      .eq("plan_key", plan)
      .eq("status", "active")
      .single();

    if (planError || !planData) {
      throw new Error(`Plan '${plan}' not found or inactive`);
    }

    // Determine price based on billing cycle
    const isAnnual = billingCycle === 'annual';
    const priceAmount = isAnnual ? planData.price_annual : planData.price_monthly;
    const stripePriceId = isAnnual ? planData.stripe_price_id_annual : planData.stripe_price_id;

    if (isAnnual && !priceAmount) {
      throw new Error(`Annual pricing not available for ${plan} plan`);
    }

    logStep("Plan loaded from database", { 
      planKey: planData.plan_key,
      billingCycle,
      price: priceAmount,
      stripePriceId
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    const origin = req.headers.get("origin") || "https://preview--duumxykzcliujgyrmzvn.lovable.app";
    
    // Price in cents for Stripe (NZD)
    const priceInCents = Math.round(priceAmount * 100);
    
    // If we have a stored Stripe price ID, use it. Otherwise create price dynamically
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    
    if (stripePriceId) {
      // Use existing Stripe price
      logStep("Using stored Stripe price ID", { priceId: stripePriceId });
      lineItems = [{
        price: stripePriceId,
        quantity: 1,
      }];
    } else {
      // Create price dynamically using price_data from database amount
      const interval = isAnnual ? "year" : "month";
      logStep("Creating dynamic price from database amount", { priceInCents, planName: planData.name, interval });
      lineItems = [{
        price_data: {
          currency: "nzd",
          product_data: {
            name: `${planData.name} Plan - Wellington EcoBuild`,
            description: `${isAnnual ? 'Annual' : 'Monthly'} subscription for ${planData.name} business listing`,
          },
          unit_amount: priceInCents,
          recurring: {
            interval: interval,
          },
        },
        quantity: 1,
      }];
    }
    
    // Create checkout session.
    // Note: PayPal availability depends on your Stripe account + currency/country support.
    // If PayPal isn't enabled/eligible, we'll gracefully fall back to card-only so checkout never fails.
    const baseSessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "subscription",
      success_url: `${origin}/payment-success?business_id=${businessId}`,
      cancel_url: `${origin}/payment-canceled`,
      metadata: {
        user_id: user.id,
        business_id: businessId,
        plan: plan,
        billing_cycle: billingCycle,
        payment_type: "business_subscription",
        price_nzd: priceAmount.toString(),
        category: business.category,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          business_id: businessId,
          plan: plan,
          billing_cycle: billingCycle,
          category: business.category,
        },
      },
    };

    let session: Stripe.Checkout.Session;

    try {
      // Try card + PayPal first
      session = await stripe.checkout.sessions.create({
        ...baseSessionParams,
        payment_method_types: ["card", "paypal"],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logStep("PayPal not available; falling back to card-only", { message });

      // Fallback to card-only (keeps checkout working even if PayPal isn't enabled/eligible)
      session = await stripe.checkout.sessions.create({
        ...baseSessionParams,
        payment_method_types: ["card"],
      });
    }

    logStep("Checkout session created", { 
      sessionId: session.id, 
      url: session.url,
      amount: priceInCents / 100,
      billingCycle
    });

    // Update business - keep status as awaiting_payment until checkout completes
    // Business will NOT be submitted for review until payment succeeds via webhook
    await supabaseClient
      .from("businesses")
      .update({ 
        status: "awaiting_payment",
        subscription_plan: plan,
        billing_cycle: billingCycle,
        payment_status: "pending",
      })
      .eq("id", businessId);

    logStep("Business updated - awaiting payment completion before submission");

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});