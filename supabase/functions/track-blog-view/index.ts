import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { articleId, sessionId, userId, deviceType, referrer, duration, action } = await req.json()

    if (!articleId || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Categorize referrer
    const categorizeReferrer = (ref: string | null): string => {
      if (!ref) return 'direct'
      const refLower = ref.toLowerCase()
      if (refLower.includes('google') || refLower.includes('bing') || refLower.includes('yahoo') || refLower.includes('duckduckgo')) {
        return 'google'
      }
      if (refLower.includes('facebook') || refLower.includes('twitter') || refLower.includes('linkedin') || 
          refLower.includes('instagram') || refLower.includes('tiktok') || refLower.includes('pinterest')) {
        return 'social'
      }
      if (refLower.includes(supabaseUrl.replace('https://', '').split('.')[0])) {
        return 'direct'
      }
      return 'other'
    }

    if (action === 'start') {
      // Check for spam protection - no duplicate views from same session within 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      
      const { data: existingView } = await supabase
        .from('blog_views')
        .select('id')
        .eq('article_id', articleId)
        .eq('session_id', sessionId)
        .gte('created_at', thirtyMinutesAgo)
        .maybeSingle()

      if (existingView) {
        return new Response(
          JSON.stringify({ success: true, message: 'View already recorded recently', viewId: existingView.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Insert new view record
      const { data: newView, error: insertError } = await supabase
        .from('blog_views')
        .insert({
          article_id: articleId,
          session_id: sessionId,
          user_id: userId || null,
          device_type: deviceType || 'desktop',
          referrer: referrer || null,
          referrer_category: categorizeReferrer(referrer),
          is_counted: false,
          duration_seconds: 0
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Error inserting view:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to record view' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, viewId: newView.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (action === 'confirm') {
      // User stayed 5+ seconds, mark view as counted
      const { viewId } = await req.json().catch(() => ({ viewId: null }))
      
      // Update based on session and article if no viewId
      const { error: updateError } = await supabase
        .from('blog_views')
        .update({ 
          is_counted: true,
          duration_seconds: Math.max(duration || 5, 5)
        })
        .eq('article_id', articleId)
        .eq('session_id', sessionId)
        .eq('is_counted', false)

      if (updateError) {
        console.error('Error confirming view:', updateError)
      }

      // Also update the article's view count for quick access
      const { data: countData } = await supabase
        .from('blog_views')
        .select('id')
        .eq('article_id', articleId)
        .eq('is_counted', true)

      const realViewCount = countData?.length || 0

      await supabase
        .from('articles')
        .update({ views: realViewCount })
        .eq('id', articleId)

      return new Response(
        JSON.stringify({ success: true, totalViews: realViewCount }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (action === 'update-duration') {
      // Update duration for analytics
      const { error: updateError } = await supabase
        .from('blog_views')
        .update({ duration_seconds: duration || 0 })
        .eq('article_id', articleId)
        .eq('session_id', sessionId)

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in track-blog-view:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})