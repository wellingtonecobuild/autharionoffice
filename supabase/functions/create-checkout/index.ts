import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Plan configuration - immediate payment, no trials
const PLANS: Record<string, Record<string, { priceId: string; price: number }>> = {
  premium: {
    monthly: {
      priceId: "price_1SfgxtIAePQl2zAwNVNqNzsF",
      price: 79,
    },
    annual: {
      priceId: "price_1SfgxtIAePQl2zAwNVNqNzsF",
      price: 790,
    }
  },
  elite: {
    monthly: {
      priceId: "price_1SfgxtIAePQl2zAwNVNqNzsF",
      price: 149,
    },
    annual: {
      priceId: "price_1SfgxtIAePQl2zAwNVNqNzsF",
      price: 1490,
    }
  }
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

    const body = await req.json();
    const { businessId, plan = 'premium', billingCycle = 'monthly', priceId: providedPriceId } = body;
    
    // Support legacy priceId-only calls
    if (providedPriceId && !businessId) {
      // Legacy mode - just create checkout with priceId
      const authHeader = req.headers.get("Authorization")!;
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      const user = data.user;
      if (!user?.email) throw new Error("User not authenticated or email not available");
      
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
        apiVersion: "2025-08-27.basil" 
      });
      
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      let customerId;
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
      
       const origin = req.headers.get("origin") || "https://wellingtonecobuild.nz";
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: providedPriceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${origin}/payment-success`,
        cancel_url: `${origin}/payment-canceled`,
        metadata: { user_id: user.id },
      });
      
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    if (!businessId) throw new Error("Business ID is required");
    if (!['premium', 'elite'].includes(plan)) throw new Error("Invalid plan");
    if (!['monthly', 'annual'].includes(billingCycle)) throw new Error("Invalid billing cycle");
    
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
      .select("id, name, owner_id, subscription_plan, category, email")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      throw new Error("Business not found");
    }

    if (business.owner_id !== user.id) {
      throw new Error("Unauthorized: Business does not belong to this user");
    }

    logStep("Business verified", { businessName: business.name, category: business.category });

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

     const origin = req.headers.get("origin") || "https://wellingtonecobuild.nz";
    const planConfig = PLANS[plan][billingCycle];
    
    // Create checkout session - IMMEDIATE PAYMENT, NO TRIAL
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: planConfig.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        metadata: {
          user_id: user.id,
          business_id: businessId,
          plan: plan,
          billing_cycle: billingCycle,
          category: business.category,
        },
      },
      payment_method_collection: "always",
      success_url: `${origin}/payment-success?business_id=${businessId}&plan=${plan}`,
      cancel_url: `${origin}/payment-canceled`,
      metadata: {
        user_id: user.id,
        business_id: businessId,
        plan: plan,
        billing_cycle: billingCycle,
        payment_type: "subscription",
        category: business.category,
      },
      custom_text: {
        submit: {
          message: `You will be charged $${planConfig.price}/${billingCycle === 'monthly' ? 'month' : 'year'} for the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.`,
        },
      },
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      plan,
      billingCycle,
      price: planConfig.price,
    });

    // Update business status
    await supabaseClient
      .from("businesses")
      .update({ 
        status: "awaiting_payment",
      })
      .eq("id", businessId);

    return new Response(JSON.stringify({ 
      url: session.url,
      plan,
      billingCycle,
      price: planConfig.price,
    }), {
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
