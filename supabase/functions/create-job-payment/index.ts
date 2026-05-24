import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-JOB-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { paymentType, businessId, jobData } = await req.json();
    logStep("Request received", { paymentType, businessId });

    // Validate business ownership - use admin client for full access
    const { data: business, error: bizError } = await supabaseAdmin
      .from("businesses")
      .select("id, name, owner_id, status, is_verified")
      .eq("id", businessId)
      .single();

    if (bizError || !business) throw new Error("Business not found");
    if (business.owner_id !== user.id) throw new Error("Not authorized");
    // Allow approved or active status
    if (business.status !== "approved" && business.status !== "active") {
      throw new Error("Business must be approved to post jobs");
    }

    logStep("Business verified", { businessName: business.name });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    let priceId: string;
    let mode: "payment" | "subscription";
    let metadata: Record<string, string> = {
      businessId,
      userId: user.id,
      paymentType,
    };

    // Get settings for price IDs using admin client
    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("key, value")
      .in("key", ["job_settings", "pay_per_listing_price_id", "spotlight_weekly_price_id"]);

    // Parse settings
    let payPerListingPriceId = "price_1SgF55IAePQl2zAwTqVMmw6Z";
    let spotlightPriceId = "price_1SgF56IAePQl2zAw6z1MUZiR";
    
    settings?.forEach(s => {
      if (s.key === "pay_per_listing_price_id" && s.value) {
        payPerListingPriceId = String(s.value);
      }
      if (s.key === "spotlight_weekly_price_id" && s.value) {
        spotlightPriceId = String(s.value);
      }
      // Also check job_settings object
      if (s.key === "job_settings" && s.value) {
        const jobSettings = s.value as any;
        if (jobSettings.pay_per_listing_price_id) {
          payPerListingPriceId = jobSettings.pay_per_listing_price_id;
        }
        if (jobSettings.spotlight_weekly_price_id) {
          spotlightPriceId = jobSettings.spotlight_weekly_price_id;
        }
      }
    });

    if (paymentType === "pay_per_listing") {
      // One-time $199 payment for non-subscribers
      priceId = payPerListingPriceId;
      mode = "payment";
      
      // Store job data in metadata for processing after payment
      if (jobData) {
        metadata.jobTitle = jobData.title;
        metadata.jobLocation = jobData.location;
        metadata.jobType = jobData.job_type;
      }
      
      logStep("Creating pay-per-listing checkout", { priceId });
    } else if (paymentType === "spotlight") {
      // Weekly $99 spotlight
      priceId = spotlightPriceId;
      mode = "subscription";
      
      if (jobData?.jobId) {
        metadata.jobId = jobData.jobId;
      }
      
      logStep("Creating spotlight checkout", { priceId });
    } else {
      throw new Error("Invalid payment type");
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      success_url: `${origin}/payment-success?type=${paymentType}&businessId=${businessId}`,
      cancel_url: `${origin}/payment-canceled`,
      metadata,
    });

    logStep("Checkout session created", { sessionId: session.id });

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
