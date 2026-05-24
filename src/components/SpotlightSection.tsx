import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
const CATEGORY_LABELS: Record<string, string> = {
  "eco-builders": "Eco Builders",
  suppliers: "Suppliers",
  architects: "Architects",
  renovation: "Renovation",
};

const SpotlightSection = () => {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { settings } = usePlatformSettings();

  const { data: spotlightBusinesses } = useQuery({
    queryKey: ["spotlight-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses_public")
        .select("id, name, category, images, is_verified")
        .eq("status", "approved")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription for spotlight businesses
  useEffect(() => {
    const channel = supabase
      .channel('spotlight-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'businesses_public'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['spotlight-businesses'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Auto-rotate based on settings - always rotate
  useEffect(() => {
    if (!spotlightBusinesses?.length) return;
    const speed = settings.spotlight_rotation_speed || 5000; // Default 5 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % spotlightBusinesses.length);
    }, speed);
    return () => clearInterval(interval);
  }, [spotlightBusinesses?.length, settings.spotlight_rotation_speed]);

  const goToPrev = () => {
    if (!spotlightBusinesses?.length) return;
    setCurrentIndex((prev) => (prev - 1 + spotlightBusinesses.length) % spotlightBusinesses.length);
  };

  const goToNext = () => {
    if (!spotlightBusinesses?.length) return;
    setCurrentIndex((prev) => (prev + 1) % spotlightBusinesses.length);
  };

  if (!spotlightBusinesses?.length) return null;

  const current = spotlightBusinesses[currentIndex];
  // Show uploaded image or neutral placeholder
  const logoUrl = current.images?.[0] || "/placeholder.svg";
  const hasImage = current.images && current.images.length > 0;

  return (
    <section className="bg-gradient-to-r from-accent/10 via-accent/5 to-accent/10 border-b border-accent/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-4">
          {/* Featured Label */}
          <div className="hidden sm:flex items-center gap-1.5 text-accent">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Featured</span>
          </div>

          {/* Navigation Arrow */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={goToPrev}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Business Card */}
          <Link
            to={`/business/${current.id}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          >
            {/* Logo */}
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-card border border-border flex-shrink-0">
              <img
                src={logoUrl}
                alt={current.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-foreground group-hover:text-accent transition-colors">
                {current.name}
              </span>
              <span className="text-muted-foreground text-sm hidden md:inline">
                • {CATEGORY_LABELS[current.category] || current.category}
              </span>
              {current.is_verified && (
                <Badge variant="verified" className="gap-1">
                  <BadgeCheck className="w-3 h-3" />
                  Verified
                </Badge>
              )}
            </div>
          </Link>

          {/* Navigation Arrow */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={goToNext}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Dots Indicator */}
          <div className="hidden lg:flex items-center gap-1 ml-2">
            {spotlightBusinesses.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  idx === currentIndex ? "bg-accent" : "bg-accent/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpotlightSection;
