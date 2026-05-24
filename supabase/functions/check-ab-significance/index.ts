import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ABTestStats {
  aImpressions: number;
  aClicks: number;
  bImpressions: number;
  bClicks: number;
}

function calculateZScore(p1: number, p2: number, n1: number, n2: number): number {
  const pPool = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1/n1 + 1/n2));
  if (se === 0) return 0;
  return (p1 - p2) / se;
}

function zScoreToPValue(z: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 2 * (1 - 0.5 * (1.0 + sign * y));
}

function checkSignificance(stats: ABTestStats): { isSignificant: boolean; winner: 'A' | 'B' | null; confidence: number } {
  const { aImpressions, aClicks, bImpressions, bClicks } = stats;
  
  // Need minimum 100 impressions each and at least 5 clicks
  if (aImpressions < 100 || bImpressions < 100 || aClicks < 5 || bClicks < 5) {
    return { isSignificant: false, winner: null, confidence: 0 };
  }
  
  const aRate = aClicks / aImpressions;
  const bRate = bClicks / bImpressions;
  const zScore = calculateZScore(aRate, bRate, aImpressions, bImpressions);
  const pValue = zScoreToPValue(zScore);
  
  // 95% confidence threshold
  const isSignificant = pValue < 0.05;
  const confidence = Math.round((1 - pValue) * 100);
  
  return {
    isSignificant,
    winner: isSignificant ? (aRate > bRate ? 'A' : 'B') : null,
    confidence,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all running tests
    const { data: runningTests, error: testsError } = await supabase
      .from('ad_ab_tests')
      .select('id, name')
      .eq('status', 'running');

    if (testsError) throw testsError;
    if (!runningTests || runningTests.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No running tests to check' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const completedTests: string[] = [];

    for (const test of runningTests) {
      // Get aggregated results for this test
      const { data: results, error: resultsError } = await supabase
        .from('ad_ab_test_results')
        .select('variant, impressions, clicks')
        .eq('test_id', test.id);

      if (resultsError) {
        console.error(`Error fetching results for test ${test.id}:`, resultsError);
        continue;
      }

      // Aggregate results by variant
      const aResults = results?.filter(r => r.variant === 'A') || [];
      const bResults = results?.filter(r => r.variant === 'B') || [];
      
      const stats: ABTestStats = {
        aImpressions: aResults.reduce((sum, r) => sum + r.impressions, 0),
        aClicks: aResults.reduce((sum, r) => sum + r.clicks, 0),
        bImpressions: bResults.reduce((sum, r) => sum + r.impressions, 0),
        bClicks: bResults.reduce((sum, r) => sum + r.clicks, 0),
      };

      const significance = checkSignificance(stats);

      if (significance.isSignificant && significance.confidence >= 95) {
        // Auto-complete the test
        const { error: updateError } = await supabase
          .from('ad_ab_tests')
          .update({
            status: 'completed',
            end_date: new Date().toISOString(),
          })
          .eq('id', test.id);

        if (!updateError) {
          completedTests.push(test.name);
          
          // Create admin notification
          await supabase
            .from('admin_notifications')
            .insert({
              type: 'ab_test',
              title: `A/B Test Completed: ${test.name}`,
              message: `Variant ${significance.winner} wins with ${significance.confidence}% confidence!`,
              metadata: {
                test_id: test.id,
                winner: significance.winner,
                confidence: significance.confidence,
                stats,
              },
            });

          console.log(`Auto-completed test ${test.name}: Variant ${significance.winner} wins with ${significance.confidence}% confidence`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        testsChecked: runningTests.length,
        testsCompleted: completedTests,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error checking A/B significance:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
