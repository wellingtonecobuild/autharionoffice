import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, MousePointer, TrendingUp, Briefcase, Star, Crown, Sparkles, ExternalLink } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface JobAnalytics {
  id: string;
  title: string;
  views: number;
  clicks: number;
  status: string;
  is_featured: boolean;
  is_spotlight: boolean;
  created_at: string;
}

interface EmployerJobAnalyticsProps {
  businessId: string;
  businessName: string;
}

export function EmployerJobAnalytics({ businessId, businessName }: EmployerJobAnalyticsProps) {
  const [jobs, setJobs] = useState<JobAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [businessId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("id, title, views, clicks, status, is_featured, is_spotlight, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);
    } catch (error) {
      console.error("Error fetching job analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

  // Aggregate stats
  const totalViews = jobs.reduce((sum, j) => sum + (j.views || 0), 0);
  const totalClicks = jobs.reduce((sum, j) => sum + (j.clicks || 0), 0);
  const activeJobs = jobs.filter(j => j.status === "approved").length;
  const clickRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0";

  // Chart data
  const chartData = jobs.slice(0, 5).map(job => ({
    name: job.title.length > 15 ? job.title.substring(0, 15) + "..." : job.title,
    views: job.views,
    clicks: job.clicks,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Job Analytics
              <Badge className="bg-accent text-accent-foreground gap-1">
                <Crown className="w-3 h-3" />
                Elite
              </Badge>
            </CardTitle>
            <CardDescription>
              Performance insights for your job postings
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Views</span>
            </div>
            <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Apply Clicks</span>
            </div>
            <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{clickRate}% click rate</p>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">External Redirects</span>
            </div>
            <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">to your website</p>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Active Jobs</span>
            </div>
            <p className="text-2xl font-bold">{activeJobs}</p>
            <p className="text-xs text-muted-foreground mt-1">of {jobs.length} total</p>
          </div>
        </div>

        {/* Performance Chart */}
        {chartData.length > 0 && (
          <div>
            <h4 className="font-medium text-foreground mb-4">Job Performance</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    className="fill-muted-foreground"
                  />
                  <YAxis 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    className="fill-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="views" name="Views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clicks" name="Apply Clicks" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Job Details Table */}
        <div>
          <h4 className="font-medium text-foreground mb-4">Individual Job Performance</h4>
          <div className="space-y-3">
            {jobs.map((job) => (
              <div 
                key={job.id} 
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{job.title}</span>
                      {job.is_spotlight && (
                        <Badge className="bg-accent/20 text-accent border-accent/30 gap-1">
                          <Sparkles className="w-3 h-3" />
                          Spotlight
                        </Badge>
                      )}
                      {job.is_featured && !job.is_spotlight && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="w-3 h-3" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    <Badge 
                      variant={job.status === "approved" ? "default" : "secondary"} 
                      className="mt-1 text-xs"
                    >
                      {job.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-semibold">{job.views}</p>
                    <p className="text-xs text-muted-foreground">Views</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{job.clicks}</p>
                    <p className="text-xs text-muted-foreground">Clicks</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">
                      {job.views > 0 ? ((job.clicks / job.views) * 100).toFixed(0) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">CTR</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {jobs.length === 0 && (
          <div className="text-center py-8">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No job data yet</h3>
            <p className="text-muted-foreground">
              Post job opportunities to start tracking performance.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
