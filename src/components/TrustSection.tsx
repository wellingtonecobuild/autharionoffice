import { useEffect } from "react";
import { ShieldCheck, Heart, Star, TrendingUp, Users, Building2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TrustSection = () => {
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["trust-stats"],
    queryFn: async () => {
      const [businessesResult, reviewsResult] = await Promise.all([
        supabase
          .from("businesses_public")
          .select("id, subscription_plan", { count: "exact" })
          .eq("status", "active"),
        supabase
          .from("reviews")
          .select("id", { count: "exact" })
      ]);

      const totalBusinesses = businessesResult.count || 0;
      const verifiedProfessionals = businessesResult.data?.filter(b => b.subscription_plan === 'premium' || b.subscription_plan === 'elite').length || 0;
      const totalReviews = reviewsResult.count || 0;

      return {
        totalBusinesses,
        verifiedProfessionals,
        totalReviews,
      };
    },
  });

  useEffect(() => {
    const businessChannel = supabase
      .channel('trust-stats-businesses')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'businesses_public' },
        () => queryClient.invalidateQueries({ queryKey: ['trust-stats'] })
      )
      .subscribe();

    const reviewsChannel = supabase
      .channel('trust-stats-reviews')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews' },
        () => queryClient.invalidateQueries({ queryKey: ['trust-stats'] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(businessChannel);
      supabase.removeChannel(reviewsChannel);
    };
  }, [queryClient]);

  const displayStats = [
    { 
      icon: Building2,
      value: "Growing", 
      label: "Listed Businesses", 
      sublabel: "Active eco-friendly companies",
      isNumber: false
    },
    { 
      icon: ShieldCheck,
      value: "Verified", 
      label: "Verified Professionals", 
      sublabel: "Premium & Elite listings",
      isNumber: false
    },
    { 
      icon: Users,
      value: "Active", 
      label: "Client Reviews", 
      sublabel: "Community feedback",
      isNumber: false
    },
    { 
      icon: Heart,
      value: "Free", 
      label: "For Homeowners", 
      sublabel: "Search & contact at no cost",
      isNumber: false
    },
  ];

  return (
    <section className="py-24 lg:py-28 bg-subtle-gradient border-y border-border/50 relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/[0.015] to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-3 text-sm font-medium text-muted-foreground">
            <Star className="w-4 h-4 text-accent" />
            <span className="text-overline">Why Wellington trusts us</span>
            <Star className="w-4 h-4 text-accent" />
          </div>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {displayStats.map((stat, index) => (
            <div 
              key={stat.label} 
              className="animate-fade-up text-center p-8 rounded-2xl card-interactive group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="icon-container-md mx-auto mb-6 bg-accent/10 group-hover:bg-accent/20 transition-colors duration-300">
                <stat.icon className="w-6 h-6 text-accent" />
              </div>
              
              {/* Value */}
              <div className="font-display text-4xl lg:text-5xl font-bold text-accent mb-2 tracking-tight">
                {stat.isNumber ? stat.value.toLocaleString() : stat.value}
              </div>
              
              {/* Label */}
              <div className="text-base font-semibold text-foreground mb-1">
                {stat.label}
              </div>
              
              {/* Sublabel */}
              <div className="text-sm text-muted-foreground">
                {stat.sublabel}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom reinforcement */}
        <div className="mt-16 text-center animate-fade-up delay-400">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-muted/60 border border-border/50 text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span>Helping Wellington build sustainably since 2024</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
