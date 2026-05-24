import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Users, ShieldCheck, TrendingUp, Clock, CheckCircle2, Sparkles } from "lucide-react";
import { useBusinessCount } from "@/hooks/useBusinessCount";

const CTASection = () => {
  const { data: businessCount } = useBusinessCount();

  return (
    <section className="section-padding-lg bg-dark-gradient relative overflow-hidden">
      {/* Premium decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-[700px] h-[700px] bg-accent/[0.04] rounded-full blur-[150px] animate-float-slow" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-primary/[0.06] rounded-full blur-[120px] animate-float-delayed" />
        
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 0h1v40H0V0zm39 0h1v40h-1V0zM0 0h40v1H0V0zm0 39h40v1H0v-1z'/%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Section Header with Urgency */}
        <div className="text-center content-medium mb-20">
          {/* Scarcity indicator */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-accent/15 border border-accent/25 mb-8 animate-fade-up">
            <Clock className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-primary-foreground/90">
              Limited spots available in 2025
            </span>
            <Sparkles className="w-4 h-4 text-accent animate-subtle-pulse" />
          </div>
          
          <h2 className="animate-fade-up delay-100 font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground tracking-tight mb-6 text-balance">
            Position Your Business Where{" "}
            <span className="text-accent">Serious Clients Are Looking</span>
          </h2>
          <p className="animate-fade-up delay-200 text-xl text-primary-foreground/60 leading-relaxed max-w-2xl mx-auto">
            This is not a marketplace. It's a curated network for professionals who meet Wellington's highest standards.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* For Homeowners */}
          <div className="animate-fade-up delay-300 group bg-primary-foreground/[0.03] backdrop-blur-sm rounded-3xl p-8 lg:p-10 border border-primary-foreground/10 transition-all duration-500 hover:border-primary-foreground/20 hover:bg-primary-foreground/[0.05]">
            <div className="icon-container-lg bg-primary-foreground/[0.06] mb-8 group-hover:scale-110 transition-transform duration-500">
              <Users className="w-7 h-7 text-primary-foreground" />
            </div>
            <h3 className="font-display text-2xl font-bold text-primary-foreground mb-4">
              For Homeowners
            </h3>
            <p className="text-primary-foreground/60 mb-8 text-lg leading-relaxed">
              Build smarter. Choose verified professionals who meet Wellington's highest standards for sustainable construction.
            </p>
            <ul className="space-y-4 mb-10">
              {[
                "Browse verified eco-builders & suppliers",
                "Compare credentials & certifications",
                "Request quotes directly",
                "100% free to search & contact",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-primary-foreground/75">
                  <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button variant="hero-outline" size="lg" asChild className="w-full sm:w-auto group/btn rounded-xl">
              <Link to="/search">
                Find a Verified Professional
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
              </Link>
            </Button>
          </div>

          {/* For Businesses */}
          <div className="animate-fade-up delay-400 group relative bg-accent/10 backdrop-blur-sm rounded-3xl p-8 lg:p-10 border border-accent/25 transition-all duration-500 hover:border-accent/40 hover:bg-accent/15">
            {/* Popular badge */}
            <div className="absolute -top-3 right-8">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold shadow-premium">
                <Sparkles className="w-3 h-3" />
                Most Value
              </span>
            </div>
            
            <div className="icon-container-lg bg-accent mb-8 group-hover:scale-110 transition-transform duration-500">
              <Building2 className="w-7 h-7 text-accent-foreground" />
            </div>
            <h3 className="font-display text-2xl font-bold text-primary-foreground mb-4">
              For Sustainable Businesses
            </h3>
            <p className="text-primary-foreground/60 mb-8 text-lg leading-relaxed">
              Join Wellington's authority in eco-construction. Get verified, showcase your work, connect with serious clients.
            </p>
            <ul className="space-y-4 mb-10">
              {[
                "Verified sustainability credentials",
                "High-quality lead generation",
                "Showcase portfolio & certifications",
                "Track views, clicks & enquiries",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-primary-foreground/75">
                  <TrendingUp className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button variant="premium" size="lg" asChild className="w-full sm:w-auto group/btn rounded-xl shadow-premium">
              <Link to="/list-business">
                Apply for Listing
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Trust indicators with social proof */}
        <div className="animate-fade-up delay-500 mt-24 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/10 mb-8">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <span className="text-primary-foreground/75 text-sm font-medium">
              {businessCount !== null && businessCount > 0
                ? `Trusted by ${businessCount} Wellington sustainable construction professional${businessCount !== 1 ? 's' : ''}`
                : 'Trusted by Wellington sustainable construction professionals'
              }
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-primary-foreground/40 text-sm font-medium">
            {[
              "Human-Verified Listings",
              "Wellington-Only Network",
              "No Pay-to-Win Rankings",
            ].map((item) => (
              <span key={item} className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-accent/50" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
