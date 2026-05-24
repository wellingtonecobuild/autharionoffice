import { useState, useEffect } from "react";
import { Star, Loader2, Edit2, Trash2, Clock, CheckCircle, XCircle, AlertCircle, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import VerifiedClientUpload from "./reviews/VerifiedClientUpload";

interface ReviewFormProps {
  businessId: string;
  businessName: string;
  onReviewSubmitted?: () => void;
}

interface ExistingReview {
  id: string;
  rating: number;
  text: string | null;
  status: string;
  created_at: string;
  project_type: string | null;
  is_verified_client: boolean;
  proof_document_url: string | null;
  proof_document_name: string | null;
  verification_requested_at: string | null;
}

const PROJECT_TYPES = [
  { value: "new_build", label: "New Build" },
  { value: "renovation", label: "Renovation" },
  { value: "retrofit", label: "Retrofit" },
  { value: "supply_only", label: "Supply Only" },
  { value: "design_planning", label: "Design / Planning" },
];

const MIN_WORD_COUNT = 10;
const MAX_REVIEW_LENGTH = 1000;

// Spam detection patterns
const SPAM_PATTERNS = {
  urls: /https?:\/\/|www\.|\.com|\.co\.nz|\.org|\.net/i,
  emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  phones: /(\+?64|0)\s*\d{1,4}[\s-]?\d{3,4}[\s-]?\d{3,4}/,
  repeatedWords: /\b(\w+)\b(?:\s+\1\b){3,}/i, // Same word repeated 4+ times
  repeatedChars: /(.)\1{5,}/, // Same character 6+ times
};

const ReviewForm = ({ businessId, businessName, onReviewSubmitted }: ReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [projectType, setProjectType] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Guest review fields
  const [guestName, setGuestName] = useState("");
  const [guestInitial, setGuestInitial] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  // Word count validation
  const wordCount = reviewText.trim().split(/\s+/).filter(word => word.length > 0).length;
  const isValidWordCount = wordCount >= MIN_WORD_COUNT;
  const reviewLength = reviewText.trim().length;

  useEffect(() => {
    if (user) {
      fetchExistingReview();
    } else {
      setLoading(false);
    }
  }, [user, businessId]);

  const fetchExistingReview = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, text, status, created_at, project_type, is_verified_client, proof_document_url, proof_document_name, verification_requested_at")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setExistingReview(data as ExistingReview);
        setRating(data.rating);
        setReviewText(data.text || "");
        setProjectType(data.project_type || "");
      }
    } catch (error) {
      console.error("Error fetching existing review:", error);
    } finally {
      setLoading(false);
    }
  };

  // Validate review text for spam
  const validateReviewText = (text: string): { isValid: boolean; error: string | null } => {
    if (SPAM_PATTERNS.urls.test(text)) {
      return { isValid: false, error: "Reviews cannot contain URLs or website links" };
    }
    if (SPAM_PATTERNS.emails.test(text)) {
      return { isValid: false, error: "Reviews cannot contain email addresses" };
    }
    if (SPAM_PATTERNS.phones.test(text)) {
      return { isValid: false, error: "Reviews cannot contain phone numbers" };
    }
    if (SPAM_PATTERNS.repeatedWords.test(text)) {
      return { isValid: false, error: "Please write a meaningful review without repeated words" };
    }
    if (SPAM_PATTERNS.repeatedChars.test(text)) {
      return { isValid: false, error: "Please write a meaningful review without repeated characters" };
    }
    return { isValid: true, error: null };
  };

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check rate limits
  const checkRateLimits = async (email: string): Promise<{ allowed: boolean; reason: string | null }> => {
    try {
      // Check if this email has already reviewed this business
      const { data: existingEmailReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("business_id", businessId)
        .eq("guest_email", email.toLowerCase())
        .maybeSingle();

      if (existingEmailReview) {
        return { allowed: false, reason: "This email has already submitted a review for this business" };
      }

      // Check rate limit (30 days for IP - we'll track this server-side in a future enhancement)
      // For now, just check email uniqueness per business
      return { allowed: true, reason: null };
    } catch (error) {
      console.error("Error checking rate limits:", error);
      return { allowed: true, reason: null }; // Allow on error to not block legitimate reviews
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!isValidWordCount) {
      toast.error(`Please write at least ${MIN_WORD_COUNT} words describing your experience`);
      return;
    }

    if (reviewLength > MAX_REVIEW_LENGTH) {
      toast.error(`Review must be less than ${MAX_REVIEW_LENGTH} characters`);
      return;
    }

    // Validate review text for spam
    const textValidation = validateReviewText(reviewText);
    if (!textValidation.isValid) {
      toast.error(textValidation.error);
      return;
    }

    // Guest validation
    if (!user) {
      if (!guestName.trim()) {
        toast.error("Please enter your first name");
        return;
      }
      if (guestName.trim().length < 2) {
        toast.error("Please enter a valid first name");
        return;
      }
      if (!guestInitial.trim() || guestInitial.trim().length !== 1) {
        toast.error("Please enter the first letter of your last name");
        return;
      }
      if (!guestEmail.trim()) {
        toast.error("Please enter your email address");
        return;
      }
      if (!validateEmail(guestEmail.trim())) {
        toast.error("Please enter a valid email address");
        return;
      }

      // Check rate limits for guest reviews
      const rateLimit = await checkRateLimits(guestEmail.trim());
      if (!rateLimit.allowed) {
        toast.error(rateLimit.reason || "You cannot submit a review at this time");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // All reviews go to pending for moderation - NO AUTO-PUBLISH
      const reviewStatus = 'pending';
      
      if (existingReview && user) {
        // Update existing review (only for authenticated users)
        const { error } = await supabase
          .from("reviews")
          .update({
            rating,
            text: reviewText.trim(),
            project_type: projectType || null,
            status: reviewStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingReview.id);

        if (error) throw error;
        toast.success("Your review has been updated and is pending approval");
        setExistingReview({ 
          ...existingReview, 
          rating, 
          text: reviewText.trim(), 
          status: reviewStatus,
          project_type: projectType || null 
        });
        setIsEditing(false);
      } else {
        // Create new review (guest or authenticated)
        const reviewData: any = {
          business_id: businessId,
          rating,
          text: reviewText.trim(),
          project_type: projectType || null,
          status: reviewStatus,
        };

        if (user) {
          reviewData.user_id = user.id;
        } else {
          reviewData.guest_name = guestName.trim();
          reviewData.guest_initial = guestInitial.trim().toUpperCase();
          reviewData.guest_email = guestEmail.trim().toLowerCase();
        }

        const { data, error } = await supabase.from("reviews").insert(reviewData).select().single();

        if (error) {
          if (error.code === '23505') {
            toast.error("You have already reviewed this business");
            return;
          }
          throw error;
        }

        // Show success immediately
        toast.success("Thank you for your review! It's pending approval by our team.");
        
        if (user) {
          setExistingReview(data as ExistingReview);
        } else {
          setRating(0);
          setReviewText("");
          setProjectType("");
          setGuestName("");
          setGuestInitial("");
          setGuestEmail("");
        }

        // Fire-and-forget: rate limit tracking and notification in background
        (async () => {
          try {
            if (!user && guestEmail) {
              await supabase.from("review_rate_limits").insert({
                email: guestEmail.trim().toLowerCase(),
                business_id: businessId,
              });
            }
            await supabase.functions.invoke('notify-review', {
              body: {
                businessId,
                rating,
                reviewText: reviewText.trim(),
                reviewerName: user 
                  ? (user.user_metadata?.full_name || user.email?.split('@')[0])
                  : `${guestName} ${guestInitial}.`,
                isAutoPublished: false,
              },
            });
          } catch (e) {
            console.error('Background task error:', e);
          }
        })();
      }

      onReviewSubmitted?.();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReview) return;

    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", existingReview.id);

      if (error) throw error;
      
      toast.success("Your review has been deleted");
      setExistingReview(null);
      setRating(0);
      setReviewText("");
      setProjectType("");
      setDeleteDialogOpen(false);
      onReviewSubmitted?.();
    } catch (error: any) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review. Please try again.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending Approval</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  // Show existing review if not editing (only for authenticated users)
  if (existingReview && !isEditing && user) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Your Review</CardTitle>
            {getStatusBadge(existingReview.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-6 h-6 ${
                  star <= existingReview.rating
                    ? "fill-accent text-accent"
                    : "text-muted-foreground"
                }`}
              />
            ))}
          </div>

          {existingReview.project_type && (
            <Badge variant="outline">
              {PROJECT_TYPES.find(p => p.value === existingReview.project_type)?.label || existingReview.project_type}
            </Badge>
          )}
          
          {existingReview.text && (
            <p className="text-muted-foreground">{existingReview.text}</p>
          )}
          
          <p className="text-xs text-muted-foreground">
            Submitted on {new Date(existingReview.created_at).toLocaleDateString()}
          </p>

          {existingReview.status === 'pending' && (
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Your review is being reviewed by our team and will appear publicly once approved.
            </p>
          )}

          {/* Verified Client Upload - only show for approved reviews */}
          {existingReview.status === 'approved' && user && (
            <VerifiedClientUpload
              reviewId={existingReview.id}
              userId={user.id}
              existingProofUrl={existingReview.proof_document_url}
              existingProofName={existingReview.proof_document_name}
              isVerifiedClient={existingReview.is_verified_client || false}
              verificationRequestedAt={existingReview.verification_requested_at}
              onUploadComplete={fetchExistingReview}
            />
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2 text-red-500" />
              Delete
            </Button>
          </div>
        </CardContent>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Your Review</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete your review? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {existingReview ? "Edit Your Review" : "Write a Review"}
          </CardTitle>
          {isEditing && (
            <Button variant="ghost" size="sm" onClick={() => {
              setIsEditing(false);
              setRating(existingReview?.rating || 0);
              setReviewText(existingReview?.text || "");
              setProjectType(existingReview?.project_type || "");
            }}>
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Guest fields (only show if not logged in) */}
          {!user && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guest-name" className="block text-sm font-medium text-foreground mb-2">
                    First Name *
                  </Label>
                  <Input
                    id="guest-name"
                    placeholder="James"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="guest-initial" className="block text-sm font-medium text-foreground mb-2">
                    Last Name Initial *
                  </Label>
                  <Input
                    id="guest-initial"
                    placeholder="K"
                    value={guestInitial}
                    onChange={(e) => setGuestInitial(e.target.value.slice(0, 1).toUpperCase())}
                    maxLength={1}
                    className="w-20"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="guest-email" className="block text-sm font-medium text-foreground mb-2">
                  Email Address * <span className="text-muted-foreground font-normal">(not displayed publicly)</span>
                </Label>
                <Input
                  id="guest-email"
                  type="email"
                  placeholder="your@email.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
          )}

          {/* Star Rating */}
          <div>
            <Label className="block text-sm font-medium text-foreground mb-2">
              Your Rating *
            </Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded"
                  aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-accent text-accent"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Project Type */}
          <div>
            <Label htmlFor="project-type" className="block text-sm font-medium text-foreground mb-2">
              Project Type (Optional)
            </Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger id="project-type" className="w-full">
                <SelectValue placeholder="Select project type..." />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Review Text */}
          <div>
            <Label htmlFor="review-text" className="block text-sm font-medium text-foreground mb-2">
              Your Review * <span className="text-muted-foreground font-normal">(minimum {MIN_WORD_COUNT} words)</span>
            </Label>
            <Textarea
              id="review-text"
              placeholder="Share your experience with this business... Describe the quality of work, communication, and overall satisfaction."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={5}
              maxLength={MAX_REVIEW_LENGTH}
              className="resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1">
                {wordCount < MIN_WORD_COUNT && wordCount > 0 && (
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                )}
                {wordCount >= MIN_WORD_COUNT && (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                )}
                <span className={`text-xs ${
                  wordCount < MIN_WORD_COUNT && wordCount > 0 
                    ? "text-amber-500" 
                    : wordCount >= MIN_WORD_COUNT
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}>
                  {wordCount < MIN_WORD_COUNT 
                    ? `${MIN_WORD_COUNT - wordCount} more words needed`
                    : `${wordCount} words`
                  }
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {reviewLength}/{MAX_REVIEW_LENGTH} characters
              </span>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <strong>Review Guidelines:</strong>
            </p>
            <p>• Write at least {MIN_WORD_COUNT} words describing your experience</p>
            <p>• Your first name and last initial will be shown publicly (e.g., "James K.")</p>
            <p>• Do not include URLs, email addresses, or phone numbers</p>
            <p>• All reviews are moderated before publishing</p>
            {!user && <p>• Your email is kept private and used only for verification</p>}
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground italic">
            Reviews are moderated and may be marked as Verified or Unverified based on available evidence.
          </p>

          <Button 
            type="submit" 
            disabled={isSubmitting || rating === 0 || !isValidWordCount || reviewLength > MAX_REVIEW_LENGTH} 
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : existingReview ? (
              "Update Review"
            ) : (
              "Submit Review"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
