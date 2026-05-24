import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin, Phone, Mail, ExternalLink, CheckCircle, Search, Filter, Loader2, Building2, BadgeCheck, Clock, Globe, Briefcase } from "lucide-react";
import { getOpenStatus } from "@/lib/businessHours";
import { CertificationBadge } from "@/components/CertificationBadge";

interface Business {
  id: string;
  name: string;
  description: string | null;
  full_description: string | null;
  address: string;
  city: string;
  website: string | null;
  phone?: string | null;
  email?: string | null;
  hours: string | null;
  certifications: string[] | null;
  images: string[] | null;
  subscription_plan: string;
  is_verified: boolean;
  is_featured: boolean;
  rating: number | null;
  review_count: number | null;
  created_at: string | null;
  updated_at: string | null;
  certification_label?: string | null;
}

const categoryMeta: Record<string, { title: string; description: string }> = {
  "eco-builders": {
    title: "Certified Eco-Builders",
    description: "Homestar & Passive House certified builders committed to sustainable construction practices in Wellington.",
  },
  suppliers: {
    title: "Sustainable Material Suppliers",
    description: "Environmentally responsible suppliers of timber, insulation, roofing, and construction materials.",
  },
  architects: {
    title: "Green Architects & Designers",
    description: "Architects specializing in energy-efficient and environmentally conscious design in Wellington.",
  },
  renovation: {
    title: "Renovation & Retrofitting Specialists",
    description: "Experts in upgrading existing homes for better energy efficiency and sustainability.",
  },
};

const locations = ["All Locations", "Wellington City", "Lower Hutt", "Upper Hutt", "Porirua", "Kāpiti Coast"];

const neutralPlaceholder = "/placeholder.svg";

