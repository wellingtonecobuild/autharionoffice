import { Award } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CertificationBadgeProps {
  label: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

export function CertificationBadge({ 
  label, 
  size = "md",
  showTooltip = true 
}: CertificationBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4"
  };

  const badge = (
    <span 
      className={`inline-flex items-center ${sizeClasses[size]} rounded-full bg-teal-600/90 text-white font-medium shadow-sm`}
    >
      <Award className={iconSizes[size]} />
      {label}
    </span>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p>Verified certificate from {label.replace(/^Certified by\s*/i, '')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
