import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "react-router-dom";
import { Check, Gift, Users, DollarSign, Copy, Share2, Trophy, ArrowRight, Sparkles, LayoutDashboard, Link2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sendReferralConfirmation, notifyAdmin } from "@/lib/emailService";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { ReferralDashboard } from "@/components/referral/ReferralDashboard";
import { ReferralLeaderboard } from "@/components/referral/ReferralLeaderboard";
import { ReferralLinkGenerator } from "@/components/referral/ReferralLinkGenerator";
import { useReferralSettings } from "@/hooks/useReferralSettings";

const referralSchema = z.object({
  referrerName: z.string().min(2, "Name must be at least 2 characters").max(100),
  referrerEmail: z.string().email("Please enter a valid email"),
  referrerPhone: z.string().optional(),
  referredCompanyName: z.string().min(2, "Company name must be at least 2 characters").max(200),
  referredCompanyEmail: z.string().email("Please enter a valid company email"),
  referralPlan: z.enum(["premium", "elite"]),
});

type ReferralFormData = z.infer<typeof referralSchema>;

const ReferralProgram = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const { premiumReward, eliteReward } = useReferralSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [referrerCode, setReferrerCode] = useState<string | null>(null);

  // Capture referral code from URL
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      setReferrerCode(refCode);
      // Store in localStorage for persistence
      localStorage.setItem("referrer_code", refCode);
    } else {
      // Check localStorage for previously stored code
      const storedCode = localStorage.getItem("referrer_code");
      if (storedCode) {
        setReferrerCode(storedCode);
      }
    }
  }, [searchParams]);

  // Get real plan prices from database
  const premiumPlan = plans.find(p => p.plan_key === 'premium');
  const elitePlan = plans.find(p => p.plan_key === 'elite');
  const premiumPrice = premiumPlan?.price_monthly || 135;
  const elitePrice = elitePlan?.price_monthly || 349;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ReferralFormData>({
    resolver: zodResolver(referralSchema),
    defaultValues: {
      referralPlan: "premium",
    },
  });

  const selectedPlan = watch("referralPlan");

  const onSubmit = async (data: ReferralFormData) => {
    setIsSubmitting(true);
    try {
      // Use dynamic reward from admin settings
      const rewardAmount = data.referralPlan === 'elite' ? eliteReward : premiumReward;
      
      const { data: result, error } = await supabase
        .from("partner_referrals")
        .insert({
          referrer_name: data.referrerName,
          referrer_email: data.referrerEmail,
          referrer_phone: data.referrerPhone || null,
          referrer_user_id: user?.id || null,
          referred_company_name: data.referredCompanyName,
          referred_company_email: data.referredCompanyEmail,
          referral_plan: data.referralPlan,
          reward_amount: rewardAmount,
        })
        .select("referral_code")
        .single();

      if (error) throw error;

      const generatedCode = result.referral_code;
      setReferralCode(generatedCode);

      // Send confirmation email to referrer
      sendReferralConfirmation(
        data.referrerEmail,
        data.referrerName,
        data.referredCompanyName,
        data.referralPlan,
        generatedCode
      ).catch(console.error);

      // Notify admin about new referral
      notifyAdmin({
        type: "referral",
        data: {
          referrerName: data.referrerName,
          referrerEmail: data.referrerEmail,
          referrerPhone: data.referrerPhone,
          referredCompanyName: data.referredCompanyName,
          referredCompanyEmail: data.referredCompanyEmail,
          referralPlan: data.referralPlan,
        },
      }).catch(console.error);

      toast({
        title: "Referral Submitted!",
        description: "We'll notify you when your referral signs up. Thank you for spreading the word!",
      });
      reset();
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/list-business?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link Copied!",
      description: "Share this link with potential businesses.",
    });
  };

  const benefits = [
    {
      icon: DollarSign,
      title: `$${premiumReward} for Premium Referrals`,
      description: `Earn $${premiumReward} for each business that subscribes to our Premium plan ($${premiumPrice}/mo) through your referral.`,
    },
    {
      icon: Gift,
      title: `$${eliteReward} for Elite Referrals`,
      description: `Earn $${eliteReward} for each business that subscribes to our Elite plan ($${elitePrice}/mo) through your referral.`,
    },
    {
      icon: Users,
      title: "Open to Everyone",
      description: "You don't need to be a business owner. Anyone can join and start earning rewards.",
    },
    {
      icon: Trophy,
      title: "No Limit on Earnings",
      description: "Refer as many businesses as you want. There's no cap on how much you can earn.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Submit a Referral",
      description: "Fill out the form with details of the business you're referring.",
    },
    {
      number: "02",
      title: "Business Signs Up",
      description: "The referred business subscribes to a Premium or Elite plan.",
    },
    {
      number: "03",
      title: "Get Rewarded",
      description: "Receive your reward once the subscription is confirmed.",
    },
  ];

  return (
    <>
      <Helmet>
        <title>Partner Referral Program | Wellington EcoBuild</title>
        <meta
          name="description"
          content="Earn rewards by referring sustainable construction businesses to Wellington EcoBuild. $50 for Premium, $100 for Elite referrals."
        />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-28 bg-gradient-to-br from-primary/10 via-background to-accent/10 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5" />
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Exclusive Referral Program
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Earn Rewards by Growing{" "}
                <span className="text-accent">Wellington's Green Network</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                Join Wellington's exclusive partner referral program. Earn up to $100 for every 
                sustainable construction business you bring to our platform.
              </p>
              <Button size="lg" className="gap-2" onClick={() => document.getElementById('referral-form')?.scrollIntoView({ behavior: 'smooth' })}>
                Start Referring <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 lg:py-24 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Join Our Referral Program?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Simple, transparent, and rewarding. Here's what makes our program stand out.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => (
                <Card key={index} className="bg-card border-border/50 hover:border-accent/50 transition-colors">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                      <benefit.icon className="w-6 h-6 text-accent" />
                    </div>
                    <CardTitle className="text-lg">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground">
                      {benefit.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* My Referral Link Section */}
        <section className="py-12 lg:py-16 bg-secondary/20">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-4">
                  <Link2 className="w-4 h-4" />
                  Share & Earn
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  Get Your Unique Referral Link
                </h2>
                <p className="text-muted-foreground">
                  Share your personal link and earn rewards when businesses sign up
                </p>
              </div>
              <ReferralLinkGenerator />
              {referrerCode && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                  <p className="text-sm text-green-600">
                    You came via referral code: <strong>{referrerCode}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Leaderboard Section */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <ReferralLeaderboard />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How It Works
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Three simple steps to start earning rewards.
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8">
                {steps.map((step, index) => (
                  <div key={index} className="relative text-center">
                    <div className="text-6xl font-bold text-accent/20 mb-4">{step.number}</div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                    {index < steps.length - 1 && (
                      <div className="hidden md:block absolute top-8 right-0 translate-x-1/2 w-12">
                        <ArrowRight className="w-6 h-6 text-accent/40" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Referral Form Section */}
        <section id="referral-form" className="py-16 lg:py-24 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Submit Your Referral
                </h2>
                <p className="text-muted-foreground">
                  Fill out the form below to refer a business. We'll handle the rest.
                </p>
              </div>

              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Your Information */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground">Your Information</h3>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="referrerName">Your Name *</Label>
                          <Input
                            id="referrerName"
                            placeholder="John Smith"
                            {...register("referrerName")}
                            className={errors.referrerName ? "border-destructive" : ""}
                          />
                          {errors.referrerName && (
                            <p className="text-sm text-destructive">{errors.referrerName.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="referrerEmail">Your Email *</Label>
                          <Input
                            id="referrerEmail"
                            type="email"
                            placeholder="john@example.com"
                            {...register("referrerEmail")}
                            className={errors.referrerEmail ? "border-destructive" : ""}
                          />
                          {errors.referrerEmail && (
                            <p className="text-sm text-destructive">{errors.referrerEmail.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="referrerPhone">Your Phone (Optional)</Label>
                        <Input
                          id="referrerPhone"
                          type="tel"
                          placeholder="+64 21 123 4567"
                          {...register("referrerPhone")}
                        />
                      </div>
                    </div>

                    {/* Referred Company Information */}
                    <div className="space-y-4 pt-4 border-t border-border">
                      <h3 className="font-semibold text-foreground">Referred Company Information</h3>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="referredCompanyName">Company Name *</Label>
                          <Input
                            id="referredCompanyName"
                            placeholder="Green Building Co."
                            {...register("referredCompanyName")}
                            className={errors.referredCompanyName ? "border-destructive" : ""}
                          />
                          {errors.referredCompanyName && (
                            <p className="text-sm text-destructive">{errors.referredCompanyName.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="referredCompanyEmail">Company Email *</Label>
                          <Input
                            id="referredCompanyEmail"
                            type="email"
                            placeholder="info@greenbuilding.co.nz"
                            {...register("referredCompanyEmail")}
                            className={errors.referredCompanyEmail ? "border-destructive" : ""}
                          />
                          {errors.referredCompanyEmail && (
                            <p className="text-sm text-destructive">{errors.referredCompanyEmail.message}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Plan Selection */}
                    <div className="space-y-4 pt-4 border-t border-border">
                      <h3 className="font-semibold text-foreground">Select Referral Plan</h3>
                      
                      <RadioGroup
                        value={selectedPlan}
                        onValueChange={(value) => setValue("referralPlan", value as "premium" | "elite")}
                        className="grid sm:grid-cols-2 gap-4"
                      >
                        <label
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedPlan === "premium"
                              ? "border-accent bg-accent/5"
                              : "border-border hover:border-accent/50"
                          }`}
                        >
                          <RadioGroupItem value="premium" id="premium" />
                          <div className="flex-1">
                            <div className="font-semibold text-foreground">Premium Plan</div>
                            <div className="text-sm text-muted-foreground">${premiumPrice}/month</div>
                            <div className="text-accent font-bold mt-1">You earn: ${premiumReward}</div>
                          </div>
                        </label>

                        <label
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedPlan === "elite"
                              ? "border-accent bg-accent/5"
                              : "border-border hover:border-accent/50"
                          }`}
                        >
                          <RadioGroupItem value="elite" id="elite" />
                          <div className="flex-1">
                            <div className="font-semibold text-foreground">Elite Plan</div>
                            <div className="text-sm text-muted-foreground">${elitePrice}/month</div>
                            <div className="text-accent font-bold mt-1">You earn: ${eliteReward}</div>
                          </div>
                        </label>
                      </RadioGroup>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit Referral"}
                    </Button>
                  </form>

                  {/* Referral Link After Submission */}
                  {referralCode && (
                    <div className="mt-6 p-4 bg-accent/10 rounded-xl border border-accent/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-5 h-5 text-accent" />
                        <span className="font-semibold text-foreground">Your Shareable Referral Link</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={`${window.location.origin}/list-business?ref=${referralCode}`}
                          className="bg-background text-sm"
                        />
                        <Button variant="outline" size="icon" onClick={copyReferralLink}>
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button variant="outline" size="icon" onClick={copyReferralLink}>
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Share this link with businesses to track your referrals automatically.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Dashboard Section for Logged-in Users */}
        {user && (
          <section id="my-referrals" className="py-16 lg:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                      My Referrals
                    </h2>
                    <p className="text-muted-foreground">
                      Track your submitted referrals and earnings
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-accent">
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="font-medium">Dashboard</span>
                  </div>
                </div>
                <ReferralDashboard />
              </div>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Frequently Asked Questions
                </h2>
              </div>
              <div className="space-y-6">
                <div className="p-6 rounded-xl bg-card border border-border">
                  <h3 className="font-semibold text-foreground mb-2">When do I get paid?</h3>
                  <p className="text-muted-foreground">
                    You receive your reward once the referred business completes their first successful subscription payment.
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border">
                  <h3 className="font-semibold text-foreground mb-2">How do I receive my reward?</h3>
                  <p className="text-muted-foreground">
                    We'll contact you via email to arrange payment through bank transfer or PayPal.
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border">
                  <h3 className="font-semibold text-foreground mb-2">Is there a limit to how many businesses I can refer?</h3>
                  <p className="text-muted-foreground">
                    No limit! Refer as many businesses as you want and earn rewards for each successful subscription.
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border">
                  <h3 className="font-semibold text-foreground mb-2">Can I refer a business that's already listed?</h3>
                  <p className="text-muted-foreground">
                    Referrals only count for new businesses or existing free-tier businesses upgrading to Premium or Elite.
                  </p>
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

export default ReferralProgram;
