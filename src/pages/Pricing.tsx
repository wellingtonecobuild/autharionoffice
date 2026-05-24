import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PricingSection from "@/components/PricingSection";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2 } from "lucide-react";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";

const Pricing = () => {
  const { plans, loading } = useSubscriptionPlans();

  // Build comparison features dynamically from plans
  const buildComparisonFeatures = () => {
    if (!plans.length) return [];
    
    const featureMap: Record<string, { free: boolean; premium: boolean; elite: boolean }> = {};
    
    plans.forEach(plan => {
      const features = Array.isArray(plan.features) ? plan.features : [];
      features.forEach((f: any) => {
        if (!featureMap[f.text]) {
          featureMap[f.text] = { free: false, premium: false, elite: false };
        }
        if (f.included !== false) {
          featureMap[f.text][plan.plan_key as 'free' | 'premium' | 'elite'] = true;
        }
      });
    });
    
    return Object.entries(featureMap).map(([feature, values]) => ({
      feature,
      ...values
    }));
  };

  const comparisonFeatures = buildComparisonFeatures();

  return (
    <>
      <Helmet>
        <title>Pricing & Plans | Wellington EcoBuild</title>
        <meta name="description" content="Choose the right plan for your sustainable construction business. List your eco-building services on Wellington's premier directory." />
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="bg-gradient-to-br from-forest to-forest-light py-16 lg:py-20">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="outline" className="mb-4 border-accent/50 text-accent">
              Pricing
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              Grow Your Sustainable Business
            </h1>
            <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
              Choose the plan that fits your needs and connect with eco-conscious clients across Wellington.
            </p>
          </div>
        </section>

        {/* Who This Is For */}
        <section className="py-12 lg:py-16 bg-card">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-6">
                <h3 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Check className="w-5 h-5 text-accent" />
                  This Platform Is For
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                    Sustainability-certified construction professionals
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                    Eco-focused builders, suppliers, and architects
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                    Premium clients seeking quality sustainable services
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                    Homeowners committed to green building practices
                  </li>
                </ul>
              </div>
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6">
                <h3 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <X className="w-5 h-5 text-destructive" />
                  Not The Right Fit For
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    General contractors without sustainability focus
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    Price-first shoppers seeking cheapest options
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    Businesses unable to provide sustainability credentials
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    Services outside the Wellington region
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <PricingSection />

        {/* Feature Comparison */}
        <section className="py-16 lg:py-20 bg-muted">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">
                Feature Comparison
              </h2>
              <p className="text-muted-foreground">
                See exactly what's included in each plan.
              </p>
            </div>

            <div className="max-w-4xl mx-auto bg-card rounded-2xl border border-border overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 font-display font-semibold text-foreground">Features</th>
                        <th className="p-4 font-display font-semibold text-foreground text-center">Free</th>
                        <th className="p-4 font-display font-semibold text-foreground text-center bg-accent/5">Premium</th>
                        <th className="p-4 font-display font-semibold text-foreground text-center">Elite</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonFeatures.map((item, i) => (
                        <tr key={item.feature} className={i % 2 === 0 ? "bg-muted/50" : ""}>
                          <td className="p-4 text-sm text-foreground">{item.feature}</td>
                          <td className="p-4 text-center">
                            {item.free ? (
                              <Check className="w-5 h-5 text-accent mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-muted-foreground mx-auto" />
                            )}
                          </td>
                          <td className="p-4 text-center bg-accent/5">
                            {item.premium ? (
                              <Check className="w-5 h-5 text-accent mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-muted-foreground mx-auto" />
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {item.elite ? (
                              <Check className="w-5 h-5 text-accent mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-muted-foreground mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 lg:py-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-6">
              {[
                {
                  q: "Why can't Free listings show contact details?",
                  a: "Free listings provide discovery and visibility. To receive direct enquiries via phone, email, or website, upgrade to Premium. This ensures only serious businesses receive leads."
                },
                {
                  q: "How does the verification process work?",
                  a: "Our team manually verifies all professional registrations, certifications, and sustainability credentials before awarding the Verified badge. This ensures all listings meet our quality standards."
                },
                {
                  q: "Can I upgrade or downgrade my plan?",
                  a: "Yes, you can change your plan at any time from your dashboard. When upgrading, you'll get immediate access to new features. When downgrading, changes take effect at the end of your billing period."
                },
                {
                  q: "What payment methods do you accept?",
                  a: "We accept all major credit cards through our secure Stripe payment system. Monthly billing with GST included."
                },
                {
                  q: "How many job postings can I have?",
                  a: "Free listings cannot post jobs. Premium allows up to 2 active job postings. Elite includes unlimited job postings with spotlight rotation."
                },
              ].map((faq, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-display font-semibold text-foreground mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Pricing;
