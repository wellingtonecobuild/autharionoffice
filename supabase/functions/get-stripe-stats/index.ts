import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-STRIPE-STATS] ${step}${detailsStr}`);
};

// Stripe product/price IDs for Wellington EcoBuild
const STRIPE_PRODUCTS = {
  premium: {
    productId: 'prod_TcwrTvDvPLM87z',
    priceId: 'price_1SfgxtIAePQl2zAwNVNqNzsF',
  },
  elite: {
    productId: 'prod_TcwsQMBkk9Smug',
    priceId: 'price_1SfgyRIAePQl2zAwYVEwdQVv',
  },
  spotlight_weekly: {
    productId: 'prod_Tcx1R1SPirnPjE',
    priceId: 'price_1Sfh74IAePQl2zAwVuYLRIyW',
  },
  spotlight_monthly: {
    productId: 'prod_Tcx1TF6B0d7OZL',
    priceId: 'price_1Sfh73IAePQl2zAwILZ4D2BI',
  },
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

    // Fetch all prices to get current pricing
    const prices = await stripe.prices.list({ active: true, limit: 100 });
    logStep("Fetched prices", { count: prices.data.length });

    // Build price map
    const priceMap: Record<string, { amount: number; interval: string | null }> = {};
    for (const price of prices.data) {
      priceMap[price.id] = {
        amount: price.unit_amount || 0,
        interval: price.recurring?.interval || null,
      };
    }

    // Fetch active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
      expand: ['data.items.data.price'],
    });
    logStep("Fetched subscriptions", { count: subscriptions.data.length });

    // Count subscriptions by product
    let premiumCount = 0;
    let eliteCount = 0;
    let spotlightCount = 0;
    let totalMRR = 0;

    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const productId = typeof item.price.product === 'string' 
          ? item.price.product 
          : item.price.product.id;
        const priceAmount = item.price.unit_amount || 0;
        const interval = item.price.recurring?.interval || 'month';
        
        // Convert to monthly for MRR calculation
        let monthlyAmount = priceAmount;
        if (interval === 'week') {
          monthlyAmount = priceAmount * 4.33; // Average weeks per month
        } else if (interval === 'year') {
          monthlyAmount = priceAmount / 12;
        }

        if (productId === STRIPE_PRODUCTS.premium.productId) {
          premiumCount++;
          totalMRR += monthlyAmount;
        } else if (productId === STRIPE_PRODUCTS.elite.productId) {
          eliteCount++;
          totalMRR += monthlyAmount;
        } else if (
          productId === STRIPE_PRODUCTS.spotlight_weekly.productId ||
          productId === STRIPE_PRODUCTS.spotlight_monthly.productId
        ) {
          spotlightCount++;
          totalMRR += monthlyAmount;
        }
      }
    }

    // Get recent payments for revenue calculation
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const charges = await stripe.charges.list({
      limit: 100,
      created: {
        gte: Math.floor(startOfYear.getTime() / 1000),
      },
    });
    logStep("Fetched charges", { count: charges.data.length });

    let revenueThisMonth = 0;
    let revenueThisYear = 0;

    for (const charge of charges.data) {
      if (charge.status === 'succeeded' && !charge.refunded) {
        const chargeDate = new Date(charge.created * 1000);
        const amountNZD = charge.amount / 100;
        
        revenueThisYear += amountNZD;
        if (chargeDate >= startOfMonth) {
          revenueThisMonth += amountNZD;
        }
      }
    }

    // Fetch current active prices for each product directly from Stripe
    const fetchCurrentPrice = async (productId: string) => {
      const productPrices = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 1,
      });
      if (productPrices.data.length > 0) {
        return {
          priceId: productPrices.data[0].id,
          amount: productPrices.data[0].unit_amount || 0,
          interval: productPrices.data[0].recurring?.interval || 'month',
        };
      }
      return null;
    };

    const [premiumPriceInfo, elitePriceInfo, spotlightWeeklyInfo, spotlightMonthlyInfo] = await Promise.all([
      fetchCurrentPrice(STRIPE_PRODUCTS.premium.productId),
      fetchCurrentPrice(STRIPE_PRODUCTS.elite.productId),
      fetchCurrentPrice(STRIPE_PRODUCTS.spotlight_weekly.productId),
      fetchCurrentPrice(STRIPE_PRODUCTS.spotlight_monthly.productId),
    ]);

    logStep("Fetched current prices from Stripe", { premiumPriceInfo, elitePriceInfo });

    const stats = {
      subscriptions: {
        premium: {
          count: premiumCount,
          priceNZD: premiumPriceInfo ? premiumPriceInfo.amount / 100 : 149,
          priceId: premiumPriceInfo?.priceId || '',
          interval: 'month',
        },
        elite: {
          count: eliteCount,
          priceNZD: elitePriceInfo ? elitePriceInfo.amount / 100 : 349,
          priceId: elitePriceInfo?.priceId || '',
          interval: 'month',
        },
        spotlight: {
          count: spotlightCount,
          weeklyPriceNZD: spotlightWeeklyInfo ? spotlightWeeklyInfo.amount / 100 : 99,
          monthlyPriceNZD: spotlightMonthlyInfo ? spotlightMonthlyInfo.amount / 100 : 299,
        },
        total: premiumCount + eliteCount,
      },
      revenue: {
        mrr: totalMRR / 100, // Convert from cents
        thisMonth: revenueThisMonth,
        thisYear: revenueThisYear,
      },
      prices: {
        premium: premiumPriceInfo ? premiumPriceInfo.amount / 100 : 149,
        elite: elitePriceInfo ? elitePriceInfo.amount / 100 : 349,
        spotlightWeekly: spotlightWeeklyInfo ? spotlightWeeklyInfo.amount / 100 : 99,
        spotlightMonthly: spotlightMonthlyInfo ? spotlightMonthlyInfo.amount / 100 : 299,
      },
      lastUpdated: new Date().toISOString(),
    };

    logStep("Stats calculated", stats);

    return new Response(JSON.stringify(stats), {
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
