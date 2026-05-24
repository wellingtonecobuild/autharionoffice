import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Known product IDs for price sync
const PRODUCT_TO_SETTING_MAP: Record<string, { priceKey: string; priceIdKey: string | null }> = {
  'prod_TcwrTvDvPLM87z': { priceKey: 'price_premium_monthly', priceIdKey: 'stripe_price_id_premium' },
  'prod_TcwsQMBkk9Smug': { priceKey: 'price_elite_monthly', priceIdKey: 'stripe_price_id_elite' },
  'prod_Tcx1R1SPirnPjE': { priceKey: 'price_spotlight_weekly', priceIdKey: null },
  'prod_Tcx1TF6B0d7OZL': { priceKey: 'price_spotlight_monthly', priceIdKey: null },
};

// Helper to sync a price to platform_settings
const syncPriceToSettings = async (
  supabaseClient: any,
  productId: string,
  priceId: string,
  priceAmountCents: number
) => {
  const mapping = PRODUCT_TO_SETTING_MAP[productId];
  if (!mapping) {
    logStep("Unknown product, skipping sync", { productId });
    return;
  }

  const priceNZD = priceAmountCents / 100;
  logStep("Syncing price to settings", { productId, priceNZD, priceKey: mapping.priceKey });

  // Update display price
  const { data: existingPrice } = await supabaseClient
    .from('platform_settings')
    .select('id')
    .eq('key', mapping.priceKey)
    .maybeSingle();

  if (existingPrice) {
    await supabaseClient
      .from('platform_settings')
      .update({ value: priceNZD, updated_at: new Date().toISOString() })
      .eq('key', mapping.priceKey);
  } else {
    await supabaseClient
      .from('platform_settings')
      .insert({ key: mapping.priceKey, value: priceNZD });
  }

  // Update Stripe price ID if applicable
  if (mapping.priceIdKey) {
    const { data: existingPriceId } = await supabaseClient
      .from('platform_settings')
      .select('id')
      .eq('key', mapping.priceIdKey)
      .maybeSingle();

    if (existingPriceId) {
      await supabaseClient
        .from('platform_settings')
        .update({ value: priceId, updated_at: new Date().toISOString() })
        .eq('key', mapping.priceIdKey);
    } else {
      await supabaseClient
        .from('platform_settings')
        .insert({ key: mapping.priceIdKey, value: priceId });
    }
  }

  logStep("Price synced successfully", { productId, priceNZD, priceId });
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
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // For now, we'll process without signature verification
    // In production, you should verify the webhook signature
    let event: Stripe.Event;
    
    try {
      event = JSON.parse(body) as Stripe.Event;
      logStep("Event parsed", { type: event.type, id: event.id });
    } catch (err) {
      logStep("Error parsing webhook body", { error: String(err) });
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log webhook event to database for real-time monitoring
    let webhookEventId: string | null = null;
    try {
      const { data: webhookEvent, error: webhookError } = await supabaseClient
        .from("webhook_events")
        .insert({
          event_type: event.type,
          event_id: event.id,
          payload: event.data.object,
          status: "received",
        })
        .select("id")
        .single();

      if (webhookError) {
        logStep("Error logging webhook event", { error: webhookError.message });
      } else {
        webhookEventId = webhookEvent?.id;
        logStep("Webhook event logged", { webhookEventId });
      }
    } catch (logErr) {
      logStep("Failed to log webhook event", { error: String(logErr) });
    }

    // Helper to update webhook event status
    const updateWebhookStatus = async (status: string, errorMessage?: string) => {
      if (webhookEventId) {
        await supabaseClient
          .from("webhook_events")
          .update({ 
            status, 
            processed_at: new Date().toISOString(),
            error_message: errorMessage || null 
          })
          .eq("id", webhookEventId);
      }
    };

    // Handle checkout session completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Checkout session completed", { 
        sessionId: session.id,
        customerId: session.customer,
        subscriptionId: session.subscription,
        metadata: session.metadata,
        mode: session.mode
      });

      const paymentType = session.metadata?.paymentType;

      // Handle job pay-per-listing payment
      if (paymentType === "pay_per_listing") {
        const businessId = session.metadata?.businessId;
        const userId = session.metadata?.userId;
        const jobTitle = session.metadata?.jobTitle || "New Job Posting";
        const jobLocation = session.metadata?.jobLocation || "Wellington";
        const jobType = session.metadata?.jobType || "full_time";

        logStep("Processing pay-per-listing job payment", { businessId, userId, jobTitle });

        if (businessId && userId) {
          // Calculate expiry date (30 days from now)
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          // Create the job listing (pending approval)
          const { data: newJob, error: jobError } = await supabaseClient
            .from("jobs")
            .insert({
              business_id: businessId,
              title: jobTitle,
              location: jobLocation,
              job_type: jobType,
              summary: "Job created via pay-per-listing. Please edit to add full details.",
              responsibilities: "Please update with job responsibilities.",
              requirements: "Please update with job requirements.",
              expires_at: expiresAt.toISOString(),
              status: "pending",
              is_paid_listing: true,
              paid_listing_expires_at: expiresAt.toISOString(),
              stripe_payment_id: session.id,
              application_method: "email",
            })
            .select()
            .single();

          if (jobError) {
            logStep("Error creating job", { error: jobError.message });
          } else {
            logStep("Job created successfully", { jobId: newJob?.id, title: jobTitle });
          }

          // Record revenue transaction
          const amountPaid = session.amount_total ? session.amount_total / 100 : 199;
          const { data: business } = await supabaseClient
            .from("businesses")
            .select("name, email")
            .eq("id", businessId)
            .single();

          if (business) {
            const { error: revenueError } = await supabaseClient
              .from("revenue_transactions")
              .insert({
                transaction_id: session.id,
                amount_nzd: amountPaid,
                payment_type: "job_listing",
                business_name: business.name,
                business_email: business.email,
                business_id: businessId,
                stripe_customer_id: session.customer as string,
                payment_status: "paid",
                gst_amount: amountPaid * 0.15,
                metadata: { job_id: newJob?.id, payment_type: "pay_per_listing" },
              });

            if (revenueError) {
              logStep("Error recording job revenue", { error: revenueError.message });
            } else {
              logStep("Job revenue recorded", { amount: amountPaid });
            }
          }

          // Create admin notification
          await supabaseClient
            .from("admin_notifications")
            .insert({
              type: "job_payment",
              title: "New Paid Job Listing",
              message: `${business?.name || "A business"} purchased a job listing: ${jobTitle}`,
              metadata: { job_id: newJob?.id, business_id: businessId, amount: amountPaid },
            });
        }
      }
      // Handle job spotlight subscription
      else if (paymentType === "spotlight") {
        const businessId = session.metadata?.businessId;
        const jobId = session.metadata?.jobId;

        logStep("Processing spotlight subscription", { businessId, jobId });

        if (jobId) {
          // Set spotlight for 7 days
          const spotlightUntil = new Date();
          spotlightUntil.setDate(spotlightUntil.getDate() + 7);

          const { error: spotlightError } = await supabaseClient
            .from("jobs")
            .update({
              is_spotlight: true,
              spotlight_until: spotlightUntil.toISOString(),
            })
            .eq("id", jobId);

          if (spotlightError) {
            logStep("Error setting spotlight", { error: spotlightError.message });
          } else {
            logStep("Job spotlight activated", { jobId, until: spotlightUntil });
          }
        }
      }
      // Handle TRIAL subscription (2-Month Free Trial)
      else if (paymentType === "trial_subscription" || session.metadata?.trial_type === "premium_2month") {
        const businessId = session.metadata?.business_id;
        const plan = session.metadata?.plan || "premium";
        const userId = session.metadata?.user_id;

        logStep("Processing TRIAL subscription", { businessId, plan, userId });

        if (businessId && plan) {
          // Calculate trial dates (60 days from now)
          const trialStartDate = new Date();
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 60);

          // Update business with trial status
          const { error: updateError } = await supabaseClient
            .from("businesses")
            .update({
              status: "active", // Trial businesses are immediately active
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              subscription_plan: plan,
              payment_status: "trial",
              trial_status: "active",
              trial_start_at: trialStartDate.toISOString(),
              trial_end_at: trialEndDate.toISOString(),
              has_used_trial: true, // FRAUD PREVENTION: Mark trial as used
            })
            .eq("id", businessId);

          if (updateError) {
            logStep("Error updating business for trial", { error: updateError.message });
          } else {
            logStep("TRIAL ACTIVATED - Business now active with Premium trial", { 
              businessId, 
              plan, 
              trialEndDate: trialEndDate.toISOString() 
            });
          }

          // Get business and owner details for notification
          const { data: business } = await supabaseClient
            .from("businesses")
            .select("name, email, owner_id")
            .eq("id", businessId)
            .single();

          // Get owner profile
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("full_name, email")
            .eq("id", business?.owner_id)
            .single();

          const recipientEmail = business?.email || profile?.email;
          const recipientName = profile?.full_name;

          // Send trial activation email
          if (recipientEmail) {
            try {
              await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-trial-email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  type: "trial_activated",
                  businessId,
                  businessName: business?.name,
                  recipientEmail,
                  recipientName,
                  trialStartDate: trialStartDate.toISOString(),
                  trialEndDate: trialEndDate.toISOString(),
                  amount: 149,
                }),
              });
              logStep("Trial activation email sent", { recipientEmail });
            } catch (emailError) {
              logStep("Error sending trial activation email", { error: String(emailError) });
            }
          }

          // Create admin notification
          await supabaseClient
            .from("admin_notifications")
            .insert({
              type: "trial_started",
              title: "New Premium Trial Started",
              message: `${business?.name || "A business"} started a 2-Month Free Trial. Trial ends ${trialEndDate.toLocaleDateString()}.`,
              metadata: { 
                business_id: businessId, 
                plan: plan,
                trial_end_date: trialEndDate.toISOString(),
                customer_id: session.customer,
              },
            });
        }
      }
      // Handle business subscription (existing logic)
      else {
        const businessId = session.metadata?.business_id;
        const plan = session.metadata?.plan;
        const userId = session.metadata?.user_id;

        if (businessId && plan) {
          // CRITICAL: Update business status from "awaiting_payment" to "payment_received"
          // This is the ONLY way a paid listing gets submitted for review
          // Without payment completion, the listing stays in "awaiting_payment" and is NOT visible
          const { error: updateError } = await supabaseClient
            .from("businesses")
            .update({
              status: "payment_received",
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              subscription_plan: plan,
              payment_status: "held",
              payment_intent_id: session.payment_intent as string || session.id,
              payment_amount: session.amount_total ? session.amount_total / 100 : null,
              payment_date: new Date().toISOString(),
            })
            .eq("id", businessId);

          if (updateError) {
            logStep("Error updating business", { error: updateError.message });
          } else {
            logStep("PAYMENT COMPLETED - Business now submitted for admin approval", { businessId, plan, status: "payment_received" });
          }

          // Get business details for notification
          const { data: business } = await supabaseClient
            .from("businesses")
            .select("name, email")
            .eq("id", businessId)
            .single();

          // Create admin notification about held payment
          await supabaseClient
            .from("admin_notifications")
            .insert({
              type: "payment_held",
              title: "New Payment Held - Verification Required",
              message: `${business?.name || "A business"} has paid for ${plan} plan. Payment is held pending verification approval.`,
              metadata: { 
                business_id: businessId, 
                plan: plan,
                amount: session.amount_total ? session.amount_total / 100 : 0,
                payment_id: session.id,
                customer_id: session.customer,
              },
            });

          // Send payment received confirmation email
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-payment-status`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                businessId,
                status: "payment_received",
                businessName: business?.name,
                businessEmail: business?.email,
                plan,
                amount: session.amount_total ? session.amount_total / 100 : 0,
              }),
            });
          } catch (emailError) {
            logStep("Error sending payment confirmation email", { error: String(emailError) });
          }

          // Note: Revenue is NOT recorded until admin approves and captures payment
          logStep("Payment held for verification", { businessId, amount: session.amount_total });
        }
      }
    }

    // Handle subscription trial ending (Stripe sends this 3 days before trial ends)
    if (event.type === "customer.subscription.trial_will_end") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Trial will end soon", { 
        subscriptionId: subscription.id,
        trialEnd: subscription.trial_end,
        metadata: subscription.metadata 
      });

      // Note: 7-day reminder is handled by our own cron job (check-trial-reminders)
      // This Stripe event is for 3-day warning which we can use as backup
    }

    // Handle subscription updated (e.g., plan changes)
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Subscription updated", { 
        subscriptionId: subscription.id,
        status: subscription.status,
        metadata: subscription.metadata 
      });

      const businessId = subscription.metadata?.business_id;
      
      if (businessId && subscription.status === "active") {
        const { error } = await supabaseClient
          .from("businesses")
          .update({
            stripe_subscription_id: subscription.id,
          })
          .eq("id", businessId);

        if (error) {
          logStep("Error updating subscription", { error: error.message });
        }
      }
    }

    // Handle subscription deleted/canceled
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Subscription deleted", { subscriptionId: subscription.id });

      const businessId = subscription.metadata?.business_id;

      // Find business by subscription ID if not in metadata
      let business = null;
      if (businessId) {
        const { data } = await supabaseClient
          .from("businesses")
          .select("id, name, email, subscription_plan, payment_amount")
          .eq("id", businessId)
          .single();
        business = data;
      } else {
        const { data } = await supabaseClient
          .from("businesses")
          .select("id, name, email, subscription_plan, payment_amount")
          .eq("stripe_subscription_id", subscription.id)
          .single();
        business = data;
      }

      if (business) {
        // Downgrade to free plan
        const { error } = await supabaseClient
          .from("businesses")
          .update({
            subscription_plan: "free",
            stripe_subscription_id: null,
            payment_status: "cancelled",
          })
          .eq("id", business.id);

        if (error) {
          logStep("Error downgrading business", { error: error.message });
        } else {
          logStep("Business downgraded to free", { businessId: business.id });

          // Send cancellation email notification
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-payment-status`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                businessId: business.id,
                status: "declined", // Using declined template for cancellation notice
                businessName: business.name,
                businessEmail: business.email,
                plan: business.subscription_plan,
                amount: business.payment_amount || 0,
                notes: "Your subscription has been cancelled. You have been downgraded to the free plan.",
              }),
            });
            logStep("Cancellation email sent", { businessId: business.id });
          } catch (emailError) {
            logStep("Error sending cancellation email", { error: String(emailError) });
          }

          // Create admin notification
          await supabaseClient
            .from("admin_notifications")
            .insert({
              type: "subscription_cancelled",
              title: "Subscription Cancelled",
              message: `${business.name} has cancelled their ${business.subscription_plan} subscription.`,
              metadata: { 
                business_id: business.id, 
                plan: business.subscription_plan,
                subscription_id: subscription.id,
              },
            });
        }
      }
    }

    // Handle payment intent succeeded
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      logStep("Payment intent succeeded", { 
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        customerId: paymentIntent.customer 
      });

      // Find business by payment intent ID
      const { data: business } = await supabaseClient
        .from("businesses")
        .select("id, name, email, subscription_plan, payment_status")
        .eq("payment_intent_id", paymentIntent.id)
        .single();

      if (business && business.payment_status === "held") {
        // Payment was already captured via admin approval, just log
        logStep("Payment intent already processed via admin approval", { businessId: business.id });
      } else if (business) {
        // Update payment status
        await supabaseClient
          .from("businesses")
          .update({
            payment_status: "succeeded",
          })
          .eq("id", business.id);
        logStep("Business payment status updated to succeeded", { businessId: business.id });
      }
    }

    // Handle payment intent failed
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      logStep("Payment intent failed", { 
        paymentIntentId: paymentIntent.id,
        error: paymentIntent.last_payment_error?.message 
      });

      // Find business by payment intent ID or stripe customer ID
      let business = null;
      const { data: bizByIntent } = await supabaseClient
        .from("businesses")
        .select("id, name, email, subscription_plan, stripe_subscription_id")
        .eq("payment_intent_id", paymentIntent.id)
        .single();

      if (bizByIntent) {
        business = bizByIntent;
      } else if (paymentIntent.customer) {
        const { data: bizByCustomer } = await supabaseClient
          .from("businesses")
          .select("id, name, email, subscription_plan, stripe_subscription_id")
          .eq("stripe_customer_id", paymentIntent.customer)
          .single();
        business = bizByCustomer;
      }

      if (business) {
        await supabaseClient
          .from("businesses")
          .update({
            payment_status: "failed",
          })
          .eq("id", business.id);

        // Create admin notification
        await supabaseClient
          .from("admin_notifications")
          .insert({
            type: "payment_failed",
            title: "Payment Failed",
            message: `Payment failed for ${business.name}: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
            metadata: { 
              business_id: business.id, 
              payment_intent_id: paymentIntent.id,
              error: paymentIntent.last_payment_error?.message,
            },
          });

        // Send dunning email for failed payment
        if (business.email) {
          // Check existing dunning records to determine attempt count
          const { data: existingDunning } = await supabaseClient
            .from("dunning_records")
            .select("attempt_count")
            .eq("business_id", business.id)
            .eq("dunning_type", "payment_failed")
            .eq("status", "sent")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const attemptCount = (existingDunning?.attempt_count || 0) + 1;
          const dunningType = attemptCount >= 3 ? "final_notice" : "payment_failed";

          try {
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
                dunningType,
                subscriptionPlan: business.subscription_plan,
                amount: paymentIntent.amount ? paymentIntent.amount / 100 : undefined,
                attemptCount,
              }),
            });
            logStep("Dunning email sent", { businessId: business.id, attemptCount, dunningType });
          } catch (dunningErr) {
            logStep("Error sending dunning email", { error: String(dunningErr) });
          }
        }

        logStep("Payment failure recorded", { businessId: business.id });
      }
    }

    // Handle charge refunded
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      logStep("Charge refunded", { 
        chargeId: charge.id,
        amount: charge.amount_refunded,
        customerId: charge.customer 
      });

      // Find business by stripe customer ID
      const { data: business } = await supabaseClient
        .from("businesses")
        .select("id, name, email, subscription_plan, payment_amount")
        .eq("stripe_customer_id", charge.customer)
        .single();

      if (business) {
        const refundAmount = charge.amount_refunded / 100;
        const isFullRefund = charge.amount_refunded === charge.amount;

        // Update business payment status
        await supabaseClient
          .from("businesses")
          .update({
            payment_status: isFullRefund ? "refunded" : "partial_refund",
            payment_refunded_at: new Date().toISOString(),
          })
          .eq("id", business.id);

        // Record refund transaction
        await supabaseClient
          .from("revenue_transactions")
          .insert({
            transaction_id: `refund_${charge.id}`,
            amount_nzd: -refundAmount, // Negative for refund
            payment_type: "refund",
            business_name: business.name,
            business_email: business.email,
            business_id: business.id,
            stripe_customer_id: charge.customer as string,
            payment_status: "refunded",
            gst_amount: -(refundAmount * 0.15),
            metadata: { 
              original_charge_id: charge.id,
              is_full_refund: isFullRefund,
            },
          });

        // Create admin notification
        await supabaseClient
          .from("admin_notifications")
          .insert({
            type: "refund_processed",
            title: isFullRefund ? "Full Refund Processed" : "Partial Refund Processed",
            message: `$${refundAmount.toFixed(2)} refunded to ${business.name}`,
            metadata: { 
              business_id: business.id, 
              charge_id: charge.id,
              refund_amount: refundAmount,
              is_full_refund: isFullRefund,
            },
          });

        logStep("Refund recorded", { businessId: business.id, amount: refundAmount, isFullRefund });
      }
    }

    // Handle invoice payment failed (recurring payment failure)
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("Invoice payment failed", { 
        invoiceId: invoice.id,
        customerId: invoice.customer,
        attemptCount: invoice.attempt_count 
      });

      // Find business by stripe customer ID
      const { data: business } = await supabaseClient
        .from("businesses")
        .select("id, name, email, subscription_plan")
        .eq("stripe_customer_id", invoice.customer)
        .single();

      if (business) {
        // Create admin notification
        await supabaseClient
          .from("admin_notifications")
          .insert({
            type: "recurring_payment_failed",
            title: "Recurring Payment Failed",
            message: `Recurring payment failed for ${business.name} (${business.subscription_plan} plan). Attempt ${invoice.attempt_count}.`,
            metadata: { 
              business_id: business.id, 
              invoice_id: invoice.id,
              attempt_count: invoice.attempt_count,
              next_attempt: invoice.next_payment_attempt,
            },
          });

        logStep("Recurring payment failure recorded", { 
          businessId: business.id, 
          attemptCount: invoice.attempt_count 
        });
      }
    }

    // Handle invoice payment succeeded (for recurring payments)
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("Invoice payment succeeded", { 
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amount: invoice.amount_paid 
      });

      // Find business by stripe customer ID
      const { data: business } = await supabaseClient
        .from("businesses")
        .select("id, name, email, subscription_plan")
        .eq("stripe_customer_id", invoice.customer)
        .single();

      if (business && invoice.billing_reason === "subscription_cycle") {
        const amountPaid = invoice.amount_paid / 100;
        
        const { error: revenueError } = await supabaseClient
          .from("revenue_transactions")
          .insert({
            transaction_id: invoice.id,
            amount_nzd: amountPaid,
            payment_type: "subscription_renewal",
            business_name: business.name,
            business_email: business.email,
            business_id: business.id,
            stripe_customer_id: invoice.customer as string,
            stripe_invoice_id: invoice.id,
            subscription_tier: business.subscription_plan,
            payment_status: "paid",
            gst_amount: amountPaid * 0.15,
          });

        if (revenueError) {
          logStep("Error recording renewal revenue", { error: revenueError.message });
        } else {
          logStep("Renewal revenue recorded", { amount: amountPaid, businessId: business.id });
        }
      }
    }

    // Handle price created - sync new prices to platform settings
    if (event.type === "price.created") {
      const price = event.data.object as Stripe.Price;
      logStep("Price created", { 
        priceId: price.id,
        productId: price.product,
        amount: price.unit_amount 
      });

      const productId = typeof price.product === 'string' ? price.product : price.product.id;
      
      if (price.active && price.unit_amount) {
        await syncPriceToSettings(supabaseClient, productId, price.id, price.unit_amount);
      }
    }

    // Handle price updated - sync updated prices
    if (event.type === "price.updated") {
      const price = event.data.object as Stripe.Price;
      logStep("Price updated", { 
        priceId: price.id,
        productId: price.product,
        amount: price.unit_amount,
        active: price.active 
      });

      const productId = typeof price.product === 'string' ? price.product : price.product.id;
      
      // Only sync if the price is active
      if (price.active && price.unit_amount) {
        await syncPriceToSettings(supabaseClient, productId, price.id, price.unit_amount);
      }
    }

    // Handle product updated - fetch and sync the current active price
    if (event.type === "product.updated") {
      const product = event.data.object as Stripe.Product;
      logStep("Product updated", { 
        productId: product.id,
        name: product.name,
        active: product.active 
      });

      // If product is in our mapping and active, fetch its current price
      if (product.active && PRODUCT_TO_SETTING_MAP[product.id]) {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2025-08-27.basil",
        });

        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 1,
        });

        if (prices.data.length > 0) {
          const price = prices.data[0];
          if (price.unit_amount) {
            await syncPriceToSettings(supabaseClient, product.id, price.id, price.unit_amount);
          }
        }
      }
    }

    // Mark webhook as processed
    await updateWebhookStatus("processed");

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
