import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown, User, LogOut, Shield, Settings, Briefcase, PenLine, Building2, Inbox, FileText, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useProfile } from "@/hooks/useProfile";
import { usePortalUser } from "@/hooks/usePortalUser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/wellington-ecobuild-logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, signOut, loading } = useAuth();
  const { isAdmin } = useAdmin();
  const { profile } = useProfile();
  const { isPortalUser, portalUser } = usePortalUser();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getInitials = (name: string | null | undefined, email: string | undefined) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || "U";
  };

  const categories = [
    { name: "Eco-Builders", href: "/category/eco-builders" },
    { name: "Material Suppliers", href: "/category/suppliers" },
    { name: "Architects & Designers", href: "/category/architects" },
    { name: "Renovation Specialists", href: "/category/renovation" },
  ];

  // Dynamic header styles based on scroll and page
  // Home hero is light, so we keep the header lightly surfaced for contrast.
  const headerBg = isScrolled
    ? "bg-background/95 backdrop-blur-xl border-b border-border shadow-sm"
    : isHomePage
      ? "bg-background/90 backdrop-blur-md border-b border-border/60"
      : "bg-background border-b border-border";

  const textColor = "text-foreground";

  // Slightly stronger than muted so links remain readable over light imagery.
  const textColorMuted = "text-foreground/85 hover:text-foreground";

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBg}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 lg:h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              src={logo} 
              alt="Wellington EcoBuild" 
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
            />
            <div className="flex flex-col sm:flex-row sm:gap-0">
              <span className={`text-sm sm:text-base font-semibold tracking-tight transition-colors ${textColor}`}>
                Wellington
              </span>
              <span className="text-sm sm:text-base font-semibold text-accent tracking-tight">
                EcoBuild
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-0.5">
            <div className="relative group">
              <button className={`flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors ${textColorMuted}`}>
                Categories
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="bg-card rounded-xl shadow-lg border border-border p-2 min-w-[220px]">
                  {categories.map((cat) => (
                    <Link
                      key={cat.name}
                      to={cat.href}
                      className="block px-4 py-2.5 text-sm text-foreground hover:bg-muted rounded-lg transition-colors font-medium"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <Link
              to="/how-it-works"
              className={`px-4 py-2 text-sm font-medium transition-colors ${textColorMuted}`}
            >
              How It Works
            </Link>
            <Link
              to="/locations"
              className={`px-4 py-2 text-sm font-medium transition-colors ${textColorMuted}`}
            >
              Locations
            </Link>
            <Link
              to="/market-insights"
              className={`px-4 py-2 text-sm font-medium transition-colors ${textColorMuted}`}
            >
              Market Insights
            </Link>
            <Link
              to="/pricing"
              className={`px-4 py-2 text-sm font-medium transition-colors ${textColorMuted}`}
            >
              Pricing
            </Link>
            <Link
              to="/community"
              className={`px-4 py-2 text-sm font-medium transition-colors ${textColorMuted}`}
            >
              Community
            </Link>
            <Link
              to="/jobs"
              className="px-4 py-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors flex items-center gap-1.5"
            >
              <Briefcase className="w-4 h-4" />
              Opportunities
            </Link>
            {isPortalUser && (
              <Link
                to="/portal/dashboard"
                className="px-3 py-1.5 text-sm font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors flex items-center gap-1.5 rounded-full border border-emerald-300 dark:border-emerald-700"
              >
                <Building2 className="w-4 h-4" />
                Contractor Portal
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${textColorMuted}`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? null : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={isScrolled || !isHomePage ? "ghost" : "hero-outline"} className="gap-2 pl-2 h-10">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
                      <AvatarFallback className="text-xs bg-accent text-accent-foreground font-semibold">
                        {getInitials(profile?.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`hidden xl:inline text-sm ${textColor}`}>{profile?.full_name || "Account"}</span>
                    <ChevronDown className={`w-4 h-4 ${textColor}`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold">{profile?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="w-full cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="w-full cursor-pointer">
                      <Building2 className="w-4 h-4 mr-2" />
                      Manage My Business
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/contributor" className="w-full cursor-pointer">
                      <PenLine className="w-4 h-4 mr-2" />
                      My Articles
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/inbox" className="w-full cursor-pointer">
                      <Inbox className="w-4 h-4 mr-2" />
                      My Messages
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/jobs/profile" className="w-full cursor-pointer">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Job Seeker Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/jobs/applications" className="w-full cursor-pointer">
                      <FileText className="w-4 h-4 mr-2" />
                      My Job Applications
                    </Link>
                  </DropdownMenuItem>
                  {isPortalUser && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-lg my-1">
                        <Link to="/portal/dashboard" className="w-full cursor-pointer text-emerald-700 dark:text-emerald-400 font-semibold">
                          <Building2 className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" />
                          🏗️ Contractor Portal
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="w-full cursor-pointer">
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="outline" asChild className="h-10 border-foreground/20 text-foreground hover:bg-foreground/10">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <div className="flex flex-col items-center">
                  <Button variant={isScrolled || !isHomePage ? "default" : "premium"} asChild className="h-10">
                    <Link to="/list-business">Apply to Be Listed</Link>
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-1 max-w-[180px] text-center leading-tight">
                    Limited verified builders per area
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`md:hidden p-2 rounded-lg border border-border bg-background/80 backdrop-blur-sm transition-colors ${textColor}`}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && ( 
          <div className="md:hidden py-4 border-t border-border bg-background animate-fade-in rounded-b-xl max-h-[calc(100vh-5rem)] overflow-y-auto">
            <nav className="flex flex-col gap-1">
              <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Categories
              </p>
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  to={cat.href}
                  className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors mx-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {cat.name}
                </Link>
              ))}
              <div className="h-px bg-border my-3 mx-4" />
              <Link
                to="/how-it-works"
                className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors mx-2"
                onClick={() => setIsMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link
                to="/locations"
                className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors mx-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Locations
              </Link>
              <Link
                to="/market-insights"
                className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors mx-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Market Insights
              </Link>
              <Link
                to="/pricing"
                className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors mx-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                to="/community"
                className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors mx-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Community
              </Link>
              <Link
                to="/jobs"
                className="px-4 py-3 text-sm font-medium text-accent hover:bg-muted rounded-lg transition-colors flex items-center gap-2 mx-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <Briefcase className="w-4 h-4" />
                Opportunities
              </Link>
              <div className="h-px bg-border my-3 mx-4" />
              <div className="px-4 pt-2 flex flex-col gap-2">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
                        <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                          {getInitials(profile?.full_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="font-semibold text-sm">{profile?.full_name || "User"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                        <User className="w-4 h-4 mr-2" />
                        My Profile
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                        <Building2 className="w-4 h-4 mr-2" />
                        Manage My Business
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link to="/contributor" onClick={() => setIsMenuOpen(false)}>
                        <PenLine className="w-4 h-4 mr-2" />
                        My Articles
                      </Link>
                    </Button>
                    {isPortalUser && (
                      <Button variant="outline" className="w-full justify-start border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-semibold shadow-sm" asChild>
                        <Link to="/portal/dashboard" onClick={() => setIsMenuOpen(false)}>
                          <Building2 className="w-4 h-4 mr-2" />
                          🏗️ Contractor Portal
                        </Link>
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link to="/admin" onClick={() => setIsMenuOpen(false)}>
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Panel
                        </Link>
                      </Button>
                    )}
                    <Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => { signOut(); setIsMenuOpen(false); }}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/auth" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                    </Button>
                    <Button className="w-full" asChild>
                      <Link to="/list-business" onClick={() => setIsMenuOpen(false)}>Apply to Be Listed</Link>
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      We only accept a limited number of verified builders per area.
                    </p>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
