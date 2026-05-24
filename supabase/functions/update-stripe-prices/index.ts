import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-STRIPE-PRICES] ${step}${detailsStr}`);
};

// Current Stripe product IDs for Wellington EcoBuild
const STRIPE_PRODUCTS = {
  premium: 'prod_TcwrTvDvPLM87z',
  elite: 'prod_TcwsQMBkk9Smug',
  spotlight_weekly: 'prod_Tcx1R1SPirnPjE',
  spotlight_monthly: 'prod_Tcx1TF6B0d7OZL',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check admin role
    const { data: hasAdminRole } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });
    if (!hasAdminRole) throw new Error("Admin access required");

    logStep("Admin verified", { userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Parse request body
    const body = await req.json();
    const { action, plan, priceNZD } = body;

    if (action === "update") {
      // Validate inputs
      if (!plan || !["premium", "elite", "spotlight_weekly", "spotlight_monthly"].includes(plan)) {
        throw new Error("Invalid plan specified");
      }
      if (!priceNZD || typeof priceNZD !== "number" || priceNZD < 0) {
        throw new Error("Invalid price specified");
      }

      const productId = STRIPE_PRODUCTS[plan as keyof typeof STRIPE_PRODUCTS];
      if (!productId) throw new Error("Product not found");

      logStep("Updating price", { plan, priceNZD, productId });

      // Create a new price in Stripe (prices are immutable, so we create new and archive old)
      const priceAmountCents = Math.round(priceNZD * 100);
      
      // Determine interval based on plan
      const isRecurring = plan === "premium" || plan === "elite" || plan === "spotlight_monthly";
      const interval = plan === "spotlight_weekly" ? "week" : "month";

      // Create the new price
      const newPrice = await stripe.prices.create({
        product: productId,
        unit_amount: priceAmountCents,
        currency: "nzd",
        recurring: isRecurring ? { interval } : undefined,
        active: true,
      });

      logStep("Created new price", { priceId: newPrice.id, amount: priceAmountCents });

      // Archive old active prices for this product
      const oldPrices = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 100,
      });

      for (const oldPrice of oldPrices.data) {
        if (oldPrice.id !== newPrice.id) {
          await stripe.prices.update(oldPrice.id, { active: false });
          logStep("Archived old price", { priceId: oldPrice.id });
        }
      }

      // Update the platform_settings in the database
      const settingKey = plan === "premium" 
        ? "price_premium_monthly" 
        : plan === "elite" 
        ? "price_elite_monthly" 
        : "price_spotlight_weekly";
      
      const priceIdKey = plan === "premium"
        ? "stripe_price_id_premium"
        : plan === "elite"
        ? "stripe_price_id_elite"
        : null;

      // Update display price
      const { data: existingSetting } = await supabaseClient
        .from('platform_settings')
        .select('id')
        .eq('key', settingKey)
        .maybeSingle();

      if (existingSetting) {
        await supabaseClient
          .from('platform_settings')
          .update({ value: priceNZD })
          .eq('key', settingKey);
      } else {
        await supabaseClient
          .from('platform_settings')
          .insert({ key: settingKey, value: priceNZD });
      }

      // Update Stripe price ID if applicable
      if (priceIdKey) {
        const { data: existingPriceIdSetting } = await supabaseClient
          .from('platform_settings')
          .select('id')
          .eq('key', priceIdKey)
          .maybeSingle();

        if (existingPriceIdSetting) {
          await supabaseClient
            .from('platform_settings')
            .update({ value: newPrice.id })
            .eq('key', priceIdKey);
        } else {
          await supabaseClient
            .from('platform_settings')
            .insert({ key: priceIdKey, value: newPrice.id });
        }
      }

      logStep("Updated platform settings", { settingKey, priceIdKey });

      return new Response(JSON.stringify({
        success: true,
        newPriceId: newPrice.id,
        plan,
        priceNZD,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (action === "get") {
      // Fetch current prices from Stripe
      const prices: Record<string, { priceId: string; priceNZD: number; interval: string }> = {};

      for (const [planName, productId] of Object.entries(STRIPE_PRODUCTS)) {
        const productPrices = await stripe.prices.list({
          product: productId,
          active: true,
          limit: 1,
        });

        if (productPrices.data.length > 0) {
          const price = productPrices.data[0];
          prices[planName] = {
            priceId: price.id,
            priceNZD: (price.unit_amount || 0) / 100,
            interval: price.recurring?.interval || "one_time",
          };
        }
      }

      logStep("Fetched current prices", prices);

      return new Response(JSON.stringify({
        success: true,
        prices,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      throw new Error("Invalid action. Use 'update' or 'get'");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
