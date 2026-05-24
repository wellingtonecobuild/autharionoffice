import { Search, ClipboardCheck, MessageSquare, Building2 } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Search & Discover",
    description: "Browse our curated directory of verified sustainable construction professionals in Wellington.",
  },
  {
    icon: ClipboardCheck,
    title: "Compare & Verify",
    description: "Review certifications, ratings, portfolios, and sustainability credentials to find your perfect match.",
  },
  {
    icon: MessageSquare,
    title: "Connect Directly",
    description: "Use our secure lead form to contact businesses directly with your project requirements.",
  },
  {
    icon: Building2,
    title: "Build Sustainably",
    description: "Work with trusted local professionals to bring your eco-friendly project to life.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 lg:py-28 bg-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-muted/50 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
            Simple Process
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            How Wellington EcoBuild Works
          </h2>
          <p className="text-muted-foreground text-lg">
            Connect with Wellington's best sustainable construction professionals in four simple steps.
          </p>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Connector Line (Desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-full h-px bg-border" />
              )}

              {/* Step Number */}
              <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
                <div className="absolute inset-0 bg-muted rounded-2xl" />
                <div className="absolute inset-2 bg-card rounded-xl shadow-sm flex items-center justify-center">
                  <step.icon className="w-8 h-8 text-accent" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
              </div>

              {/* Content */}
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
