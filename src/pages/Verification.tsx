import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  FileCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Award, 
  Upload,
  Building2,
  FileText,
  ShieldCheck,
  Users,
  Lock,
  Eye,
  Scale
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DocumentUpload from "@/components/verification/DocumentUpload";

const certifications = [
  "Licensed Building Practitioner (LBP) Registration",
  "Homestar Certification (NZGBC)",
  "Passive House Certification (PHINZ)",
  "Green Building Council NZ (NZGBC) Membership",
  "Site Safe Certification",
  "NZ Master Builders Association Membership",
  "Registered Architect (NZRAB)",
  "Certified Builder (CBANZ)",
  "BRANZ Appraised Products Supplier",
  "Energy Efficiency and Conservation Authority (EECA) Accreditation",
  "ISO 14001 Environmental Management Certification",
  "WorkSafe NZ Health & Safety Certification",
  "Sustainable Business Network NZ Membership"
];

const processSteps = [
  {
    icon: Upload,
    title: "Document Submission",
    description: "Submit your NZ professional registrations, business registration (NZBN), and trade credentials through the secure document portal below.",
    status: "Step 1"
  },
  {
    icon: Eye,
    title: "Verification Review",
    description: "Our Wellington-based verification team reviews all documentation within 3-5 business days. We verify credentials against official NZ registers.",
    status: "Step 2"
  },
  {
    icon: ShieldCheck,
    title: "Verification Decision",
    description: "Upon successful verification, your listing displays the Verified Professional badge. All professionals must maintain current NZ certifications.",
    status: "Step 3"
  }
];

const acceptedIds = [
  { name: "NZ Driver Licence", description: "Current, unexpired licence" },
  { name: "NZ Passport", description: "Valid passport document" },
  { name: "RealMe Verified Identity", description: "Digital identity verification" },
  { name: "NZBN (NZ Business Number)", description: "Business registration" },
  { name: "Companies Office Registration", description: "Company extract" }
];

const trustIndicators = [
  { icon: Lock, label: "Encrypted Storage", description: "Documents securely encrypted" },
  { icon: Eye, label: "Restricted Access", description: "Admin-only document viewing" },
  { icon: Scale, label: "Compliance", description: "NZ privacy law compliant" },
  { icon: Shield, label: "Verified Badge", description: "Public trust indicator" }
];

