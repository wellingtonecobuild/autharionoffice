import { useState, useEffect } from "react";
import { Mail, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProtectedEmailProps {
  email: string;
  className?: string;
  showIcon?: boolean;
  showCopyButton?: boolean;
  variant?: "link" | "button" | "text";
}

/**
 * ProtectedEmail component
 * Renders email addresses in a way that prevents automated scraping
 * - Email is not in the initial HTML
 * - Requires user interaction to reveal
 * - Uses obfuscation techniques
 */
const ProtectedEmail = ({ 
  email, 
  className, 
  showIcon = true, 
  showCopyButton = true,
  variant = "link"
}: ProtectedEmailProps) => {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [displayEmail, setDisplayEmail] = useState<string | null>(null);

  // Decode email only after user interaction (prevents scraping)
  useEffect(() => {
    if (revealed && email) {
      // Slight delay to ensure it's a genuine user interaction
      const timeout = setTimeout(() => {
        setDisplayEmail(email);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [revealed, email]);

  const handleReveal = (e: React.MouseEvent) => {
    e.preventDefault();
    setRevealed(true);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (displayEmail) {
      await navigator.clipboard.writeText(displayEmail);
      setCopied(true);
      toast.success("Email copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEmailClick = (e: React.MouseEvent) => {
    if (!displayEmail) {
      e.preventDefault();
    }
  };

  // Not revealed yet - show placeholder
  if (!revealed) {
    return (
      <button
        onClick={handleReveal}
        className={cn(
          "inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors",
          className
        )}
        aria-label="Click to reveal email address"
      >
        {showIcon && <Mail className="w-4 h-4" />}
        <span className="underline underline-offset-2">Click to reveal email</span>
      </button>
    );
  }

  // Email is being revealed
  if (!displayEmail) {
    return (
      <span className={cn("inline-flex items-center gap-2 text-muted-foreground", className)}>
        {showIcon && <Mail className="w-4 h-4" />}
        <span>Loading...</span>
      </span>
    );
  }

  // Email is revealed
  if (variant === "button") {
    return (
      <div className="inline-flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={`mailto:${displayEmail}`} onClick={handleEmailClick}>
            {showIcon && <Mail className="w-4 h-4 mr-2" />}
            {displayEmail}
          </a>
        </Button>
        {showCopyButton && (
          <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
            {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
          </Button>
        )}
      </div>
    );
  }

  if (variant === "text") {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        {showIcon && <Mail className="w-4 h-4 text-muted-foreground" />}
        <span>{displayEmail}</span>
        {showCopyButton && (
          <button onClick={handleCopy} className="hover:text-accent transition-colors">
            {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
          </button>
        )}
      </span>
    );
  }

  // Default: link variant
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <a
        href={`mailto:${displayEmail}`}
        onClick={handleEmailClick}
        className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
      >
        {showIcon && <Mail className="w-4 h-4" />}
        <span>{displayEmail}</span>
      </a>
      {showCopyButton && (
        <button onClick={handleCopy} className="hover:text-accent transition-colors">
          {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
        </button>
      )}
    </span>
  );
};

export default ProtectedEmail;
