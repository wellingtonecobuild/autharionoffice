import { useState, useEffect } from "react";
import { Copy, Check, Share2, Link2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Generate a random referral code for anonymous users
const generateAnonymousCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Get or create anonymous referral code from localStorage
const getOrCreateAnonymousCode = () => {
  const storedCode = localStorage.getItem("my_referral_code");
  if (storedCode) {
    return storedCode;
  }
  const newCode = generateAnonymousCode();
  localStorage.setItem("my_referral_code", newCode);
  return newCode;
};

export function ReferralLinkGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    if (user) {
      // For logged-in users, use their user ID as the code
      setReferralCode(user.id.substring(0, 8).toUpperCase());
    } else {
      // For anonymous users, generate a persistent random code
      setReferralCode(getOrCreateAnonymousCode());
    }
    
    setLoading(false);
  }, [user]);

  const referralLink = referralCode 
    ? `${window.location.origin}/referral-program?ref=${referralCode}` 
    : "";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link Copied!",
        description: "Your referral link has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Wellington EcoBuild",
          text: "List your sustainable construction business on Wellington EcoBuild and join the green building movement!",
          url: referralLink,
        });
      } catch (error) {
        // User cancelled or share failed - copy instead
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-gradient-to-br from-accent/5 to-background">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/20 bg-gradient-to-br from-accent/5 via-background to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <CardTitle className="text-lg">Your Referral Link</CardTitle>
            <CardDescription>
              {user 
                ? "Share this link to earn rewards" 
                : "Share this link - sign in later to claim rewards"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={referralLink}
            readOnly
            className="bg-background/50 font-mono text-sm"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={copyToClipboard}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button onClick={copyToClipboard} className="flex-1 gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button variant="outline" onClick={shareLink} className="flex-1 gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>

        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            {user 
              ? "When someone clicks your link and submits a referral, you'll be credited as the referrer."
              : "Your unique code: " + referralCode + " - Sign in to track and claim your rewards!"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
