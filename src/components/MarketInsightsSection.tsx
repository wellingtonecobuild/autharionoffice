import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, TrendingUp, BarChart3, Sparkles, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { format } from "date-fns";

const CATEGORY_LABELS: Record<string, string> = {
  wellington_construction_news: "Wellington Insights",
  sustainable_building: "Sustainable Building",
  supplier_updates: "Supplier Updates",
  projects_developments: "Projects",
  renovation_retrofit: "Renovation",
  regulations_compliance: "Regulations",
  market_trends: "Market Trends",
  eco_building_education: "Education",
};

const MarketInsightsSection = () => {
  const queryClient = useQueryClient();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["homepage-insights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, featured_image, published_at, categories, views, is_trending, is_featured")
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 60000,
  });

  // Real-time subscription for articles
  useEffect(() => {
    const channel = supabase
      .channel('insights-articles-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'articles'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['homepage-insights'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Auto-rotate carousel - professional speed (8 seconds)
  useEffect(() => {
    if (!articles?.length || articles.length <= 1 || isPaused || isHovered) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % articles.length);
    }, 8000); // 8 seconds - professional pace like major news sites

    return () => clearInterval(interval);
  }, [articles?.length, isPaused, isHovered]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  const nextSlide = useCallback(() => {
    if (articles?.length) {
      setCurrentSlide((prev) => (prev + 1) % articles.length);
    }
  }, [articles?.length]);

  const prevSlide = useCallback(() => {
    if (articles?.length) {
      setCurrentSlide((prev) => (prev - 1 + articles.length) % articles.length);
    }
  }, [articles?.length]);

  if (isLoading) {
    return (
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-primary/20 rounded-full animate-pulse" />
              <div className="h-8 bg-muted rounded w-48 animate-pulse" />
            </div>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-card rounded-2xl h-[420px] animate-pulse border border-border" />
              <div className="flex flex-col gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-card rounded-xl h-28 animate-pulse border border-border" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!articles?.length) {
    return (
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Industry Intelligence
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-3">
            Market Insights
          </h2>
          <p className="text-muted-foreground mb-6">
            Wellington construction industry analysis, market trends, and professional intelligence.
          </p>
          <Link
            to="/submit-article"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            <TrendingUp className="w-5 h-5" />
            Submit an Article
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    );
  }

  const featuredArticle = articles[currentSlide];
  const sideArticles = articles.filter((_, i) => i !== currentSlide).slice(0, 3);

  return (
    <section className="py-20 lg:py-28 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              Industry Intelligence
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3">
              Market Insights
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Wellington construction industry analysis, market trends, and professional intelligence.
            </p>
            <p className="text-muted-foreground/70 text-sm mt-2 italic">
              Original analysis. Wellington focus. Data-driven insight.
            </p>
          </div>
          <Button variant="outline" asChild className="h-11 shrink-0 group">
            <Link to="/market-insights" className="gap-2">
              View All Insights
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        {/* Articles Grid with Carousel */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Featured Article Carousel */}
          <div 
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Main Carousel */}
            <div className="relative rounded-2xl overflow-hidden bg-card border border-border shadow-sm">
              {articles.map((article, index) => (
                <Link
                  key={article.id}
                  to={`/market-insights/${article.slug}`}
                  className={`group block absolute inset-0 transition-all duration-700 ease-out ${
                    index === currentSlide 
                      ? 'opacity-100 translate-x-0 z-10' 
                      : index < currentSlide 
                        ? 'opacity-0 -translate-x-full z-0' 
                        : 'opacity-0 translate-x-full z-0'
                  }`}
                  style={{ pointerEvents: index === currentSlide ? 'auto' : 'none' }}
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={article.featured_image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80"}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/60 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                    <div className="flex items-center gap-2 mb-3">
                      {article.is_trending && (
                        <Badge variant="destructive" className="gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Trending
                        </Badge>
                      )}
                      {article.categories?.[0] && (
                        <Badge variant="secondary" className="backdrop-blur-sm">
                          {CATEGORY_LABELS[article.categories[0]] || article.categories[0]}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-display text-xl lg:text-2xl font-bold text-white mb-2 group-hover:text-primary transition-colors duration-300 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-white/80 text-sm lg:text-base line-clamp-2 mb-4">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-white/70 text-sm">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {article.published_at && format(new Date(article.published_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
              
              {/* Static container for aspect ratio */}
              <div className="aspect-[16/10] pointer-events-none" />
            </div>

            {/* Carousel Controls */}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between">
              {/* Slide Indicators */}
              <div className="flex items-center gap-2">
                {articles.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentSlide 
                        ? 'w-8 bg-white' 
                        : 'w-2 bg-white/40 hover:bg-white/60'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  aria-label={isPaused ? "Resume autoplay" : "Pause autoplay"}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={prevSlide}
                  className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextSlide}
                  className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {!isPaused && !isHovered && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-20">
                <div 
                  className="h-full bg-primary transition-none"
                  style={{
                    animation: 'progress 8s linear infinite',
                    width: '100%',
                  }}
                />
              </div>
            )}
          </div>

          {/* Side Articles */}
          <div className="flex flex-col gap-4">
            {sideArticles.map((article, index) => (
              <Link
                key={article.id}
                to={`/market-insights/${article.slug}`}
                className="group flex gap-5 p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-lg transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={article.featured_image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&q=80"}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    {article.is_trending && (
                      <Badge variant="outline" className="text-xs gap-1 text-destructive border-destructive/30 px-2 py-0.5">
                        <TrendingUp className="w-3 h-3" />
                        Trending
                      </Badge>
                    )}
                    {article.categories?.[0] && (
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        {CATEGORY_LABELS[article.categories[0]] || article.categories[0]}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2 mb-2 text-base">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-3 text-muted-foreground text-xs">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {article.published_at && format(new Date(article.published_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}

            {/* Live Stats Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping" />
                </div>
                <span className="text-sm font-medium text-foreground">Live Updates</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                View counts refresh every 3 seconds
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for progress animation */}
      <style>{`
        @keyframes progress {
          from { transform: scaleX(0); transform-origin: left; }
          to { transform: scaleX(1); transform-origin: left; }
        }
      `}</style>
    </section>
  );
};

export default MarketInsightsSection;
