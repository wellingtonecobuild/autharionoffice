import { Link } from "react-router-dom";
import { Mail, MapPin, ShieldCheck, Lock, Instagram, Facebook } from "lucide-react";
import logo from "@/assets/wellington-ecobuild-logo.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    categories: [
      { name: "Certified Eco-Builders", href: "/category/eco-builders" },
      { name: "Sustainable Material Suppliers", href: "/category/suppliers" },
      { name: "Green Architects & Designers", href: "/category/architects" },
      { name: "Renovation & Retrofitting Specialists", href: "/category/renovation" },
    ],
    locations: [
      { name: "Wellington City", href: "/location/wellington-city" },
      { name: "Lower Hutt", href: "/location/lower-hutt" },
      { name: "Upper Hutt", href: "/location/upper-hutt" },
      { name: "Porirua", href: "/location/porirua" },
      { name: "Kāpiti Coast", href: "/location/kapiti-coast" },
    ],
    company: [
      { name: "About Us", href: "/about" },
      { name: "How It Works", href: "/how-it-works" },
      { name: "Construction Opportunities", href: "/jobs" },
      { name: "Market Insights", href: "/market-insights" },
      { name: "Pricing", href: "/pricing" },
      { name: "Contact", href: "/contact" },
      { name: "Verification Process", href: "/verification" },
      { name: "Listing Standards", href: "/listing-standards" },
    ],
    earnWithUs: [
      { name: "Partner Referral Program", href: "/referral-program" },
    ],
    legal: [
      { name: "Terms of Use", href: "/legal" },
      { name: "Privacy Policy", href: "/legal" },
      { name: "Disclaimer", href: "/legal" },
    ],
  };

  return (
    <footer className="bg-secondary text-secondary-foreground">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <img 
                src={logo} 
                alt="Wellington EcoBuild" 
                className="w-9 h-9 object-contain"
              />
              <div>
                <span className="text-base font-semibold text-secondary-foreground tracking-tight">
                  Wellington
                </span>
                <span className="text-base font-semibold text-accent tracking-tight">
                  EcoBuild
                </span>
              </div>
            </Link>
            <p className="text-secondary-foreground/60 text-sm mb-3 leading-relaxed">
              Wellington's verified directory for qualified builders and construction companies.
            </p>
            <p className="text-secondary-foreground/50 text-xs mb-4 italic leading-relaxed">
              Built for serious builders and construction companies who want visibility without competing against unqualified operators.
            </p>
            <p className="text-secondary-foreground/70 text-xs font-medium mb-6">
              Founded by Beveck Chiwawa
            </p>
            {/* Contact Info */}
            <div className="space-y-3">
              <a
                href="mailto:info@wellingtonecobuild.nz"
                className="flex items-center gap-2.5 text-sm text-secondary-foreground/60 hover:text-accent transition-colors"
              >
                <Mail className="w-4 h-4" />
                info@wellingtonecobuild.nz
              </a>
              <p className="flex items-center gap-2.5 text-sm text-secondary-foreground/60">
                <MapPin className="w-4 h-4" />
                Wellington, New Zealand
              </p>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold text-secondary-foreground mb-4 text-sm uppercase tracking-wider">
              Categories
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.categories.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-secondary-foreground/60 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Locations */}
          <div>
            <h4 className="font-semibold text-secondary-foreground mb-4 text-sm uppercase tracking-wider">
              Locations
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.locations.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-secondary-foreground/60 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-secondary-foreground mb-4 text-sm uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-secondary-foreground/60 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Earn with Us */}
          <div>
            <h4 className="font-semibold text-secondary-foreground mb-4 text-sm uppercase tracking-wider">
              Earn with Us
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.earnWithUs.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-secondary-foreground/60 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-secondary-foreground mb-4 text-sm uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-secondary-foreground/60 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Security Badge */}
      <div className="border-t border-secondary-foreground/10">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-secondary-foreground/70">Secure Platform</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-secondary-foreground/50">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                Encrypted
              </span>
              <span>•</span>
              <span>Stripe Payments</span>
              <span>•</span>
              <span>Privacy Protected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimers */}
      <div className="border-t border-secondary-foreground/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs text-secondary-foreground/40">
            <p>Listings are independently owned businesses</p>
            <p>Verification does not guarantee outcomes</p>
          </div>
        </div>
      </div>

      {/* Social Media Section */}
      <div className="border-t border-secondary-foreground/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-secondary-foreground/70">
              Follow us on
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://facebook.com/wellingtonecobuild"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary-foreground/5 hover:bg-secondary-foreground/10 transition-colors"
                aria-label="Wellington EcoBuild on Facebook"
              >
                <Facebook className="w-5 h-5 text-[#1877F2]" />
                <span className="text-sm font-medium text-secondary-foreground/80">
                  Wellington EcoBuild
                </span>
              </a>
              <a
                href="https://instagram.com/wellingtonecobuild"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary-foreground/5 hover:bg-secondary-foreground/10 transition-colors"
                aria-label="Wellington EcoBuild on Instagram"
              >
                <Instagram className="w-5 h-5 text-[#E4405F]" />
                <span className="text-sm font-medium text-secondary-foreground/80">
                  Wellington EcoBuild
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-secondary-foreground/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-secondary-foreground/50">
              © {currentYear} Wellington EcoBuild. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
