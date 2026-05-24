import { ShieldCheck, Lock, Eye, CreditCard, Activity } from "lucide-react";

const SecurityBadge = () => {
  const securityFeatures = [
    {
      icon: CreditCard,
      text: "Payments are processed securely via Stripe (PCI-DSS compliant)",
    },
    {
      icon: Lock,
      text: "No card or bank details are ever stored on our servers",
    },
    {
      icon: ShieldCheck,
      text: "All data is protected with industry-standard encryption",
    },
    {
      icon: Eye,
      text: "Business information is verified and securely handled",
    },
    {
      icon: Activity,
      text: "Continuous monitoring for security, fraud, and abuse",
    },
  ];

  return (
    <section className="py-16 lg:py-20 bg-muted/30 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge Header */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <span className="text-sm font-semibold text-accent">This Site Is Safe</span>
          </div>

          <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-3">
            Wellington EcoBuild is a secure, trusted platform.
          </h2>

          <p className="text-muted-foreground mb-8">
            Your privacy and security come first.
          </p>

          {/* Security Features List */}
          <div className="space-y-3 text-left max-w-xl mx-auto">
            {securityFeatures.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border/50"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-4 h-4 text-accent" />
                </div>
                <span className="text-sm text-foreground/80 leading-relaxed pt-1">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecurityBadge;
