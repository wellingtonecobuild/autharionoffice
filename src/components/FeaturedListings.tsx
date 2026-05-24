import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, BadgeCheck, Loader2, ChevronLeft, ChevronRight, Crown, Sparkles, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Business {
  id: string;
  name: string;
  category: string;
  city: string;
  rating: number | null;
  review_count: number | null;
  images: string[] | null;
  certifications: string[] | null;
  is_verified: boolean;
  is_featured: boolean;
  subscription_plan: string;
}

const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
  "eco-builders": { label: "Certified Eco-Builder", icon: "🏗️", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "suppliers": { label: "Sustainable Supplier", icon: "🧱", color: "bg-blue-50 text-blue-700 border-blue-200" },
  "architects": { label: "Green Architect", icon: "📐", color: "bg-violet-50 text-violet-700 border-violet-200" },
  "renovation": { label: "Retrofit Specialist", icon: "🔧", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

const neutralPlaceholder = "/placeholder.svg";

const FeaturedListings = () => {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const itemsPerPage = 4;

  const { data: allBusinesses = [], isLoading: loading } = useQuery({
    queryKey: ['featured-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses_public")
        .select("id, name, category, city, rating, review_count, images, certifications, is_verified, is_featured, subscription_plan")
        .or("is_featured.eq.true,subscription_plan.in.(premium,elite)")
        .order("is_featured", { ascending: false })
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(12);

      if (error) throw error;
      return (data || []) as Business[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('featured-listings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'businesses_public' },
        () => queryClient.invalidateQueries({ queryKey: ['featured-listings'] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    if (!isAutoPlaying || allBusinesses.length <= itemsPerPage) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const maxIndex = Math.max(0, allBusinesses.length - itemsPerPage);
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, allBusinesses.length]);

  const getImage = (business: Business) => {
    if (business.images && business.images.length > 0) return business.images[0];
    return neutralPlaceholder;
  };

  const hasImage = (business: Business) => business.images && business.images.length > 0;

  const handlePrev = useCallback(() => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setIsAutoPlaying(false);
    const maxIndex = Math.max(0, allBusinesses.length - itemsPerPage);
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  }, [allBusinesses.length]);

  const displayBusinesses = allBusinesses.slice(currentIndex, currentIndex + itemsPerPage);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < allBusinesses.length - itemsPerPage;

  return (
    <section className="section-padding bg-muted/20 relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/[0.02] rounded-full blur-[100px]" />
      
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            <div className="pill-premium mb-6 inline-flex">
              <Sparkles className="w-4 h-4" />
              Featured Businesses
            </div>
            <h2 className="font-display text-foreground mb-4">
              Top-Rated in Wellington
            </h2>
            <p className="text-body-large">
              Verified professionals with proven track records in sustainable construction.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {allBusinesses.length > itemsPerPage && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrev}
                  disabled={!canGoPrev}
                  className="rounded-full h-12 w-12 border-border/60 hover:border-accent hover:bg-accent/5"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="rounded-full h-12 w-12 border-border/60 hover:border-accent hover:bg-accent/5"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}
            <Button variant="outline" asChild className="ml-2 h-12 rounded-xl border-border/60">
              <Link to="/category/eco-builders">View All Listings</Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : displayBusinesses.length === 0 ? (
          <div className="text-center py-24 card-premium">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground mb-6 text-lg">
              No featured businesses yet. Be the first to get featured.
            </p>
            <Button variant="premium" asChild className="rounded-xl">
              <Link to="/list-business">Apply for Premium Listing</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayBusinesses.map((business, index) => (
                <Link
                  key={business.id}
                  to={`/business/${business.id}`}
                  className="group card-premium overflow-hidden animate-fade-up"
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {hasImage(business) ? (
                      <img
                        src={getImage(business)}
                        alt={business.name}
                        loading="lazy"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = neutralPlaceholder;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-secondary/70 via-secondary/20 to-transparent" />
                    
                    {/* Verified badge */}
                    {(business.subscription_plan === 'premium' || business.subscription_plan === 'elite') && (
                      <div className="absolute bottom-3 right-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                        <BadgeCheck className="w-5 h-5 text-white" />
                      </div>
                    )}
                    
                    {/* Elite crown */}
                    {business.is_featured && (
                      <div className="absolute top-3 right-3 w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="font-display text-lg font-bold text-foreground group-hover:text-accent transition-colors duration-300 line-clamp-1 mb-2">
                      {business.name}
                    </h3>
                    
                    {/* Category Badge */}
                    <div className="mb-4">
                      <Badge 
                        className={`${categoryConfig[business.category]?.color || 'bg-muted text-muted-foreground'} border text-xs font-medium py-1 px-2.5`}
                      >
                        <span className="mr-1">{categoryConfig[business.category]?.icon || '🏢'}</span>
                        {categoryConfig[business.category]?.label || business.category.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </div>
                    
                    {/* Verified Professional Badge */}
                    {(business.subscription_plan === 'premium' || business.subscription_plan === 'elite') && (
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 py-0.5 mb-4">
                        <BadgeCheck className="w-3 h-3" />
                        Verified Professional
                      </Badge>
                    )}

                    {/* Location & Rating */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {business.city}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-semibold text-foreground">
                          {business.rating ? Number(business.rating).toFixed(1) : "New"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({business.review_count || 0})
                        </span>
                      </div>
                    </div>

                    {/* Certifications */}
                    {business.certifications && business.certifications.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {business.certifications.slice(0, 2).map((cert) => (
                          <Badge key={cert} variant="category" className="text-xs">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            
            {/* Pagination dots */}
            {allBusinesses.length > itemsPerPage && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: Math.ceil(allBusinesses.length / itemsPerPage) }).map((_, idx) => {
                  const isActive = Math.floor(currentIndex / itemsPerPage) === idx || 
                    (currentIndex >= idx * itemsPerPage && currentIndex < (idx + 1) * itemsPerPage);
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsAutoPlaying(false);
                        setCurrentIndex(idx * itemsPerPage);
                      }}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isActive 
                          ? 'bg-accent w-10' 
                          : 'bg-muted-foreground/20 hover:bg-muted-foreground/40 w-2'
                      }`}
                      aria-label={`Go to page ${idx + 1}`}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Loss Aversion CTA */}
        <div className="mt-24 text-center animate-fade-up">
          <div className="inline-block card-premium p-10 lg:p-12 max-w-2xl">
            <Sparkles className="w-8 h-8 text-accent mx-auto mb-4" />
            <h3 className="font-display text-2xl font-bold text-foreground mb-4">
              Your Competitors Are Already Here
            </h3>
            <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
              Premium and Elite listings get 5x more visibility. Limited spots available in each category.
            </p>
            <Button variant="premium" size="lg" asChild className="rounded-xl shadow-premium">
              <Link to="/pricing">
                Apply for Premium Listing
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedListings;
