import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Star, Users, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[85svh] flex items-center bg-subtle-gradient overflow-hidden">
      {/* Premium decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large ambient glow */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent/[0.04] rounded-full blur-[120px] animate-float-slow" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[100px] animate-float-delayed" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        {/* Decorative accent lines */}
        <div className="absolute top-1/4 right-1/4 w-32 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        <div className="absolute bottom-1/3 left-1/3 w-48 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
      </div>

      {/* Content - Centered, clean hierarchy */}
      <div className="container mx-auto px-6 sm:px-8 relative z-10 pt-28 sm:pt-32 pb-16 sm:pb-20">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Premium Social Proof Badge */}
          <div className="animate-fade-up inline-flex items-center gap-3 px-5 py-2.5 rounded-full glass-premium mb-10">
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-forest-light border-2 border-background flex items-center justify-center"
                    style={{ zIndex: 3 - i }}
                  >
                    <Users className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                ))}
              </div>
            </div>
            <div className="h-4 w-px bg-accent/30" />
            <span className="text-sm font-semibold text-foreground">
              Verified Professionals
            </span>
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-accent text-accent" />
              ))}
            </div>
          </div>

          {/* H1 - Primary Brand Positioning */}
          <h1 className="animate-fade-up delay-100 font-display text-secondary text-[2rem] sm:text-4xl lg:text-6xl leading-[1.1] tracking-tight mb-8">
            Wellington's Verified Directory for{" "}
            <span className="relative inline-block">
              <span className="text-gradient-primary">Qualified Builders & Construction Companies</span>
              <Sparkles className="absolute -top-2 -right-6 w-5 h-5 text-accent animate-subtle-pulse" />
            </span>
          </h1>

          {/* H2 - Supporting Sub-headline */}
          <p className="animate-fade-up delay-200 text-muted-foreground text-lg sm:text-xl lg:text-2xl leading-relaxed max-w-3xl mx-auto mb-6">
            A trust-based platform connecting Wellington homeowners and developers with verified, compliant construction professionals.
          </p>
          

          {/* Trust Signals - Above the fold verification badges */}
          <div className="animate-fade-up delay-300 flex flex-wrap justify-center gap-3 mb-8">
            {[
              { icon: Shield, text: "Verified Business Badge" },
              { icon: CheckCircle2, text: "Manual Vetting Process" },
              { icon: Star, text: "Wellington-Based Only" },
            ].map(({ icon: Icon, text }) => (
              <div 
                key={text}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/60 shadow-soft transition-all duration-300 hover:shadow-elegant hover:border-accent/30"
              >
                <Icon className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-foreground">{text}</span>
              </div>
            ))}
          </div>
          
          {/* Trust Statement */}
          <div className="animate-fade-up delay-350 mb-12">
            <p className="text-sm text-muted-foreground bg-muted/50 px-5 py-3 rounded-xl border border-border/40 inline-block">
              Every business on Wellington EcoBuild is manually reviewed before approval. No instant listings. No unverified profiles.
            </p>
          </div>

          {/* Two CTAs - Premium styling */}
          <div className="animate-fade-up delay-400 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="xl"
              onClick={() => navigate("/search")}
              className="h-14 px-10 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                Find a Professional
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </span>
            </Button>
            <div className="flex flex-col items-center">
              <Button
                variant="outline"
                size="xl"
                onClick={() => navigate("/pricing")}
                className="h-14 px-10 text-base font-semibold border-2 border-foreground/15 hover:border-foreground/25 text-foreground hover:bg-foreground/5 rounded-2xl transition-all duration-300"
              >
                Apply to Be Listed
              </Button>
              <p className="text-xs text-muted-foreground mt-2 max-w-[240px] text-center">
                We only accept a limited number of verified builders per area.
              </p>
            </div>
          </div>

          {/* Micro-commitment text */}
          <p className="animate-fade-up delay-500 text-sm text-muted-foreground mt-8 flex items-center justify-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/60" />
              Free to browse
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/60" />
              No account required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/60" />
              100% Wellington-focused
            </span>
          </p>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};

export default HeroSection;
