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
  console.log(`[SYNC-STRIPE-REVENUE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    // Check admin role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) throw new Error("Admin access required");
    logStep("Admin verified", { userId: userData.user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get request body for date range
    const body = await req.json().catch(() => ({}));
    const { startDate, endDate } = body;

    // Build query params
    const queryParams: any = { limit: 100, status: "paid" };
    if (startDate) queryParams.created = { gte: Math.floor(new Date(startDate).getTime() / 1000) };
    if (endDate) {
      queryParams.created = { 
        ...(queryParams.created || {}), 
        lte: Math.floor(new Date(endDate).getTime() / 1000) 
      };
    }

    logStep("Fetching invoices from Stripe", queryParams);

    // Fetch paid invoices from Stripe
    const invoices = await stripe.invoices.list(queryParams);
    logStep("Fetched invoices", { count: invoices.data.length });

    let newTransactions = 0;
    let skippedTransactions = 0;

    for (const invoice of invoices.data) {
      // Check if transaction already exists
      const { data: existing } = await supabaseClient
        .from("revenue_transactions")
        .select("id")
        .eq("stripe_invoice_id", invoice.id)
        .single();

      if (existing) {
        skippedTransactions++;
        continue;
      }

      // Get subscription details if applicable
      let subscriptionTier = null;
      let paymentType = "subscription";

      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const productId = subscription.items.data[0]?.price?.product;
        
        if (productId) {
          const product = await stripe.products.retrieve(productId as string);
          const productName = product.name.toLowerCase();
          
          if (productName.includes("elite")) {
            subscriptionTier = "elite";
          } else if (productName.includes("premium")) {
            subscriptionTier = "premium";
          } else if (productName.includes("spotlight")) {
            subscriptionTier = "spotlight";
            paymentType = "spotlight";
          }
        }
      }

      // Get business info from Supabase
      let businessName = invoice.customer_name || invoice.customer_email || "Unknown";
      let businessEmail = invoice.customer_email || null;
      let businessId = null;

      if (invoice.customer_email) {
        const { data: business } = await supabaseClient
          .from("businesses")
          .select("id, name, email")
          .eq("stripe_customer_id", invoice.customer)
          .single();

        if (business) {
          businessId = business.id;
          businessName = business.name;
          businessEmail = business.email || invoice.customer_email;
        }
      }

      // Convert amount from cents to NZD
      const amountNzd = (invoice.amount_paid || 0) / 100;

      // Insert transaction
      const { error: insertError } = await supabaseClient
        .from("revenue_transactions")
        .insert({
          transaction_id: `stripe_${invoice.id}`,
          created_at: new Date(invoice.created * 1000).toISOString(),
          amount_nzd: amountNzd,
          payment_type: paymentType,
          subscription_tier: subscriptionTier,
          business_id: businessId,
          business_name: businessName,
          business_email: businessEmail,
          stripe_invoice_id: invoice.id,
          stripe_customer_id: invoice.customer as string,
          payment_status: "paid",
          is_manual: false,
          gst_amount: amountNzd * 0.15 / 1.15, // GST inclusive calculation
          metadata: {
            stripe_invoice_number: invoice.number,
            stripe_subscription_id: invoice.subscription,
            currency: invoice.currency,
          }
        });

      if (insertError) {
        logStep("Error inserting transaction", { error: insertError });
      } else {
        newTransactions++;
      }
    }

    // Log the sync action
    await supabaseClient.from("financial_audit_logs").insert({
      admin_id: userData.user.id,
      action: "stripe_sync",
      details: {
        new_transactions: newTransactions,
        skipped_transactions: skippedTransactions,
        date_range: { startDate, endDate }
      }
    });

    logStep("Sync complete", { newTransactions, skippedTransactions });

    return new Response(
      JSON.stringify({ 
        success: true, 
        newTransactions, 
        skippedTransactions,
        message: `Synced ${newTransactions} new transactions, skipped ${skippedTransactions} existing`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error, "SYNC-STRIPE-REVENUE") }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
