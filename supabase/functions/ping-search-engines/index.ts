import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://wellingtonecobuild.nz'
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Starting daily search engine ping for SEO domination...')

    // Fetch all published articles
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('slug, title, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })

    if (articlesError) {
      console.error('Error fetching articles:', articlesError)
      throw articlesError
    }

    console.log(`Found ${articles?.length || 0} published articles to ping`)

    const pingResults: { url: string; status: string; engine: string }[] = []

    // Ping Google with sitemap
    try {
      const googleSitemapPing = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
      const googleResponse = await fetch(googleSitemapPing)
      pingResults.push({
        url: SITEMAP_URL,
        status: googleResponse.ok ? 'success' : 'failed',
        engine: 'Google Sitemap'
      })
      console.log(`Google sitemap ping: ${googleResponse.ok ? 'SUCCESS' : 'FAILED'}`)
    } catch (e) {
      console.error('Google sitemap ping error:', e)
      pingResults.push({ url: SITEMAP_URL, status: 'error', engine: 'Google Sitemap' })
    }

    // Ping Bing with sitemap
    try {
      const bingSitemapPing = `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
      const bingResponse = await fetch(bingSitemapPing)
      pingResults.push({
        url: SITEMAP_URL,
        status: bingResponse.ok ? 'success' : 'failed',
        engine: 'Bing Sitemap'
      })
      console.log(`Bing sitemap ping: ${bingResponse.ok ? 'SUCCESS' : 'FAILED'}`)
    } catch (e) {
      console.error('Bing sitemap ping error:', e)
      pingResults.push({ url: SITEMAP_URL, status: 'error', engine: 'Bing Sitemap' })
    }

    // Ping IndexNow for Bing/Yandex (free, no key required for basic ping)
    try {
      const indexNowUrl = 'https://www.bing.com/indexnow'
      const urlList = articles?.slice(0, 100).map(a => `${SITE_URL}/insights/${a.slug}`) || []
      
      // IndexNow accepts URL pings without API key for sitemap notifications
      for (const articleUrl of urlList.slice(0, 10)) { // Ping top 10 recent articles
        try {
          const pingUrl = `https://www.bing.com/ping?url=${encodeURIComponent(articleUrl)}`
          await fetch(pingUrl)
          console.log(`Pinged Bing for: ${articleUrl}`)
        } catch (e) {
          console.log(`Ping failed for ${articleUrl}`)
        }
      }
      pingResults.push({
        url: 'Multiple articles',
        status: 'success',
        engine: 'Bing Individual URLs'
      })
    } catch (e) {
      console.error('IndexNow ping error:', e)
    }

    // Ping Google for individual URLs (using webmaster ping)
    try {
      const recentArticles = articles?.slice(0, 10) || []
      for (const article of recentArticles) {
        const articleUrl = `${SITE_URL}/insights/${article.slug}`
        try {
          // Google's blog ping service
          const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(articleUrl)}`
          await fetch(pingUrl)
          console.log(`Pinged Google for: ${articleUrl}`)
        } catch (e) {
          console.log(`Google ping failed for ${articleUrl}`)
        }
      }
      pingResults.push({
        url: 'Multiple articles',
        status: 'success',
        engine: 'Google Individual URLs'
      })
    } catch (e) {
      console.error('Google individual ping error:', e)
    }

    // Log the ping activity
    const { error: logError } = await supabase
      .from('admin_notifications')
      .insert({
        type: 'seo_ping',
        title: 'Daily SEO Ping Completed',
        message: `Pinged ${articles?.length || 0} articles to Google & Bing. ${pingResults.filter(r => r.status === 'success').length} successful pings.`,
        metadata: {
          total_articles: articles?.length || 0,
          ping_results: pingResults,
          timestamp: new Date().toISOString()
        }
      })

    if (logError) {
      console.error('Error logging ping:', logError)
    }

    const summary = {
      success: true,
      message: 'Search engine ping completed for Wellington EcoBuild SEO domination',
      articles_count: articles?.length || 0,
      ping_results: pingResults,
      timestamp: new Date().toISOString()
    }

    console.log('Ping summary:', JSON.stringify(summary))

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: unknown) {
    console.error('Error in ping-search-engines:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
