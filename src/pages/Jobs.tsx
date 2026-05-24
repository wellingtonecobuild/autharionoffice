import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Briefcase, 
  MapPin, 
  Building2, 
  Clock, 
  CheckCircle,
  Search,
  Loader2,
  Leaf,
  Star,
  ExternalLink,
  Users,
  Shield,
  TrendingUp,
  Award,
  Crown,
  Megaphone
} from "lucide-react";
import { useJobs, JobWithBusiness } from "@/hooks/useJobs";

const jobTypeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
};

const categoryLabels: Record<string, string> = {
  "eco-builders": "Eco-Builders",
  suppliers: "Suppliers",
  architects: "Architects & Designers",
  renovation: "Renovation & Retrofitting",
};

const JobCard = ({ job }: { job: JobWithBusiness & { is_spotlight?: boolean; spotlight_until?: string | null } }) => {
  const daysUntilExpiry = Math.ceil(
    (new Date(job.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Check if spotlight is active
  const isSpotlightActive = job.is_spotlight && job.spotlight_until && new Date(job.spotlight_until) > new Date();
  const isEliteEmployer = job.business?.subscription_plan === 'elite';

  return (
    <Card className={`group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
      isSpotlightActive 
        ? 'border-accent ring-2 ring-accent/30 bg-gradient-to-br from-accent/5 to-accent/10' 
        : job.is_featured 
          ? 'border-accent ring-2 ring-accent/20 bg-accent/5' 
          : 'border-border'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {isSpotlightActive && (
                <Badge className="bg-accent/90 text-accent-foreground gap-1 shadow-sm">
                  <Megaphone className="w-3 h-3" />
                  Sponsored
                </Badge>
              )}
              {job.is_featured && !isSpotlightActive && (
                <Badge className="bg-accent text-accent-foreground gap-1 shadow-sm">
                  <Star className="w-3 h-3 fill-current" />
                  Featured
                </Badge>
              )}
              {isEliteEmployer && (
                <Badge variant="outline" className="text-xs border-accent/50 text-accent gap-1">
                  <Crown className="w-3 h-3" />
                  Elite Employer
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs font-medium">
                {jobTypeLabels[job.job_type]}
              </Badge>
              {job.sustainability_relevance && (
                <Badge variant="outline" className="text-xs text-primary border-primary/30 gap-1">
                  <Leaf className="w-3 h-3" />
                  Eco
                </Badge>
              )}
            </div>
            <h3 className="font-display text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
              {job.title}
            </h3>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company Info */}
        <Link 
          to={`/business/${job.business.id}`}
          className="flex items-center gap-3 p-3 bg-muted/60 rounded-xl hover:bg-muted transition-all group/company"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground truncate">{job.business.name}</span>
              {(job.business.subscription_plan === 'premium' || job.business.subscription_plan === 'elite') && (
                <CheckCircle className="w-4 h-4 text-accent shrink-0" />
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {categoryLabels[job.business.category] || job.business.category}
            </span>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover/company:text-primary transition-colors shrink-0" />
        </Link>

        {/* Summary */}
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {job.summary}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-2 border-t border-border/50">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary/60" />
            {job.location}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary/60" />
            {daysUntilExpiry} days left
          </span>
        </div>

        {/* Actions */}
        <Button asChild className="w-full mt-2" size="lg">
          <Link to={`/jobs/${job.id}`}>
            View Position
            <ExternalLink className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

const Jobs = () => {
  const { jobs, loading, fetchJobs } = useJobs();
  const [searchLocation, setSearchLocation] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedJobType, setSelectedJobType] = useState<string>("all");

  const handleSearch = () => {
    fetchJobs({
      location: searchLocation || undefined,
      category: selectedCategory === "all" ? undefined : selectedCategory,
      jobType: selectedJobType === "all" ? undefined : selectedJobType,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Separate spotlight, featured, and regular jobs
  const spotlightJobs = jobs.filter((j: any) => 
    j.is_spotlight && j.spotlight_until && new Date(j.spotlight_until) > new Date()
  );
  const featuredJobs = jobs.filter((j: any) => 
    j.is_featured && !(j.is_spotlight && j.spotlight_until && new Date(j.spotlight_until) > new Date())
  );
  const regularJobs = jobs.filter((j: any) => 
    !j.is_featured && !(j.is_spotlight && j.spotlight_until && new Date(j.spotlight_until) > new Date())
  );

  return (
    <>
      <Helmet>
        <title>Construction Opportunities | Wellington EcoBuild</title>
        <meta 
          name="description" 
          content="Find sustainable construction jobs in Wellington. Connect with verified eco-builders, architects, and construction professionals." 
        />
        <meta name="keywords" content="construction jobs wellington, eco builder jobs, sustainable construction careers, architect jobs nz" />
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24 min-h-screen bg-background">
        {/* Post a Job CTA Bar */}
        <section className="py-4 bg-accent/10 border-b border-accent/20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-accent" />
                <span className="font-semibold text-foreground">Hiring for your construction business?</span>
              </div>
              <Button asChild variant="default" size="lg">
                <Link to="/pricing">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Post a Job
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Hero */}
        <section className="relative py-20 lg:py-28 bg-gradient-to-br from-primary via-primary to-primary/90 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          </div>
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/10 to-transparent" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="outline" className="border-accent/50 text-accent bg-accent/10 mb-6 py-1.5 px-4">
                <Briefcase className="w-4 h-4 mr-2" />
                Wellington's Premier Construction Job Board
              </Badge>
              <h1 className="font-display text-4xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
                Construction<br />
                <span className="text-accent">Opportunities</span>
              </h1>
              <p className="text-lg lg:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto leading-relaxed">
                Exclusive positions from Wellington's verified sustainable construction professionals. 
                Quality roles from quality businesses.
              </p>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center gap-6 text-sm text-primary-foreground/70">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-accent" />
                  <span>Verified Employers Only</span>
                </div>
                <div className="flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-accent" />
                  <span>Sustainability Focused</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-accent" />
                  <span>Wellington Region</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Rules */}
        <section className="py-8 bg-card border-b border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-6">
                <h2 className="font-display text-lg font-bold text-foreground mb-2">Our Standards</h2>
                <p className="text-sm text-muted-foreground">Non-negotiable rules that protect the quality of this platform</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">Verified Employers Only</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">No free posting from unverified companies. Premium & Elite subscribers only.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">Construction Roles Only</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">Builders, site managers, architects, engineers, estimators, sustainability consultants.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">Wellington Region Only</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">No remote spam or nationwide dilution. Local opportunities for local talent.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">Quality Threshold</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">Every role is reviewed and approved by our team before going live.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Search & Filters */}
        <section className="py-8 border-b border-border bg-card shadow-sm sticky top-16 lg:top-18 z-30">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-1.5">
                <label className="text-sm font-medium text-foreground">Search Location</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="e.g. Wellington CBD, Lower Hutt..."
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="pl-11 h-12 text-base"
                  />
                </div>
              </div>
              <div className="w-full lg:w-52 space-y-1.5">
                <label className="text-sm font-medium text-foreground">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="eco-builders">Eco-Builders</SelectItem>
                    <SelectItem value="suppliers">Suppliers</SelectItem>
                    <SelectItem value="architects">Architects & Designers</SelectItem>
                    <SelectItem value="renovation">Renovation Specialists</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full lg:w-44 space-y-1.5">
                <label className="text-sm font-medium text-foreground">Employment Type</label>
                <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSearch} size="lg" className="w-full lg:w-auto h-12 px-8">
                <Search className="w-5 h-5 mr-2" />
                Search Jobs
              </Button>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="py-4 bg-muted/30 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {loading ? 'Loading...' : `${jobs.length} active position${jobs.length !== 1 ? 's' : ''}`}
              </span>
              {featuredJobs.length > 0 && (
                <span className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-accent" />
                  {featuredJobs.length} featured
                </span>
              )}
            </div>
          </div>
        </section>

        {/* External Applications Note */}
        <section className="py-3 bg-primary/5 border-b border-primary/10">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-2 text-sm text-primary">
              <ExternalLink className="w-4 h-4" />
              <span>All applications are submitted directly on the employer's website — we connect you, they handle the rest.</span>
            </div>
          </div>
        </section>

        {/* Jobs List */}
        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading opportunities...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-24 max-w-md mx-auto">
                <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Briefcase className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                  No opportunities listed yet
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Be the first to post a construction job opportunity, or explore our verified professionals in the meantime.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild variant="outline" size="lg">
                    <Link to="/">Browse Businesses</Link>
                  </Button>
                  <Button asChild size="lg">
                    <Link to="/pricing">Post a Job</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                {/* Spotlight Jobs - Sponsored */}
                {spotlightJobs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-accent/20 rounded-lg">
                        <Megaphone className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-bold text-foreground">
                          Sponsored Opportunities
                        </h2>
                        <p className="text-sm text-muted-foreground">Premium placement from verified employers</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {spotlightJobs.map((job) => (
                        <JobCard key={job.id} job={job as any} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Featured Jobs */}
                {featuredJobs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-accent/10 rounded-lg">
                        <Star className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-bold text-foreground">
                          Featured Opportunities
                        </h2>
                        <p className="text-sm text-muted-foreground">Premium positions from top employers</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {featuredJobs.map((job) => (
                        <JobCard key={job.id} job={job as any} />
                      ))}
                    </div>
                  </div>
                )}

                {/* All Jobs */}
                {regularJobs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-bold text-foreground">
                          All Opportunities
                        </h2>
                        <p className="text-sm text-muted-foreground">Explore all available positions</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {regularJobs.map((job) => (
                        <JobCard key={job.id} job={job as any} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* CTA for Businesses */}
        <section className="py-20 bg-gradient-to-br from-muted/50 to-muted border-t border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-4">For Verified Employers</Badge>
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Looking to hire top talent?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Post construction opportunities to reach qualified, sustainability-focused professionals in Wellington.
              </p>
              
              {/* Pricing Grid */}
              <div className="grid sm:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
                <div className="p-5 bg-card border border-border rounded-xl">
                  <div className="font-semibold text-foreground mb-1">Premium Plan</div>
                  <div className="text-2xl font-bold text-primary mb-2">$149<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  <p className="text-sm text-muted-foreground">2 active job postings included</p>
                </div>
                <div className="p-5 bg-accent/5 border-2 border-accent rounded-xl relative">
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">Best Value</Badge>
                  <div className="font-semibold text-foreground mb-1 mt-2">Elite Plan</div>
                  <div className="text-2xl font-bold text-accent mb-2">$299<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  <p className="text-sm text-muted-foreground">Unlimited + Spotlight eligible</p>
                </div>
                <div className="p-5 bg-card border border-border rounded-xl">
                  <div className="font-semibold text-foreground mb-1">Pay Per Listing</div>
                  <div className="text-2xl font-bold text-foreground mb-2">$199<span className="text-sm font-normal text-muted-foreground">/one-time</span></div>
                  <p className="text-sm text-muted-foreground">30 days, no subscription</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="px-8">
                  <Link to="/pricing">
                    <Crown className="w-5 h-5 mr-2" />
                    View Plans
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="px-8">
                  <Link to="/dashboard">
                    <Briefcase className="w-5 h-5 mr-2" />
                    Go to Dashboard
                  </Link>
                </Button>
              </div>
              
              {/* Benefits */}
              <div className="grid sm:grid-cols-4 gap-6 mt-12 pt-12 border-t border-border">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Admin Reviewed</h3>
                  <p className="text-sm text-muted-foreground">Every listing is reviewed</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Targeted Reach</h3>
                  <p className="text-sm text-muted-foreground">Construction pros only</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Star className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Featured Options</h3>
                  <p className="text-sm text-muted-foreground">Boost visibility</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Megaphone className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Spotlight Ads</h3>
                  <p className="text-sm text-muted-foreground">$99/week boost</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Jobs;
