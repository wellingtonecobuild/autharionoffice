import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-BILLING-HISTORY] ${step}${detailsStr}`);
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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(
        JSON.stringify({ invoices: [], payments: [], subscriptions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Fetch invoices
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 50,
    });
    logStep("Fetched invoices", { count: invoices.data.length });

    // Fetch payment intents
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 50,
    });
    logStep("Fetched payment intents", { count: paymentIntents.data.length });

    // Fetch subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
      status: 'all',
    });
    logStep("Fetched subscriptions", { count: subscriptions.data.length });

    // Format invoices
    const formattedInvoices = invoices.data.map((inv: Stripe.Invoice) => ({
      id: inv.id,
      number: inv.number,
      amount: inv.amount_paid / 100,
      currency: inv.currency.toUpperCase(),
      status: inv.status,
      created: new Date(inv.created * 1000).toISOString(),
      paid_at: inv.status_transitions?.paid_at 
        ? new Date(inv.status_transitions.paid_at * 1000).toISOString() 
        : null,
      invoice_pdf: inv.invoice_pdf,
      hosted_invoice_url: inv.hosted_invoice_url,
      description: inv.lines?.data?.[0]?.description || 'Subscription payment',
    }));

    // Format payment intents
    const formattedPayments = paymentIntents.data.map((pi: Stripe.PaymentIntent) => ({
      id: pi.id,
      amount: pi.amount / 100,
      currency: pi.currency.toUpperCase(),
      status: pi.status,
      created: new Date(pi.created * 1000).toISOString(),
      description: pi.description || 'Payment',
    }));

    // Format subscriptions
    const formattedSubscriptions = subscriptions.data.map((sub: Stripe.Subscription) => ({
      id: sub.id,
      status: sub.status,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
      plan_amount: sub.items.data[0]?.price?.unit_amount 
        ? sub.items.data[0].price.unit_amount / 100 
        : 0,
      plan_interval: sub.items.data[0]?.price?.recurring?.interval || 'month',
      plan_name: sub.items.data[0]?.price?.nickname || 'Subscription',
    }));

    logStep("Returning billing history");

    return new Response(
      JSON.stringify({
        invoices: formattedInvoices,
        payments: formattedPayments,
        subscriptions: formattedSubscriptions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
