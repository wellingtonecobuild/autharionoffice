import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, MessageSquare, ArrowRight, Shield, Star, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Search Verified Professionals",
    description: "Browse our curated directory of sustainability-certified eco-builders, suppliers, architects, and renovation specialists across the Wellington region.",
    details: ["Filter by category, location, and certifications", "View detailed profiles with project portfolios", "Read reviews from verified clients"]
  },
  {
    number: "02",
    icon: CheckCircle,
    title: "Compare Credentials & Projects",
    description: "Evaluate professionals based on their sustainability certifications, completed projects, and client reviews to find the perfect match for your needs.",
    details: ["Verified Homestar & Passive House certifications", "Photo galleries of completed work", "Transparent pricing tiers"]
  },
  {
    number: "03",
    icon: MessageSquare,
    title: "Connect Directly",
    description: "Contact your chosen professionals directly through our secure platform. Premium and Elite listed businesses offer direct lead forms for faster response.",
    details: ["Secure contact forms", "Direct phone and email access", "Quick response from verified professionals"]
  }
];

const benefits = [
  {
    icon: Shield,
    title: "Verified Professionals Only",
    description: "Every listed business undergoes our manual verification process."
  },
  {
    icon: Star,
    title: "Quality Guaranteed",
    description: "We maintain strict listing standards to ensure quality."
  },
  {
    icon: Users,
    title: "Local Wellington Focus",
    description: "Exclusively serving the Greater Wellington region."
  }
];

const HowItWorks = () => {
  return (
    <>
      <Helmet>
        <title>How It Works | Wellington EcoBuild</title>
        <meta name="description" content="Learn how Wellington EcoBuild connects you with verified sustainable construction professionals in 3 simple steps." />
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="bg-gradient-to-br from-forest to-forest-light py-16 lg:py-24">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="outline" className="mb-4 border-accent/50 text-accent">
              Simple Process
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              Find Sustainable Construction Professionals
            </h1>
            <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto mb-8">
              Wellington EcoBuild makes it easy to connect with verified eco-builders, suppliers, and specialists in just three simple steps.
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-16">
              {steps.map((step, index) => (
                <div key={step.number} className="relative">
                  <div className={`flex flex-col lg:flex-row gap-8 items-start ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center relative">
                        <step.icon className="w-10 h-10 text-accent" />
                        <span className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center">
                          {step.number}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-3">
                        {step.title}
                      </h2>
                      <p className="text-muted-foreground text-lg mb-4">
                        {step.description}
                      </p>
                      <ul className="space-y-2">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                            <ArrowRight className="w-4 h-4 text-accent flex-shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute left-10 top-24 w-0.5 h-16 bg-border" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 lg:py-20 bg-muted">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">
                Why Choose Wellington EcoBuild?
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="text-center">
                  <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Start browsing our directory of verified sustainable construction professionals today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg">
                <Link to="/category/eco-builders">Browse Directory</Link>
              </Button>
              <div className="flex flex-col items-center">
                <Button variant="outline" asChild size="lg">
                  <Link to="/list-business">Apply to Be Listed</Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center max-w-[240px]">
                  We only accept a limited number of verified builders per area.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default HowItWorks;
