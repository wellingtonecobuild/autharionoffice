import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, Copy, Check } from "lucide-react";
import { toast } from "sonner";

// Map routes to tab values
const routeToTab: Record<string, string> = {
  "/legal": "terms",
  "/terms": "terms",
  "/privacy": "privacy",
  "/sales-terms": "sales",
  "/disclaimer": "disclaimer",
  "/acceptable-use": "acceptable",
};

// Map tab values to routes
const tabToRoute: Record<string, string> = {
  "terms": "/terms",
  "privacy": "/privacy",
  "sales": "/sales-terms",
  "disclaimer": "/disclaimer",
  "acceptable": "/acceptable-use",
};

const Legal = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const lastUpdated = "1 January 2026";
  const effectiveDate = "1 January 2026";
  
  // Determine initial tab from URL
  const getInitialTab = () => {
    return routeToTab[location.pathname] || "terms";
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  
  // Update tab when URL changes
  useEffect(() => {
    const tab = routeToTab[location.pathname];
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.pathname]);
  
  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newRoute = tabToRoute[value];
    if (newRoute && newRoute !== location.pathname) {
      navigate(newRoute, { replace: true });
    }
  };
  
  // Copy link functionality
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  
  const copyLink = (tabValue: string) => {
    const route = tabToRoute[tabValue];
    const fullUrl = `${window.location.origin}${route}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedTab(tabValue);
      toast.success("Link copied to clipboard!", {
        description: fullUrl,
      });
      setTimeout(() => setCopiedTab(null), 2000);
    });
  };
  
  return (
    <>
      <Helmet>
        <title>Legal | Wellington EcoBuild</title>
        <meta name="description" content="Terms of Use, Privacy Policy, and legal information for Wellington EcoBuild - Wellington's sustainable construction directory." />
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="bg-gradient-to-br from-forest to-forest-light py-12 lg:py-16">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="outline" className="mb-4 border-accent/50 text-accent">
              Legal
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
              Legal Information
            </h1>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto">
              Last updated: {lastUpdated}
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Alert className="mb-8">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Wellington EcoBuild operates exclusively within New Zealand and is governed by New Zealand law. All legal matters are subject to the jurisdiction of New Zealand courts.
                </AlertDescription>
              </Alert>

              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="flex flex-col gap-4 mb-8">
                  <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
                    <TabsTrigger value="terms">Terms of Use</TabsTrigger>
                    <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
                    <TabsTrigger value="sales">Sales Terms</TabsTrigger>
                    <TabsTrigger value="disclaimer">Disclaimer</TabsTrigger>
                    <TabsTrigger value="acceptable">Acceptable Use</TabsTrigger>
                  </TabsList>
                  
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Copy direct link:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink("terms")}
                      className="h-8 text-xs"
                    >
                      {copiedTab === "terms" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      Terms
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink("privacy")}
                      className="h-8 text-xs"
                    >
                      {copiedTab === "privacy" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      Privacy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink("sales")}
                      className="h-8 text-xs"
                    >
                      {copiedTab === "sales" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      Sales
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink("disclaimer")}
                      className="h-8 text-xs"
                    >
                      {copiedTab === "disclaimer" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      Disclaimer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink("acceptable")}
                      className="h-8 text-xs"
                    >
                      {copiedTab === "acceptable" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      Acceptable Use
                    </Button>
                  </div>
                </div>

                <TabsContent value="terms" className="prose prose-neutral dark:prose-invert max-w-none">
                  <div className="bg-card rounded-xl border border-border p-6 lg:p-8 space-y-6">
                    <h2 className="font-display text-2xl font-bold text-foreground mt-0">Terms of Use</h2>
                    <p className="text-sm text-muted-foreground">Effective Date: {effectiveDate}</p>
                    
                    <div className="space-y-4 text-muted-foreground">
                      <h3 className="font-semibold text-foreground">1. Introduction and Acceptance</h3>
                      <p>Wellington EcoBuild ("we", "us", "our", or "the Platform") is operated within New Zealand. By accessing, browsing, or using our website, mobile applications, or any services we provide (collectively, "Services"), you ("User", "you", or "your") acknowledge that you have read, understood, and agree to be bound by these Terms of Use ("Terms").</p>
                      <p>If you do not agree to these Terms in their entirety, you must not access or use our Services. We reserve the right to modify these Terms at any time. Continued use of the Services after any modifications constitutes acceptance of the revised Terms.</p>

                      <h3 className="font-semibold text-foreground">2. Eligibility</h3>
                      <p>To use our Services, you must:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Be at least 18 years of age or the age of majority in your jurisdiction</li>
                        <li>Have the legal capacity to enter into a binding agreement</li>
                        <li>Not be prohibited from using the Services under New Zealand law or any other applicable jurisdiction</li>
                        <li>If registering on behalf of a business, have the authority to bind that business to these Terms</li>
                      </ul>

                      <h3 className="font-semibold text-foreground">3. Nature of Services</h3>
                      <p>Wellington EcoBuild is an online directory and marketplace platform that:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Connects users with sustainable construction professionals, suppliers, architects, and renovation specialists in the Wellington region and greater New Zealand</li>
                        <li>Provides business listing services for construction and building industry professionals</li>
                        <li>Facilitates the discovery of eco-friendly and sustainable building services</li>
                        <li>Offers job posting and recruitment services within the construction industry</li>
                      </ul>
                      <p className="font-medium">We are a directory and intermediary service only. We do not provide construction services, employ listed contractors, or guarantee any work performed by listed businesses.</p>

                      <h3 className="font-semibold text-foreground">4. User Accounts</h3>
                      <p><strong>4.1 Account Registration:</strong> To access certain features, you must create an account. You agree to provide accurate, current, and complete information during registration and maintain the accuracy of such information.</p>
                      <p><strong>4.2 Account Security:</strong> You are solely responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized access or use of your account. We are not liable for any loss or damage arising from your failure to protect your account credentials.</p>
                      <p><strong>4.3 Account Termination:</strong> We reserve the right to suspend or terminate your account at our sole discretion, without prior notice, for any violation of these Terms or for any other reason we deem appropriate.</p>

                      <h3 className="font-semibold text-foreground">5. Business Listings</h3>
                      <p><strong>5.1 Listing Accuracy:</strong> Businesses listing on the Platform represent and warrant that all information provided is accurate, complete, current, and not misleading. This includes but is not limited to business name, contact details, services offered, certifications, and qualifications.</p>
                      <p><strong>5.2 Compliance:</strong> Listed businesses must comply with all applicable New Zealand laws and regulations, including but not limited to:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Building Act 2004 and Building Code</li>
                        <li>Licensed Building Practitioners (LBP) requirements where applicable</li>
                        <li>Health and Safety at Work Act 2015</li>
                        <li>Fair Trading Act 1986</li>
                        <li>Consumer Guarantees Act 1993</li>
                        <li>Construction Contracts Act 2002</li>
                      </ul>
                      <p><strong>5.3 Verification:</strong> Our verification process confirms that businesses have provided certain documentation. Verification does not constitute an endorsement, warranty, or guarantee of work quality, safety, or outcomes.</p>
                      <p><strong>5.4 Content Moderation:</strong> We reserve the right to review, edit, refuse, or remove any listing at our sole discretion without prior notice.</p>

                      <h3 className="font-semibold text-foreground">6. User Conduct</h3>
                      <p>You agree not to:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Use the Services for any unlawful purpose or in violation of any applicable laws</li>
                        <li>Provide false, inaccurate, or misleading information</li>
                        <li>Impersonate any person or entity</li>
                        <li>Interfere with or disrupt the Services or servers</li>
                        <li>Attempt to gain unauthorized access to any part of the Services</li>
                        <li>Use automated means to access the Services without our express permission</li>
                        <li>Harass, abuse, or harm other users</li>
                        <li>Post defamatory, obscene, or offensive content</li>
                        <li>Infringe on intellectual property rights of others</li>
                        <li>Engage in any form of spam or unsolicited advertising</li>
                      </ul>

                      <h3 className="font-semibold text-foreground">7. Intellectual Property</h3>
                      <p><strong>7.1 Our Content:</strong> All content on the Platform, including but not limited to text, graphics, logos, icons, images, audio clips, digital downloads, data compilations, and software, is the property of Wellington EcoBuild or its content suppliers and is protected by New Zealand and international intellectual property laws, including the Copyright Act 1994.</p>
                      <p><strong>7.2 Limited License:</strong> We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Services for personal, non-commercial purposes in accordance with these Terms.</p>
                      <p><strong>7.3 User Content:</strong> By submitting content to the Platform, you grant us a worldwide, royalty-free, perpetual, irrevocable license to use, reproduce, modify, adapt, publish, translate, and distribute such content in any media.</p>

                      <h3 className="font-semibold text-foreground">8. Third-Party Links and Services</h3>
                      <p>The Platform may contain links to third-party websites or services. We do not control, endorse, or assume responsibility for any third-party sites or their content. Your use of third-party services is at your own risk and subject to their respective terms and conditions.</p>

                      <h3 className="font-semibold text-foreground">9. Limitation of Liability</h3>
                      <p><strong>9.1</strong> To the maximum extent permitted by New Zealand law, including the Consumer Guarantees Act 1993 (where applicable), Wellington EcoBuild, its directors, officers, employees, agents, and affiliates shall not be liable for:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Any indirect, incidental, special, consequential, punitive, or exemplary damages</li>
                        <li>Any loss of profits, revenue, data, goodwill, or other intangible losses</li>
                        <li>Any damages resulting from your use or inability to use the Services</li>
                        <li>Any damages resulting from any services or work provided by listed businesses</li>
                        <li>Any unauthorized access to or alteration of your data</li>
                        <li>Any conduct or content of any third party on the Services</li>
                      </ul>
                      <p><strong>9.2</strong> In no event shall our total liability to you exceed the greater of: (a) the amount paid by you to us in the twelve (12) months preceding the claim; or (b) NZD $100.</p>
                      <p><strong>9.3</strong> Nothing in these Terms excludes or limits liability that cannot be excluded or limited under New Zealand law, including liability for death or personal injury caused by negligence.</p>

                      <h3 className="font-semibold text-foreground">10. Indemnification</h3>
                      <p>You agree to indemnify, defend, and hold harmless Wellington EcoBuild, its directors, officers, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or relating to:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Your use of the Services</li>
                        <li>Your violation of these Terms</li>
                        <li>Your violation of any rights of another party</li>
                        <li>Your content or listings on the Platform</li>
                        <li>Any dispute between you and a listed business</li>
                      </ul>

                      <h3 className="font-semibold text-foreground">11. Dispute Resolution</h3>
                      <p><strong>11.1 Informal Resolution:</strong> Before initiating any formal dispute resolution, you agree to first contact us to attempt to resolve the dispute informally.</p>
                      <p><strong>11.2 Mediation:</strong> If informal resolution fails, both parties agree to attempt mediation through a mutually agreed mediator before commencing court proceedings.</p>
                      <p><strong>11.3 Jurisdiction:</strong> These Terms and any disputes arising from them shall be governed by and construed in accordance with the laws of New Zealand. You agree to submit to the exclusive jurisdiction of the courts of New Zealand, with venue in Wellington.</p>

                      <h3 className="font-semibold text-foreground">12. General Provisions</h3>
                      <p><strong>12.1 Entire Agreement:</strong> These Terms, together with our Privacy Policy and any other legal notices published on the Platform, constitute the entire agreement between you and Wellington EcoBuild.</p>
                      <p><strong>12.2 Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.</p>
                      <p><strong>12.3 Waiver:</strong> No waiver of any term shall be deemed a further or continuing waiver of such term or any other term.</p>
                      <p><strong>12.4 Assignment:</strong> You may not assign or transfer these Terms without our prior written consent. We may assign our rights and obligations without restriction.</p>
                      <p><strong>12.5 Force Majeure:</strong> We shall not be liable for any failure or delay in performing our obligations due to circumstances beyond our reasonable control.</p>

                      <h3 className="font-semibold text-foreground">13. Contact Information</h3>
                      <p>For questions about these Terms, please contact us at:</p>
                      <p>Wellington EcoBuild<br />
                      Email: info@wellingtonecobuild.nz<br />
                      Wellington, New Zealand</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="privacy" className="prose prose-neutral dark:prose-invert max-w-none">
                  <div className="bg-card rounded-xl border border-border p-6 lg:p-8 space-y-6">
                    <h2 className="font-display text-2xl font-bold text-foreground mt-0">Privacy Policy</h2>
                    <p className="text-sm text-muted-foreground">This policy complies with the New Zealand Privacy Act 2020 and its Information Privacy Principles (IPPs).</p>
                    <p className="text-sm text-muted-foreground">Effective Date: {effectiveDate}</p>
                    
                    <div className="space-y-4 text-muted-foreground">
                      <h3 className="font-semibold text-foreground">1. Introduction</h3>
                      <p>Wellington EcoBuild ("we", "us", or "our") is committed to protecting your privacy and handling your personal information in accordance with the New Zealand Privacy Act 2020. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our website and services.</p>
                      <p>By using our Services, you consent to the collection and use of your personal information as described in this Policy.</p>

                      <h3 className="font-semibold text-foreground">2. Information We Collect</h3>
                      <p><strong>2.1 Information You Provide Directly:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Account Information:</strong> Name, email address, phone number, password</li>
                        <li><strong>Business Listing Information:</strong> Business name, address, description, services, certifications, images, contact details</li>
                        <li><strong>Job Applicant Information:</strong> CV/resume, cover letter, work history, qualifications, skills</li>
                        <li><strong>Payment Information:</strong> Billing address, payment card details (processed securely by Stripe; we do not store full card numbers)</li>
                        <li><strong>Communications:</strong> Messages, enquiries, support requests, feedback</li>
                        <li><strong>Verification Documents:</strong> Business registration, licenses, certifications, insurance certificates</li>
                      </ul>
                      <p><strong>2.2 Information Collected Automatically:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                        <li><strong>Usage Information:</strong> Pages visited, time spent, clicks, search queries, referring URLs</li>
                        <li><strong>Location Information:</strong> General location derived from IP address</li>
                        <li><strong>Cookies and Similar Technologies:</strong> Session cookies, persistent cookies, analytics cookies</li>
                      </ul>

                      <h3 className="font-semibold text-foreground">3. Purpose of Collection (IPP 1)</h3>
                      <p>We collect personal information for the following purposes:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>To create and manage your account</li>
                        <li>To provide, maintain, and improve our Services</li>
                        <li>To process business listings and subscriptions</li>
                        <li>To facilitate communication between users and listed businesses</li>
                        <li>To process job applications and facilitate recruitment</li>
                        <li>To process payments and prevent fraud</li>
                        <li>To send service-related communications and notifications</li>
                        <li>To respond to enquiries and provide customer support</li>
                        <li>To ensure platform security and prevent abuse</li>
                        <li>To comply with legal obligations</li>
                        <li>To analyse usage patterns and improve user experience</li>
                        <li>To send marketing communications (with your consent)</li>
                      </ul>

                      <h3 className="font-semibold text-foreground">4. Source of Information (IPP 2)</h3>
                      <p>We collect information directly from you when you:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Create an account or update your profile</li>
                        <li>Submit or update a business listing</li>
                        <li>Apply for a job through our platform</li>
                        <li>Make a payment or subscription</li>
                        <li>Contact us or send enquiries</li>
                        <li>Participate in surveys or promotions</li>
                        <li>Browse our website (automated collection)</li>
                      </ul>
                      <p>We may also collect information from third parties, including:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Payment processors (Stripe) for transaction verification</li>
                        <li>Publicly available business registers and databases</li>
                        <li>Analytics providers for aggregated usage data</li>
                      </ul>

                      <h3 className="font-semibold text-foreground">5. Disclosure of Information (IPP 11)</h3>
                      <p><strong>5.1 We do not sell your personal information.</strong></p>
                      <p><strong>5.2 We may share your information with:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Service Providers:</strong> Third-party companies that assist us in operating the Platform (hosting, analytics, payment processing, email services). These providers are contractually obligated to protect your information.</li>
                        <li><strong>Business Listings (Public Information):</strong> Business contact information you choose to make public on your listing</li>
                        <li><strong>Job Employers:</strong> If you apply for a job, your application information will be shared with the relevant employer</li>
                        <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                        <li><strong>Protection of Rights:</strong> To protect our rights, property, safety, or that of our users or the public</li>
                        <li><strong>Business Transfers:</strong> In connection with any merger, acquisition, or sale of assets</li>
                      </ul>

                      <h3 className="font-semibold text-foreground">6. Data Storage and Security (IPP 5)</h3>
                      <p><strong>6.1 Storage:</strong> Your data is stored on secure servers. We use Supabase for database services, with data primarily stored in secure data centres.</p>
                      <p><strong>6.2 Security Measures:</strong> We implement appropriate technical and organizational measures including:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                        <li>Secure authentication mechanisms</li>
                        <li>Regular security assessments and updates</li>
                        <li>Access controls and employee training</li>
                        <li>Secure payment processing through PCI-compliant providers</li>
                      </ul>
                      <p><strong>6.3 Data Breach:</strong> In the event of a data breach that poses a risk of serious harm, we will notify affected individuals and the Privacy Commissioner as required by the Privacy Act 2020.</p>

                      <h3 className="font-semibold text-foreground">7. Data Retention (IPP 9)</h3>
                      <p>We retain your personal information only for as long as necessary for the purposes described in this Policy, or as required by law. Specifically:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Account Information:</strong> Retained while your account is active and for 7 years after closure for legal and tax purposes</li>
                        <li><strong>Transaction Records:</strong> Retained for 7 years as required by tax law</li>
                        <li><strong>Business Listings:</strong> Retained while active; archived for 2 years after removal</li>
                        <li><strong>Job Applications:</strong> Retained for 2 years unless you request earlier deletion</li>
                        <li><strong>Communications:</strong> Retained for 3 years for dispute resolution purposes</li>
                        <li><strong>Analytics Data:</strong> Aggregated data retained indefinitely; identifiable data retained for 2 years</li>
                      </ul>

                      <h3 className="font-semibold text-foreground">8. Your Rights Under the Privacy Act 2020</h3>
                      <p>Under the New Zealand Privacy Act 2020, you have the following rights:</p>
                      <p><strong>8.1 Access (IPP 6):</strong> You have the right to request access to your personal information that we hold. We will respond to your request within 20 working days.</p>
                      <p><strong>8.2 Correction (IPP 7):</strong> You have the right to request correction of inaccurate, incomplete, or misleading personal information. We will correct information where appropriate or attach a statement of correction where we disagree.</p>
                      <p><strong>8.3 Deletion:</strong> You may request deletion of your personal information, subject to our legal obligations to retain certain records.</p>
                      <p><strong>8.4 Objection to Processing:</strong> You may object to processing of your personal information for direct marketing purposes at any time.</p>
                      <p><strong>8.5 Data Portability:</strong> You may request a copy of your personal information in a commonly used electronic format.</p>
                      <p>To exercise any of these rights, contact us at info@wellingtonecobuild.nz. We may require proof of identity before processing your request.</p>

                      <h3 className="font-semibold text-foreground">9. Cookies and Tracking Technologies</h3>
                      <p><strong>9.1 Types of Cookies We Use:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Essential Cookies:</strong> Required for the website to function (authentication, security)</li>
                        <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
                        <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our website</li>
                        <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements (with consent)</li>
                      </ul>
                      <p><strong>9.2 Managing Cookies:</strong> You can control cookies through your browser settings. Note that disabling certain cookies may affect website functionality.</p>

                      <h3 className="font-semibold text-foreground">10. Third-Party Services</h3>
                      <p>Our Services integrate with third-party services including:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Stripe:</strong> Payment processing (see Stripe Privacy Policy)</li>
                        <li><strong>Google Analytics:</strong> Website analytics (see Google Privacy Policy)</li>
                        <li><strong>Mapbox:</strong> Map services (see Mapbox Privacy Policy)</li>
                      </ul>
                      <p>These services have their own privacy policies and we encourage you to review them.</p>

                      <h3 className="font-semibold text-foreground">11. International Data Transfers</h3>
                      <p>Some of our service providers may be located outside New Zealand. When transferring data internationally, we ensure appropriate safeguards are in place in accordance with IPP 12 of the Privacy Act 2020.</p>

                      <h3 className="font-semibold text-foreground">12. Children's Privacy</h3>
                      <p>Our Services are not directed to individuals under 18 years of age. We do not knowingly collect personal information from children. If we become aware that we have collected personal information from a child, we will take steps to delete such information.</p>

                      <h3 className="font-semibold text-foreground">13. Changes to This Policy</h3>
                      <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated Policy on our website and updating the "Effective Date". Your continued use of the Services after any changes constitutes acceptance of the revised Policy.</p>

                      <h3 className="font-semibold text-foreground">14. Complaints</h3>
                      <p>If you have concerns about how we handle your personal information, please contact us first. If you are not satisfied with our response, you may lodge a complaint with:</p>
                      <p>Office of the Privacy Commissioner<br />
                      PO Box 10094, The Terrace<br />
                      Wellington 6143, New Zealand<br />
                      Phone: 0800 803 909<br />
                      Website: www.privacy.org.nz</p>

                      <h3 className="font-semibold text-foreground">15. Contact Us</h3>
                      <p>For privacy-related enquiries or to exercise your rights:</p>
                      <p>Privacy Officer<br />
                      Wellington EcoBuild<br />
                      Email: info@wellingtonecobuild.nz<br />
                      Wellington, New Zealand</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sales" className="prose prose-neutral dark:prose-invert max-w-none">
                  <div className="bg-card rounded-xl border border-border p-6 lg:p-8 space-y-6">
                    <h2 className="font-display text-2xl font-bold text-foreground mt-0">Sales & Subscription Terms</h2>
                    <p className="text-sm text-muted-foreground">Effective Date: {effectiveDate}</p>
                    
                    <div className="space-y-4 text-muted-foreground">
                      <h3 className="font-semibold text-foreground">1. Scope</h3>
                      <p>These Sales and Subscription Terms ("Sales Terms") govern all purchases made through the Wellington EcoBuild platform, including subscription plans, featured listing upgrades, job posting fees, and any other paid services. These Sales Terms are incorporated into and form part of our Terms of Use.</p>

                      <h3 className="font-semibold text-foreground">2. Subscription Plans</h3>
                      <p><strong>2.1 Available Plans:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Free:</strong> Basic listing with limited features</li>
                        <li><strong>Premium:</strong> Enhanced listing with additional features and visibility</li>
                        <li><strong>Elite:</strong> Maximum visibility, priority placement, and premium features</li>
                      </ul>
                      <p><strong>2.2 Plan Details:</strong> Current features, pricing, and availability for each plan are detailed on our Pricing page. We reserve the right to modify plan features and pricing at any time.</p>
                      <p><strong>2.3 Fair Trading Act Compliance:</strong> All pricing information is provided in accordance with the Fair Trading Act 1986. Prices are accurate at the time of publication and are subject to change.</p>

                      <h3 className="font-semibold text-foreground">3. Pricing and Payment</h3>
                      <p><strong>3.1 Currency:</strong> All prices are quoted and payable in New Zealand Dollars (NZD).</p>
                      <p><strong>3.2 GST:</strong> All prices are inclusive of Goods and Services Tax (GST) at the current rate of 15%, unless otherwise stated. GST invoices will be provided for all purchases.</p>
                      <p><strong>3.3 Payment Methods:</strong> We accept payment via credit card (Visa, Mastercard) processed securely through Stripe. We do not accept direct bank transfers or cash payments.</p>
                      <p><strong>3.4 Payment Processing:</strong> All payment card information is processed by Stripe in accordance with PCI-DSS compliance standards. We do not store your full card details on our servers.</p>
                      <p><strong>3.5 Failed Payments:</strong> If a payment fails, we will attempt to notify you and may retry the payment. Continued payment failure may result in suspension or termination of your subscription.</p>

                      <h3 className="font-semibold text-foreground">4. Billing Cycles</h3>
                      <p><strong>4.1 Billing Period:</strong> Subscriptions are billed either monthly or annually in advance, depending on your selected billing cycle.</p>
                      <p><strong>4.2 Billing Date:</strong> Your billing date is the date you first subscribed or upgraded. Subsequent billing occurs on the same date each period.</p>
                      <p><strong>4.3 Pro-Rata Adjustments:</strong> Upgrades during a billing cycle will be pro-rated for the remaining period. You will be charged the difference immediately.</p>
                      <p><strong>4.4 Annual Subscriptions:</strong> Annual subscriptions are billed as a single payment for 12 months in advance and may include a discount compared to monthly billing.</p>

                      <h3 className="font-semibold text-foreground">5. Upgrades and Downgrades</h3>
                      <p><strong>5.1 Upgrades:</strong> You may upgrade your subscription at any time. Upgrades take effect immediately, and you will have immediate access to enhanced features. Payment for the upgrade is charged immediately on a pro-rata basis.</p>
                      <p><strong>5.2 Downgrades:</strong> You may downgrade your subscription at any time. Downgrades take effect at the end of your current billing period. You will retain access to your current plan features until the period ends. No refund is provided for the remaining period.</p>

                      <h3 className="font-semibold text-foreground">6. Cancellation</h3>
                      <p><strong>6.1 Cancellation by You:</strong> You may cancel your subscription at any time through your account dashboard or by contacting us. Cancellation takes effect at the end of your current billing period. You will retain access to paid features until the period ends.</p>
                      <p><strong>6.2 Cancellation by Us:</strong> We reserve the right to cancel your subscription at any time for violation of our Terms of Use. In cases of cancellation by us due to your breach, no refund will be provided.</p>
                      <p><strong>6.3 Effect of Cancellation:</strong> Upon cancellation:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Your listing will revert to the Free tier at the end of the billing period</li>
                        <li>Premium features will be disabled</li>
                        <li>Your business information will be retained unless you request deletion</li>
                      </ul>

                      <h3 className="font-semibold text-foreground">7. Refund Policy</h3>
                      <p><strong>7.1 General Policy:</strong> Due to the immediate access nature of our digital services, refunds are generally not provided once a subscription period has commenced.</p>
                      <p><strong>7.2 Consumer Guarantees Act 1993:</strong> Nothing in these Sales Terms excludes or limits your rights under the Consumer Guarantees Act 1993. If our services fail to meet the guarantees in that Act, you may be entitled to a remedy, which may include a refund.</p>
                      <p><strong>7.3 Discretionary Refunds:</strong> We may, at our sole discretion, provide refunds in exceptional circumstances. Requests should be made within 7 days of the charge to info@wellingtonecobuild.nz.</p>
                      <p><strong>7.4 Cooling-Off Period:</strong> For new paid subscriptions, we offer a 7-day cooling-off period during which you may request a full refund if you have not used premium features. This is in addition to your rights under the Consumer Guarantees Act.</p>

                      <h3 className="font-semibold text-foreground">8. One-Time Purchases</h3>
                      <p><strong>8.1 Job Postings:</strong> Job posting fees are one-time charges for a specified duration (typically 30 days). Expired job postings require a new purchase to relist.</p>
                      <p><strong>8.2 Featured Listings:</strong> Featured listing upgrades are one-time or recurring charges for a specified duration. Features expire automatically at the end of the purchased period.</p>
                      <p><strong>8.3 No Refunds for One-Time Purchases:</strong> One-time purchases are non-refundable once the service has commenced, except as required by the Consumer Guarantees Act.</p>

                      <h3 className="font-semibold text-foreground">9. Price Changes</h3>
                      <p><strong>9.1 Notice:</strong> We reserve the right to modify our pricing at any time. We will provide at least 30 days written notice before any price increase takes effect for existing subscribers.</p>
                      <p><strong>9.2 Existing Subscriptions:</strong> Price changes will apply to new subscriptions immediately. For existing subscribers, price changes will take effect at the start of your next billing period after the notice period.</p>
                      <p><strong>9.3 Promotional Pricing:</strong> Promotional or introductory pricing is available for a limited time. Standard pricing will apply after the promotional period ends unless otherwise specified.</p>

                      <h3 className="font-semibold text-foreground">10. Taxes</h3>
                      <p><strong>10.1 GST:</strong> All prices include GST at the current rate of 15%. GST registration number will be provided on invoices.</p>
                      <p><strong>10.2 Other Taxes:</strong> You are responsible for any other applicable taxes or duties in your jurisdiction.</p>

                      <h3 className="font-semibold text-foreground">11. Invoices and Receipts</h3>
                      <p><strong>11.1 Tax Invoices:</strong> We will provide a GST-compliant tax invoice for all purchases, sent to your registered email address.</p>
                      <p><strong>11.2 Access:</strong> Invoices can also be accessed through your account dashboard.</p>

                      <h3 className="font-semibold text-foreground">12. Service Level</h3>
                      <p><strong>12.1 Availability:</strong> While we strive for high availability, we do not guarantee uninterrupted access to our Services. Planned maintenance will be communicated in advance where possible.</p>
                      <p><strong>12.2 No Credit:</strong> Service interruptions do not entitle you to credits or refunds unless they result in a material breach of these Terms.</p>

                      <h3 className="font-semibold text-foreground">13. Disputes</h3>
                      <p><strong>13.1 Billing Disputes:</strong> If you believe you have been incorrectly charged, contact us at info@wellingtonecobuild.nz within 30 days of the charge.</p>
                      <p><strong>13.2 Resolution:</strong> We will investigate and respond to billing disputes within 10 working days.</p>

                      <h3 className="font-semibold text-foreground">14. Contact</h3>
                      <p>For billing enquiries:<br />
                      Email: info@wellingtonecobuild.nz<br />
                      Wellington EcoBuild<br />
                      Wellington, New Zealand</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="disclaimer" className="prose prose-neutral dark:prose-invert max-w-none">
                  <div className="bg-card rounded-xl border border-border p-6 lg:p-8 space-y-6">
                    <h2 className="font-display text-2xl font-bold text-foreground mt-0">Disclaimer & Limitation of Liability</h2>
                    <p className="text-sm text-muted-foreground">Effective Date: {effectiveDate}</p>
                    
                    <Alert className="my-4 border-destructive/50 bg-destructive/10">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-foreground">
                        <strong>Important:</strong> Please read this disclaimer carefully. It contains important information about your relationship with Wellington EcoBuild and the limitations of our responsibility.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-4 text-muted-foreground">
                      <h3 className="font-semibold text-foreground">1. Nature of Our Service</h3>
                      <p><strong>1.1 Directory Service Only:</strong> Wellington EcoBuild operates solely as an online directory and information service. We provide a platform that connects users with sustainable construction professionals, suppliers, architects, and renovation specialists in New Zealand.</p>
                      <p><strong>1.2 No Agency Relationship:</strong> We are not an agent, employee, joint venturer, or partner of any business listed on our Platform. There is no employment, agency, or partnership relationship between Wellington EcoBuild and any listed business.</p>
                      <p><strong>1.3 No Endorsement:</strong> The listing of any business on our Platform does not constitute an endorsement, recommendation, or approval of that business, its services, or the quality of its work.</p>

                      <h3 className="font-semibold text-foreground">2. No Responsibility for Listed Businesses</h3>
                      <p><strong>2.1 Independence:</strong> All businesses listed on Wellington EcoBuild are independent entities. We do not:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Employ, supervise, or control listed businesses</li>
                        <li>Guarantee the quality, safety, or legality of their services</li>
                        <li>Verify the accuracy of all information provided by businesses</li>
                        <li>Monitor or oversee work performed by listed businesses</li>
                        <li>Provide warranties or guarantees on behalf of listed businesses</li>
                      </ul>
                      <p><strong>2.2 User Responsibility:</strong> Any engagement, contract, or agreement between you and a listed business is directly between those parties. Wellington EcoBuild is not a party to any such agreement.</p>

                      <h3 className="font-semibold text-foreground">3. Disclaimers</h3>
                      <p><strong>3.1 Services Provided "As Is":</strong> The Platform and all information, content, and services are provided on an "as is" and "as available" basis, without warranties of any kind, either express or implied.</p>
                      <p><strong>3.2 No Warranty:</strong> To the maximum extent permitted by New Zealand law, we disclaim all warranties, including but not limited to:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Implied warranties of merchantability and fitness for a particular purpose</li>
                        <li>Warranties that the Services will be uninterrupted, error-free, or secure</li>
                        <li>Warranties regarding the accuracy, reliability, or completeness of any content</li>
                        <li>Warranties regarding the quality of services provided by listed businesses</li>
                      </ul>
                      <p><strong>3.3 Information Accuracy:</strong> While we strive to ensure the accuracy of information on our Platform, we cannot guarantee that all information provided by listed businesses is current, complete, or accurate. Information may change without notice.</p>

                      <h3 className="font-semibold text-foreground">4. Verification Badge Disclaimer</h3>
                      <p><strong>4.1 Meaning of Verification:</strong> The "Verified" badge indicates only that a business has submitted documentation that we have reviewed. Verification means:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>The business has provided documentation of their stated credentials</li>
                        <li>The documentation appeared genuine at the time of review</li>
                        <li>The business has completed our verification process</li>
                      </ul>
                      <p><strong>4.2 What Verification Does NOT Mean:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Endorsement or recommendation of the business</li>
                        <li>Guarantee of work quality, safety, or outcomes</li>
                        <li>Ongoing monitoring of the business's credentials or performance</li>
                        <li>Liability for any services provided by the verified professional</li>
                        <li>Warranty that credentials remain current or valid</li>
                      </ul>
                      <p><strong>4.3 Independent Verification:</strong> Users should independently verify credentials, licenses, insurance, and references before engaging any professional.</p>

                      <h3 className="font-semibold text-foreground">5. Limitation of Liability</h3>
                      <p><strong>5.1 Maximum Liability:</strong> To the maximum extent permitted by law, Wellington EcoBuild's total liability to you for any claims arising from your use of the Services shall not exceed the greater of: (a) the fees paid by you to Wellington EcoBuild in the twelve (12) months preceding the claim; or (b) NZD $100.</p>
                      <p><strong>5.2 Exclusion of Damages:</strong> In no event shall Wellington EcoBuild, its directors, officers, employees, agents, or affiliates be liable for:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                        <li>Any loss of profits, revenue, data, goodwill, or other intangible losses</li>
                        <li>Damages arising from services or work provided by listed businesses</li>
                        <li>Damages arising from your reliance on any information on the Platform</li>
                        <li>Damages arising from unauthorized access to your account or data</li>
                        <li>Damages arising from errors, omissions, or interruptions in the Services</li>
                        <li>Any disputes between you and listed businesses</li>
                        <li>Any physical injury, property damage, or death resulting from services provided by listed businesses</li>
                      </ul>
                      <p><strong>5.3 Consumer Guarantees Act:</strong> Nothing in this disclaimer excludes or limits any rights you may have under the Consumer Guarantees Act 1993 that cannot be excluded or limited by law. If the Consumer Guarantees Act applies, our liability is limited, where permitted, to re-supplying the services or paying for them to be re-supplied.</p>

                      <h3 className="font-semibold text-foreground">6. Your Due Diligence Obligations</h3>
                      <p><strong>6.1 Independent Assessment:</strong> Before engaging any business listed on our Platform, you are strongly encouraged to:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Verify that the business holds current and valid licenses and registrations required for the work</li>
                        <li>Check Licensed Building Practitioner (LBP) status where applicable through the LBP Register</li>
                        <li>Verify current public liability and professional indemnity insurance</li>
                        <li>Request and check references from previous clients</li>
                        <li>Obtain multiple quotes and compare them carefully</li>
                        <li>Request and review a written contract before work commences</li>
                        <li>Ensure compliance with the Building Act 2004 and Building Code requirements</li>
                        <li>Verify Health and Safety practices and policies</li>
                        <li>Check reviews and ratings, but exercise judgment about their reliability</li>
                      </ul>
                      <p><strong>6.2 Written Agreements:</strong> We strongly recommend that all agreements with service providers be in writing, clearly specifying scope of work, timelines, costs, payment terms, and dispute resolution mechanisms, in accordance with the Construction Contracts Act 2002.</p>

                      <h3 className="font-semibold text-foreground">7. Third-Party Content</h3>
                      <p><strong>7.1 User-Generated Content:</strong> The Platform may contain content submitted by users and listed businesses. We do not endorse, guarantee, or assume responsibility for any user-generated content.</p>
                      <p><strong>7.2 Third-Party Links:</strong> Links to third-party websites are provided for convenience only. We do not control, endorse, or assume responsibility for the content or practices of linked websites.</p>
                      <p><strong>7.3 Reviews and Ratings:</strong> Reviews and ratings represent the personal opinions of individual users. We do not verify the accuracy of reviews and are not responsible for their content.</p>

                      <h3 className="font-semibold text-foreground">8. Release and Indemnification</h3>
                      <p><strong>8.1 Release:</strong> You release Wellington EcoBuild, its directors, officers, employees, and agents from all claims, demands, and damages (actual and consequential) of every kind and nature, known and unknown, arising out of or in any way connected with your use of the Services or any dispute with a listed business.</p>
                      <p><strong>8.2 Indemnification:</strong> You agree to indemnify and hold harmless Wellington EcoBuild from any claims, losses, damages, liabilities, costs, and expenses (including legal fees) arising from your use of the Services, your violation of these Terms, or your violation of any rights of another party.</p>

                      <h3 className="font-semibold text-foreground">9. Governing Law</h3>
                      <p>This disclaimer is governed by the laws of New Zealand. Any disputes shall be subject to the exclusive jurisdiction of the courts of New Zealand, with venue in Wellington.</p>

                      <h3 className="font-semibold text-foreground">10. Severability</h3>
                      <p>If any provision of this disclaimer is found to be unenforceable, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.</p>

                      <h3 className="font-semibold text-foreground">11. Contact</h3>
                      <p>For questions about this disclaimer:<br />
                      Email: info@wellingtonecobuild.nz<br />
                      Wellington EcoBuild<br />
                      Wellington, New Zealand</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="acceptable" className="prose prose-neutral dark:prose-invert max-w-none">
                  <div className="bg-card rounded-xl border border-border p-6 lg:p-8 space-y-6">
                    <h2 className="font-display text-2xl font-bold text-foreground mt-0">Acceptable Use Policy</h2>
                    <p className="text-sm text-muted-foreground">Effective Date: {effectiveDate}</p>
                    
                    <div className="space-y-4 text-muted-foreground">
                      <h3 className="font-semibold text-foreground">1. Purpose</h3>
                      <p>This Acceptable Use Policy ("AUP") sets out the rules governing use of Wellington EcoBuild's platform and services. This AUP supplements and is incorporated into our Terms of Use. Violation of this AUP may result in suspension or termination of your account and access to our Services.</p>

                      <h3 className="font-semibold text-foreground">2. Prohibited Activities</h3>
                      <p>You agree not to use the Services to:</p>
                      
                      <p><strong>2.1 Unlawful Activities:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Engage in any activity that violates New Zealand law or any applicable foreign laws</li>
                        <li>Facilitate, promote, or assist in any illegal activity</li>
                        <li>Violate the Fair Trading Act 1986 through false or misleading representations</li>
                        <li>Engage in fraudulent business practices</li>
                        <li>Infringe on intellectual property rights</li>
                      </ul>

                      <p><strong>2.2 Harmful Content:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Post, upload, or distribute defamatory, libellous, or slanderous content</li>
                        <li>Share content that is obscene, pornographic, or sexually explicit</li>
                        <li>Publish content that promotes hatred, violence, or discrimination</li>
                        <li>Share content that harasses, bullies, or threatens others</li>
                        <li>Post content that is harmful to minors</li>
                      </ul>

                      <p><strong>2.3 Deceptive Practices:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Provide false, misleading, or inaccurate information in listings or communications</li>
                        <li>Impersonate any person, business, or entity</li>
                        <li>Create fake reviews or ratings</li>
                        <li>Misrepresent qualifications, certifications, or credentials</li>
                        <li>Use misleading business names or descriptions</li>
                        <li>Engage in "astroturfing" or fake grassroots marketing</li>
                      </ul>

                      <p><strong>2.4 Spam and Unsolicited Communications:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Send unsolicited bulk emails or messages (spam)</li>
                        <li>Harvest email addresses or other user information</li>
                        <li>Use the platform for unauthorized advertising or promotions</li>
                        <li>Create multiple accounts to circumvent restrictions</li>
                      </ul>

                      <p><strong>2.5 Security Violations:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Attempt to gain unauthorized access to the Services or other accounts</li>
                        <li>Interfere with or disrupt the Services or servers</li>
                        <li>Introduce malware, viruses, or other malicious code</li>
                        <li>Attempt to probe, scan, or test system vulnerabilities</li>
                        <li>Circumvent security measures or access controls</li>
                        <li>Engage in denial-of-service attacks</li>
                      </ul>

                      <p><strong>2.6 Data Misuse:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Scrape, crawl, or collect user data without permission</li>
                        <li>Use automated means to access the Services without authorization</li>
                        <li>Download or copy business listings for commercial use</li>
                        <li>Compile databases from Platform content without permission</li>
                        <li>Share or sell user data obtained through the Services</li>
                      </ul>

                      <p><strong>2.7 Platform Abuse:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Interfere with other users' use of the Services</li>
                        <li>Manipulate search rankings or featured listings</li>
                        <li>Engage in click fraud or artificial traffic generation</li>
                        <li>Use the Platform in ways that create an unfair competitive advantage</li>
                        <li>Abuse refund policies or payment systems</li>
                      </ul>

                      <h3 className="font-semibold text-foreground">3. Business Listing Standards</h3>
                      <p>Businesses listing on Wellington EcoBuild must:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Provide accurate and truthful business information</li>
                        <li>Maintain current contact information</li>
                        <li>Only advertise services they are legally permitted and qualified to provide</li>
                        <li>Comply with all applicable licensing and registration requirements</li>
                        <li>Maintain appropriate insurance coverage for their services</li>
                        <li>Respond to user enquiries in a professional and timely manner</li>
                        <li>Update their listing promptly when information changes</li>
                        <li>Not engage in bait-and-switch pricing tactics</li>
                      </ul>

                      <h3 className="font-semibold text-foreground">4. Review and Rating Guidelines</h3>
                      <p><strong>4.1 Authentic Reviews:</strong> Reviews must be genuine and based on real experiences. You must not:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Post reviews for services you did not receive</li>
                        <li>Accept payment or incentives for reviews without disclosure</li>
                        <li>Post reviews for your own business or a competitor's business</li>
                        <li>Ask family members or employees to post reviews without disclosure</li>
                      </ul>
                      <p><strong>4.2 Constructive Feedback:</strong> Reviews should be honest, fair, and constructive. They should not contain personal attacks, hate speech, or irrelevant content.</p>

                      <h3 className="font-semibold text-foreground">5. Intellectual Property</h3>
                      <p>You must not:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Post content that infringes on copyrights, trademarks, or other intellectual property rights</li>
                        <li>Use the Wellington EcoBuild name, logo, or branding without permission</li>
                        <li>Copy or reproduce our website design, features, or content</li>
                        <li>Create derivative works based on our Services without authorization</li>
                      </ul>

                      <h3 className="font-semibold text-foreground">6. Reporting Violations</h3>
                      <p>If you become aware of any violation of this AUP, please report it to us immediately at info@wellingtonecobuild.nz. We take violations seriously and will investigate all reports.</p>

                      <h3 className="font-semibold text-foreground">7. Enforcement</h3>
                      <p><strong>7.1 Investigation:</strong> We reserve the right to investigate any suspected violation of this AUP. We may access and review content and account information as part of our investigation.</p>
                      <p><strong>7.2 Actions:</strong> If we determine that a violation has occurred, we may take any or all of the following actions at our sole discretion:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Issue a warning</li>
                        <li>Remove or modify content</li>
                        <li>Suspend access to certain features</li>
                        <li>Temporarily or permanently suspend your account</li>
                        <li>Terminate your account and all associated listings</li>
                        <li>Report illegal activities to law enforcement</li>
                        <li>Take legal action to protect our rights and those of our users</li>
                      </ul>
                      <p><strong>7.3 No Refunds:</strong> If your account is terminated for violation of this AUP, you will not be entitled to any refunds for prepaid services.</p>

                      <h3 className="font-semibold text-foreground">8. Updates to This Policy</h3>
                      <p>We may update this AUP from time to time. Material changes will be communicated through our website or by email. Your continued use of the Services after changes are posted constitutes acceptance of the updated AUP.</p>

                      <h3 className="font-semibold text-foreground">9. Contact</h3>
                      <p>For questions about this Acceptable Use Policy:<br />
                      Email: info@wellingtonecobuild.nz<br />
                      Wellington EcoBuild<br />
                      Wellington, New Zealand</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Legal;
