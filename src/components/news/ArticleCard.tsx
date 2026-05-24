import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Star, Hash, MapPin } from "lucide-react";
import { format } from "date-fns";

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

const CATEGORY_LABELS: Record<BlogCategory, string> = {
  wellington_construction_news: "Wellington Insights",
  sustainable_building: "Sustainable Building",
  supplier_updates: "Supplier Updates",
  projects_developments: "Projects",
  renovation_retrofit: "Renovation",
  regulations_compliance: "Regulations",
  market_trends: "Market Trends",
  eco_building_education: "Education",
  construction_opportunities: "Construction Opportunities",
  construction_finance: "Finance & Investment",
  design_architecture: "Design & Architecture",
  technology_innovation: "Technology & Innovation",
  health_safety_compliance: "Health, Safety & Compliance",
  sustainability_standards: "Sustainability Standards",
  industry_insights: "Industry Insights",
};

// Wellington-specific categories
const WELLINGTON_CATEGORIES: BlogCategory[] = ["wellington_construction_news"];

// Determine if article is Wellington-specific
const isWellingtonScope = (locationScope?: string | null, categories?: BlogCategory[]): boolean => {
  // If explicit location_scope is set, use it
  if (locationScope === 'wellington') {
    return true;
  }
  // Fall back to category inference for backwards compatibility
  return categories?.some(cat => cat === 'wellington_construction_news') || false;
};

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    featured_image: string | null;
    categories: BlogCategory[];
    tags?: string[] | null;
    author: string;
    is_featured?: boolean;
    is_trending?: boolean;
    views: number;
    published_at: string;
    location_scope?: string | null;
  };
  variant?: "default" | "featured" | "compact";
  showTags?: boolean;
}

export const ArticleCard = ({ article, variant = "default", showTags = false }: ArticleCardProps) => {
  const estimateReadTime = (excerpt: string) => {
    const words = excerpt.split(" ").length * 5;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  const isWellington = isWellingtonScope(article.location_scope, article.categories);

  if (variant === "featured") {
    return (
      <Link to={`/blog/${article.slug}`} className="group block">
        <article className="grid md:grid-cols-2 gap-8 items-center bg-card rounded-2xl border border-border hover:border-accent/50 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden will-change-transform">
          <div className="h-64 md:h-96 overflow-hidden relative">
            {article.featured_image ? (
              <img
                src={article.featured_image}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-muted-foreground">No image</span>
              </div>
            )}
            {article.is_featured && (
              <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground shadow-lg">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
          </div>
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap gap-2 mb-4">
              {/* Wellington badge - only show for Wellington articles */}
              {isWellington && (
                <Badge 
                  variant="outline" 
                  className="text-accent border-accent/50 gap-1"
                >
                  <MapPin className="w-3 h-3" />
                  Wellington
                </Badge>
              )}
              {article.categories.slice(0, 2).map((cat) => (
                <Badge key={cat} variant="secondary">
                  {CATEGORY_LABELS[cat]}
                </Badge>
              ))}
            </div>
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4 group-hover:text-accent transition-colors duration-300">
              {article.title}
            </h2>
            <p className="text-muted-foreground mb-6 line-clamp-3 leading-relaxed">{article.excerpt}</p>
            
            {showTags && article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {article.tags.slice(0, 3).map((tag) => (
                  <Link
                    key={tag}
                    to={`/tag/${encodeURIComponent(tag.replace(/\s+/g, "-"))}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent text-xs rounded-full hover:bg-accent/20 transition-colors duration-200"
                  >
                    <Hash className="w-3 h-3" />
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="font-medium">{article.author}</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {format(new Date(article.published_at), "MMMM d, yyyy")}
              </span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link to={`/blog/${article.slug}`} className="group flex gap-4 py-4 border-b border-border last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors duration-200">
        <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden shadow-sm">
          {article.featured_image ? (
            <img
              src={article.featured_image}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="font-medium text-foreground group-hover:text-accent transition-colors duration-200 line-clamp-2 text-sm leading-snug">
            {article.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-1.5">
            {format(new Date(article.published_at), "MMM d, yyyy")}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/blog/${article.slug}`} className="group block">
      <article className="bg-card rounded-2xl border border-border hover:border-accent/50 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden h-full will-change-transform">
        <div className="h-48 overflow-hidden relative">
          {article.featured_image ? (
            <img
              src={article.featured_image}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No image</span>
            </div>
          )}
          {article.is_trending && (
            <Badge className="absolute top-3 right-3 bg-accent/90 text-accent-foreground shadow-lg">
              <TrendingUp className="w-3 h-3 mr-1" />
              Trending
            </Badge>
          )}
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {/* Wellington badge - only show for Wellington articles */}
            {isWellington && (
              <Badge 
                variant="outline" 
                className="text-xs text-accent border-accent/50 gap-0.5"
              >
                <MapPin className="w-2.5 h-2.5" />
                Wellington
              </Badge>
            )}
            {article.categories.slice(0, 1).map((cat) => (
              <Badge key={cat} variant="secondary" className="text-xs">
                {CATEGORY_LABELS[cat]}
              </Badge>
            ))}
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-2 group-hover:text-accent transition-colors duration-200 line-clamp-2">
            {article.title}
          </h3>
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed">
            {article.excerpt}
          </p>
          
          {showTags && article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {article.tags.slice(0, 2).map((tag) => (
                <Link
                  key={tag}
                  to={`/tag/${encodeURIComponent(tag.replace(/\s+/g, "-"))}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-0.5 text-xs text-accent hover:underline"
                >
                  <Hash className="w-3 h-3" />
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <div className="flex items-center text-xs text-muted-foreground pt-2 border-t border-border/50">
            <span>{format(new Date(article.published_at), "MMM d, yyyy")}</span>
          </div>
        </div>
      </article>
    </Link>
  );
};
