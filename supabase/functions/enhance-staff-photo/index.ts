import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { imageUrl, portalUserId } = await req.json();

    if (!imageUrl || !portalUserId) {
      throw new Error("imageUrl and portalUserId are required");
    }

    console.log(`[Enhance Photo] Starting enhancement for user ${portalUserId}`);

    // Update status to processing
    await supabase
      .from("portal_users")
      .update({ photo_status: "processing" })
      .eq("id", portalUserId);

    // Use Lovable AI to enhance the image
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Enhance this professional headshot photo to HD quality. Make it look crisp, professional, and suitable for a corporate staff ID card. Improve lighting, sharpness, and overall quality while maintaining the natural appearance of the person. Keep the same composition and background."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Enhance Photo] AI Gateway error:", errorText);
      
      // If enhancement fails, use original image
      await supabase
        .from("portal_users")
        .update({ 
          profile_photo_hd_url: imageUrl,
          photo_status: "approved"
        })
        .eq("id", portalUserId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Using original image (enhancement unavailable)",
          hdImageUrl: imageUrl
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const enhancedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (enhancedImageUrl) {
      // Convert base64 to blob and upload to storage
      const base64Data = enhancedImageUrl.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      const fileName = `${portalUserId}/hd-photo-${Date.now()}.png`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("staff-photos")
        .upload(fileName, imageBuffer, {
          contentType: "image/png",
          upsert: true
        });

      if (uploadError) {
        console.error("[Enhance Photo] Upload error:", uploadError);
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("staff-photos")
        .getPublicUrl(fileName);

      const hdPhotoUrl = publicUrlData.publicUrl;

      // Update portal user with HD photo
      await supabase
        .from("portal_users")
        .update({ 
          profile_photo_hd_url: hdPhotoUrl,
          photo_status: "approved"
        })
        .eq("id", portalUserId);

      console.log(`[Enhance Photo] Successfully enhanced photo for user ${portalUserId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Photo enhanced successfully",
          hdImageUrl: hdPhotoUrl
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Fallback to original if no enhanced image returned
      await supabase
        .from("portal_users")
        .update({ 
          profile_photo_hd_url: imageUrl,
          photo_status: "approved"
        })
        .eq("id", portalUserId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Using original image",
          hdImageUrl: imageUrl
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("[Enhance Photo] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
