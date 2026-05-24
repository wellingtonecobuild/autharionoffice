import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml',
};

const SITE_URL = 'https://wellingtonecobuild.nz';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all published articles
    const { data: articles, error } = await supabase
      .from('articles')
      .select('slug, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching articles:', error);
      throw error;
    }

    // Fetch all approved businesses
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, name, updated_at, category')
      .in('status', ['active', 'approved'])
      .order('updated_at', { ascending: false });

    // Static pages
    const staticPages = [
      { loc: '', priority: '1.0', changefreq: 'daily' },
      { loc: '/market-insights', priority: '0.9', changefreq: 'daily' },
      { loc: '/category/builders', priority: '0.8', changefreq: 'weekly' },
      { loc: '/category/architects', priority: '0.8', changefreq: 'weekly' },
      { loc: '/category/suppliers', priority: '0.8', changefreq: 'weekly' },
      { loc: '/category/specialists', priority: '0.8', changefreq: 'weekly' },
      { loc: '/locations', priority: '0.8', changefreq: 'weekly' },
      { loc: '/jobs', priority: '0.8', changefreq: 'daily' },
      { loc: '/how-it-works', priority: '0.7', changefreq: 'monthly' },
      { loc: '/pricing', priority: '0.7', changefreq: 'monthly' },
      { loc: '/about', priority: '0.6', changefreq: 'monthly' },
      { loc: '/contact', priority: '0.6', changefreq: 'monthly' },
      { loc: '/resources', priority: '0.6', changefreq: 'weekly' },
      { loc: '/events', priority: '0.7', changefreq: 'weekly' },
      { loc: '/community', priority: '0.6', changefreq: 'weekly' },
      { loc: '/suburbs', priority: '0.7', changefreq: 'weekly' },
    ];

    const today = new Date().toISOString().split('T')[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    // Add static pages
    for (const page of staticPages) {
      sitemap += `  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Add blog articles with news sitemap extension
    if (articles) {
      for (const article of articles) {
        const lastmod = article.updated_at || article.published_at;
        const pubDate = new Date(article.published_at);
        const formattedDate = lastmod ? lastmod.split('T')[0] : today;
        
        sitemap += `  <url>
    <loc>${SITE_URL}/market-insights/${article.slug}</loc>
    <lastmod>${formattedDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <news:news>
      <news:publication>
        <news:name>Wellington EcoBuild</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate.toISOString()}</news:publication_date>
    </news:news>
  </url>
`;
      }
    }

    // Add business listings
    if (businesses) {
      for (const business of businesses) {
        const lastmod = business.updated_at?.split('T')[0] || today;
        sitemap += `  <url>
    <loc>${SITE_URL}/business/${business.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    sitemap += `</urlset>`;

    return new Response(sitemap, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}</loc>
    <priority>1.0</priority>
  </url>
</urlset>`,
      { headers: corsHeaders }
    );
  }
});
