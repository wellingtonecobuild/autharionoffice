import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleCard } from "@/components/news/ArticleCard";
import { NewsSearch } from "@/components/news/NewsSearch";
import { CategoryTabs } from "@/components/news/CategoryTabs";
import { TrendingBar } from "@/components/news/TrendingBar";
import { MostReadSidebar } from "@/components/news/MostReadSidebar";
import { ArrowRight, TrendingUp } from "lucide-react";

type BlogCategory = 
  | "wellington_construction_news"
  | "sustainable_building"
  | "supplier_updates"
  | "projects_developments"
  | "renovation_retrofit"
  | "regulations_compliance"
  | "market_trends"
  | "eco_building_education"
  | "construction_opportunities"
  | "construction_finance"
  | "design_architecture"
  | "technology_innovation"
  | "health_safety_compliance"
  | "sustainability_standards"
  | "industry_insights";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string | null;
  categories: BlogCategory[];
  tags: string[] | null;
  author: string;
  is_featured: boolean;
  is_trending: boolean;
  is_pinned: boolean;
  views: number;
  published_at: string;
  location_scope: string | null;
}

const MarketInsights = () => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, featured_image, categories, tags, author, is_featured, is_trending, is_pinned, views, published_at, location_scope")
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("is_pinned", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as Article[];
    },
  });

  // Real-time subscription for articles
  useEffect(() => {
    const channel = supabase
      .channel('market-insights-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'articles'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['articles'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    if (!articles) return {};
    const counts: Record<string, number> = { all: articles.length };
    articles.forEach((article) => {
      article.categories.forEach((cat) => {
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });
    return counts;
  }, [articles]);

  // Extract all unique tags with counts
  const popularTags = useMemo(() => {
    if (!articles) return [];
    const tagCounts: Record<string, number> = {};
    articles.forEach((article) => {
      (article.tags || []).forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({ name, count }));
  }, [articles]);

  // Filter articles
  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    return articles.filter((article) => {
      const matchesCategory = selectedCategory === "all" || article.categories.includes(selectedCategory as BlogCategory);
      const matchesSearch = searchQuery === "" || 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (article.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [articles, selectedCategory, searchQuery]);

  const trendingArticles = articles?.filter((a) => a.is_trending).slice(0, 5) || [];
  const featuredArticle = filteredArticles.find((a) => a.is_featured || a.is_pinned);
  const remainingArticles = filteredArticles.filter((a) => a.id !== featuredArticle?.id);
  const mostReadArticles = [...(articles || [])].sort((a, b) => b.views - a.views).slice(0, 5);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Wellington EcoBuild Market Insights",
    "description": "Wellington construction industry market insights, analysis, and professional intelligence for the construction sector.",
    "url": "https://wellingtonecobuild.nz/market-insights",
    "publisher": {
      "@type": "Organization",
      "name": "Wellington EcoBuild",
      "url": "https://wellingtonecobuild.nz"
    },
    "about": {
      "@type": "Thing",
      "name": "Wellington Construction Industry"
    }
  };

  return (
    <>
      <Helmet>
        <title>Market Insights | Wellington Construction Intelligence | Wellington EcoBuild</title>
        <meta name="description" content="Wellington construction industry market insights, analysis, and professional intelligence. Expert analysis on infrastructure, labour markets, and development trends in the Wellington region." />
        <meta property="og:title" content="Market Insights | Wellington EcoBuild" />
        <meta property="og:description" content="Wellington's construction industry intelligence and market analysis for professionals." />
        <meta property="og:type" content="website" />
        <meta name="keywords" content="Wellington construction market, construction insights, building industry analysis, Wellington infrastructure, construction trends NZ" />
        <link rel="canonical" href="https://wellingtonecobuild.nz/market-insights" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        {/* Google AdSense - only on blog/insights pages */}
        <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9272188045746670"
          crossOrigin="anonymous"
        />
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="bg-gradient-to-br from-forest to-forest-light py-12 lg:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
                Market Insights
              </h1>
              <p className="text-primary-foreground/80 text-lg mb-6">
                Data-driven insights into Wellington's construction and property market.
              </p>
              <NewsSearch
                value={searchQuery} 
                onChange={setSearchQuery} 
                placeholder="Search insights, topics, tags..."
              />
            </div>
          </div>
        </section>

        {/* Trending Bar */}
        <TrendingBar articles={trendingArticles} />

        {/* Categories */}
        <section className="py-6 bg-muted/50 border-b border-border">
          <div className="container mx-auto px-4">
            <CategoryTabs 
              selected={selectedCategory} 
              onChange={setSelectedCategory} 
              counts={categoryCounts}
            />
          </div>
        </section>

        {/* Articles */}
        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-4 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-3">
                {isLoading ? (
                  <div className="space-y-8">
                    <Skeleton className="h-96 w-full rounded-2xl" />
                    <div className="grid md:grid-cols-2 gap-6">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-80 rounded-2xl" />
                      ))}
                    </div>
                  </div>
                ) : filteredArticles.length === 0 ? (
                  <div className="text-center py-16 bg-muted rounded-2xl">
                    <p className="text-muted-foreground text-lg mb-4">No insights found.</p>
                    <button 
                      onClick={() => { setSelectedCategory("all"); setSearchQuery(""); }}
                      className="text-accent hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Featured Article */}
                    {featuredArticle && (
                      <div className="mb-10">
                        <ArticleCard article={featuredArticle} variant="featured" showTags />
                      </div>
                    )}

                    {/* Articles Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {remainingArticles.map((article) => (
                        <ArticleCard key={article.id} article={article} showTags />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Sidebar */}
              <MostReadSidebar articles={mostReadArticles} tags={popularTags} />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-muted">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-2xl lg:text-3xl font-bold mb-4">
              Looking for Sustainable Builders?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Connect with verified eco-friendly construction professionals in the Wellington region.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/category/eco-builders"
                className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-medium hover:bg-accent/90 transition-colors"
              >
                Find a Builder
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/category/suppliers"
                className="inline-flex items-center gap-2 bg-background text-foreground px-6 py-3 rounded-lg font-medium border border-border hover:border-accent transition-colors"
              >
                Explore Suppliers
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default MarketInsights;