const Category = () => {
  const queryClient = useQueryClient();
  const { slug, subSlug } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all-locations");
  const [planFilter, setPlanFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("rating");
  
  // Track selected image index per listing (for click-to-preview)
  const [selectedImageIndex, setSelectedImageIndex] = useState<Record<string, number>>({});
  // Track hover preview image per listing
  const [hoverImageIndex, setHoverImageIndex] = useState<Record<string, number | null>>({});

  const meta = categoryMeta[slug || "eco-builders"] || categoryMeta["eco-builders"];
  const categorySlug = slug || "eco-builders";

  const { data: listings = [], isLoading: loading } = useQuery({
    queryKey: ["category-listings", categorySlug, locationFilter, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("businesses_public")
        .select("*")
        .eq("category", categorySlug as "eco-builders" | "suppliers" | "architects" | "renovation");

      // Location filter
      if (locationFilter && locationFilter !== "all-locations") {
        const cityName = locationFilter.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        query = query.eq("city", cityName);
      }

      // Sorting - featured/premium first, then by selected criteria
      if (sortBy === "rating") {
        query = query.order("is_featured", { ascending: false })
          .order("subscription_plan", { ascending: false })
          .order("rating", { ascending: false, nullsFirst: false });
      } else if (sortBy === "reviews") {
        query = query.order("is_featured", { ascending: false })
          .order("review_count", { ascending: false, nullsFirst: false });
      } else {
        query = query.order("is_featured", { ascending: false })
          .order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Business[];
    },
  });

  // Real-time subscription for category listings
  useEffect(() => {
    const channel = supabase
      .channel('category-listings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'businesses_public'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['category-listings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Apply client-side filters
  const filteredListings = listings.filter(listing => {
    // Search filter
    if (searchQuery !== "") {
      const query = searchQuery.toLowerCase();
      if (!listing.name.toLowerCase().includes(query) &&
          !listing.description?.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    // Plan filter
    if (planFilter !== "all") {
      if (planFilter === "premium" && listing.subscription_plan !== "premium" && listing.subscription_plan !== "elite") {
        return false;
      }
      if (planFilter === "elite" && listing.subscription_plan !== "elite") {
        return false;
      }
    }
    
    // Verified filter
    if (verifiedFilter === "verified" && !listing.is_verified) {
      return false;
    }
    
    return true;
  });

  // Get the currently displayed image for a listing (hover takes priority, then selected, then first)
  const getDisplayedImage = (listing: Business) => {
    const hoverIdx = hoverImageIndex[listing.id];
    const selectedIdx = selectedImageIndex[listing.id] ?? 0;
    const activeIdx = hoverIdx !== null && hoverIdx !== undefined ? hoverIdx : selectedIdx;
    
    if (listing.images && listing.images.length > 0 && listing.images[activeIdx]) {
      return listing.images[activeIdx];
    }
    if (listing.images && listing.images.length > 0) {
      return listing.images[0];
    }
    return neutralPlaceholder;
  };

  // Get the current active index for thumbnail highlighting
  const getActiveImageIndex = (listing: Business) => {
    const hoverIdx = hoverImageIndex[listing.id];
    if (hoverIdx !== null && hoverIdx !== undefined) return hoverIdx;
    return selectedImageIndex[listing.id] ?? 0;
  };

  const hasImage = (listing: Business) => listing.images && listing.images.length > 0;

  const isPremium = (plan: string) => plan === "premium" || plan === "elite";

  // Parse business hours and check if open
  const getBusinessStatus = (hoursString: string | null) => {
    if (!hoursString) return { isOpen: false, statusText: "Hours not listed" };
    
    const status = getOpenStatus(hoursString);
    return {
      isOpen: status.isOpen,
      statusText: status.isOpen ? "Open now" : (status.nextChange || "Closed"),
    };
  };

  // Format updated time
  const getLastUpdated = (updatedAt: string | null) => {
    if (!updatedAt) return null;
    const date = new Date(updatedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Updated today";
    if (diffDays === 1) return "Updated yesterday";
    if (diffDays < 7) return `Updated ${diffDays} days ago`;
    if (diffDays < 30) return `Updated ${Math.floor(diffDays / 7)} weeks ago`;
    return `Updated ${date.toLocaleDateString()}`;
  };

  return (
    <>
      <Helmet>
        <title>{meta.title} | Wellington EcoBuild</title>
        <meta name="description" content={meta.description} />
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="bg-gradient-to-br from-forest to-forest-light py-16 lg:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4 border-accent/50 text-accent">
                {subSlug ? subSlug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "Category"}
              </Badge>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
                {meta.title}
              </h1>
              <p className="text-primary-foreground/80 text-lg">
                {meta.description}
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-6 bg-muted border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px] max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search listings..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc.toLowerCase().replace(/ /g, "-")}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="premium">Premium+</SelectItem>
                  <SelectItem value="elite">Elite Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Top Rated</SelectItem>
                  <SelectItem value="reviews">Most Reviews</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Listings */}
        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-20">
                <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  No listings found
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || planFilter !== "all" || verifiedFilter !== "all" 
                    ? "Try adjusting your filters to see more results."
                    : "Be the first to apply for listing in this category."}
                </p>
                <div className="flex flex-col items-center">
                  <Button asChild>
                    <Link to="/list-business">Apply to Be Listed</Link>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    We only accept a limited number of verified builders per area.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6 text-muted-foreground">
                  Showing {filteredListings.length} result{filteredListings.length !== 1 ? "s" : ""}
                </div>

                <div className="grid gap-6">
                  {filteredListings.map((listing) => {
                    const businessStatus = getBusinessStatus(listing.hours);
                    const lastUpdated = getLastUpdated(listing.updated_at);
                    
                    return (
                      <Card 
                        key={listing.id} 
                        className="group hover:border-accent/50 hover:shadow-elegant transition-all duration-300 overflow-hidden"
                      >
                        <CardContent className="p-0">
                          <div className="flex flex-col lg:flex-row">
                            {/* Image */}
                            <div className="lg:w-80 h-56 lg:h-auto relative overflow-hidden bg-muted flex-shrink-0">
                              <Link to={`/business/${listing.id}`}>
                                {hasImage(listing) ? (
                                  <img
                                    src={getDisplayedImage(listing)}
                                    alt={listing.name}
                                    loading="lazy"
                                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = neutralPlaceholder;
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Building2 className="w-12 h-12 text-muted-foreground opacity-50" />
                                  </div>
                                )}
                              </Link>
                              {listing.is_featured && (
                                <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">
                                  Featured
                                </Badge>
                              )}
                              {/* Blue verified tick badge on image - premium/elite only */}
                              {isPremium(listing.subscription_plan) && (
                                <div className="absolute bottom-3 right-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                  <BadgeCheck className="w-5 h-5 text-white" />
                                </div>
                              )}
                              {/* Clickable gallery thumbnails if multiple images */}
                              {listing.images && listing.images.length > 1 && (
                                <div className="absolute bottom-3 left-3 flex gap-1">
                                  {listing.images.slice(0, 5).map((img, idx) => {
                                    const isActive = getActiveImageIndex(listing) === idx;
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setSelectedImageIndex(prev => ({ ...prev, [listing.id]: idx }));
                                        }}
                                        onMouseEnter={() => {
                                          setHoverImageIndex(prev => ({ ...prev, [listing.id]: idx }));
                                        }}
                                        onMouseLeave={() => {
                                          setHoverImageIndex(prev => ({ ...prev, [listing.id]: null }));
                                        }}
                                        className={`w-10 h-10 rounded overflow-hidden transition-all duration-200 ${
                                          isActive 
                                            ? 'ring-2 ring-accent ring-offset-1 scale-110 z-10' 
                                            : 'border-2 border-white shadow-sm hover:scale-105'
                                        }`}
                                        aria-label={`View image ${idx + 1}`}
                                      >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                      </button>
                                    );
                                  })}
                                  {listing.images.length > 5 && (
                                    <Link 
                                      to={`/business/${listing.id}`}
                                      className="w-10 h-10 rounded border-2 border-white shadow-sm bg-black/60 flex items-center justify-center text-white text-xs font-medium hover:bg-black/80 transition-colors"
                                    >
                                      +{listing.images.length - 5}
                                    </Link>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-6">
                              <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Link 
                                      to={`/business/${listing.id}`}
                                      className="font-display text-xl font-semibold text-foreground hover:text-accent transition-colors"
                                    >
                                      {listing.name}
                                    </Link>
                                    {/* Verified badge - paid plans only */}
                                    {listing.is_verified && isPremium(listing.subscription_plan) && (
                                      <CheckCircle className="w-5 h-5 text-accent" />
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {/* Verified Professional badge - paid plans only */}
                                    {isPremium(listing.subscription_plan) && (
                                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 py-0.5">
                                        <BadgeCheck className="w-3 h-3" />
                                        Verified Professional
                                      </Badge>
                                    )}
                                    {/* Certification Label - admin added */}
                                    {listing.certification_label && (
                                      <CertificationBadge label={listing.certification_label} size="sm" />
                                    )}
                                    {/* Open/Closed status */}
                                    <Badge 
                                      variant="outline" 
                                      className={businessStatus.isOpen 
                                        ? "border-green-500 text-green-600 bg-green-50" 
                                        : "border-muted-foreground/30 text-muted-foreground"
                                      }
                                    >
                                      <Clock className="w-3 h-3 mr-1" />
                                      {businessStatus.statusText}
                                    </Badge>
                                  </div>
                                  {/* Ratings - paid plans only */}
                                  {isPremium(listing.subscription_plan) ? (
                                    <div className="flex items-center gap-1 text-sm">
                                      <Star className="w-4 h-4 fill-accent text-accent" />
                                      <span className="font-medium text-foreground">
                                        {listing.rating ? Number(listing.rating).toFixed(1) : "New"}
                                      </span>
                                      <span className="text-muted-foreground">
                                        ({listing.review_count || 0} reviews)
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Basic Listing</span>
                                  )}
                                </div>
                                {/* Certifications - paid plans only */}
                                {isPremium(listing.subscription_plan) && listing.certifications && listing.certifications.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {listing.certifications.slice(0, 3).map((cert: string) => (
                                      <Badge key={cert} variant="secondary" className="text-xs">
                                        {cert}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <p className="text-muted-foreground mb-4 line-clamp-2">
                                {listing.description || "Sustainable construction services in the Wellington region."}
                              </p>

                              {/* Contact Details - visible for premium/elite */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{listing.address}, {listing.city}</span>
                                </div>
                                
                                {isPremium(listing.subscription_plan) && listing.phone && (
                                  <a 
                                    href={`tel:${listing.phone}`}
                                    className="flex items-center gap-2 text-sm text-foreground hover:text-accent transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Phone className="w-4 h-4 flex-shrink-0" />
                                    <span>{listing.phone}</span>
                                  </a>
                                )}
                                
                                {isPremium(listing.subscription_plan) && listing.email && (
                                  <a 
                                    href={`mailto:${listing.email}`}
                                    className="flex items-center gap-2 text-sm text-foreground hover:text-accent transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Mail className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">{listing.email}</span>
                                  </a>
                                )}
                                
                                {isPremium(listing.subscription_plan) && listing.website && (
                                  <a 
                                    href={listing.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-accent hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Globe className="w-4 h-4 flex-shrink-0" />
                                    <span>Visit Website</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>

                              {/* Action buttons and metadata */}
                              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
                                <div className="flex flex-wrap gap-2">
                                  <Button asChild size="sm">
                                    <Link to={`/business/${listing.id}`}>View Profile</Link>
                                  </Button>
                                  {isPremium(listing.subscription_plan) && listing.website && (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      asChild
                                    >
                                      <a href={listing.website} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        Website
                                      </a>
                                    </Button>
                                  )}
                                </div>
                                {lastUpdated && (
                                  <span className="text-xs text-muted-foreground">
                                    {lastUpdated}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Category;