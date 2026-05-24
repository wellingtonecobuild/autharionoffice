import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getSafeErrorMessage } from "../_shared/error-handler.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Product IDs mapping (NZD)
const PRODUCTS = {
  premium: "prod_TcwrTvDvPLM87z",        // $149/month
  elite: "prod_TcwsQMBkk99Smug",         // $349/month
  spotlight_monthly: "prod_Tcx1TF6B0d7OZL", // $549/month
  spotlight_weekly: "prod_Tcx1R1SPirnPjE",  // $149/week
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan: "free",
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10, // Check all active subscriptions for spotlight
    });

    let plan = "free";
    let subscriptionEnd = null;
    let hasSpotlight = false;
    let spotlightEnd = null;

    for (const subscription of subscriptions.data) {
      const productId = subscription.items.data[0].price.product as string;
      const endDate = new Date(subscription.current_period_end * 1000).toISOString();
      
      // Check for main plan
      if (productId === PRODUCTS.elite) {
        plan = "elite";
        subscriptionEnd = endDate;
      } else if (productId === PRODUCTS.premium && plan !== "elite") {
        plan = "premium";
        subscriptionEnd = endDate;
      }
      
      // Check for spotlight add-on
      if (productId === PRODUCTS.spotlight_monthly || productId === PRODUCTS.spotlight_weekly) {
        hasSpotlight = true;
        spotlightEnd = endDate;
      }
    }
    
    logStep("Subscription check complete", { plan, hasSpotlight, subscriptionEnd, spotlightEnd });

    return new Response(JSON.stringify({
      subscribed: plan !== "free",
      plan,
      subscription_end: subscriptionEnd,
      has_spotlight: hasSpotlight,
      spotlight_end: spotlightEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: getSafeErrorMessage(error, "CHECK-SUBSCRIPTION") }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
