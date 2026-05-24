import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { leadFormSchema, LeadFormData } from "@/lib/validation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle, MessageSquare, Lock } from "lucide-react";
import { trackContactBusiness } from "@/lib/analytics";
import { useFormProtection } from "@/hooks/useFormProtection";
import HoneypotField from "@/components/security/HoneypotField";

interface LeadContactFormProps {
  businessId: string;
  businessName: string;
  businessCategory: string;
}

const LeadContactForm = ({ businessId, businessName, businessCategory }: LeadContactFormProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [botDetected, setBotDetected] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  const { checkProtection, isBlocked } = useFormProtection({
    action: `lead_form_${businessId}`,
    maxAttempts: 3,
    windowMs: 300000,
    minFillTimeMs: 2000
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
  });

  // Gate behind authentication
  if (!user) {
    return (
      <Card className="border-primary/20 overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary/90 px-5 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary-foreground" />
            <span className="text-sm font-medium text-primary-foreground">Business Enquiry</span>
          </div>
        </div>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground mb-1">Authentication Required</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Please sign in to submit an enquiry to {businessName}. Creating an account is free and takes less than a minute.
              </p>
            </div>
            <Button asChild className="w-full h-11">
              <Link to="/auth">
                <Lock className="w-4 h-4 mr-2" />
                Sign In to Continue
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = async (data: LeadFormData) => {
    if (botDetected) {
      toast.error("Submission blocked for security reasons.");
      return;
    }
    
    const protection = checkProtection();
    if (!protection.allowed) {
      toast.error(protection.error || "Too many attempts. Please try again later.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from("leads")
        .insert({
          business_id: businessId,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          message: data.message,
        });

      if (insertError) throw insertError;

      // Show success immediately - don't wait for notification
      setIsSubmitted(true);
      reset();
      toast.success("Your enquiry has been sent!");

      // Fire-and-forget: notification and analytics in background
      Promise.all([
        supabase.functions.invoke("notify-lead", {
          body: { businessId, leadName: data.name, leadEmail: data.email, leadPhone: data.phone, leadMessage: data.message },
        }),
        Promise.resolve(trackContactBusiness(businessId, businessName, businessCategory))
      ]).catch(console.error);

    } catch (error: any) {
      toast.error(error.message || "Failed to send enquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-primary/20 bg-primary/5 overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary/90 px-5 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary-foreground" />
            <span className="text-sm font-medium text-primary-foreground">Enquiry Submitted</span>
          </div>
        </div>
        <CardContent className="py-10 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">Enquiry Received</h3>
          <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
            Your enquiry has been sent to {businessName}. They will respond directly to your email address.
          </p>
          <Button variant="outline" onClick={() => setIsSubmitted(false)} className="px-6">
            Submit Another Enquiry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-primary/20 overflow-hidden ${isBlocked ? 'opacity-60' : ''}`}>
      <div className="bg-gradient-to-r from-primary to-primary/90 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary-foreground" />
            <span className="text-sm font-medium text-primary-foreground">Business Enquiry Form</span>
          </div>
        </div>
      </div>
      <CardContent className="p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-foreground">Contact {businessName}</h3>
          <p className="text-sm text-muted-foreground">
            {isBlocked ? "Rate limit exceeded. Please wait before trying again." : "Submit your project details and the business will respond directly to your email."}
          </p>
        </div>
        
        <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <HoneypotField onBotDetected={() => setBotDetected(true)} />
          
          {/* Contact Details */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1 border-b border-border">Your Contact Details</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-name" className="text-sm font-medium">Full Name <span className="text-destructive">*</span></Label>
                <Input id="lead-name" placeholder="Enter your full name" {...register("name")} className={`h-10 ${errors.name ? "border-destructive" : ""}`} disabled={isBlocked} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-email" className="text-sm font-medium">Email Address <span className="text-destructive">*</span></Label>
                <Input id="lead-email" type="email" placeholder="your@email.com" {...register("email")} className={`h-10 ${errors.email ? "border-destructive" : ""}`} disabled={isBlocked} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone" className="text-sm font-medium">Phone Number <span className="text-muted-foreground text-xs">(Optional)</span></Label>
              <Input id="lead-phone" type="tel" placeholder="021 123 4567" {...register("phone")} className="h-10" disabled={isBlocked} />
            </div>
          </div>
          
          {/* Project Details */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1 border-b border-border">Your Enquiry</div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-message" className="text-sm font-medium">Message <span className="text-destructive">*</span></Label>
              <Textarea 
                id="lead-message" 
                placeholder="Please describe your project requirements, timeline, and any specific questions you have for the business." 
                rows={5} 
                {...register("message")} 
                className={`resize-none ${errors.message ? "border-destructive" : ""}`} 
                disabled={isBlocked} 
              />
              {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
            </div>
          </div>
          
          <div className="pt-3 border-t border-border">
            <Button type="submit" className="w-full h-11 font-semibold" disabled={isSubmitting || isBlocked}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting Enquiry...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Enquiry
                </>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-3">
              Your contact details will be shared with {businessName} to facilitate this enquiry. By submitting, you agree to our privacy policy.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LeadContactForm;