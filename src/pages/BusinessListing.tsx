import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { normalizeWebsiteUrl, displayWebsiteUrl } from "@/lib/validation";
import { getOpenStatus, formatOpenStatus } from "@/lib/businessHours";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useGetPlanFeatures } from "@/hooks/useSubscriptionFeatures";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReviewForm from "@/components/ReviewForm";
import ReviewsList from "@/components/reviews/ReviewsList";
import EmailRevealButton from "@/components/security/EmailRevealButton";
import LeadContactForm from "@/components/LeadContactForm";
import { BookingForm, BuilderAvailability } from "@/components/project-tracking";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { ImageComparisonSlider } from "@/components/ui/image-comparison-slider";
import { FullscreenComparison } from "@/components/ui/fullscreen-comparison";
import { 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  ExternalLink, 
  CheckCircle, 
  Clock, 
  ArrowLeft, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Loader2, 
  Building2, 
  Briefcase, 
  Leaf,
  Globe,
  Lock,
  Sparkles,
  Expand,
  BadgeCheck,
  Settings,
  Crown
} from "lucide-react";
import { Json } from "@/integrations/supabase/types";
import { CertificationBadge } from "@/components/CertificationBadge";

interface Business {
  id: string;
  name: string;
  description: string | null;
  full_description: string | null;
  category: string;
  address: string;
  city: string;
  phone?: string | null;
  email?: string | null;
  website: string | null;
  social_links: Json | null;
  certifications: string[] | null;
  materials: string[] | null;
  hours: string | null;
  images: string[] | null;
  subscription_plan: string;
  is_verified: boolean;
  rating: number | null;
  review_count: number | null;
  owner_id?: string;
  certification_label?: string | null;
}

interface Job {
  id: string;
  title: string;
  location: string;
  job_type: string;
  summary: string;
  sustainability_relevance: string | null;
  expires_at: string;
  created_at: string;
}

// Neutral placeholder for businesses without images
const neutralPlaceholder = "/placeholder.svg";

const categoryLabels: Record<string, string> = {
  'eco-builders': 'Eco Builder',
  'suppliers': 'Supplier',
  'architects': 'Architect',
  'renovation': 'Renovation',
};

