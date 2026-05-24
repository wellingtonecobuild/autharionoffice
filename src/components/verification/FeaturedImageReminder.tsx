import { Image, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeaturedImageReminderProps {
  imageCount: number;
  minRecommended?: number;
  plan: "premium" | "elite";
  className?: string;
}

export function FeaturedImageReminder({
  imageCount,
  minRecommended = 3,
  plan,
  className,
}: FeaturedImageReminderProps) {
  const isElite = plan === "elite";
  const hasEnoughImages = imageCount >= minRecommended;
  
  if (hasEnoughImages) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20",
        className
      )}>
        <Sparkles className="w-4 h-4 text-green-600 flex-shrink-0" />
        <p className="text-sm text-green-700">
          Great! You have {imageCount} image{imageCount !== 1 ? "s" : ""} uploaded. High-quality visuals help attract more customers.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-lg border",
      isElite 
        ? "bg-amber-500/5 border-amber-500/20" 
        : "bg-blue-500/5 border-blue-500/20",
      className
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isElite ? "bg-amber-500/10" : "bg-blue-500/10"
      )}>
        <Image className={cn(
          "w-4 h-4",
          isElite ? "text-amber-600" : "text-blue-600"
        )} />
      </div>
      <div className="space-y-1">
        <p className={cn(
          "text-sm font-medium",
          isElite ? "text-amber-700" : "text-blue-700"
        )}>
          Add more work images for better visibility
        </p>
        <p className="text-xs text-muted-foreground">
          {plan === "elite" ? "Elite" : "Premium"} listings with at least {minRecommended} high-quality images 
          receive significantly more enquiries. Showcase your best projects, completed work, 
          or your team in action.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          <span className="font-medium">Current:</span> {imageCount} image{imageCount !== 1 ? "s" : ""} 
          <span className="mx-1">•</span>
          <span className="font-medium">Recommended:</span> {minRecommended}+ images
        </p>
      </div>
    </div>
  );
}