const Verification = () => {
  return (
    <>
      <Helmet>
        <title>Professional Verification | Wellington EcoBuild</title>
        <meta name="description" content="Our government-grade verification process ensures all listed professionals meet high standards for sustainability credentials and professional conduct." />
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero - Government Style */}
        <section className="bg-gradient-to-b from-slate-900 to-slate-800 py-16 lg:py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC00aDJ2MmgtMnYtMnptLTQgMHYyaC0ydi0yaDJ6bTIgMGgydjJoLTJ2LTJ6bS0yIDR2MmgtMnYtMmgyem0yIDB2MmgtMnYtMmgyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-white/90">Professional Verification System</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
                Document Verification Portal
              </h1>
              <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
                Establishing trust through rigorous credential verification. 
                All listed professionals undergo our comprehensive verification process.
              </p>
            </div>
          </div>
        </section>

        {/* Trust Indicators Bar */}
        <section className="bg-slate-50 border-y border-slate-200 py-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-8">
              {trustIndicators.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <item.icon className="w-4 h-4 text-slate-600" />
                  <span className="font-medium text-slate-700">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What is Verification */}
        <section className="py-16 lg:py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid lg:grid-cols-5 gap-8 items-start">
                <div className="lg:col-span-3">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-8 bg-primary rounded-full"></div>
                    <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                      What Does "Verified" Mean?
                    </h2>
                  </div>
                  <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                    The Verified badge indicates a business has undergone our manual verification process 
                    and demonstrated legitimate NZ sustainability credentials, professional registrations, 
                    and business credentials. This badge serves as a trust signal for Wellington clients 
                    seeking genuine eco-focused construction professionals.
                  </p>
                  <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-4">
                    <p className="font-medium text-foreground mb-1">Verification Eligibility</p>
                    <p className="text-sm text-muted-foreground">
                      Available exclusively to Premium and Elite tier listings. 
                      All businesses must provide valid NZ identification and business registration.
                    </p>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <Card className="border-2 border-emerald-200 bg-emerald-50/50">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8 text-emerald-600" />
                      </div>
                      <h3 className="font-display font-bold text-foreground mb-2">Verified Professional</h3>
                      <p className="text-sm text-muted-foreground">
                        Credentials confirmed against official NZ registers
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Verification Process Steps */}
        <section className="py-16 lg:py-20 bg-slate-50 border-y border-slate-200">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-1 h-8 bg-primary rounded-full"></div>
                  <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                    Verification Process
                  </h2>
                </div>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  A streamlined, secure process designed for professional efficiency
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {processSteps.map((step, index) => (
                  <div key={step.title} className="relative">
                    <Card className="h-full border-2 bg-white hover:border-primary/30 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <step.icon className="w-6 h-6 text-primary" />
                          </div>
                          <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                            {step.status}
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-foreground mb-2">{step.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                      </CardContent>
                    </Card>
                    {index < processSteps.length - 1 && (
                      <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-slate-300">
                        →
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Two Column: IDs and Certifications */}
        <section className="py-16 lg:py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
              {/* Accepted ID */}
              <Card className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-slate-700" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-foreground">Accepted NZ Identification</h3>
                      <p className="text-sm text-muted-foreground">Government-issued documents required</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {acceptedIds.map((id) => (
                      <div key={id.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-foreground text-sm">{id.name}</p>
                          <p className="text-xs text-muted-foreground">{id.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Accepted Certifications */}
              <Card className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Award className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-foreground">Accepted Certifications</h3>
                      <p className="text-sm text-muted-foreground">NZ-recognised professional credentials</p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {certifications.map((cert) => (
                      <div key={cert} className="flex items-start gap-2 p-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">{cert}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                    Additional credentials evaluated on a case-by-case basis.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Rejection & Revocation */}
        <section className="py-16 lg:py-20 bg-slate-50 border-y border-slate-200">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <Card className="border-2 border-red-200 bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-foreground">Rejection & Revocation Policy</h3>
                      <p className="text-sm text-muted-foreground">Maintaining platform integrity</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Wellington EcoBuild reserves the right to reject verification applications or revoke 
                    verified status for the following reasons:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 mb-4">
                    {[
                      "Fraudulent or misleading documentation",
                      "Expired or invalid certifications",
                      "Substantiated client complaints",
                      "Violation of listing quality standards",
                      "Professional misconduct",
                      "Failure to maintain required certifications"
                    ].map((reason) => (
                      <div key={reason} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0"></span>
                        <span className="text-foreground">{reason}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground border-t pt-4">
                    Businesses whose verification is revoked will be notified in writing and given 
                    the opportunity to address concerns before final decisions.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Document Upload Section */}
        <section className="py-16 lg:py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-4">
                  <Upload className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Secure Document Portal</span>
                </div>
                <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-2">
                  Submit Your Documents
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Upload your NZ identification and professional certifications for verification review
                </p>
              </div>
              <DocumentUpload />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-20 bg-gradient-to-b from-slate-900 to-slate-800">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">
              Ready to Get Verified?
            </h2>
            <p className="text-slate-300 mb-8 max-w-xl mx-auto">
              List your sustainable construction business and apply for verification to build trust with clients.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                <Link to="/pricing">View Pricing Plans</Link>
              </Button>
              <Button variant="outline" asChild size="lg" className="border-white/30 text-white hover:bg-white/10">
                <Link to="/contact">Contact Support</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Verification;
