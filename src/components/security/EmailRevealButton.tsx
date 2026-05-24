import { useState } from "react";
import { toast } from "sonner";

interface EmailRevealButtonProps {
  email: string;
  businessName: string;
}

/**
 * EmailRevealButton - A security component that prevents email scraping
 * The email is not rendered in HTML until user clicks
 */
const EmailRevealButton = ({ email, businessName }: EmailRevealButtonProps) => {
  const [revealed, setRevealed] = useState(false);
  const [displayEmail, setDisplayEmail] = useState<string | null>(null);

  const handleReveal = () => {
    // Small delay to ensure genuine user interaction
    setTimeout(() => {
      setRevealed(true);
      setDisplayEmail(email);
    }, 100);
  };

  const handleClick = () => {
    if (displayEmail) {
      window.location.href = `mailto:${displayEmail}`;
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (displayEmail) {
      await navigator.clipboard.writeText(displayEmail);
      toast.success("Email copied to clipboard");
    }
  };

  if (!revealed) {
    return (
      <button
        onClick={handleReveal}
        className="font-semibold text-accent hover:text-accent/80 transition-colors underline underline-offset-2"
      >
        Click to reveal email
      </button>
    );
  }

  if (!displayEmail) {
    return <span className="text-muted-foreground">Loading...</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        className="font-semibold text-foreground hover:text-accent transition-colors break-all text-left"
      >
        {displayEmail}
      </button>
      <button
        onClick={handleCopy}
        className="text-muted-foreground hover:text-accent transition-colors text-xs"
        title="Copy email"
      >
        Copy
      </button>
    </div>
  );
};

export default EmailRevealButton;
