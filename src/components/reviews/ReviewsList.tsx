import { useState, useEffect } from "react";
import { Star, Loader2, Shield, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReviewCard from "./ReviewCard";

interface ReviewsListProps {
  businessId: string;
  businessOwnerId?: string;
  subscriptionPlan: string;
  rating: number | null;
  reviewCount: number | null;
  onReviewsLoaded?: (reviews: any[]) => void;
}

interface Review {
  id: string;
  rating: number;
  text: string | null;
  project_type: string | null;
  created_at: string;
  user_id: string | null;
  guest_name: string | null;
  guest_initial: string | null;
  business_response: string | null;
  response_at: string | null;
  is_verified_client: boolean;
}

interface ReviewerProfile {
  id: string;
  full_name: string | null;
}

const ReviewsList = ({
  businessId,
  businessOwnerId,
  subscriptionPlan,
  rating,
  reviewCount,
  onReviewsLoaded,
}: ReviewsListProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewerProfiles, setReviewerProfiles] = useState<Record<string, ReviewerProfile>>({});
  const [loading, setLoading] = useState(true);

  const isPaidPlan = subscriptionPlan === "premium" || subscriptionPlan === "elite";
  const isBusinessOwner = user?.id === businessOwnerId;

  // Minimum reviews to display publicly (prevents review manipulation)
  const MIN_REVIEWS_TO_SHOW = 2;

  useEffect(() => {
    fetchReviews();
  }, [businessId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, text, project_type, created_at, user_id, guest_name, guest_initial, business_response, response_at, is_verified_client")
        .eq("business_id", businessId)
        .eq("status", "approved")
        .order("is_verified_client", { ascending: false }) // Verified first
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const reviewData = (data || []) as Review[];
      setReviews(reviewData);
      onReviewsLoaded?.(reviewData);

      // Fetch reviewer profiles for authenticated reviews
      const userIds = reviewData
        .filter((r) => r.user_id)
        .map((r) => r.user_id as string);
      
      if (userIds.length > 0) {
        const uniqueUserIds = [...new Set(userIds)];
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("id, full_name")
          .in("id", uniqueUserIds);

        if (profiles) {
          const profileMap: Record<string, ReviewerProfile> = {};
          profiles.forEach((p) => {
            profileMap[p.id] = p as ReviewerProfile;
          });
          setReviewerProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get reviewer display name
  const getReviewerName = (review: Review): string => {
    if (review.user_id && reviewerProfiles[review.user_id]?.full_name) {
      return reviewerProfiles[review.user_id].full_name as string;
    }
    if (review.guest_name && review.guest_initial) {
      return `${review.guest_name} ${review.guest_initial}.`;
    }
    return "Anonymous";
  };

  // Count verified and unverified reviews
  const verifiedCount = reviews.filter(r => r.is_verified_client).length;
  const unverifiedCount = reviews.filter(r => !r.is_verified_client).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  // Show "New listing" message if fewer than MIN_REVIEWS_TO_SHOW approved reviews
  if (reviews.length < MIN_REVIEWS_TO_SHOW) {
    return (
      <div className="space-y-4">
        {/* Rating Summary - show even for new listings */}
        <Card className="bg-muted/30">
          <CardContent className="py-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-6 h-6 text-muted-foreground" />
              <span className="text-lg font-semibold text-muted-foreground">No Reviews Yet</span>
            </div>
            <p className="text-sm text-muted-foreground">
              This business hasn't received any reviews yet. Be the first to share your experience!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Rating Summary */}
      <Card className="bg-accent/5 border-accent/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="w-6 h-6 fill-accent text-accent" />
                <span className="text-2xl font-bold text-foreground">
                  {rating ? Number(rating).toFixed(1) : "0.0"}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(rating || 0) ? "fill-accent text-accent" : "text-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm text-muted-foreground">
                {reviewCount || 0} review{(reviewCount || 0) !== 1 ? "s" : ""}
              </span>
              {verifiedCount > 0 && (
                <span className="text-xs text-blue-600 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {verifiedCount} verified
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Disclaimer */}
      <p className="text-xs text-muted-foreground italic px-1">
        Reviews are moderated and may be marked as Verified or Unverified based on available evidence.
      </p>

      {/* Reviews List - Verified first, then unverified */}
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          reviewerName={getReviewerName(review)}
          businessId={businessId}
          canRespond={isPaidPlan}
          isBusinessOwner={isBusinessOwner}
          onUpdate={fetchReviews}
        />
      ))}
    </div>
  );
};

export default ReviewsList;
