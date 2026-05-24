import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { test_id, variant, event_type } = await req.json();

    if (!test_id || !variant || !event_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: test_id, variant, event_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['A', 'B'].includes(variant)) {
      return new Response(
        JSON.stringify({ error: 'Variant must be A or B' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['impression', 'click'].includes(event_type)) {
      return new Response(
        JSON.stringify({ error: 'Event type must be impression or click' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];

    // Try to upsert the result record
    const { data: existing } = await supabase
      .from('ad_ab_test_results')
      .select('id, impressions, clicks')
      .eq('test_id', test_id)
      .eq('variant', variant)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const updateData = event_type === 'impression' 
        ? { impressions: existing.impressions + 1 }
        : { clicks: existing.clicks + 1 };

      await supabase
        .from('ad_ab_test_results')
        .update(updateData)
        .eq('id', existing.id);
    } else {
      // Create new record
      await supabase
        .from('ad_ab_test_results')
        .insert({
          test_id,
          variant,
          date: today,
          impressions: event_type === 'impression' ? 1 : 0,
          clicks: event_type === 'click' ? 1 : 0,
        });
    }

    console.log(`Tracked ${event_type} for test ${test_id}, variant ${variant}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error tracking A/B event:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