const BusinessListing = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [fullscreenComparisonOpen, setFullscreenComparisonOpen] = useState(false);
  const [fullscreenComparisonIndex, setFullscreenComparisonIndex] = useState(0);

  // Get plan features from database (centralized source of truth)
  const { features: planFeatures } = useGetPlanFeatures(business?.subscription_plan || 'free');
  
  // Feature visibility from database
  const showPhone = planFeatures.show_phone;
  const showEmail = planFeatures.show_email;
  const showWebsite = planFeatures.show_website;
  const showReviews = planFeatures.show_reviews;
  const showVerifiedBadge = planFeatures.show_verified_badge;
  const canPostJobs = planFeatures.job_postings !== 0;
  
  // Legacy compatibility - isPaidPlan for backwards compatibility with existing UI
  const isPaidPlan = showPhone || showEmail || showWebsite;

  // Calculate open/closed status dynamically based on NZ timezone
  const openStatus = useMemo(() => {
    if (!business?.hours) return null;
    return getOpenStatus(business.hours);
  }, [business?.hours]);
  
  const formattedStatus = useMemo(() => {
    if (!openStatus) return null;
    return formatOpenStatus(openStatus);
  }, [openStatus]);

  useEffect(() => {
    if (id) {
      fetchBusiness();
      fetchJobs();
    }
  }, [id]);

  // Real-time subscription for business, reviews, and jobs
  useEffect(() => {
    if (!id) return;

    const businessChannel = supabase
      .channel(`business-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'businesses_public',
          filter: `id=eq.${id}`
        },
        () => {
          fetchBusiness();
        }
      )
      .subscribe();

    const reviewsChannel = supabase
      .channel(`business-reviews-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
          filter: `business_id=eq.${id}`
        },
        () => {
          fetchBusiness(); // Refetch to update rating
        }
      )
      .subscribe();

    const jobsChannel = supabase
      .channel(`business-jobs-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `business_id=eq.${id}`
        },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(businessChannel);
      supabase.removeChannel(reviewsChannel);
      supabase.removeChannel(jobsChannel);
    };
  }, [id]);

  const fetchJobs = async () => {
    try {
      const { data } = await supabase
        .from("jobs")
        .select("id, title, location, job_type, summary, sustainability_relevance, expires_at, created_at")
        .eq("business_id", id)
        .eq("status", "approved")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(5);
      
      setJobs(data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  const fetchBusiness = async () => {
    try {
      // Use businesses_public for public access - contact info is protected
      const { data, error } = await supabase
        .from("businesses_public")
        .select("id, name, description, full_description, category, address, city, website, social_links, certifications, materials, hours, images, subscription_plan, is_verified, rating, review_count, certification_label")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        let businessData = data as Business;
        
        // Check if this is a paid plan (premium or elite)
        const isPaidSubscription = data.subscription_plan === 'premium' || data.subscription_plan === 'elite';
        
        // For premium/elite plans, contact info is PUBLIC - fetch regardless of login status
        // For free plans, contact info stays hidden
        if (isPaidSubscription) {
          const { data: extraData } = await supabase
            .from("businesses")
            .select("phone, email, owner_id")
            .eq("id", id)
            .maybeSingle();
          if (extraData) {
            businessData = { 
              ...businessData, 
              owner_id: extraData.owner_id,
              phone: extraData.phone,
              email: extraData.email
            };
          }
        } else if (user) {
          // For free plan, only fetch owner_id if user is logged in (for edit button)
          const { data: extraData } = await supabase
            .from("businesses")
            .select("owner_id")
            .eq("id", id)
            .maybeSingle();
          if (extraData) {
            businessData = { ...businessData, owner_id: extraData.owner_id };
          }
        }
        
        setBusiness(businessData);
      } else {
        setBusiness(null);
      }
    } catch (error) {
      console.error("Error fetching business:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSocialLinks = (): Record<string, string> => {
    if (!business?.social_links) return {};
    if (typeof business.social_links === 'object' && !Array.isArray(business.social_links)) {
      return business.social_links as Record<string, string>;
    }
    return {};
  };

  const getLogo = (): string | null => {
    const socialLinks = getSocialLinks();
    return socialLinks.logo || null;
  };

  const getBeforeAfterPairs = (): { id: string; beforeImageUrl: string; afterImageUrl: string; title?: string; description?: string; label?: string }[] => {
    const socialLinks = getSocialLinks();
    if (socialLinks.beforeAfterPairs && Array.isArray(socialLinks.beforeAfterPairs)) {
      return socialLinks.beforeAfterPairs;
    }
    return [];
  };

  const getImages = () => {
    // Show uploaded images for ALL plans, use neutral placeholder only when no images
    if (business?.images && business.images.length > 0) {
      return business.images;
    }
    return [neutralPlaceholder];
  };

  const hasImages = business?.images && business.images.length > 0;

  const getWebsiteUrl = (url: string) => {
    return normalizeWebsiteUrl(url) || '#';
  };

  const getGoogleMapsUrl = () => {
    if (!business) return '';
    const address = encodeURIComponent(`${business.address}, ${business.city}, New Zealand`);
    return `https://www.google.com/maps/search/?api=1&query=${address}`;
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="pt-20 lg:pt-24 min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </main>
        <Footer />
      </>
    );
  }

  if (!business) {
    return (
      <>
        <Header />
        <main className="pt-20 lg:pt-24 min-h-screen">
          <div className="container mx-auto px-4 py-20 text-center">
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              Business not found
            </h1>
            <p className="text-muted-foreground mb-6">
              This listing may have been removed or doesn't exist.
            </p>
            <Button asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const images = getImages();
  const socialLinks = getSocialLinks();
  const logo = getLogo();
  const beforeAfterPairs = getBeforeAfterPairs();

  return (
    <>
      <Helmet>
        <title>{business.name} | Wellington EcoBuild</title>
        <meta name="description" content={business.description || `${business.name} - Sustainable construction in Wellington`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: business.name,
            description: business.description,
            address: {
              "@type": "PostalAddress",
              streetAddress: business.address,
              addressLocality: business.city,
            },
            telephone: business.phone,
            email: isPaidPlan ? business.email : undefined,
            url: isPaidPlan ? business.website : undefined,
            aggregateRating: business.rating && isPaidPlan ? {
              "@type": "AggregateRating",
              ratingValue: business.rating,
              reviewCount: business.review_count || 0,
            } : undefined,
          })}
        </script>
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Breadcrumb */}
        <div className="bg-muted py-4">
          <div className="container mx-auto px-4">
            <Link to={`/category/${business.category}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to {categoryLabels[business.category] || 'listings'}
            </Link>
          </div>
        </div>

        {/* Hero Image - Show uploaded images for all plans */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            {hasImages && images.length > 1 ? (
              // Multiple images: Show gallery with lightbox and progressive loading
              <div className="relative">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {images.slice(0, 4).map((img: string, i: number) => (
                    <button 
                      key={i}
                      onClick={() => {
                        setLightboxIndex(i);
                        setLightboxOpen(true);
                      }}
                      className={`${i === 0 ? "md:col-span-2 md:row-span-2" : ""} rounded-xl overflow-hidden bg-muted ${i === 0 ? "aspect-[4/3] md:aspect-auto md:min-h-[300px]" : "aspect-[4/3]"} group relative cursor-pointer`}
                    >
                      <ProgressiveImage
                        src={img}
                        alt={`${business.name} - ${i + 1}`}
                        loading={i === 0 ? "eager" : "lazy"}
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        containerClassName="w-full h-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = neutralPlaceholder;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                        <Expand className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {/* Show "View all" overlay on last visible image if there are more */}
                      {i === 3 && images.length > 4 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                          <span className="text-white font-semibold text-lg">+{images.length - 4} more</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {/* View all photos button */}
                {images.length > 1 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-4 right-4 gap-2 shadow-lg"
                    onClick={() => {
                      setLightboxIndex(0);
                      setLightboxOpen(true);
                    }}
                  >
                    <Expand className="w-4 h-4" />
                    View all {images.length} photos
                  </Button>
                )}
              </div>
            ) : hasImages ? (
              // Single uploaded image with lightbox and progressive loading
              <div className="max-w-3xl mx-auto">
                <button
                  onClick={() => {
                    setLightboxIndex(0);
                    setLightboxOpen(true);
                  }}
                  className="w-full rounded-xl overflow-hidden bg-muted aspect-[16/9] group relative cursor-pointer"
                >
                  <ProgressiveImage
                    src={images[0]}
                    alt={business.name}
                    loading="eager"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    containerClassName="w-full h-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = neutralPlaceholder;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                    <Expand className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              </div>
            ) : (
              // No images: Show neutral placeholder
              <div className="max-w-3xl mx-auto">
                <div className="rounded-xl overflow-hidden bg-muted aspect-[16/9] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Building2 className="w-16 h-16 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No image provided</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Image Lightbox */}
        {hasImages && (
          <ImageLightbox
            images={images}
            initialIndex={lightboxIndex}
            open={lightboxOpen}
            onOpenChange={setLightboxOpen}
            altPrefix={business.name}
          />
        )}

        {/* Before/After Comparison Section - Renovation businesses only */}
        {business.category === 'renovation' && (beforeAfterPairs.length > 0 || (hasImages && images.length >= 2)) && (
          <section className="py-8 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-6">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">
                    Work Transformations
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Drag the slider to compare before and after. Click to view fullscreen.
                  </p>
                </div>
                
                {/* Display explicit before/after pairs if available */}
                {beforeAfterPairs.length > 0 ? (
                  <div className={`grid gap-6 ${beforeAfterPairs.length === 1 ? 'max-w-3xl mx-auto' : beforeAfterPairs.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                    {beforeAfterPairs.map((pair, index) => (
                      <div key={pair.id} className="space-y-2">
                        {pair.title && (
                          <p className="text-sm font-medium text-foreground text-center">
                            {pair.title}
                          </p>
                        )}
                        <div 
                          className="cursor-pointer group relative"
                          onClick={() => {
                            setFullscreenComparisonIndex(index);
                            setFullscreenComparisonOpen(true);
                          }}
                        >
                          <ImageComparisonSlider
                            beforeImage={pair.beforeImageUrl}
                            afterImage={pair.afterImageUrl}
                            beforeLabel="Before"
                            afterLabel="After"
                            className="shadow-lg"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                              <Expand className="w-4 h-4 inline mr-1" />
                              View Fullscreen
                            </div>
                          </div>
                        </div>
                        {pair.description && (
                          <p className="text-xs text-muted-foreground text-center px-2">
                            {pair.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Fallback to auto-pairing images (1-2, 3-4, etc.) */
                  <div className={`grid gap-6 ${images.length < 4 ? 'max-w-3xl mx-auto' : 'md:grid-cols-2'}`}>
                    {Array.from({ length: Math.floor(images.length / 2) }).slice(0, 4).map((_, index) => (
                      <div key={index} className="space-y-2">
                        {images.length >= 4 && (
                          <p className="text-xs text-muted-foreground text-center font-medium">
                            Transformation {index + 1}
                          </p>
                        )}
                        <ImageComparisonSlider
                          beforeImage={images[index * 2]}
                          afterImage={images[index * 2 + 1]}
                          beforeLabel="Before"
                          afterLabel="After"
                          className="shadow-lg"
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                {beforeAfterPairs.length === 0 && images.length > 2 && (
                  <p className="text-center text-xs text-muted-foreground mt-4">
                    Images are automatically paired for comparison. View all {images.length} photos in the gallery above.
                  </p>
                )}
              </div>
            </div>

            {/* Fullscreen Comparison Dialog */}
            {beforeAfterPairs.length > 0 && (
              <FullscreenComparison
                open={fullscreenComparisonOpen}
                onOpenChange={setFullscreenComparisonOpen}
                pairs={beforeAfterPairs}
                initialIndex={fullscreenComparisonIndex}
              />
            )}
          </section>
        )}

        {/* Content */}
        <section className="py-8 lg:py-12">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Header with Logo (Paid only) */}
                <div className="flex items-start gap-5">
                  {/* Logo - Paid plans only */}
                  {logo && isPaidPlan && (
                    <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg border border-border bg-background shadow-sm overflow-hidden flex items-center justify-center">
                      <img
                        src={logo}
                        alt={`${business.name} logo`}
                        className="max-w-full max-h-full object-contain p-1.5"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.parentElement!.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    {/* Business Name */}
                    <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
                      {business.name}
                    </h1>
                    
                    {/* Verification & Badges - Verified badge for paid only */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {/* Open/Closed Status - Dynamic based on NZ timezone */}
                      {formattedStatus && (
                        <Badge 
                          variant="outline" 
                          className={`gap-1.5 ${
                            formattedStatus.color === 'green' 
                              ? 'border-primary/40 bg-primary/10 text-primary' 
                              : formattedStatus.color === 'gray'
                              ? 'border-muted-foreground/30 bg-muted text-muted-foreground'
                              : 'border-accent/40 bg-accent/10 text-accent'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            formattedStatus.color === 'green' ? 'bg-primary animate-pulse' : 'bg-muted-foreground'
                          }`} />
                          {formattedStatus.label}
                        </Badge>
                      )}
                      {business.is_verified && isPaidPlan && (
                        <Badge className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          Verified Professional
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        {categoryLabels[business.category] || business.category}
                      </Badge>
                      {/* Certification Label - admin added */}
                      {business.certification_label && (
                        <CertificationBadge label={business.certification_label} size="md" />
                      )}
                    </div>

                    {/* Rating - shown for all businesses */}
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 fill-accent text-accent" />
                        <span className="font-semibold text-foreground">
                          {business.rating ? Number(business.rating).toFixed(1) : "New"}
                        </span>
                        <span className="text-muted-foreground">({business.review_count || 0} reviews)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* OWNER ACTION BUTTONS - visible only to business owner */}
                {user && business.owner_id === user.id && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground mr-2">Manage your listing:</span>
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/dashboard">
                            <Settings className="w-4 h-4 mr-1" />
                            Edit
                          </Link>
                        </Button>
                        {/* Post a Job - only for Premium/Elite */}
                        {canPostJobs && (
                          <Button size="sm" asChild>
                            <Link to="/dashboard?tab=jobs">
                              <Briefcase className="w-4 h-4 mr-1" />
                              Post a Job
                            </Link>
                          </Button>
                        )}
                        {/* Manage Plan - only for paid plans */}
                        {isPaidPlan ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              toast.info("Opening subscription portal...");
                              const { data, error } = await supabase.functions.invoke("customer-portal");
                              if (error || !data?.url) {
                                toast.error("Failed to open subscription portal. Please try again.");
                                return;
                              }
                              window.open(data.url, "_blank");
                            }}
                          >
                            <Crown className="w-4 h-4 mr-1" />
                            Manage Plan
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" asChild>
                            <Link to="/pricing">
                              <Sparkles className="w-4 h-4 mr-1" />
                              Upgrade
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* DIRECT CONTACT SECTION */}
                <Card className={`border-2 ${isPaidPlan ? 'border-accent/20 bg-accent/5' : 'border-border'}`}>
                  <CardContent className="p-5 sm:p-6">
                    <h2 className="font-display text-lg font-semibold text-foreground mb-4">Contact Details</h2>
                    
                    {/* Sign in required to view contact details */}
                    {!user ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-muted/30 border border-border rounded-lg">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Lock className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">Sign in to view contact details</p>
                            <p className="text-xs text-muted-foreground mt-1">Create a free account to access phone, email, and website information</p>
                          </div>
                        </div>
                        <Button asChild className="w-full">
                          <Link to="/auth">
                            <Lock className="w-4 h-4 mr-2" />
                            Sign In to View Contacts
                          </Link>
                        </Button>
                      </div>
                    ) : (
                    <div className="space-y-4">
                      {/* Phone - VISIBLE for Premium/Elite plans when logged in */}
                      {isPaidPlan && business.phone ? (
                        <a 
                          href={`tel:${business.phone}`}
                          className="flex items-center gap-4 p-4 bg-background border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-all group"
                        >
                          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                            <Phone className="w-6 h-6 text-accent" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                            <p className="font-semibold text-foreground text-lg">{business.phone}</p>
                          </div>
                        </a>
                      ) : !isPaidPlan ? (
                        <div className="flex items-center gap-4 p-4 bg-muted/30 border border-border rounded-lg">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Phone className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                            <p className="text-sm text-muted-foreground">Not available on this plan</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4 bg-muted/30 border border-border rounded-lg">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Phone className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                            <p className="text-sm text-muted-foreground">Not provided</p>
                          </div>
                        </div>
                      )}

                      {/* Email - VISIBLE for Premium/Elite plans when logged in */}
                      {isPaidPlan && business.email ? (
                        <div className="flex items-center gap-4 p-4 bg-background border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-all group">
                          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                            <Mail className="w-6 h-6 text-accent" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                            {/* Email is rendered dynamically to prevent bot scraping */}
                            <EmailRevealButton email={business.email} businessName={business.name} />
                          </div>
                        </div>
                      ) : !isPaidPlan ? (
                        <div className="flex items-center gap-4 p-4 bg-muted/30 border border-border rounded-lg">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Mail className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                            <p className="text-sm text-muted-foreground">Not available on this plan</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4 bg-muted/30 border border-border rounded-lg">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Mail className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                            <p className="text-sm text-muted-foreground">Not provided</p>
                          </div>
                        </div>
                      )}

                      {/* Website - Always visible to everyone */}
                      {business.website ? (
                        <a 
                          href={getWebsiteUrl(business.website)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 bg-background border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-all group"
                        >
                          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                            <Globe className="w-6 h-6 text-accent" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Website</p>
                            <p className="font-semibold text-foreground truncate">{displayWebsiteUrl(business.website)}</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-4 p-4 bg-muted/30 border border-border rounded-lg">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Globe className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Website</p>
                            <p className="text-sm text-muted-foreground">Not available</p>
                          </div>
                        </div>
                      )}

                      {/* Address with Google Maps - Available to all */}
                      <a 
                        href={getGoogleMapsUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 bg-background border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                          <MapPin className="w-6 h-6 text-accent" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Address</p>
                          <p className="font-semibold text-foreground">{business.address}</p>
                          <p className="text-sm text-muted-foreground">{business.city}, New Zealand</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                      </a>

                      {/* Hours if available */}
                      {business.hours && (
                        <div className="flex items-center gap-4 p-4 bg-background border border-border rounded-lg">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Clock className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Hours</p>
                            <p className="font-medium text-foreground">{business.hours}</p>
                          </div>
                        </div>
                      )}
                      {/* Social Links - Paid plans only */}
                      {isPaidPlan && (socialLinks.facebook || socialLinks.instagram || socialLinks.linkedin) && (
                        <div className="flex gap-3 mt-5 pt-5 border-t border-border">
                          {socialLinks.facebook && (
                            <a 
                              href={socialLinks.facebook} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="p-3 bg-background border border-border rounded-lg hover:border-accent hover:text-accent transition-colors"
                              aria-label="Facebook"
                            >
                              <Facebook className="w-5 h-5" />
                            </a>
                          )}
                          {socialLinks.instagram && (
                            <a 
                              href={socialLinks.instagram} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="p-3 bg-background border border-border rounded-lg hover:border-accent hover:text-accent transition-colors"
                              aria-label="Instagram"
                            >
                              <Instagram className="w-5 h-5" />
                            </a>
                          )}
                          {socialLinks.linkedin && (
                            <a 
                              href={socialLinks.linkedin} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="p-3 bg-background border border-border rounded-lg hover:border-accent hover:text-accent transition-colors"
                              aria-label="LinkedIn"
                            >
                              <Linkedin className="w-5 h-5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    )}
                  </CardContent>
                </Card>

                {/* Builder Availability - Shows workload & wait times */}
                <BuilderAvailability businessId={business.id} />

                {/* Booking Request Form */}
                <BookingForm 
                  businessId={business.id}
                  businessName={business.name}
                />

                {/* Lead Contact Form - Premium/Elite only */}
                {isPaidPlan && (
                  <LeadContactForm 
                    businessId={business.id}
                    businessName={business.name}
                    businessCategory={business.category}
                  />
                )}

                {/* About */}
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground mb-3">About</h2>
                  <div className="prose prose-muted max-w-none">
                    <p className="text-muted-foreground leading-relaxed">
                      {business.full_description || business.description || "Sustainable construction services in the Wellington region."}
                    </p>
                  </div>
                </div>

                {/* Certifications - Paid plans only */}
                {isPaidPlan && business.certifications && business.certifications.length > 0 && (
                  <div>
                    <h2 className="font-display text-lg font-semibold text-foreground mb-3">Certifications & Credentials</h2>
                    <div className="flex flex-wrap gap-2">
                      {business.certifications.map((cert: string) => (
                        <Badge key={cert} variant="secondary" className="px-3 py-1.5">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Materials */}
                {business.materials && business.materials.length > 0 && (
                  <div>
                    <h2 className="font-display text-lg font-semibold text-foreground mb-3">Sustainable Materials</h2>
                    <div className="flex flex-wrap gap-2">
                      {business.materials.map((mat: string) => (
                        <span key={mat} className="px-3 py-1.5 bg-muted rounded-lg text-sm text-foreground">
                          {mat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Open Roles - Paid plans only */}
                {isPaidPlan && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-primary" />
                        Open Roles
                      </h2>
                      <div className="flex items-center gap-2">
                        {jobs.length > 0 && (
                          <Badge variant="secondary">{jobs.length} position{jobs.length !== 1 ? 's' : ''}</Badge>
                        )}
                        {/* Post a Job button - visible only to the business owner */}
                        {user && business.owner_id === user.id && (
                          <Button size="sm" asChild>
                            <Link to="/dashboard?tab=jobs">
                              <Briefcase className="w-4 h-4 mr-1" />
                              Post a Job
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                    {jobs.length > 0 ? (
                      <div className="space-y-3">
                        {jobs.map((job) => {
                          const daysLeft = Math.ceil(
                            (new Date(job.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                          );
                          const jobTypeLabel = job.job_type === 'full_time' ? 'Full-time' : job.job_type === 'part_time' ? 'Part-time' : 'Contract';
                          
                          return (
                            <Card key={job.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <h3 className="font-semibold text-foreground">{job.title}</h3>
                                      <Badge variant="outline" className="text-xs">{jobTypeLabel}</Badge>
                                      {job.sustainability_relevance && (
                                        <Badge variant="secondary" className="text-xs gap-1">
                                          <Leaf className="w-3 h-3" />
                                          Eco
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{job.summary}</p>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {job.location}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {daysLeft} days left
                                      </span>
                                    </div>
                                  </div>
                                  <Button asChild size="sm">
                                    <Link to={`/jobs/${job.id}`}>View</Link>
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : user && business.owner_id === user.id ? (
                      <div className="text-center py-6 border border-dashed border-border rounded-lg">
                        <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground mb-3">No job postings yet</p>
                        <Button size="sm" asChild>
                          <Link to="/dashboard?tab=jobs">
                            <Briefcase className="w-4 h-4 mr-1" />
                            Post Your First Job
                          </Link>
                        </Button>
                      </div>
                    ) : null}
                    {jobs.length > 0 && (
                      <div className="mt-4">
                        <Button variant="outline" asChild className="w-full">
                          <Link to="/jobs">View All Opportunities</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Reviews Section - All businesses can receive reviews */}
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground mb-4">Reviews</h2>
                  
                  {/* Review Form */}
                  <div className="mb-6">
                    <ReviewForm 
                      businessId={business.id} 
                      businessName={business.name}
                      onReviewSubmitted={fetchBusiness}
                    />
                  </div>

                  {/* Reviews List with business response capability */}
                  <ReviewsList
                    businessId={business.id}
                    businessOwnerId={business.owner_id}
                    subscriptionPlan={business.subscription_plan}
                    rating={business.rating}
                    reviewCount={business.review_count}
                  />
                </div>
              </div>

              {/* Sidebar - Quick Contact Summary (Desktop) */}
              <div className="hidden lg:block">
                <Card className="sticky top-24">
                  <CardContent className="p-5">
                    <h3 className="font-display font-semibold text-foreground mb-4">Quick Contact</h3>
                    
                    {!user ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Lock className="w-5 h-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Sign in to view contact details</span>
                        </div>
                        <Button asChild size="sm" className="w-full">
                          <Link to="/auth">
                            <Lock className="w-4 h-4 mr-2" />
                            Sign In
                          </Link>
                        </Button>
                      </div>
                    ) : (
                    <div className="space-y-3">
                      {business.phone && (
                        <a 
                          href={`tel:${business.phone}`}
                          className="flex items-center gap-3 p-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium"
                        >
                          <Phone className="w-5 h-5" />
                          <span>{business.phone}</span>
                        </a>
                      )}
                      
                      {isPaidPlan && business.email && (
                        <a 
                          href={`mailto:${business.email}`}
                          className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-foreground"
                        >
                          <Mail className="w-5 h-5 text-accent" />
                          <span className="truncate">{business.email}</span>
                        </a>
                      )}
                      
                      {isPaidPlan && business.website && (
                        <a 
                          href={getWebsiteUrl(business.website)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-foreground"
                        >
                          <Globe className="w-5 h-5 text-accent" />
                          <span className="truncate flex-1">{displayWebsiteUrl(business.website)}</span>
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </a>
                      )}
                      
                      <a 
                        href={getGoogleMapsUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-foreground"
                      >
                        <MapPin className="w-5 h-5 text-accent" />
                        <span className="flex-1 text-sm">View on Google Maps</span>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    </div>
                    )}

                    {business.hours && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{business.hours}</span>
                        </div>
                      </div>
                    )}

                    {/* Upgrade prompt for free plans (when no contact info is visible) */}
                    {!isPaidPlan && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-3">
                          This is a basic listing. Upgrade for more features.
                        </p>
                        <Button asChild size="sm" variant="outline" className="w-full">
                          <Link to="/pricing">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Upgrade
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default BusinessListing;
