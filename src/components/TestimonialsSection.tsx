import { useEffect } from "react";
import { Quote, Star, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  rating: number;
  text: string | null;
  created_at: string;
  business: {
    name: string;
  } | null;
  profile: {
    full_name: string | null;
  } | null;
}

// No placeholder testimonials - only show real reviews from the database

const TestimonialsSection = () => {
  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["testimonials-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          id,
          rating,
          text,
          created_at,
          business:businesses_public!inner(name),
          profile:profiles_public(full_name)
        `)
        .eq("status", "approved")
        .gte("rating", 4)
        .not("text", "is", null)
        .order("rating", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as unknown as Review[];
    },
  });

  // Real-time subscription for reviews
  useEffect(() => {
    const channel = supabase
      .channel('testimonials-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['testimonials-reviews'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const hasRealReviews = reviews && reviews.length > 0;
  const displayReviews = hasRealReviews ? reviews.slice(0, 3) : null;

  return (
    <section className="py-24 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
            Testimonials
          </span>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
            What Our Community Says
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            Hear from homeowners and professionals in Wellington's sustainable construction network.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : displayReviews ? (
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {displayReviews.map((review) => (
              <div
                key={review.id}
                className="bg-card rounded-2xl border border-border p-8"
              >
                {/* Rating */}
                <div className="flex gap-1 mb-6">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                  ))}
                </div>
                
                <p className="text-foreground mb-8 leading-relaxed line-clamp-4">
                  "{review.text}"
                </p>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Quote className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {review.profile?.full_name || "Verified Customer"}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Review for {review.business?.name}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-2xl border border-border max-w-xl mx-auto">
            <Quote className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
              Be the First to Review
            </h3>
            <p className="text-muted-foreground">
              Testimonials will appear here as businesses receive reviews from the community.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default TestimonialsSection;
