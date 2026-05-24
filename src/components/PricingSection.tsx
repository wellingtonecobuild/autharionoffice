// Annual billing toggle enabled
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, Sparkles, Crown, Zap, Loader2, Clock, Users, TrendingUp, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useBusinessCount } from "@/hooks/useBusinessCount";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { useEliteAvailability, formatCategoryName } from "@/hooks/useEliteAvailability";

const iconMap: Record<string, any> = {
  zap: Zap,
  sparkles: Sparkles,
  crown: Crown,
};

type BillingCycle = 'monthly' | 'annual';

const PricingSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const { data: businessCount } = useBusinessCount();
  const { data: eliteCaps, isLoading: eliteCapsLoading } = useEliteAvailability();

  // Calculate total Elite availability across all categories
  const totalEliteSlots = eliteCaps?.reduce((sum, c) => sum + c.max_slots, 0) ?? 0;
  const totalEliteUsed = eliteCaps?.reduce((sum, c) => sum + c.current_count, 0) ?? 0;
  const totalEliteRemaining = totalEliteSlots - totalEliteUsed;
  const isEliteAvailable = totalEliteRemaining > 0 && eliteCaps?.some(c => c.is_accepting_new && c.current_count < c.max_slots);

  const handleSubscribe = async (planKey: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in or create an account to continue.",
      });
      const redirectTo = encodeURIComponent(`/list-business?plan=${planKey}&billing=${billingCycle}`);
      navigate(`/auth?redirect=${redirectTo}`);
      return;
    }

    // For Elite, check availability
    if (planKey === "elite" && !isEliteAvailable) {
      toast({
        title: "Elite slots are full",
        description: "All Elite positions are currently filled. Please join the waitlist.",
        variant: "destructive",
      });
      return;
    }

    navigate(`/list-business?plan=${planKey}&billing=${billingCycle}`);
  };

  if (plansLoading) {
    return (
      <section className="py-24 lg:py-32 bg-muted/30 relative overflow-hidden">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 lg:py-32 bg-muted/30 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
      
      <div className="container mx-auto px-4 relative">
        {/* Header with Social Proof */}
        <div className="text-center max-w-3xl mx-auto mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/15 text-accent text-sm font-semibold mb-6">
            <TrendingUp className="w-4 h-4" />
            {businessCount !== null && businessCount > 0 
              ? `Join ${businessCount} Wellington eco-business${businessCount !== 1 ? 'es' : ''}`
              : 'Join Wellington eco-businesses'
            }
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-4">
            Invest in Your Business Visibility
          </h2>
          <p className="text-muted-foreground text-lg mb-6">
            Choose your billing cycle. No hidden fees. Cancel anytime.
          </p>
          
          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'annual'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs text-accent">(Save with yearly billing)</span>
            </button>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center gap-6 mb-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-primary" />
            <span>Secure payments via Stripe</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4 text-primary" />
            <span>Trusted by local businesses</span>
          </div>
        </div>

        {/* Billing Cycle Toggle - Annual Highlighted */}
        <div className="flex flex-col items-center justify-center mb-10 gap-2">
          <div className="inline-flex items-center gap-1 p-1.5 bg-muted rounded-xl border-2 border-primary/20">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`relative px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                billingCycle === 'annual'
                  ? 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/50'
                  : 'bg-primary/10 text-primary hover:bg-primary/20 ring-1 ring-primary/30'
              }`}
            >
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full uppercase tracking-wide whitespace-nowrap">
                Best Value
              </span>
              Annual
              <span className="ml-1.5 text-xs opacity-90">(Save ~17%)</span>
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            💡 Switch to <span className="font-medium text-primary">Annual</span> and save 2 months free
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => {
            const IconComponent = iconMap[plan.icon || 'zap'] || Zap;
            const features = Array.isArray(plan.features) ? plan.features : [];
            const isPopular = plan.is_popular;
            const isElite = plan.plan_key === 'elite';
            const isFree = plan.plan_key === 'free';
            const eliteIsFull = isElite && !isEliteAvailable;
            
            return (
              <div
                key={plan.id}
                className={`relative bg-card rounded-2xl p-6 lg:p-8 border transition-all duration-500 animate-fade-up group hover:-translate-y-1 ${
                  isPopular
                    ? "border-accent shadow-premium scale-[1.02] z-10"
                    : "border-border hover:border-accent/40 hover:shadow-elegant"
                }`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold shadow-lg">
                      <Sparkles className="w-3 h-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Elite Scarcity Indicator - Highly Visible */}
                {isElite && !eliteCapsLoading && (
                  <div className="mb-4">
                    {eliteIsFull ? (
                      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-destructive/20 via-destructive/10 to-destructive/20 border-2 border-destructive/50 p-3 animate-pulse">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-destructive/5 to-transparent animate-shimmer" />
                        <div className="flex items-center justify-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive animate-bounce" />
                          <span className="text-destructive font-bold text-sm tracking-wide">
                            ALL ELITE SLOTS FILLED
                          </span>
                          <AlertTriangle className="w-4 h-4 text-destructive animate-bounce" />
                        </div>
                      </div>
                    ) : (
                      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-red-500/20 via-red-600/15 to-red-500/20 border-2 border-red-500/60 p-3 shadow-lg shadow-red-500/20">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                        <div className="flex flex-col items-center gap-1 relative z-10">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                            </span>
                            <span className="text-red-600 dark:text-red-400 font-extrabold text-sm tracking-wide uppercase">
                              Limited Availability
                            </span>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                            </span>
                          </div>
                          <div className="text-red-700 dark:text-red-300 font-bold text-base">
                            Limited to 10 per category • <span className="text-red-600 dark:text-red-400 text-lg">{totalEliteRemaining}</span> slots available
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Badge - Only show if not Elite (Elite has its own) */}
                {plan.badge_text && !isPopular && !isElite && (
                  <div className="mb-4">
                    <Badge 
                      variant="outline" 
                      className="border-accent/50 text-accent bg-accent/5 text-xs font-medium"
                    >
                      {plan.badge_text}
                    </Badge>
                  </div>
                )}

                {/* Header */}
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 transition-transform group-hover:scale-110 ${
                    isPopular ? "bg-accent" : isElite ? "bg-gradient-to-br from-accent to-accent/60" : "bg-muted"
                  }`}>
                    <IconComponent className={`w-5 h-5 ${isPopular || isElite ? "text-accent-foreground" : "text-foreground"}`} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {plan.name}
                  </h3>
                  {isPopular ? (
                    <>
                      {/* Value highlight for Premium */}
                      {billingCycle === 'annual' && (
                        <div className="mb-3 px-3 py-2 rounded-lg bg-gradient-to-r from-accent/20 via-accent/15 to-accent/20 border-2 border-accent/50">
                          <div className="flex items-center justify-center gap-2">
                            <Crown className="w-4 h-4 text-accent" />
                            <span className="text-accent font-bold text-sm">
                              Save ~17% with Annual
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-accent/15 via-accent/10 to-primary/15 border border-accent/30 shadow-sm">
                        <p className="text-sm font-semibold text-accent mb-1">
                          🚀 For businesses ready to grow
                        </p>
                        <p className="text-xs text-foreground/80">
                          Get more enquiries • Build instant trust • Stand out from competitors
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className={`text-sm mb-4 px-3 py-2 rounded-lg ${
                      isFree 
                        ? "bg-primary/10 text-primary font-medium border border-primary/20" 
                        : isElite 
                          ? "bg-gradient-to-r from-accent/10 to-primary/10 text-foreground font-medium border border-accent/20" 
                          : "text-muted-foreground"
                    }`}>
                      {plan.description}
                    </p>
                  )}
                  {/* Price Display */}
                  {billingCycle === 'annual' && plan.price_annual ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-foreground">
                          ${plan.price_annual.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">/year</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Billed yearly • Charged immediately</p>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-foreground">
                        ${plan.price_monthly}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  )}
                  {!isFree && plan.gst_included && (
                    <p className="text-xs text-muted-foreground mt-1">inc. GST • Cancel anytime</p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {features.map((feature: any, fIndex: number) => (
                    <li key={fIndex} className="flex items-start gap-3">
                      {feature.included !== false ? (
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <X className="w-3 h-3 text-muted-foreground/50" />
                        </div>
                      )}
                      <span className={`text-sm ${feature.included !== false ? "text-foreground" : "text-muted-foreground/50"}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isElite && eliteIsFull ? (
                  <div className="space-y-2">
                    <p className="text-center text-sm text-muted-foreground mb-3">
                      Elite placements in this category are currently full
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      size="lg"
                      onClick={() => navigate("/contact?subject=Elite%20Waitlist&message=I%20would%20like%20to%20join%20the%20Elite%20waitlist.%20Please%20notify%20me%20when%20a%20slot%20becomes%20available.")}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Join Elite Waitlist
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-sm"
                      onClick={() => handleSubscribe("premium")}
                    >
                      Upgrade to Premium instead
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      variant={isPopular ? "default" : isElite ? "premium" : "outline"}
                      className={`w-full transition-all duration-300 ${
                        isPopular ? "shadow-md hover:shadow-lg" : ""
                      } ${isElite ? "bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70" : ""}`}
                      size="lg"
                      onClick={() => handleSubscribe(plan.plan_key)}
                      disabled={loading === plan.plan_key || plansLoading}
                    >
                      {loading === plan.plan_key && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Apply to Be Listed
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center leading-snug">
                      We only accept a limited number of verified builders per area.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Trust Note */}
        <div className="text-center mt-12 space-y-4">
          <p className="text-sm text-muted-foreground">
            All plans include GST. Payments secured by Stripe.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <span>✓ 30-day money-back guarantee</span>
            <span>✓ No lock-in contracts</span>
            <span>✓ Upgrade or cancel anytime</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
