// Wellington EcoBuild Internal Portal - Payment Reminder Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND = {
  name: "Wellington EcoBuild",
  primaryColor: "#059669",
  logo: "🏗️"
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[Payment Reminder] Starting reminder check...");

    // Find approved invoices that haven't been paid (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: overdueInvoices, error: fetchError } = await supabase
      .from("contractor_invoices")
      .select(`
        id,
        invoice_number,
        total_amount,
        due_date,
        approved_at,
        portal_users(email, legal_full_name)
      `)
      .eq("status", "approved")
      .lt("approved_at", sevenDaysAgo.toISOString());

    if (fetchError) {
      console.error("[Payment Reminder] Error fetching invoices:", fetchError);
      throw fetchError;
    }

    console.log(`[Payment Reminder] Found ${overdueInvoices?.length || 0} overdue invoices`);

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No overdue invoices found", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Build summary from overdue invoices
    const invoiceSummary = overdueInvoices.map((invoice: any) => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      total_amount: invoice.total_amount,
      due_date: invoice.due_date,
      approved_at: invoice.approved_at,
      contractor_email: invoice.portal_users?.email,
      contractor_name: invoice.portal_users?.legal_full_name
    }));

    console.log(`[Payment Reminder] ${invoiceSummary.length} overdue invoices found`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Found ${invoiceSummary.length} overdue invoices`,
        count: invoiceSummary.length,
        invoices: invoiceSummary
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("[Payment Reminder] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
};

serve(handler);
