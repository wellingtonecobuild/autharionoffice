import { useState, useEffect, useCallback } from "react";
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Briefcase, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Loader2,
  Star,
  Settings,
  Clock,
  Building2,
  TrendingUp,
  MousePointer,
  Sparkles,
  DollarSign,
  Users,
  Calendar,
  Crown
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Job, JobStatus, JobSettings } from "@/hooks/useJobs";

interface JobWithBusiness extends Job {
  business: {
    id: string;
    name: string;
    category: string;
    subscription_plan: string;
  };
}

const statusColors: Record<JobStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  approved: "bg-green-500/10 text-green-600 border-green-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  expired: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  closed: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const AdminJobs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobWithBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobWithBusiness | null>(null);
  const [actionDialog, setActionDialog] = useState<'view' | 'reject' | 'settings' | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [settings, setSettings] = useState<JobSettings | null>(null);

  // Auto-refresh every 5 seconds
  useAutoRefresh(useCallback(() => { fetchJobs(); }, [statusFilter]));

  useEffect(() => {
    fetchJobs();
    fetchSettings();
  }, [statusFilter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          business:businesses!inner(id, name, category, subscription_plan)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'approved' | 'rejected' | 'expired' | 'closed');
      }

      const { data, error } = await query;
      if (error) throw error;
      setJobs((data as JobWithBusiness[]) || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'job_settings')
      .maybeSingle();

    if (data?.value) {
      setSettings(data.value as unknown as JobSettings);
    }
  };

  const handleApprove = async (job: JobWithBusiness) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', job.id);

      if (error) throw error;

      toast({ title: "Job approved", description: `"${job.title}" is now live.` });
      fetchJobs();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedJob) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
        })
        .eq('id', selectedJob.id);

      if (error) throw error;

      toast({ title: "Job rejected", description: `"${selectedJob.title}" has been rejected.` });
      setActionDialog(null);
      setRejectionReason("");
      fetchJobs();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleFeatured = async (job: JobWithBusiness) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          is_featured: !job.is_featured,
          featured_until: !job.is_featured 
            ? new Date(Date.now() + (settings?.featured_duration_days || 7) * 24 * 60 * 60 * 1000).toISOString()
            : null,
        })
        .eq('id', job.id);

      if (error) throw error;

      toast({ 
        title: job.is_featured ? "Featured removed" : "Job featured",
        description: job.is_featured 
          ? `"${job.title}" is no longer featured.`
          : `"${job.title}" is now featured.`
      });
      fetchJobs();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleSpotlight = async (job: JobWithBusiness) => {
    // Only Elite members can have spotlight
    if (job.business.subscription_plan !== 'elite' && !job.is_spotlight) {
      toast({ 
        title: "Elite Only", 
        description: "Spotlight is only available for Elite members.", 
        variant: "destructive" 
      });
      return;
    }
    
    try {
      const spotlightDays = settings?.spotlight_duration_days || 7;
      const { error } = await supabase
        .from('jobs')
        .update({
          is_spotlight: !job.is_spotlight,
          spotlight_until: !job.is_spotlight 
            ? new Date(Date.now() + spotlightDays * 24 * 60 * 60 * 1000).toISOString()
            : null,
        })
        .eq('id', job.id);

      if (error) throw error;

      toast({ 
        title: job.is_spotlight ? "Spotlight removed" : "Job spotlighted",
        description: job.is_spotlight 
          ? `"${job.title}" is no longer in spotlight.`
          : `"${job.title}" is now in the spotlight rotation.`
      });
      fetchJobs();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          value: JSON.parse(JSON.stringify(settings)),
          updated_by: user?.id,
        })
        .eq('key', 'job_settings');

      if (error) throw error;

      toast({ title: "Settings saved" });
      setActionDialog(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = jobs.filter(j => j.status === 'pending').length;
  const approvedCount = jobs.filter(j => j.status === 'approved').length;
  const featuredCount = jobs.filter(j => j.is_featured).length;
  const spotlightCount = jobs.filter(j => j.is_spotlight).length;
  const paidListingCount = jobs.filter(j => j.is_paid_listing).length;
  const totalViews = jobs.reduce((sum, j) => sum + (j.views || 0), 0);
  const totalClicks = jobs.reduce((sum, j) => sum + (j.clicks || 0), 0);

  return (
    <AdminLayout title="Construction Opportunities">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{spotlightCount}</p>
                <p className="text-sm text-muted-foreground">Spotlight</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{featuredCount}</p>
                <p className="text-sm text-muted-foreground">Featured</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{paidListingCount}</p>
                <p className="text-sm text-muted-foreground">Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalViews}</p>
                <p className="text-sm text-muted-foreground">Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <MousePointer className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalClicks}</p>
                <p className="text-sm text-muted-foreground">Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Settings */}
      <div className="flex items-center justify-between mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={() => setActionDialog('settings')}>
          <Settings className="w-4 h-4 mr-2" />
          Job Settings
        </Button>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No jobs found</h3>
              <p className="text-muted-foreground">Job listings will appear here when businesses post them.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Monetization</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {job.is_spotlight && <Sparkles className="w-4 h-4 text-accent fill-accent" />}
                        {job.is_featured && !job.is_spotlight && <Star className="w-4 h-4 text-purple-600 fill-purple-600" />}
                        <span className="font-medium">{job.title}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{job.location}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{job.business.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={
                          job.business.subscription_plan === 'elite' 
                            ? "bg-accent/20 text-accent border-accent/30" 
                            : job.business.subscription_plan === 'premium'
                            ? "bg-primary/20 text-primary border-primary/30"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {job.business.subscription_plan === 'elite' && <Crown className="w-3 h-3 mr-1" />}
                        {job.business.subscription_plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[job.status]}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {job.is_spotlight && (
                          <Badge className="bg-accent/20 text-accent text-xs">Spotlight</Badge>
                        )}
                        {job.is_featured && (
                          <Badge className="bg-purple-500/20 text-purple-600 text-xs">Featured</Badge>
                        )}
                        {job.is_paid_listing && (
                          <Badge className="bg-emerald-500/20 text-emerald-600 text-xs">Paid</Badge>
                        )}
                        {!job.is_spotlight && !job.is_featured && !job.is_paid_listing && (
                          <span className="text-xs text-muted-foreground">Standard</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {job.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <MousePointer className="w-3 h-3" />
                          {job.clicks}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setSelectedJob(job); setActionDialog('view'); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {job.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleApprove(job)}
                              disabled={processing}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => { setSelectedJob(job); setActionDialog('reject'); }}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {job.status === 'approved' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={job.is_spotlight ? "text-accent" : "text-muted-foreground"}
                              onClick={() => handleToggleSpotlight(job)}
                              title={job.business.subscription_plan !== 'elite' ? "Elite only" : "Toggle spotlight"}
                            >
                              <Sparkles className={`w-4 h-4 ${job.is_spotlight ? 'fill-current' : ''}`} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={job.is_featured ? "text-purple-600" : "text-muted-foreground"}
                              onClick={() => handleToggleFeatured(job)}
                            >
                              <Star className={`w-4 h-4 ${job.is_featured ? 'fill-current' : ''}`} />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={actionDialog === 'view'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedJob?.title}</DialogTitle>
            <DialogDescription>
              {selectedJob?.business.name} • {selectedJob?.location}
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Summary</h4>
                <p className="text-sm text-muted-foreground">{selectedJob.summary}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Responsibilities</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedJob.responsibilities}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Requirements</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedJob.requirements}</p>
              </div>
              {selectedJob.sustainability_relevance && (
                <div>
                  <h4 className="font-medium mb-1">Sustainability Focus</h4>
                  <p className="text-sm text-muted-foreground">{selectedJob.sustainability_relevance}</p>
                </div>
              )}
              
              {/* Monetization Info */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Monetization Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Subscription:</span>
                    <Badge className="ml-2" variant="secondary">
                      {selectedJob.business.subscription_plan}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Spotlight:</span>
                    <Badge className={`ml-2 ${selectedJob.is_spotlight ? 'bg-accent/20 text-accent' : ''}`}>
                      {selectedJob.is_spotlight ? 'Active' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Featured:</span>
                    <Badge className={`ml-2 ${selectedJob.is_featured ? 'bg-purple-500/20 text-purple-600' : ''}`}>
                      {selectedJob.is_featured ? 'Active' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Paid Listing:</span>
                    <Badge className={`ml-2 ${selectedJob.is_paid_listing ? 'bg-emerald-500/20 text-emerald-600' : ''}`}>
                      {selectedJob.is_paid_listing ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Performance</h4>
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <span className="font-semibold">{selectedJob.views}</span>
                    <span className="text-muted-foreground">views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MousePointer className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold">{selectedJob.clicks}</span>
                    <span className="text-muted-foreground">clicks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {selectedJob.views > 0 ? ((selectedJob.clicks / selectedJob.views) * 100).toFixed(1) : 0}%
                    </span>
                    <span className="text-muted-foreground">CTR</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionDialog === 'reject'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Job Listing</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting "{selectedJob?.title}"
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectionReason}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={actionDialog === 'settings'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Job Section Settings</DialogTitle>
            <DialogDescription>
              Configure job posting limits and featured pricing
            </DialogDescription>
          </DialogHeader>
          {settings && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Enable Job Section</label>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Premium Job Limit</label>
                  <Input
                    type="number"
                    value={settings.premium_job_limit}
                    onChange={(e) => setSettings({ ...settings, premium_job_limit: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Elite Job Limit</label>
                  <Input
                    type="number"
                    value={settings.elite_job_limit}
                    onChange={(e) => setSettings({ ...settings, elite_job_limit: parseInt(e.target.value) })}
                    placeholder="-1 for unlimited"
                  />
                  <p className="text-xs text-muted-foreground">Use -1 for unlimited</p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Spotlight Settings (Elite Only)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Spotlight Price ($/week)</label>
                    <Input
                      type="number"
                      value={settings.spotlight_price_per_week || 99}
                      onChange={(e) => setSettings({ ...settings, spotlight_price_per_week: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Spotlight Duration (days)</label>
                    <Input
                      type="number"
                      value={settings.spotlight_duration_days || 7}
                      onChange={(e) => setSettings({ ...settings, spotlight_duration_days: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Featured Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Featured Price ($/week)</label>
                    <Input
                      type="number"
                      value={settings.featured_price_per_week}
                      onChange={(e) => setSettings({ ...settings, featured_price_per_week: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Featured Duration (days)</label>
                    <Input
                      type="number"
                      value={settings.featured_duration_days}
                      onChange={(e) => setSettings({ ...settings, featured_duration_days: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Pay-Per-Listing</h4>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Single Listing Price ($)</label>
                  <Input
                    type="number"
                    value={settings.pay_per_listing_price || 199}
                    onChange={(e) => setSettings({ ...settings, pay_per_listing_price: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">For verified non-subscribers</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminJobs;
