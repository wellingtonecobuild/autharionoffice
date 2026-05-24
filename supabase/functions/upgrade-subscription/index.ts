import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPGRADE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Helper function to send subscription change notification
async function sendSubscriptionNotification(
  supabaseUrl: string,
  params: {
    businessName: string;
    ownerEmail: string;
    changeType: "upgraded" | "downgraded" | "cancelled" | "created" | "paused" | "resumed";
    oldPlan?: string;
    newPlan?: string;
    reason?: string;
  }
) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/notify-subscription-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      console.error('Failed to send notification:', await response.text());
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

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

    // Verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    logStep("User verified", { userId: user.id, email: user.email });

    const body = await req.json();
    const { action, businessId, newPlan, priceId, billingCycle } = body;
    logStep("Action requested", { action, businessId, newPlan, billingCycle });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const origin = req.headers.get("origin") || "https://wellingtonecobuild.nz";
    let result: any = {};

    // Get business details and verify ownership
    const { data: business, error: bizError } = await supabaseClient
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (bizError || !business) throw new Error("Business not found");
    if (business.owner_id !== user.id) throw new Error("Unauthorized: You don't own this business");

    logStep("Business verified", { businessId, ownerId: business.owner_id, currentPlan: business.subscription_plan });

    switch (action) {
      // Create checkout session for upgrade (new subscription)
      case 'create_upgrade_checkout': {
        if (!priceId) throw new Error("priceId is required");

        let stripeCustomerId = business.stripe_customer_id;

        // Create Stripe customer if doesn't exist
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: business.name,
            metadata: {
              business_id: businessId,
              user_id: user.id,
            }
          });
          stripeCustomerId = customer.id;
          
          // Update business with customer ID
          await supabaseClient
            .from('businesses')
            .update({ stripe_customer_id: stripeCustomerId })
            .eq('id', businessId);
            
          logStep("Created Stripe customer", { customerId: stripeCustomerId });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          line_items: [{ price: priceId, quantity: 1 }],
          mode: 'subscription',
          success_url: `${origin}/dashboard?payment=success&plan=${newPlan}&businessId=${businessId}`,
          cancel_url: `${origin}/dashboard?payment=cancelled`,
          metadata: {
            business_id: businessId,
            user_id: user.id,
            old_plan: business.subscription_plan,
            new_plan: newPlan,
            billing_cycle: billingCycle || 'monthly',
          },
          subscription_data: {
            metadata: {
              business_id: businessId,
              user_id: user.id,
              billing_cycle: billingCycle || 'monthly',
            }
          }
        });

        logStep("Created checkout session", { sessionId: session.id, url: session.url, billingCycle });
        result = { success: true, url: session.url, sessionId: session.id };
        break;
      }

      // Change existing subscription plan (upgrade/downgrade)
      case 'change_plan': {
        if (!priceId || !newPlan) throw new Error("priceId and newPlan are required");
        
        const oldPlan = business.subscription_plan;
        
        if (!business.stripe_subscription_id) {
          throw new Error("No active subscription found. Please use upgrade checkout.");
        }

        // Get current subscription
        const currentSub = await stripe.subscriptions.retrieve(business.stripe_subscription_id);
        if (currentSub.status !== 'active') {
          throw new Error("Subscription is not active. Please contact support.");
        }

        const currentItemId = currentSub.items.data[0].id;

        // Update subscription to new price
        const subscription = await stripe.subscriptions.update(business.stripe_subscription_id, {
          items: [{
            id: currentItemId,
            price: priceId,
          }],
          proration_behavior: 'create_prorations',
          metadata: {
            business_id: businessId,
            old_plan: oldPlan,
            new_plan: newPlan,
            changed_by: user.id,
            billing_cycle: billingCycle || 'monthly',
          }
        });

        logStep("Subscription plan changed", { subscriptionId: subscription.id, newPlan });

        // Determine if upgrade or downgrade
        const planOrder: Record<string, number> = { free: 0, premium: 1, elite: 2 };
        const isUpgrade = (planOrder[newPlan] ?? 0) > (planOrder[oldPlan] ?? 0);

        // Update business plan and billing cycle
        await supabaseClient
          .from('businesses')
          .update({
            subscription_plan: newPlan,
            payment_status: 'active',
            billing_cycle: billingCycle || 'monthly',
          })
          .eq('id', businessId);

        // Log audit
        await supabaseClient.from('audit_logs').insert({
          admin_id: user.id,
          entity_type: 'subscription',
          entity_id: businessId,
          action: isUpgrade ? 'user_upgraded' : 'user_downgraded',
          metadata: { oldPlan, newPlan, subscriptionId: subscription.id }
        });

        // Send notification
        await sendSubscriptionNotification(supabaseUrl, {
          businessName: business.name,
          ownerEmail: user.email,
          changeType: isUpgrade ? 'upgraded' : 'downgraded',
          oldPlan,
          newPlan,
        });

        result = { 
          success: true, 
          subscription,
          oldPlan,
          newPlan,
          isUpgrade,
          nextBillingDate: new Date(subscription.current_period_end * 1000).toISOString(),
        };
        break;
      }

      // Downgrade to free (cancel subscription)
      case 'downgrade_to_free': {
        const oldPlan = business.subscription_plan;
        
        if (!business.stripe_subscription_id) {
          // Already on free plan or no subscription
          result = { success: true, message: 'Already on free plan', plan: 'free' };
          break;
        }

        // Cancel at period end (user keeps features until end of billing cycle)
        const subscription = await stripe.subscriptions.update(business.stripe_subscription_id, {
          cancel_at_period_end: true,
          metadata: {
            business_id: businessId,
            cancelled_by: user.id,
            cancelled_from: oldPlan,
          }
        });

        const cancelDate = new Date(subscription.current_period_end * 1000);

        logStep("Subscription scheduled to cancel", { 
          subscriptionId: subscription.id, 
          cancelAt: cancelDate.toISOString() 
        });

        // Update business with pending cancellation info
        await supabaseClient
          .from('businesses')
          .update({
            admin_notes: `Subscription scheduled to cancel on ${cancelDate.toISOString()}. Will downgrade to free.`,
          })
          .eq('id', businessId);

        // Log audit
        await supabaseClient.from('audit_logs').insert({
          admin_id: user.id,
          entity_type: 'subscription',
          entity_id: businessId,
          action: 'user_scheduled_downgrade',
          metadata: { oldPlan, cancelAt: cancelDate.toISOString(), subscriptionId: subscription.id }
        });

        // Send notification
        await sendSubscriptionNotification(supabaseUrl, {
          businessName: business.name,
          ownerEmail: user.email,
          changeType: 'downgraded',
          oldPlan,
          newPlan: 'free',
        });

        result = { 
          success: true, 
          message: `Your subscription will be cancelled on ${cancelDate.toLocaleDateString()}. You'll keep your current features until then.`,
          cancelAt: cancelDate.toISOString(),
          currentPlan: oldPlan,
        };
        break;
      }

      // Cancel pending downgrade (reactivate subscription)
      case 'cancel_downgrade': {
        if (!business.stripe_subscription_id) {
          throw new Error("No subscription found");
        }

        const subscription = await stripe.subscriptions.update(business.stripe_subscription_id, {
          cancel_at_period_end: false,
        });

        logStep("Downgrade cancelled, subscription reactivated", { subscriptionId: subscription.id });

        await supabaseClient
          .from('businesses')
          .update({ admin_notes: null })
          .eq('id', businessId);

        await supabaseClient.from('audit_logs').insert({
          admin_id: user.id,
          entity_type: 'subscription',
          entity_id: businessId,
          action: 'user_cancelled_downgrade',
          metadata: { subscriptionId: subscription.id }
        });

        result = { success: true, message: 'Downgrade cancelled. Your subscription will continue.' };
        break;
      }

      // Get subscription status
      case 'get_status': {
        let subscriptionData = null;
        let upcomingInvoice = null;

        if (business.stripe_subscription_id) {
          try {
            subscriptionData = await stripe.subscriptions.retrieve(business.stripe_subscription_id, {
              expand: ['items.data.price.product', 'latest_invoice']
            });

            // Get upcoming invoice for proration preview
            upcomingInvoice = await stripe.invoices.retrieveUpcoming({
              subscription: business.stripe_subscription_id,
            }).catch(() => null);
          } catch (e) {
            logStep("Error fetching subscription", { error: e });
          }
        }

        result = {
          success: true,
          currentPlan: business.subscription_plan,
          subscription: subscriptionData ? {
            id: subscriptionData.id,
            status: subscriptionData.status,
            cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
            currentPeriodEnd: new Date(subscriptionData.current_period_end * 1000).toISOString(),
            cancelAt: subscriptionData.cancel_at ? new Date(subscriptionData.cancel_at * 1000).toISOString() : null,
          } : null,
          upcomingInvoice: upcomingInvoice ? {
            amountDue: upcomingInvoice.amount_due,
            currency: upcomingInvoice.currency,
          } : null,
        };
        break;
      }

      // Preview plan change (proration preview)
      case 'preview_change': {
        if (!priceId || !business.stripe_subscription_id) {
          result = { success: false, message: 'No active subscription to preview' };
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(business.stripe_subscription_id);
        
        // Get proration preview
        const previewInvoice = await stripe.invoices.retrieveUpcoming({
          subscription: business.stripe_subscription_id,
          subscription_items: [{
            id: subscription.items.data[0].id,
            price: priceId,
          }],
          subscription_proration_behavior: 'create_prorations',
        });

        const prorationLine = previewInvoice.lines.data.find((l: Stripe.InvoiceLineItem) => l.proration);

        result = {
          success: true,
          preview: {
            amountDue: previewInvoice.amount_due,
            currency: previewInvoice.currency,
            prorationDate: prorationLine?.period?.start 
              ? new Date(prorationLine.period.start * 1000).toISOString()
              : null,
            lines: previewInvoice.lines.data.map((line: Stripe.InvoiceLineItem) => ({
              description: line.description,
              amount: line.amount,
              proration: line.proration,
            })),
          }
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
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
