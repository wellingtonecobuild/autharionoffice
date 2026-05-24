import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin, MessageSquare, Building, Shield, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { contactFormSchema, ContactFormData } from "@/lib/validation";
import { toast } from "sonner";
import HoneypotField, { useHoneypotCheck } from "@/components/security/HoneypotField";
import { useFormProtection } from "@/hooks/useFormProtection";

const contactOptions = [
  {
    icon: MessageSquare,
    title: "General Inquiries",
    description: "Questions about using the platform"
  },
  {
    icon: Building,
    title: "Business Listings",
    description: "Help with your business profile"
  },
  {
    icon: Shield,
    title: "Verification Support",
    description: "Questions about the verification process"
  }
];

const Contact = () => {
  const email = "info@wellingtonecobuild.nz";
  const urgentEmail = "beveckbusiness@gmail.com";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [botDetected, setBotDetected] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { checkHoneypot } = useHoneypotCheck(formRef);
  
  // Rate limiting: 5 submissions per minute
  const { checkProtection, isBlocked, remainingAttempts } = useFormProtection({
    action: 'contact_form',
    maxAttempts: 5,
    windowMs: 60000,
    minFillTimeMs: 2000 // Minimum 2 seconds to fill form
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    // Check honeypot fields
    if (checkHoneypot() || botDetected) {
      setIsSubmitted(true);
      return;
    }

    // Check rate limiting and bot protection
    const protection = checkProtection();
    if (!protection.allowed) {
      toast.error(protection.error || "Please try again later.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Run contact_submissions insert and communication_threads insert in parallel
      const [, threadResult] = await Promise.all([
        supabase.from("contact_submissions").insert({
          name: data.name,
          email: data.email,
          subject: data.subject || null,
          message: data.message,
        }),
        supabase.from("communication_threads").insert({
          subject: data.subject || 'Contact Form Submission',
          channel_type: 'contact_form',
          status: 'unread',
          priority: 'normal',
          category: 'support',
          initiator_email: data.email,
          initiator_name: data.name,
          initiator_role: 'visitor'
        }).select().single()
      ]);

      if (threadResult.error) throw threadResult.error;

      // Show success immediately - user doesn't need to wait for emails
      setIsSubmitted(true);
      reset();
      toast.success("Message sent successfully! We'll get back to you soon.");

      // Fire-and-forget: create message and send emails in background
      const threadId = threadResult.data.id;
      Promise.all([
        supabase.from("communication_messages").insert({
          thread_id: threadId,
          sender_email: data.email,
          sender_name: data.name,
          sender_role: 'visitor',
          content: data.message
        }),
        supabase.functions.invoke('send-contact-confirmation', {
          body: { name: data.name, email: data.email, subject: data.subject || 'Contact Form Submission', message: data.message, thread_id: threadId }
        }),
        supabase.functions.invoke('notify-admin', {
          body: { type: 'contact', data: { name: data.name, email: data.email, subject: data.subject || 'Contact Form Submission', message: data.message, thread_id: threadId } }
        })
      ]).catch(console.error);

    } catch (error: any) {
      toast.error(error.message || "Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact & Support | Wellington EcoBuild</title>
        <meta name="description" content="Get in touch with Wellington EcoBuild for support, business inquiries, or verification questions." />
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Official Hero Banner */}
        <section className="bg-gradient-to-br from-primary via-primary to-primary/90 py-16 lg:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="container mx-auto px-4 text-center relative">
            {/* Official Logo */}
            <div className="flex justify-center mb-6">
              <img 
                src="https://duumxykzcliujgyrmzvn.supabase.co/storage/v1/object/public/avatars/wellington-ecobuild-logo-PQDk3oCl.png" 
                alt="Wellington EcoBuild"
                className="h-16 w-auto"
                loading="eager"
              />
            </div>
            <Badge variant="outline" className="mb-4 border-accent/50 text-accent bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">
              Official Contact
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              Contact & Support Centre
            </h1>
            <p className="text-primary-foreground/90 text-lg max-w-2xl mx-auto leading-relaxed">
              Official enquiries and support for Wellington's verified building industry directory. 
              Our team responds to all correspondence within 1–2 business days.
            </p>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 lg:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {/* Left Column - Official Contact Form */}
              <div className="space-y-8">
                {/* Section 1: Primary Contact Email */}
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
                  <div className="bg-primary/10 px-6 py-3 border-b border-primary/10">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Primary Contact</span>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Mail className="w-7 h-7 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-foreground mb-1">Email Correspondence</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                          For all official enquiries, please contact us via email. This is our primary communication channel for all subscription tiers.
                        </p>
                        <Button variant="outline" size="lg" className="w-full justify-center border-primary/30 hover:bg-primary/5" asChild>
                          <a href={`mailto:${email}`}>
                            <Mail className="w-4 h-4 mr-2" />
                            {email}
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section 2: Official Contact Form */}
                <Card className="border-border/50 shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-primary to-primary/90 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-primary-foreground">Submit an Enquiry</h2>
                        <p className="text-primary-foreground/80 text-sm">Official correspondence form</p>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    {isSubmitted ? (
                      <div className="text-center py-10">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                          <CheckCircle className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="font-display text-2xl font-semibold text-foreground mb-3">
                          Enquiry Received
                        </h3>
                        <p className="text-muted-foreground mb-2 max-w-sm mx-auto">
                          Thank you for contacting Wellington EcoBuild. Your enquiry has been logged in our system.
                        </p>
                        <p className="text-sm text-muted-foreground mb-8">
                          Expected response time: <span className="font-semibold text-foreground">1–2 business days</span>
                        </p>
                        <Button variant="outline" onClick={() => setIsSubmitted(false)} className="px-6">
                          Submit Another Enquiry
                        </Button>
                      </div>
                    ) : (
                      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <HoneypotField onBotDetected={() => setBotDetected(true)} />
                        
                        {/* Personal Details Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Details</span>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="name" className="text-sm font-medium">
                                Full Name <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="name"
                                placeholder="Enter your full name"
                                {...register("name")}
                                className={`h-11 ${errors.name ? "border-destructive focus:ring-destructive" : "focus:ring-primary/20"}`}
                              />
                              {errors.name && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {errors.name.message}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email" className="text-sm font-medium">
                                Email Address <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                {...register("email")}
                                className={`h-11 ${errors.email ? "border-destructive focus:ring-destructive" : "focus:ring-primary/20"}`}
                              />
                              {errors.email && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {errors.email.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Enquiry Details Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enquiry Details</span>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="subject" className="text-sm font-medium">Subject</Label>
                            <Input
                              id="subject"
                              placeholder="Brief description of your enquiry"
                              {...register("subject")}
                              className="h-11 focus:ring-primary/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="message" className="text-sm font-medium">
                              Message <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                              id="message"
                              placeholder="Please provide detailed information about your enquiry. Include any relevant reference numbers or business names if applicable."
                              rows={6}
                              {...register("message")}
                              className={`resize-none ${errors.message ? "border-destructive focus:ring-destructive" : "focus:ring-primary/20"}`}
                            />
                            {errors.message && (
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.message.message}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Submit Section */}
                        <div className="pt-4 border-t border-border">
                          <Button 
                            type="submit" 
                            className="w-full h-12 text-base font-semibold" 
                            size="lg" 
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Submitting Enquiry...
                              </>
                            ) : (
                              <>
                                <Mail className="w-5 h-5 mr-2" />
                                Submit Enquiry
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-muted-foreground text-center mt-3">
                            By submitting this form, you agree to our privacy policy. Your information will be handled in accordance with New Zealand privacy legislation.
                          </p>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Info Sections */}
              <div className="space-y-8">
                {/* Section 3: How Can We Help? */}
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                    How Can We Help?
                  </h3>
                  <div className="space-y-3">
                    {contactOptions.map((option) => (
                      <div 
                        key={option.title} 
                        className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border"
                      >
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                          <option.icon className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{option.title}</h4>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 4: Location */}
                <div className="bg-muted rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Location</h3>
                      <p className="text-muted-foreground">Wellington, New Zealand</p>
                    </div>
                  </div>
                </div>

                {/* Section 5: Response Times */}
                <div className="p-6 bg-background rounded-2xl border border-border">
                  <h4 className="font-semibold text-foreground mb-3">Response Times</h4>
                  <p className="text-muted-foreground text-sm mb-4">
                    We aim to respond to all inquiries within 1–2 business days. For urgent listing issues, please include "URGENT" in your subject line.
                  </p>
                </div>

                {/* Urgent Support Section */}
                <div className="p-6 bg-amber-500/5 rounded-2xl border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Urgent Support</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        For urgent matters, contact our admin directly at:
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`mailto:${urgentEmail}`}>
                          <Mail className="w-4 h-4 mr-2" />
                          {urgentEmail}
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Contact;