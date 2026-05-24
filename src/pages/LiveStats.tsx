import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  Star, 
  Briefcase, 
  Newspaper, 
  TrendingUp,
  ShieldCheck,
  MapPin,
  Eye,
  MessageSquare,
  Activity,
  Zap
} from "lucide-react";

const LiveStats = () => {
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["live-platform-stats"],
    queryFn: async () => {
      const [
        businessesResult,
        reviewsResult,
        jobsResult,
        articlesResult,
        leadsResult,
        contactsResult
      ] = await Promise.all([
        supabase.from("businesses_public").select("id, is_verified, is_featured, category, subscription_plan", { count: "exact" }).eq("status", "active"),
        supabase.from("reviews").select("id, rating", { count: "exact" }),
        supabase.from("jobs").select("id, is_featured", { count: "exact" }).eq("status", "approved").gt("expires_at", new Date().toISOString()),
        supabase.from("articles").select("id, views, is_featured, is_trending", { count: "exact" }).eq("status", "published"),
        supabase.from("leads").select("id", { count: "exact" }),
        supabase.from("contact_submissions").select("id", { count: "exact" })
      ]);

      const businesses = businessesResult.data || [];
      const reviews = reviewsResult.data || [];
      const articles = articlesResult.data || [];

      return {
        totalBusinesses: businessesResult.count || 0,
        // Verified Professionals = only Premium & Elite (paid) listings
        verifiedProfessionals: businesses.filter(b => b.subscription_plan === 'premium' || b.subscription_plan === 'elite').length,
        featuredBusinesses: businesses.filter(b => b.is_featured).length,
        premiumBusinesses: businesses.filter(b => b.subscription_plan === 'premium' || b.subscription_plan === 'elite').length,
        eliteBusinesses: businesses.filter(b => b.subscription_plan === 'elite').length,
        categoryBreakdown: {
          ecoBuilders: businesses.filter(b => b.category === 'eco-builders').length,
          suppliers: businesses.filter(b => b.category === 'suppliers').length,
          architects: businesses.filter(b => b.category === 'architects').length,
          renovation: businesses.filter(b => b.category === 'renovation').length,
        },
        totalReviews: reviewsResult.count || 0,
        averageRating: reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "0",
        totalJobs: jobsResult.count || 0,
        featuredJobs: (jobsResult.data || []).filter((j: any) => j.is_featured).length,
        totalArticles: articlesResult.count || 0,
        totalArticleViews: articles.reduce((acc, a) => acc + (a.views || 0), 0),
        trendingArticles: articles.filter(a => a.is_trending).length,
        totalLeads: leadsResult.count || 0,
        totalContacts: contactsResult.count || 0,
      };
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Real-time subscriptions for all tables
  useEffect(() => {
    const channels = [
      supabase.channel('live-stats-businesses').on('postgres_changes', { event: '*', schema: 'public', table: 'businesses_public' }, () => queryClient.invalidateQueries({ queryKey: ['live-platform-stats'] })).subscribe(),
      supabase.channel('live-stats-reviews').on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => queryClient.invalidateQueries({ queryKey: ['live-platform-stats'] })).subscribe(),
      supabase.channel('live-stats-jobs').on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => queryClient.invalidateQueries({ queryKey: ['live-platform-stats'] })).subscribe(),
      supabase.channel('live-stats-articles').on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, () => queryClient.invalidateQueries({ queryKey: ['live-platform-stats'] })).subscribe(),
      supabase.channel('live-stats-leads').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => queryClient.invalidateQueries({ queryKey: ['live-platform-stats'] })).subscribe(),
      supabase.channel('live-stats-contacts').on('postgres_changes', { event: '*', schema: 'public', table: 'contact_submissions' }, () => queryClient.invalidateQueries({ queryKey: ['live-platform-stats'] })).subscribe(),
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [queryClient]);

  const StatCard = ({ title, value, icon: Icon, subtitle, trend, highlight }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    subtitle?: string;
    trend?: string;
    highlight?: boolean;
  }) => (
    <Card className={`transition-all duration-300 hover:shadow-lg ${highlight ? 'border-accent bg-accent/5' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${highlight ? 'text-accent' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{isLoading ? "..." : value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-3 h-3 text-accent" />
            <span className="text-xs text-accent font-medium">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <Helmet>
        <title>Live Platform Stats | Wellington EcoBuild</title>
        <meta name="description" content="Real-time platform statistics for Wellington EcoBuild - businesses, jobs, reviews, and more." />
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24 min-h-screen bg-background">
        {/* Hero */}
        <section className="py-12 lg:py-16 bg-gradient-to-br from-primary via-primary to-primary/90">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/30 mb-6">
              <Activity className="w-4 h-4 text-accent animate-pulse" />
              <span className="text-sm font-medium text-primary-foreground">Live Dashboard</span>
              <Zap className="w-4 h-4 text-accent" />
            </div>
            <h1 className="font-display text-3xl lg:text-5xl font-bold text-primary-foreground mb-4">
              Platform Statistics
            </h1>
            <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
              Real-time data from Wellington's sustainable construction network. Updates automatically.
            </p>
          </div>
        </section>

        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-4">
            {/* Live Indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
              </span>
              <span className="text-sm font-medium text-muted-foreground">Live - Updates in real-time</span>
            </div>

            {/* Main Stats Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <StatCard 
                title="Total Businesses" 
                value={stats?.totalBusinesses || 0} 
                icon={Building2}
                subtitle="Active listings"
                highlight
              />
              <StatCard 
                title="Verified Professionals" 
                value={stats?.verifiedProfessionals || 0} 
                icon={ShieldCheck}
                subtitle="Premium & Elite listings"
              />
              <StatCard 
                title="Total Reviews" 
                value={stats?.totalReviews || 0} 
                icon={Star}
                subtitle={`Avg: ${stats?.averageRating || 0} stars`}
              />
              <StatCard 
                title="Active Jobs" 
                value={stats?.totalJobs || 0} 
                icon={Briefcase}
                subtitle={`${stats?.featuredJobs || 0} featured`}
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <StatCard 
                title="Premium/Elite Businesses" 
                value={stats?.premiumBusinesses || 0} 
                icon={TrendingUp}
                subtitle={`${stats?.eliteBusinesses || 0} elite`}
              />
              <StatCard 
                title="Featured Businesses" 
                value={stats?.featuredBusinesses || 0} 
                icon={Star}
                subtitle="Spotlight listings"
              />
              <StatCard 
                title="Total Articles" 
                value={stats?.totalArticles || 0} 
                icon={Newspaper}
                subtitle={`${stats?.trendingArticles || 0} trending`}
              />
              <StatCard 
                title="Article Views" 
                value={stats?.totalArticleViews?.toLocaleString() || 0} 
                icon={Eye}
                subtitle="Total reads"
              />
            </div>

            {/* Category Breakdown */}
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">Business Categories</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <StatCard 
                title="Eco-Builders" 
                value={stats?.categoryBreakdown?.ecoBuilders || 0} 
                icon={Building2}
              />
              <StatCard 
                title="Suppliers" 
                value={stats?.categoryBreakdown?.suppliers || 0} 
                icon={Building2}
              />
              <StatCard 
                title="Architects" 
                value={stats?.categoryBreakdown?.architects || 0} 
                icon={Building2}
              />
              <StatCard 
                title="Renovation" 
                value={stats?.categoryBreakdown?.renovation || 0} 
                icon={Building2}
              />
            </div>

            {/* Engagement Stats */}
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">Engagement</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard 
                title="Total Leads" 
                value={stats?.totalLeads || 0} 
                icon={MessageSquare}
                subtitle="Business enquiries"
                highlight
              />
              <StatCard 
                title="Contact Submissions" 
                value={stats?.totalContacts || 0} 
                icon={Users}
                subtitle="Platform contacts"
              />
              <Card className="flex items-center justify-center p-8 border-dashed">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Wellington Region</p>
                  <p className="text-xs text-muted-foreground">100% Local Focus</p>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default LiveStats;
