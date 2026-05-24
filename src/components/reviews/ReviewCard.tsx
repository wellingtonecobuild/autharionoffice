import { useState } from "react";
import { Star, Flag, MessageSquare, CheckCircle, Building2, User, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    text: string | null;
    project_type: string | null;
    created_at: string;
    business_response: string | null;
    response_at: string | null;
    is_verified_client: boolean;
  };
  reviewerName: string;
  reviewerCity?: string;
  businessId: string;
  canRespond: boolean;
  isBusinessOwner: boolean;
  onUpdate?: () => void;
}

const projectTypeLabels: Record<string, string> = {
  new_build: "New Build",
  renovation: "Renovation",
  retrofit: "Retrofit",
  supply_only: "Supply Only",
  design_planning: "Design / Planning",
};

// Format reviewer name as "FirstName L." for privacy
const formatReviewerName = (fullName: string): string => {
  if (!fullName || fullName === "Anonymous") return "Anonymous";
  
  // If already formatted (contains initial with period), return as-is
  if (/\s[A-Z]\.$/.test(fullName)) return fullName;
  
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  
  return `${firstName} ${lastInitial}.`;
};

const ReviewCard = ({
  review,
  reviewerName,
  reviewerCity,
  businessId,
  canRespond,
  isBusinessOwner,
  onUpdate,
}: ReviewCardProps) => {
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [response, setResponse] = useState(review.business_response || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [isFlagging, setIsFlagging] = useState(false);

  const handleSubmitResponse = async () => {
    if (!response.trim()) {
      toast.error("Please enter a response");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          business_response: response.trim(),
          response_at: new Date().toISOString(),
        })
        .eq("id", review.id);

      if (error) throw error;

      toast.success("Response submitted successfully");
      setShowResponseForm(false);
      onUpdate?.();
    } catch (error: any) {
      console.error("Error submitting response:", error);
      toast.error(error.message || "Failed to submit response");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFlagReview = async () => {
    if (!flagReason.trim()) {
      toast.error("Please provide a reason for flagging");
      return;
    }

    setIsFlagging(true);
    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          is_flagged: true,
          flag_reason: flagReason.trim(),
          flagged_at: new Date().toISOString(),
        })
        .eq("id", review.id);

      if (error) throw error;

      toast.success("Review has been flagged for admin review");
      setFlagDialogOpen(false);
      setFlagReason("");
    } catch (error: any) {
      console.error("Error flagging review:", error);
      toast.error("Failed to flag review");
    } finally {
      setIsFlagging(false);
    }
  };

  const displayName = formatReviewerName(reviewerName);

  return (
    <Card className={review.is_verified_client ? "border-blue-500/30 bg-blue-500/5" : ""}>
      <CardContent className="pt-6">
        {/* Review Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">{displayName}</span>
              {reviewerCity && (
                <span className="text-sm text-muted-foreground">• {reviewerCity}</span>
              )}
              {/* Verification Status Badge */}
              {review.is_verified_client ? (
                <Badge className="gap-1 text-xs bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20">
                  <CheckCircle className="w-3 h-3" />
                  Verified Client
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  Unverified Client
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {new Date(review.created_at).toLocaleDateString("en-NZ", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              {review.project_type && projectTypeLabels[review.project_type] && (
                <Badge variant="outline" className="text-xs">
                  {projectTypeLabels[review.project_type]}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Star Rating */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < review.rating ? "fill-accent text-accent" : "text-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Review Text */}
        {review.text && (
          <p className="text-foreground leading-relaxed mb-4">{review.text}</p>
        )}

        {/* Business Response */}
        {review.business_response && (
          <div className="mt-4 ml-4 pl-4 border-l-2 border-accent/30 bg-muted/30 p-4 rounded-r-lg">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-accent" />
              <span className="font-medium text-sm text-foreground">Business Response</span>
              {review.response_at && (
                <span className="text-xs text-muted-foreground">
                  • {new Date(review.response_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{review.business_response}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
          {/* Flag Review Button */}
          <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                <Flag className="w-3 h-3 mr-1" />
                Report concern
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report Review</DialogTitle>
                <DialogDescription>
                  Please describe your concern about this review. Our team will review it promptly.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Describe your concern..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                rows={3}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleFlagReview} disabled={isFlagging}>
                  {isFlagging ? "Submitting..." : "Submit Report"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Respond Button - Only for business owners with Premium/Elite */}
          {canRespond && isBusinessOwner && !review.business_response && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs ml-auto"
              onClick={() => setShowResponseForm(!showResponseForm)}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Respond
            </Button>
          )}
        </div>

        {/* Response Form */}
        {showResponseForm && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
            <Textarea
              placeholder="Write your professional response..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{response.length}/500</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowResponseForm(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmitResponse} disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Post Response"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewCard;
