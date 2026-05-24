import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Find documents expiring within 30 days
    const { data: expiringDocs, error: fetchError } = await supabase
      .from("verification_submissions")
      .select(`
        id,
        document_name,
        document_type,
        expiry_date,
        status,
        business:business_id (
          id,
          name,
          email
        )
      `)
      .not("expiry_date", "is", null)
      .lte("expiry_date", in30Days.toISOString().split("T")[0])
      .gte("expiry_date", now.toISOString().split("T")[0])
      .in("status", ["approved", "pending"]);

    if (fetchError) {
      console.error("Error fetching expiring documents:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiringDocs?.length || 0} documents expiring within 30 days`);

    const notifications: any[] = [];
    const expiredDocs: any[] = [];
    const urgentDocs: any[] = [];
    const upcomingDocs: any[] = [];

    for (const doc of expiringDocs || []) {
      const expiryDate = new Date(doc.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 0) {
        expiredDocs.push({ ...doc, daysUntilExpiry });
      } else if (daysUntilExpiry <= 7) {
        urgentDocs.push({ ...doc, daysUntilExpiry });
      } else {
        upcomingDocs.push({ ...doc, daysUntilExpiry });
      }
    }

    // Create admin notification for expired documents
    if (expiredDocs.length > 0) {
      notifications.push({
        type: "document_expired",
        title: `${expiredDocs.length} Document(s) Have Expired`,
        message: expiredDocs.map((d: any) => 
          `${d.document_name} (${d.business?.name || 'Unknown business'})`
        ).join(", "),
        metadata: {
          count: expiredDocs.length,
          documents: expiredDocs.map((d: any) => ({
            id: d.id,
            name: d.document_name,
            business_name: d.business?.name,
            expiry_date: d.expiry_date,
          })),
        },
      });
    }

    // Create admin notification for urgent expiring documents (within 7 days)
    if (urgentDocs.length > 0) {
      notifications.push({
        type: "document_expiring_urgent",
        title: `${urgentDocs.length} Document(s) Expiring Within 7 Days`,
        message: urgentDocs.map((d: any) => 
          `${d.document_name} (${d.business?.name || 'Unknown'}) - ${d.daysUntilExpiry} days`
        ).join(", "),
        metadata: {
          count: urgentDocs.length,
          documents: urgentDocs.map((d: any) => ({
            id: d.id,
            name: d.document_name,
            business_name: d.business?.name,
            expiry_date: d.expiry_date,
            days_until_expiry: d.daysUntilExpiry,
          })),
        },
      });
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from("admin_notifications")
        .insert(notifications);

      if (notifError) {
        console.error("Error inserting notifications:", notifError);
      } else {
        console.log(`Created ${notifications.length} admin notifications`);
      }
    }

    // Update expired documents status
    if (expiredDocs.length > 0) {
      const expiredIds = expiredDocs.map((d: any) => d.id);
      const { error: updateError } = await supabase
        .from("verification_submissions")
        .update({ status: "expired" })
        .in("id", expiredIds);

      if (updateError) {
        console.error("Error updating expired documents:", updateError);
      } else {
        console.log(`Marked ${expiredIds.length} documents as expired`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          expired: expiredDocs.length,
          urgent: urgentDocs.length,
          upcoming: upcomingDocs.length,
          notifications_created: notifications.length,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in check-expiring-documents:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
