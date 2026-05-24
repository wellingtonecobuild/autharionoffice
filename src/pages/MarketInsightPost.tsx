import { useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleCard } from "@/components/news/ArticleCard";
import AdSlot from "@/components/blog/AdSlot";
import SidebarAdSlot from "@/components/blog/SidebarAdSlot";
import { Calendar, User, Clock, ArrowLeft, Share2, Facebook, Twitter, Linkedin, ArrowRight, Hash, Play, AlertCircle, MapPin, ExternalLink, Info } from "lucide-react";
import EditorialTransparency from "@/components/insights/EditorialTransparency";
import { getLinkRelAttribute, isAffiliateLink, trackAffiliateLinkClick, contentHasAffiliateLinks } from "@/lib/affiliateUtils";
import { useAdsenseSettings } from "@/hooks/useAdsenseSettings";
import { useBlogViewTracker } from "@/hooks/useBlogViewTracker";
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

// Check if article is Wellington-specific
const isWellingtonScope = (locationScope?: string | null, categories?: BlogCategory[]): boolean => {
  if (locationScope === 'wellington') {
    return true;
  }
  return categories?.some(cat => cat === 'wellington_construction_news') || false;
};

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  video_url: string | null;
  image_caption: string | null;
  image_credit: string | null;
  categories: BlogCategory[];
  tags: string[] | null;
  author: string;
  views: number;
  ads_enabled: boolean;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string;
  location_scope: string | null;
  source_url: string | null;
  call_to_action: {
    text?: string;
    link?: string;
    label?: string;
  } | null;
}

