import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2 } from "lucide-react";
import { sendNewsletterConfirmation, notifyAdmin } from "@/lib/emailService";

const NewsletterSignup = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      // Validate email synchronously (already loaded)
      const { newsletterSchema } = await import("@/lib/validation");
      const validated = newsletterSchema.parse({ email });

      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: validated.email });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already subscribed", description: "This email is already on our mailing list." });
        } else {
          throw error;
        }
      } else {
        // Show success immediately
        toast({ title: "Subscribed!", description: "You'll receive our latest updates and eco-building tips." });
        setEmail("");
        
        // Fire-and-forget: emails in background
        sendNewsletterConfirmation(validated.email).catch(console.error);
        notifyAdmin({ type: "newsletter", data: { email: validated.email } }).catch(console.error);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.errors?.[0]?.message || "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 rounded-2xl p-6 lg:p-8 border border-primary/10 shadow-sm">
      {/* Header with Logo */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-md">
          <Mail className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Industry Updates
          </h3>
          <p className="text-xs text-muted-foreground">Official Wellington EcoBuild Newsletter</p>
        </div>
      </div>
      
      <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
        Subscribe to receive the latest sustainable building insights, industry updates, and verified business listings directly to your inbox. Unsubscribe at any time.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="newsletter-email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Email Address
          </label>
          <Input
            id="newsletter-email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 bg-background/80"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full h-11 font-semibold">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Subscribe to Newsletter
            </>
          )}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          By subscribing, you agree to receive communications from Wellington EcoBuild. Your information is protected under NZ privacy legislation.
        </p>
      </form>
    </div>
  );
};

export default NewsletterSignup;
