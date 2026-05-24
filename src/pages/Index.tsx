import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import SpotlightSection from "@/components/SpotlightSection";
import HeroSection from "@/components/HeroSection";
import CategoriesSection from "@/components/CategoriesSection";
import FeaturedListings from "@/components/FeaturedListings";
import HowItWorks from "@/components/HowItWorks";
import LocationsSection from "@/components/LocationsSection";
import MarketInsightsSection from "@/components/MarketInsightsSection";
import PricingSection from "@/components/PricingSection";
import SecurityBadge from "@/components/SecurityBadge";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Wellington EcoBuild | Verified Directory for Qualified Builders & Construction Companies</title>
        <meta
          name="description"
          content="Wellington's verified directory for qualified builders and construction companies. A trust-based platform connecting homeowners and developers with verified, compliant construction professionals."
        />
        <meta
          name="keywords"
          content="Wellington builders, verified builders Wellington, construction companies Wellington, qualified builders NZ, building contractors Wellington"
        />
        <link rel="canonical" href="https://wellingtonecobuild.nz" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Wellington EcoBuild",
            url: "https://wellingtonecobuild.nz",
            description:
              "Wellington's verified directory for qualified builders and construction companies",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://wellingtonecobuild.nz/search?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Wellington EcoBuild",
            url: "https://wellingtonecobuild.nz",
            logo: {
              "@type": "ImageObject",
              url: "https://wellingtonecobuild.nz/images/wellington-ecobuild-logo.png",
              width: 512,
              height: 512,
            },
            image: "https://wellingtonecobuild.nz/images/wellington-ecobuild-logo.png",
            email: "info@wellingtonecobuild.nz",
            contactPoint: {
              "@type": "ContactPoint",
              email: "info@wellingtonecobuild.nz",
              contactType: "customer service",
              areaServed: "NZ",
              availableLanguage: "English",
            },
            sameAs: [
              "https://facebook.com/wellingtonecobuild",
              "https://instagram.com/wellingtonecobuild",
              "https://linkedin.com/company/wellingtonecobuild",
            ],
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <SpotlightSection />
        <main>
          <HeroSection />
          <FeaturedListings />
          <CategoriesSection />
          <HowItWorks />
          <LocationsSection />
          <MarketInsightsSection />
          <PricingSection />
          <SecurityBadge />
          <CTASection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
