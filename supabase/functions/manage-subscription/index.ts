import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Plan price mappings (in cents NZD)
const PLAN_PRICES = {
  premium: 14900, // $149/month
  elite: 34900,   // $349/month
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      console.error('Failed to send subscription notification:', await response.text());
    } else {
      console.log('Subscription notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending subscription notification:', error);
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

    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      throw new Error("Unauthorized: Admin access required");
    }

    logStep("Admin verified", { userId: user.id });

    const body = await req.json();
    const { action, subscriptionId, customerId, businessId, newPriceId, reason, 
            newPlan, priceId, businessEmail, businessName, featureToggles, sendNotification = true } = body;
    logStep("Action requested", { action, subscriptionId, customerId, businessId, sendNotification });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    let result: any = {};

    switch (action) {
      case 'cancel': {
        if (!subscriptionId) throw new Error("subscriptionId is required for cancel");
        
        // Get business info for notification
        let bizInfo: any = null;
        if (businessId) {
          const { data } = await supabaseClient.from('businesses').select('name, email, subscription_plan').eq('id', businessId).single();
          bizInfo = data;
        }
        
        const subscription = await stripe.subscriptions.cancel(subscriptionId);
        logStep("Subscription cancelled", { subscriptionId, status: subscription.status });
        
        // Update business in database
        if (businessId) {
          await supabaseClient
            .from('businesses')
            .update({ 
              subscription_plan: 'free',
              stripe_subscription_id: null,
              admin_notes: `Subscription cancelled by admin on ${new Date().toISOString()}. Reason: ${reason || 'Not specified'}`
            })
            .eq('id', businessId);
            
          // Log audit
          await supabaseClient.from('audit_logs').insert({
            admin_id: user.id,
            entity_type: 'subscription',
            entity_id: businessId,
            action: 'subscription_cancelled',
            metadata: { subscriptionId, reason }
          });
          
          // Send notification email
          if (sendNotification && bizInfo?.email) {
            await sendSubscriptionNotification(supabaseUrl, {
              businessName: bizInfo.name || businessName || 'Your Business',
              ownerEmail: bizInfo.email,
              changeType: 'cancelled',
              oldPlan: bizInfo.subscription_plan || 'unknown',
              newPlan: 'free',
              reason,
            });
          }
        }
        
        result = { success: true, subscription };
        break;
      }

      case 'pause': {
        if (!subscriptionId) throw new Error("subscriptionId is required for pause");
        
        // Get business info for notification
        let bizInfo: any = null;
        if (businessId) {
          const { data } = await supabaseClient.from('businesses').select('name, email, subscription_plan').eq('id', businessId).single();
          bizInfo = data;
        }
        
        const subscription = await stripe.subscriptions.update(subscriptionId, {
          pause_collection: { behavior: 'void' }
        });
        logStep("Subscription paused", { subscriptionId });
        
        if (businessId) {
          await supabaseClient
            .from('businesses')
            .update({ 
              admin_notes: `Subscription paused by admin on ${new Date().toISOString()}. Reason: ${reason || 'Not specified'}`
            })
            .eq('id', businessId);
            
          await supabaseClient.from('audit_logs').insert({
            admin_id: user.id,
            entity_type: 'subscription',
            entity_id: businessId,
            action: 'subscription_paused',
            metadata: { subscriptionId, reason }
          });
          
          // Send notification email
          if (sendNotification && bizInfo?.email) {
            await sendSubscriptionNotification(supabaseUrl, {
              businessName: bizInfo.name || businessName || 'Your Business',
              ownerEmail: bizInfo.email,
              changeType: 'paused',
              oldPlan: bizInfo.subscription_plan,
              newPlan: bizInfo.subscription_plan,
              reason,
            });
          }
        }
        
        result = { success: true, subscription };
        break;
      }

      case 'resume': {
        if (!subscriptionId) throw new Error("subscriptionId is required for resume");
        
        // Get business info for notification
        let bizInfo: any = null;
        if (businessId) {
          const { data } = await supabaseClient.from('businesses').select('name, email, subscription_plan').eq('id', businessId).single();
          bizInfo = data;
        }
        
        const subscription = await stripe.subscriptions.update(subscriptionId, {
          pause_collection: null
        });
        logStep("Subscription resumed", { subscriptionId });
        
        if (businessId) {
          await supabaseClient
            .from('businesses')
            .update({ 
              admin_notes: `Subscription resumed by admin on ${new Date().toISOString()}`
            })
            .eq('id', businessId);
            
          await supabaseClient.from('audit_logs').insert({
            admin_id: user.id,
            entity_type: 'subscription',
            entity_id: businessId,
            action: 'subscription_resumed',
            metadata: { subscriptionId }
          });
          
          // Send notification email
          if (sendNotification && bizInfo?.email) {
            await sendSubscriptionNotification(supabaseUrl, {
              businessName: bizInfo.name || businessName || 'Your Business',
              ownerEmail: bizInfo.email,
              changeType: 'resumed',
              oldPlan: bizInfo.subscription_plan,
              newPlan: bizInfo.subscription_plan,
            });
          }
        }
        
        result = { success: true, subscription };
        break;
      }

      case 'change_plan': {
        if (!subscriptionId || !newPriceId) throw new Error("subscriptionId and newPriceId are required");
        
        // Get business info for notification
        let bizInfo: any = null;
        if (businessId) {
          const { data } = await supabaseClient.from('businesses').select('name, email, subscription_plan').eq('id', businessId).single();
          bizInfo = data;
        }
        const oldPlan = bizInfo?.subscription_plan || 'free';
        
        // Get current subscription
        const currentSub = await stripe.subscriptions.retrieve(subscriptionId);
        const currentItemId = currentSub.items.data[0].id;
        
        // Update subscription to new price
        const subscription = await stripe.subscriptions.update(subscriptionId, {
          items: [{
            id: currentItemId,
            price: newPriceId,
          }],
          proration_behavior: 'create_prorations',
        });
        
        logStep("Subscription plan changed", { subscriptionId, newPriceId });
        
        // Determine new plan from price
        let determinedPlan = 'free';
        const priceAmount = subscription.items.data[0].price.unit_amount;
        if (priceAmount >= 30000) {
          determinedPlan = 'elite';
        } else if (priceAmount >= 10000) {
          determinedPlan = 'premium';
        }
        
        // Determine if upgrade or downgrade
        const planOrder = { free: 0, premium: 1, elite: 2 };
        const isUpgrade = (planOrder[determinedPlan as keyof typeof planOrder] || 0) > (planOrder[oldPlan as keyof typeof planOrder] || 0);
        
        if (businessId) {
          await supabaseClient
            .from('businesses')
            .update({ 
              subscription_plan: determinedPlan,
              admin_notes: `Plan changed to ${determinedPlan} by admin on ${new Date().toISOString()}`
            })
            .eq('id', businessId);
            
          await supabaseClient.from('audit_logs').insert({
            admin_id: user.id,
            entity_type: 'subscription',
            entity_id: businessId,
            action: 'plan_changed',
            metadata: { subscriptionId, newPriceId, newPlan: determinedPlan, oldPlan }
          });
          
          // Send notification email
          if (sendNotification && bizInfo?.email) {
            await sendSubscriptionNotification(supabaseUrl, {
              businessName: bizInfo.name || businessName || 'Your Business',
              ownerEmail: bizInfo.email,
              changeType: isUpgrade ? 'upgraded' : 'downgraded',
              oldPlan,
              newPlan: determinedPlan,
            });
          }
        }
        
        result = { success: true, subscription, newPlan: determinedPlan };
        break;
      }

      // NEW: Create subscription for a business (admin manually assigns paid plan with Stripe sync)
      case 'create_subscription': {
        if (!businessId || !priceId) throw new Error("businessId and priceId are required");
        
        // Get business details
        const { data: business, error: bizError } = await supabaseClient
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .single();
          
        if (bizError || !business) throw new Error("Business not found");
        
        const oldPlan = business.subscription_plan || 'free';
        let stripeCustomerId = business.stripe_customer_id;
        
        // Create Stripe customer if doesn't exist
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: businessEmail || business.email,
            name: businessName || business.name,
            metadata: {
              business_id: businessId,
              created_by_admin: user.id,
            }
          });
          stripeCustomerId = customer.id;
          logStep("Created Stripe customer", { customerId: stripeCustomerId });
        }
        
        // Create subscription
        const subscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.payment_intent'],
        });
        
        logStep("Created subscription", { subscriptionId: subscription.id });
        
        // Determine plan from price
        let plan = 'free';
        const amount = subscription.items.data[0].price.unit_amount || 0;
        if (amount >= 30000) {
          plan = 'elite';
        } else if (amount >= 10000) {
          plan = 'premium';
        }
        
        // Update business
        await supabaseClient
          .from('businesses')
          .update({
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: subscription.id,
            subscription_plan: plan,
            payment_status: subscription.status === 'active' ? 'active' : 'pending',
            admin_notes: `Subscription created by admin on ${new Date().toISOString()}`
          })
          .eq('id', businessId);
          
        await supabaseClient.from('audit_logs').insert({
          admin_id: user.id,
          entity_type: 'subscription',
          entity_id: businessId,
          action: 'subscription_created',
          metadata: { subscriptionId: subscription.id, plan, priceId, oldPlan }
        });
        
        // Send notification email
        if (sendNotification && business.email) {
          await sendSubscriptionNotification(supabaseUrl, {
            businessName: business.name || businessName || 'Your Business',
            ownerEmail: business.email,
            changeType: 'created',
            oldPlan,
            newPlan: plan,
          });
        }
        
        result = { success: true, subscription, customerId: stripeCustomerId, plan };
        break;
      }

      // NEW: Manual plan assignment without Stripe (for comped/free upgrades)
      case 'assign_plan_manual': {
        if (!businessId || !newPlan) throw new Error("businessId and newPlan are required");
        
        const validPlans = ['free', 'premium', 'elite'];
        if (!validPlans.includes(newPlan)) throw new Error("Invalid plan");
        
        // Get business info for notification
        const { data: bizInfo } = await supabaseClient
          .from('businesses')
          .select('name, email, subscription_plan')
          .eq('id', businessId)
          .single();
        
        const oldPlan = bizInfo?.subscription_plan || 'free';
        
        const updateData: any = {
          subscription_plan: newPlan,
          admin_notes: `Plan manually assigned to ${newPlan} by admin on ${new Date().toISOString()}. Reason: ${reason || 'Admin override'}`,
        };
        
        // If downgrading to free, clear Stripe IDs
        if (newPlan === 'free') {
          updateData.stripe_subscription_id = null;
          updateData.payment_status = null;
        } else {
          updateData.payment_status = 'active'; // Mark as active for manual assignments
        }
        
        // Apply feature toggles if provided
        if (featureToggles) {
          updateData.feature_toggles = featureToggles;
        }
        
        await supabaseClient
          .from('businesses')
          .update(updateData)
          .eq('id', businessId);
          
        await supabaseClient.from('audit_logs').insert({
          admin_id: user.id,
          entity_type: 'subscription',
          entity_id: businessId,
          action: 'plan_manually_assigned',
          metadata: { newPlan, oldPlan, reason, featureToggles }
        });
        
        // Send notification email
        if (sendNotification && bizInfo?.email && oldPlan !== newPlan) {
          const planOrder = { free: 0, premium: 1, elite: 2 };
          const isUpgrade = (planOrder[newPlan as keyof typeof planOrder] || 0) > (planOrder[oldPlan as keyof typeof planOrder] || 0);
          
          await sendSubscriptionNotification(supabaseUrl, {
            businessName: bizInfo.name || businessName || 'Your Business',
            ownerEmail: bizInfo.email,
            changeType: isUpgrade ? 'upgraded' : 'downgraded',
            oldPlan,
            newPlan,
            reason,
          });
        }
        
        logStep("Plan manually assigned", { businessId, newPlan, oldPlan });
        result = { success: true, plan: newPlan };
        break;
      }

      // NEW: Sync subscription status from Stripe
      case 'sync_from_stripe': {
        if (!businessId) throw new Error("businessId is required");
        
        const { data: business } = await supabaseClient
          .from('businesses')
          .select('stripe_customer_id, stripe_subscription_id')
          .eq('id', businessId)
          .single();
          
        if (!business?.stripe_customer_id) {
          result = { success: true, synced: false, message: 'No Stripe customer linked' };
          break;
        }
        
        let subscription = null;
        if (business.stripe_subscription_id) {
          try {
            subscription = await stripe.subscriptions.retrieve(business.stripe_subscription_id);
          } catch (e) {
            logStep("Subscription not found in Stripe", { subscriptionId: business.stripe_subscription_id });
          }
        }
        
        // If no subscription found, search by customer
        if (!subscription) {
          const subs = await stripe.subscriptions.list({
            customer: business.stripe_customer_id,
            status: 'active',
            limit: 1
          });
          subscription = subs.data[0] || null;
        }
        
        if (subscription) {
          const amount = subscription.items.data[0]?.price?.unit_amount || 0;
          let plan = 'free';
          if (amount >= 30000) plan = 'elite';
          else if (amount >= 10000) plan = 'premium';
          
          await supabaseClient
            .from('businesses')
            .update({
              stripe_subscription_id: subscription.id,
              subscription_plan: plan,
              payment_status: subscription.status
            })
            .eq('id', businessId);
            
          result = { success: true, synced: true, subscription, plan };
        } else {
          await supabaseClient
            .from('businesses')
            .update({
              stripe_subscription_id: null,
              subscription_plan: 'free',
              payment_status: null
            })
            .eq('id', businessId);
            
          result = { success: true, synced: true, subscription: null, plan: 'free' };
        }
        
        await supabaseClient.from('audit_logs').insert({
          admin_id: user.id,
          entity_type: 'subscription',
          entity_id: businessId,
          action: 'subscription_synced',
          metadata: result
        });
        
        break;
      }

      case 'get_subscription': {
        if (!subscriptionId && !customerId) throw new Error("subscriptionId or customerId required");
        
        let subscription;
        if (subscriptionId) {
          subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['customer', 'latest_invoice', 'items.data.price.product']
          });
        } else if (customerId) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            limit: 1,
            expand: ['data.customer', 'data.latest_invoice', 'data.items.data.price.product']
          });
          subscription = subscriptions.data[0] || null;
        }
        
        result = { success: true, subscription };
        break;
      }

      case 'list_invoices': {
        if (!customerId) throw new Error("customerId is required");
        const invoices = await stripe.invoices.list({
          customer: customerId,
          limit: 10,
        });
        result = { success: true, invoices: invoices.data };
        break;
      }

      case 'apply_credit': {
        if (!customerId) throw new Error("customerId is required");
        const { amount, description } = body;
        
        const creditNote = await stripe.customers.createBalanceTransaction(customerId, {
          amount: -Math.abs(amount), // Negative = credit
          currency: 'nzd',
          description: description || 'Admin credit applied',
        });
        
        logStep("Credit applied", { customerId, amount });
        
        await supabaseClient.from('audit_logs').insert({
          admin_id: user.id,
          entity_type: 'billing',
          entity_id: customerId,
          action: 'credit_applied',
          metadata: { amount, description }
        });
        
        result = { success: true, creditNote };
        break;
      }

      // NEW: Get all Stripe prices for plan selection
      case 'list_prices': {
        const prices = await stripe.prices.list({
          active: true,
          type: 'recurring',
          expand: ['data.product'],
          limit: 100
        });
        
        result = { 
          success: true, 
          // deno-lint-ignore no-explicit-any
          prices: prices.data.map((p: any) => ({
            id: p.id,
            unitAmount: p.unit_amount,
            currency: p.currency,
            interval: p.recurring?.interval,
            productId: typeof p.product === 'string' ? p.product : p.product?.id,
            productName: typeof p.product === 'string' ? null : p.product?.name,
          }))
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
