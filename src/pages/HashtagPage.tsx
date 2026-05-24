import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Hash, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

type BlogCategory = 
  | "wellington_construction_news"
  | "sustainable_building"
  | "supplier_updates"
  | "projects_developments"
  | "renovation_retrofit"
  | "regulations_compliance"
  | "market_trends"
  | "eco_building_education";

const CATEGORY_LABELS: Record<BlogCategory, string> = {
  wellington_construction_news: "Wellington News",
  sustainable_building: "Sustainable Building",
  supplier_updates: "Supplier Updates",
  projects_developments: "Projects",
  renovation_retrofit: "Renovation",
  regulations_compliance: "Regulations",
  market_trends: "Market Trends",
  eco_building_education: "Education",
};

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string | null;
  categories: BlogCategory[];
  tags: string[] | null;
  views: number;
  published_at: string;
}

const HashtagPage = () => {
  const { tag } = useParams();
  const decodedTag = decodeURIComponent(tag || "").replace(/-/g, " ");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["hashtag-articles", tag],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, featured_image, categories, tags, views, published_at")
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .contains("tags", [decodedTag])
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as Article[];
    },
    enabled: !!tag,
  });

  // Get all unique tags for related hashtags
  const { data: allTags } = useQuery({
    queryKey: ["all-hashtags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("tags")
        .eq("status", "published")
        .not("tags", "is", null);
      if (error) throw error;
      
      const tagCounts: Record<string, number> = {};
      data.forEach((article) => {
        (article.tags || []).forEach((t: string) => {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
      });
      
      return Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name, count]) => ({ name, count }));
    },
  });

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `#${decodedTag} - Wellington EcoBuild`,
    "description": `Articles tagged with #${decodedTag} on Wellington EcoBuild`,
    "url": `https://wellingtonecobuild.nz/tag/${tag}`,
  };

  return (
    <>
      <Helmet>
        <title>#{decodedTag} | Wellington EcoBuild News</title>
        <meta name="description" content={`Browse all articles tagged with #${decodedTag}. Wellington's source for sustainable construction news and insights.`} />
        <meta property="og:title" content={`#${decodedTag} | Wellington EcoBuild`} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`https://wellingtonecobuild.nz/tag/${tag}`} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="bg-gradient-to-br from-forest to-forest-light py-12 lg:py-16">
          <div className="container mx-auto px-4">
            <Link to="/news" className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to News
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Hash className="w-6 h-6 text-accent" />
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground">
                #{decodedTag}
              </h1>
            </div>
            <p className="text-primary-foreground/80 text-lg max-w-2xl">
              {articles?.length || 0} article{articles?.length !== 1 ? "s" : ""} tagged with this topic
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12 lg:py-16">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {isLoading ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-80 rounded-2xl" />
                  ))}
                </div>
              ) : articles?.length === 0 ? (
                <div className="text-center py-16 bg-muted rounded-2xl">
                  <Hash className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">No articles found with this tag.</p>
                  <Link to="/news" className="text-accent hover:underline mt-4 inline-block">
                    Browse all articles
                  </Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {articles?.map((article) => (
                    <Link
                      key={article.id}
                      to={`/news/${article.slug}`}
                      className="group"
                    >
                      <article className="bg-card rounded-2xl border border-border hover:border-accent/50 hover:shadow-elegant transition-all duration-300 overflow-hidden h-full">
                        <div className="h-48 overflow-hidden relative">
                          {article.featured_image ? (
                            <img
                              src={article.featured_image}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <span className="text-muted-foreground text-sm">No image</span>
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <div className="flex flex-wrap gap-1 mb-3">
                            {article.categories.slice(0, 2).map((cat) => (
                              <Badge key={cat} variant="secondary" className="text-xs">
                                {CATEGORY_LABELS[cat]}
                              </Badge>
                            ))}
                          </div>
                          <h3 className="font-display text-lg font-semibold text-foreground mb-2 group-hover:text-accent transition-colors line-clamp-2">
                            {article.title}
                          </h3>
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(article.published_at), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="font-display text-lg font-semibold mb-4">Popular Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {allTags?.map((t) => (
                    <Link
                      key={t.name}
                      to={`/tag/${encodeURIComponent(t.name.replace(/\s+/g, "-"))}`}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
                        t.name.toLowerCase() === decodedTag.toLowerCase()
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent/10 hover:text-accent"
                      }`}
                    >
                      <Hash className="w-3 h-3" />
                      {t.name}
                      <span className="text-xs opacity-60">({t.count})</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="bg-accent/10 rounded-2xl border border-accent/20 p-6">
                <h3 className="font-display text-lg font-semibold mb-2">Find Eco Builders</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect with verified sustainable construction professionals.
                </p>
                <Link
                  to="/category/eco-builders"
                  className="inline-flex items-center gap-2 text-accent font-medium text-sm hover:underline"
                >
                  Browse Directory →
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default HashtagPage;
