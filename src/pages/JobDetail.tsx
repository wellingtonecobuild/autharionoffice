import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  MapPin, 
  Building2, 
  Clock, 
  CheckCircle,
  Loader2,
  Leaf,
  Star,
  ArrowLeft,
  Mail,
  ExternalLink,
  Calendar,
  FileText,
  DollarSign
} from "lucide-react";
import { JobWithBusiness } from "@/hooks/useJobs";
import { JobApplicationModal } from "@/components/jobs/JobApplicationModal";
import { useAuth } from "@/hooks/useAuth";

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

const salaryTypeLabels: Record<string, string> = {
  hourly: "/hr",
  annual: "/year",
  project: " (project rate)",
};

const JobDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState<JobWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            business:businesses!inner(id, name, category, city, is_verified, subscription_plan, email, phone, website)
          `)
          .eq('id', id)
          .eq('status', 'approved')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (error) throw error;
        setJob(data as JobWithBusiness);

        // Increment views
        if (data) {
          await supabase.from('jobs').update({ views: (data.views || 0) + 1 }).eq('id', id);
        }
      } catch (err) {
        console.error('Error fetching job:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);

  const handleApplyClick = async () => {
    if (!job) return;

    // Track click
    await supabase
      .from('jobs')
      .update({ clicks: (job.clicks || 0) + 1 })
      .eq('id', job.id);

    // Handle different application methods
    if (job.application_method === 'internal') {
      // For internal applications, show the modal
      setShowApplicationModal(true);
    } else if (job.application_method === 'email' && job.application_email) {
      window.location.href = `mailto:${job.application_email}?subject=Application: ${job.title}`;
    } else if (job.application_url) {
      window.open(job.application_url, '_blank');
    }
  };

  const formatSalary = (min?: number | null, max?: number | null, type?: string | null) => {
    if (!min && !max) return null;
    const suffix = type ? salaryTypeLabels[type] || "" : "";
    if (min && max) {
      return `$${min.toLocaleString()} - $${max.toLocaleString()}${suffix}`;
    }
    if (min) return `From $${min.toLocaleString()}${suffix}`;
    if (max) return `Up to $${max.toLocaleString()}${suffix}`;
    return null;
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="pt-20 lg:pt-24 min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </main>
        <Footer />
      </>
    );
  }

  if (!job) {
    return (
      <>
        <Header />
        <main className="pt-20 lg:pt-24 min-h-screen">
          <div className="container mx-auto px-4 py-20 text-center">
            <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              Job not found
            </h1>
            <p className="text-muted-foreground mb-6">
              This position may have been filled or expired.
            </p>
            <Button asChild>
              <Link to="/jobs">Browse Opportunities</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(job.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      <Helmet>
        <title>{job.title} at {job.business.name} | Wellington EcoBuild</title>
        <meta 
          name="description" 
          content={job.summary} 
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: job.title,
            description: job.summary,
            datePosted: job.created_at,
            validThrough: job.expires_at,
            employmentType: job.job_type.toUpperCase().replace('_', '-'),
            hiringOrganization: {
              "@type": "Organization",
              name: job.business.name,
            },
            jobLocation: {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                addressLocality: job.location,
                addressRegion: "Wellington",
                addressCountry: "NZ",
              },
            },
          })}
        </script>
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24 min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="bg-muted py-4">
          <div className="container mx-auto px-4">
            <Link to="/jobs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to opportunities
            </Link>
          </div>
        </div>

        {/* Content */}
        <section className="py-8 lg:py-12">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Header */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {job.is_featured && (
                      <Badge variant="default" className="bg-accent text-accent-foreground gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        Featured
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {jobTypeLabels[job.job_type]}
                    </Badge>
                    {job.sustainability_relevance && (
                      <Badge variant="secondary" className="gap-1">
                        <Leaf className="w-3 h-3" />
                        Sustainability Focus
                      </Badge>
                    )}
                  </div>
                  <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
                    {job.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </span>
                    {formatSalary(job.salary_min, job.salary_max, job.salary_type) && (
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <DollarSign className="w-4 h-4" />
                        {formatSalary(job.salary_min, job.salary_max, job.salary_type)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {daysUntilExpiry} days remaining
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">About This Role</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{job.summary}</p>
                  </CardContent>
                </Card>

                {/* Responsibilities */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Responsibilities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-muted max-w-none">
                      <p className="text-muted-foreground whitespace-pre-wrap">{job.responsibilities}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Requirements */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-muted max-w-none">
                      <p className="text-muted-foreground whitespace-pre-wrap">{job.requirements}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Sustainability */}
                {job.sustainability_relevance && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Leaf className="w-5 h-5 text-primary" />
                        Sustainability Focus
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {job.sustainability_relevance}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Apply Card */}
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle className="text-lg">Apply for this role</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {job.application_method === 'internal' ? (
                      <>
                        {user ? (
                          <Button onClick={handleApplyClick} className="w-full" size="lg">
                            <FileText className="w-4 h-4 mr-2" />
                            Apply Now
                          </Button>
                        ) : (
                          <div className="space-y-3">
                            <Button asChild className="w-full" size="lg">
                              <Link to="/auth?redirect=/jobs/{job.id}">
                                <FileText className="w-4 h-4 mr-2" />
                                Sign In to Apply
                              </Link>
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                              Create an account to apply and track your applications
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            Applications are handled securely through Wellington EcoBuild
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Button onClick={handleApplyClick} className="w-full" size="lg">
                          {job.application_method === 'email' ? (
                            <>
                              <Mail className="w-4 h-4 mr-2" />
                              Apply via Email
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Apply on Company Website
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          You will be redirected to the employer's website or email
                        </p>
                      </>
                    )}
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Applications close in {daysUntilExpiry} days
                    </p>
                  </CardContent>
                </Card>

                {/* Company Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">About the Company</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Link 
                      to={`/business/${job.business.id}`}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{job.business.name}</span>
                          {job.business.is_verified && (
                            <CheckCircle className="w-4 h-4 text-accent" />
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {categoryLabels[job.business.category] || job.business.category}
                        </span>
                      </div>
                    </Link>
                    
                    <Button asChild variant="outline" className="w-full">
                      <Link to={`/business/${job.business.id}`}>
                        View Company Profile
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Application Modal for Internal Applications */}
      {job && (
        <JobApplicationModal
          open={showApplicationModal}
          onOpenChange={setShowApplicationModal}
          jobId={job.id}
          jobTitle={job.title}
          businessId={job.business_id}
          businessName={job.business.name}
        />
      )}
    </>
  );
};

export default JobDetail;
