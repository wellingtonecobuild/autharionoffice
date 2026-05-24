import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Camera, Leaf, Users, FileText, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const standards = [
  {
    icon: Camera,
    title: "Photo Quality Standards",
    requirements: [
      "Minimum resolution: 1200 x 800 pixels",
      "Professional quality images (well-lit, in-focus)",
      "Show actual completed projects",
      "No stock photos or AI-generated images",
      "At least 3 photos for Premium/Elite listings"
    ],
    notAllowed: [
      "Blurry or pixelated images",
      "Photos with visible watermarks",
      "Images that misrepresent your work"
    ]
  },
  {
    icon: Leaf,
    title: "Sustainability Proof",
    requirements: [
      "Valid sustainability certifications",
      "Documentation of eco-friendly practices",
      "Proof of sustainable materials used",
      "Evidence of energy-efficient methods"
    ],
    notAllowed: [
      "Unverifiable claims",
      "Expired certifications",
      "Misleading environmental statements"
    ]
  },
  {
    icon: Users,
    title: "Professional Conduct",
    requirements: [
      "Respond to inquiries within 48 hours",
      "Maintain professional communication",
      "Honor quoted prices and timelines",
      "Resolve disputes promptly and fairly"
    ],
    notAllowed: [
      "Spam or unsolicited marketing",
      "Discriminatory practices",
      "Misrepresentation of services",
      "Harassment of clients or competitors"
    ]
  },
  {
    icon: FileText,
    title: "Listing Content",
    requirements: [
      "Accurate business information",
      "Clear description of services offered",
      "Valid contact details",
      "Correct business category selection"
    ],
    notAllowed: [
      "False or misleading information",
      "Keyword stuffing or spam",
      "Inappropriate or offensive content",
      "Links to unrelated websites"
    ]
  }
];

const ListingStandards = () => {
  return (
    <>
      <Helmet>
        <title>Listing Quality Standards | Wellington EcoBuild</title>
        <meta name="description" content="Learn about our listing quality standards to ensure your business meets Wellington EcoBuild's requirements for sustainable construction professionals." />
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="bg-gradient-to-br from-forest to-forest-light py-16 lg:py-24">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="outline" className="mb-4 border-accent/50 text-accent">
              Quality First
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              Listing Quality Standards
            </h1>
            <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
              Maintaining high standards protects our community and ensures clients find genuine, quality sustainable construction professionals.
            </p>
          </div>
        </section>

        {/* Intro */}
        <section className="py-16 lg:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-muted-foreground text-lg">
                All businesses listed on Wellington EcoBuild must adhere to these quality standards. Failure to meet these standards may result in listing suspension or removal.
              </p>
            </div>
          </div>
        </section>

        {/* Standards */}
        <section className="pb-16 lg:pb-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-12">
              {standards.map((standard) => (
                <div key={standard.title} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="bg-muted p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <standard.icon className="w-6 h-6 text-accent" />
                    </div>
                    <h2 className="font-display text-xl font-bold text-foreground">
                      {standard.title}
                    </h2>
                  </div>
                  <div className="p-6 grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-accent" />
                        Requirements
                      </h3>
                      <ul className="space-y-2">
                        {standard.requirements.map((req) => (
                          <li key={req} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-destructive" />
                        Not Allowed
                      </h3>
                      <ul className="space-y-2">
                        {standard.notAllowed.map((item) => (
                          <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Enforcement */}
        <section className="py-16 lg:py-20 bg-muted">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-6 text-center">
                Enforcement
              </h2>
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <p className="text-muted-foreground">
                  Wellington EcoBuild reserves the right to:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 flex-shrink-0" />
                    Review and edit listing content for compliance
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 flex-shrink-0" />
                    Temporarily suspend listings pending review
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 flex-shrink-0" />
                    Permanently remove listings that violate standards
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 flex-shrink-0" />
                    Deny verification for non-compliant listings
                  </li>
                </ul>
                <p className="text-muted-foreground text-sm">
                  Businesses will be notified of any issues and given reasonable opportunity to rectify them before action is taken.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-4">
              Ready to Apply?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Ensure your listing meets our standards and apply to join Wellington's premier sustainable construction directory.
            </p>
            <div className="flex flex-col items-center">
              <Button asChild size="lg">
                <Link to="/list-business">Apply to Be Listed</Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                We only accept a limited number of verified builders per area.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default ListingStandards;
