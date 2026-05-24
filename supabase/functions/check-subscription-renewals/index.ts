import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION-RENEWALS] ${step}${detailsStr}`);
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
    logStep("Starting subscription renewal check");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get all businesses with active subscriptions
    const { data: businesses, error: bizError } = await supabaseClient
      .from("businesses")
      .select("id, name, email, subscription_plan, stripe_subscription_id, stripe_customer_id")
      .not("stripe_subscription_id", "is", null)
      .neq("subscription_plan", "free");

    if (bizError) {
      throw new Error(`Error fetching businesses: ${bizError.message}`);
    }

    logStep("Found businesses with subscriptions", { count: businesses?.length || 0 });

    const remindersSent: string[] = [];
    const errors: string[] = [];

    for (const business of businesses || []) {
      try {
        if (!business.stripe_subscription_id) continue;

        // Get subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(business.stripe_subscription_id);
        
        if (subscription.status !== "active") continue;

        const renewalDate = new Date(subscription.current_period_end * 1000);
        const now = new Date();
        const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        logStep("Checking subscription", { 
          businessId: business.id, 
          daysUntilRenewal,
          renewalDate: renewalDate.toISOString() 
        });

        // Send reminders at 7 days and 3 days before renewal
        if (daysUntilRenewal === 7 || daysUntilRenewal === 3) {
          // Check if we already sent a reminder for this period
          const { data: existingReminder } = await supabaseClient
            .from("dunning_records")
            .select("id")
            .eq("business_id", business.id)
            .eq("dunning_type", "renewal_reminder")
            .gte("email_sent_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existingReminder && business.email) {
            // Get amount from subscription
            const amount = subscription.items.data[0]?.price?.unit_amount 
              ? subscription.items.data[0].price.unit_amount / 100 
              : undefined;

            // Send renewal reminder
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-dunning-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                businessId: business.id,
                businessName: business.name,
                businessEmail: business.email,
                dunningType: "renewal_reminder",
                subscriptionPlan: business.subscription_plan,
                amount,
                daysUntilRenewal,
              }),
            });

            remindersSent.push(business.id);
            logStep("Sent renewal reminder", { businessId: business.id, daysUntilRenewal });
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`${business.id}: ${errorMsg}`);
        logStep("Error processing business", { businessId: business.id, error: errorMsg });
      }
    }

    logStep("Renewal check complete", { 
      remindersSent: remindersSent.length, 
      errors: errors.length 
    });

    // Create admin notification with summary
    const businessesChecked = businesses?.length || 0;
    const notificationMessage = remindersSent.length > 0
      ? `Sent ${remindersSent.length} renewal reminder${remindersSent.length > 1 ? 's' : ''} to businesses with upcoming subscription renewals.`
      : `Checked ${businessesChecked} subscription${businessesChecked !== 1 ? 's' : ''}. No reminders needed today.`;

    await supabaseClient
      .from("admin_notifications")
      .insert({
        type: "scheduled_task",
        title: "Daily Renewal Check Complete",
        message: notificationMessage,
        metadata: {
          task: "check-subscription-renewals",
          businesses_checked: businessesChecked,
          reminders_sent: remindersSent.length,
          errors_count: errors.length,
          business_ids: remindersSent.slice(0, 10), // Limit to first 10 for brevity
          run_at: new Date().toISOString(),
        },
      });

    logStep("Admin notification created");

    return new Response(JSON.stringify({ 
      success: true, 
      remindersSent: remindersSent.length,
      errors: errors.length > 0 ? errors : undefined 
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