const MarketInsightPost = () => {
  const { slug } = useParams();
  const { settings: adSettings, shouldShowAds } = useAdsenseSettings();

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["article", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data as Article | null;
    },
    enabled: !!slug,
  });

  // Real view tracking (5 second minimum, spam protection)
  useBlogViewTracker(article?.id);

  const { data: relatedArticles } = useQuery({
    queryKey: ["related-articles", article?.categories, article?.id],
    queryFn: async () => {
      if (!article?.categories?.length) return [];
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, featured_image, categories, tags, author, views, published_at")
        .eq("status", "published")
        .neq("id", article.id)
        .overlaps("categories", article.categories)
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!article,
  });

  const estimateReadTime = (content: string) => {
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = article?.title || "";

  const handleShare = (platform: string) => {
    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    };
    window.open(urls[platform], "_blank", "width=600,height=400");
  };

  const getVideoEmbedUrl = (url: string) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtu.be") 
        ? url.split("/").pop() 
        : url.split("v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("vimeo.com")) {
      const videoId = url.split("/").pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  // Check if article has affiliate links for disclosure
  const hasAffiliateLinks = useMemo(() => {
    return article ? contentHasAffiliateLinks(article.content) : false;
  }, [article]);

  // Check if content contains HTML tags
  const isHtmlContent = (content: string) => {
    return /<[a-z][\s\S]*>/i.test(content);
  };

  const renderContent = (content: string) => {
    // If content is HTML, sanitize and render it with proper styling
    if (isHtmlContent(content)) {
      // Sanitize HTML content to prevent XSS attacks
      const sanitizedContent = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
          'img', 'figure', 'figcaption', 'div', 'span', 'table', 'thead',
          'tbody', 'tr', 'th', 'td', 'hr', 'sub', 'sup', 'mark'
        ],
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel',
          'width', 'height', 'loading', 'decoding'
        ],
        ALLOW_DATA_ATTR: false,
        ADD_ATTR: ['target', 'rel'],
        FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button', 'object', 'embed'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
      });

      return (
        <div 
          className="prose prose-lg max-w-none 
            prose-headings:font-display prose-headings:text-foreground prose-headings:font-bold
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-2
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4
            prose-li:text-muted-foreground prose-li:mb-2
            prose-ul:list-disc prose-ul:ml-6 prose-ul:my-4
            prose-ol:list-decimal prose-ol:ml-6 prose-ol:my-4
            prose-strong:text-foreground prose-strong:font-semibold
            prose-a:text-accent prose-a:hover:underline
            prose-blockquote:border-l-4 prose-blockquote:border-accent prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      );
    }

    // Fallback to markdown-style parsing
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let paragraphCount = 0;

    lines.forEach((line, i) => {
      // Headings
      if (line.startsWith("#### ")) {
        elements.push(<h4 key={i} className="text-lg font-semibold mt-6 mb-2 text-foreground">{line.replace("#### ", "")}</h4>);
        return;
      }
      if (line.startsWith("### ")) {
        elements.push(<h3 key={i} className="text-xl font-semibold mt-8 mb-3 text-foreground">{line.replace("### ", "")}</h3>);
        return;
      }
      if (line.startsWith("## ")) {
        elements.push(<h2 key={i} className="text-2xl font-semibold mt-10 mb-4 text-foreground">{line.replace("## ", "")}</h2>);
        return;
      }
      
      // Block quote
      if (line.startsWith("> ")) {
        elements.push(
          <blockquote key={i} className="border-l-4 border-accent pl-4 my-6 italic text-muted-foreground">
            {line.replace("> ", "")}
          </blockquote>
        );
        return;
      }
      
      // Lists
      if (line.startsWith("- ")) {
        elements.push(<li key={i} className="ml-6 mb-2 text-muted-foreground list-disc">{line.replace("- ", "")}</li>);
        return;
      }
      if (line.match(/^\d+\. /)) {
        elements.push(<li key={i} className="ml-6 mb-2 text-muted-foreground list-decimal">{line.replace(/^\d+\. /, "")}</li>);
        return;
      }
      
      // Bold text
      if (line.startsWith("**") && line.endsWith("**")) {
        elements.push(<p key={i} className="font-semibold mb-4 text-foreground">{line.replace(/\*\*/g, "")}</p>);
        paragraphCount++;
        return;
      }
      
      // Regular paragraph
      if (line.trim()) {
        // Handle inline links [text](url) with proper affiliate attributes
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;
        
        while ((match = linkRegex.exec(line)) !== null) {
          if (match.index > lastIndex) {
            parts.push(line.slice(lastIndex, match.index));
          }
          
          const linkUrl = match[2];
          const linkText = match[1];
          const isExternal = linkUrl.startsWith("http");
          const isAffiliate = isAffiliateLink(linkUrl);
          
          parts.push(
            <a 
              key={`link-${i}-${match.index}`}
              href={linkUrl} 
              className={`text-accent hover:underline ${isAffiliate ? "affiliate-link" : ""}`}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? getLinkRelAttribute(linkUrl) : undefined}
              onClick={isAffiliate ? () => trackAffiliateLinkClick(linkUrl, article?.title) : undefined}
              data-affiliate={isAffiliate ? "true" : undefined}
            >
              {linkText}
              {isAffiliate && <span className="sr-only"> (affiliate link)</span>}
            </a>
          );
          lastIndex = match.index + match[0].length;
        }
        
        if (lastIndex < line.length) {
          parts.push(line.slice(lastIndex));
        }
        
        elements.push(<p key={i} className="mb-4 text-muted-foreground leading-relaxed">{parts.length > 0 ? parts : line}</p>);
        paragraphCount++;

        // Insert ad slot based on admin settings
        const articleAdsEnabled = article?.ads_enabled !== false;
        const canShowAds = shouldShowAds(articleAdsEnabled) && adSettings.adsense_ad_positions?.mid_article;
        const adFrequency = adSettings.ad_frequency_paragraphs || 5;
        const maxAds = adSettings.adsense_max_ads_per_page || 3;
        const currentAdCount = Math.floor(paragraphCount / adFrequency);
        
        if (canShowAds && paragraphCount > 0 && paragraphCount % adFrequency === 0 && currentAdCount <= maxAds) {
          elements.push(
            <div key={`ad-${paragraphCount}`} className="my-8">
              <AdSlot 
                adSlot={`article-inline-${currentAdCount}`}
                adFormat="horizontal"
                position="mid_article"
                articleAdsEnabled={articleAdsEnabled}
              />
            </div>
          );
        }
      }
    });

    return elements;
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="pt-20 lg:pt-24">
          <Skeleton className="h-64 lg:h-96 w-full" />
          <div className="container mx-auto px-4 max-w-3xl py-12">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-12 w-full mb-6" />
            <Skeleton className="h-4 w-64 mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !article) {
    return (
      <>
        <Header />
        <main className="pt-20 lg:pt-24 min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Insight Not Found</h1>
            <p className="text-muted-foreground mb-6">The market insight you're looking for doesn't exist or has been removed.</p>
            <Link to="/market-insights" className="text-accent hover:underline">
              ← Back to Market Insights
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "description": article.meta_description || article.excerpt,
    "image": article.featured_image ? [article.featured_image] : [],
    "author": {
      "@type": "Organization",
      "name": article.author,
      "url": "https://wellingtonecobuild.nz"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Wellington EcoBuild",
      "url": "https://wellingtonecobuild.nz",
      "logo": {
        "@type": "ImageObject",
        "url": "https://wellingtonecobuild.nz/images/wellington-ecobuild-logo.png"
      }
    },
    "datePublished": article.published_at,
    "dateModified": article.published_at,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://wellingtonecobuild.nz/market-insights/${article.slug}`
    },
    "keywords": article.tags?.join(", ") || "",
    "articleSection": article.categories?.map(c => CATEGORY_LABELS[c]).join(", ") || "Construction News",
    "inLanguage": "en-NZ",
    "isAccessibleForFree": true
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://wellingtonecobuild.nz"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Market Insights",
        "item": "https://wellingtonecobuild.nz/market-insights"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": article.title,
        "item": `https://wellingtonecobuild.nz/market-insights/${article.slug}`
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>{article.meta_title || article.title} | Wellington EcoBuild</title>
        <meta name="description" content={article.meta_description || article.excerpt} />
        <meta name="keywords" content={article.tags?.join(", ") || "Wellington construction, building, renovation"} />
        <meta name="author" content={article.author} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="bingbot" content="index, follow" />
        
        {/* Open Graph */}
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.meta_description || article.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://wellingtonecobuild.nz/market-insights/${article.slug}`} />
        <meta property="og:image" content={article.featured_image || "https://wellingtonecobuild.nz/images/wellington-ecobuild-logo.png"} />
        <meta property="og:image:alt" content={article.title} />
        <meta property="og:site_name" content="Wellington EcoBuild" />
        <meta property="og:locale" content="en_NZ" />
        <meta property="article:published_time" content={article.published_at} />
        <meta property="article:author" content={article.author} />
        <meta property="article:section" content={article.categories?.[0] ? CATEGORY_LABELS[article.categories[0]] : "Construction News"} />
        {article.tags?.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.meta_description || article.excerpt} />
        <meta name="twitter:image" content={article.featured_image || "https://wellingtonecobuild.nz/images/wellington-ecobuild-logo.png"} />
        
        {/* Canonical */}
        <link rel="canonical" href={`https://wellingtonecobuild.nz/market-insights/${article.slug}`} />
        
        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbData)}</script>
        
        {/* Google AdSense - only on blog posts */}
        <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9272188045746670"
          crossOrigin="anonymous"
        />
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero Image or Video */}
        <div className="h-64 lg:h-[28rem] relative">
          {article.video_url ? (
            <div className="w-full h-full">
              <iframe
                src={getVideoEmbedUrl(article.video_url)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={article.title}
              />
            </div>
          ) : article.featured_image ? (
            <>
              <img
                src={article.featured_image}
                alt={article.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
          
          {article.image_caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-4 py-2">
              <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
                {article.image_caption}
                {article.image_credit && <span className="text-accent"> — {article.image_credit}</span>}
              </p>
            </div>
          )}
        </div>

        {/* Content with Sidebar */}
        <article className="py-12 lg:py-16">
          <div className="container mx-auto px-4">
            <div className="flex gap-8">
              {/* Main Content */}
              <div className="flex-1 max-w-3xl">
            <Link to="/market-insights" className="inline-flex items-center gap-2 text-muted-foreground hover:text-accent mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Market Insights
            </Link>

            <div className="flex flex-wrap gap-2 mb-4">
              {/* Wellington badge - only show for Wellington articles */}
              {isWellingtonScope(article.location_scope, article.categories) && (
                <Badge 
                  variant="outline" 
                  className="text-accent border-accent/50 gap-1"
                >
                  <MapPin className="w-3 h-3" />
                  Wellington
                </Badge>
              )}
              {article.categories.map((cat) => (
                <Badge key={cat} variant="secondary">
                  {CATEGORY_LABELS[cat]}
                </Badge>
              ))}
            </div>

            <h1 className="font-display text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground mb-6 leading-tight">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b border-border">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {article.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {format(new Date(article.published_at), "MMMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {estimateReadTime(article.content)}
              </span>
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {article.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/tag/${encodeURIComponent(tag.replace(/\s+/g, "-"))}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent/10 text-accent rounded-full text-sm hover:bg-accent/20 transition-colors"
                  >
                    <Hash className="w-3 h-3" />
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Affiliate Disclosure */}
            {hasAffiliateLinks && (
              <div className="mb-6 p-4 bg-muted/50 border border-border rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  <strong>Disclosure:</strong> This article contains affiliate links. We may earn a small commission if you make a purchase through these links, at no extra cost to you. This helps support our content. 
                  <Link to="/legal?tab=terms" className="text-accent hover:underline ml-1">Learn more</Link>
                </p>
              </div>
            )}

            {/* Top Ad Slot */}
            {shouldShowAds(article?.ads_enabled) && adSettings.adsense_ad_positions?.after_first_paragraph && (
              <div className="mb-8">
                <AdSlot adSlot="article-top" adFormat="horizontal" position="after_first_paragraph" articleAdsEnabled={article?.ads_enabled} />
              </div>
            )}

            {/* External Source Attribution */}
            {article.source_url && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-blue-900 dark:text-blue-100">
                      <strong>Source:</strong>{" "}
                      <a 
                        href={article.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        View Original Article
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Article Body */}
            <div className="prose prose-lg max-w-none">
              {renderContent(article.content)}
            </div>

            {/* Bottom Ad Slot */}
            {shouldShowAds(article?.ads_enabled) && adSettings.adsense_ad_positions?.end_of_article && (
              <div className="mt-8">
                <AdSlot adSlot="article-bottom" adFormat="rectangle" position="end_of_article" articleAdsEnabled={article?.ads_enabled} />
              </div>
            )}

            {/* Custom CTA */}
            {article.call_to_action && article.call_to_action.text && (
              <div className="mt-12 p-6 bg-accent/10 rounded-xl border border-accent/20">
                <p className="text-foreground mb-4">{article.call_to_action.text}</p>
                {article.call_to_action.link && (
                  <Link
                    to={article.call_to_action.link}
                    className="inline-flex items-center gap-2 text-accent font-medium hover:underline"
                  >
                    {article.call_to_action.label || "Learn More"}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            )}

            {/* Share */}
            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share this article
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleShare("facebook")} aria-label="Share on Facebook">
                    <Facebook className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleShare("twitter")} aria-label="Share on Twitter">
                    <Twitter className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleShare("linkedin")} aria-label="Share on LinkedIn">
                    <Linkedin className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Default CTA */}
            {!article.call_to_action?.text && (
              <div className="mt-12 p-6 bg-gradient-to-br from-forest to-forest-light rounded-xl text-primary-foreground">
                <h3 className="font-display text-xl font-semibold mb-2">Looking for Sustainable Builders?</h3>
                <p className="text-primary-foreground/80 mb-4">Connect with verified eco-friendly construction professionals in Wellington.</p>
                <Link
                  to="/category/eco-builders"
                  className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
                >
                  Browse Suppliers
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Editorial Transparency - Always shown */}
            <EditorialTransparency />
              </div>
              
              {/* Sidebar Ads (Desktop) */}
              <SidebarAdSlot articleAdsEnabled={article?.ads_enabled} />
            </div>
          </div>
        </article>

        {/* Related Articles */}
        {relatedArticles && relatedArticles.length > 0 && (
          <section className="py-12 bg-muted">
            <div className="container mx-auto px-4">
              <h2 className="font-display text-2xl font-bold mb-8">Related Articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedArticles.map((related: any) => (
                  <ArticleCard key={related.id} article={related} variant="compact" />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
};

export default MarketInsightPost;
