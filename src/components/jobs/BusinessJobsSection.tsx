import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  Plus, 
  Clock, 
  MapPin, 
  Eye,
  Trash2,
  Loader2,
  Lock,
  Star,
  Sparkles,
  Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBusinessJobs, Job, JobStatus } from "@/hooks/useJobs";
import { JobPostingForm } from "./JobPostingForm";
import { JOB_PRICING, getJobPermissions, SubscriptionPlan } from "@/lib/jobPricing";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BusinessJobsSectionProps {
  businessId: string;
  businessName: string;
  subscriptionPlan: string;
  isVerified?: boolean;
  autoOpenForm?: boolean;
  onFormOpened?: () => void;
}

const statusLabels: Record<JobStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending Approval", variant: "secondary" },
  approved: { label: "Active", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  expired: { label: "Expired", variant: "outline" },
  closed: { label: "Closed", variant: "outline" },
};

const jobTypeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
};

export function BusinessJobsSection({ 
  businessId, 
  businessName, 
  subscriptionPlan,
  isVerified = false,
  autoOpenForm = false,
  onFormOpened
}: BusinessJobsSectionProps) {
  const { toast } = useToast();
  const { jobs, loading, refetch } = useBusinessJobs(businessId);
  const { settings } = usePlatformSettings();
  const [showForm, setShowForm] = useState(false);
  const [deleteJob, setDeleteJob] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Auto-open form when triggered by payment success
  useEffect(() => {
    if (autoOpenForm && !showForm) {
      setShowForm(true);
      onFormOpened?.();
    }
  }, [autoOpenForm, showForm, onFormOpened]);

  const plan = subscriptionPlan as SubscriptionPlan;
  const permissions = getJobPermissions(plan);
  
  // Get job limits based on plan
  const jobLimit = permissions.jobLimit;
  const canPostWithPlan = permissions.canPost;
  
  const activeJobs = jobs.filter(j => 
    (j.status === 'pending' || j.status === 'approved') && 
    new Date(j.expires_at) > new Date()
  );
  const canAddMore = canPostWithPlan && activeJobs.length < jobLimit;

  const handleDelete = async () => {
    if (!deleteJob) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', deleteJob.id);

      if (error) throw error;
      toast({ title: "Job deleted" });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteJob(null);
    }
  };

  // Free plan - show clear message (no misleading upsell)
  if (!canPostWithPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Job Postings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">
              Job postings are available on Premium and Elite plans
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Premium members can post up to 2 active job listings (30 days each). Elite members get unlimited postings (60 days each).
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Premium</span>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">${settings.price_premium_monthly || 149}</p>
                <p className="text-xs text-muted-foreground mb-3">/month • 2 jobs (30 days)</p>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to="/pricing">View Plan</Link>
                </Button>
              </div>
              
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-accent" />
                  <span className="font-semibold">Elite</span>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">${settings.price_elite_monthly || 299}</p>
                <p className="text-xs text-muted-foreground mb-3">/month • Unlimited (60 days)</p>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to="/pricing">View Plan</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Construction Opportunities
                {plan === 'elite' && (
                  <Badge className="bg-accent text-accent-foreground gap-1">
                    <Crown className="w-3 h-3" />
                    Elite
                  </Badge>
                )}
              </CardTitle>
              {plan === 'elite' && (
                <p className="text-sm text-muted-foreground mt-1">
                  Unlimited postings • Priority listing • Spotlight eligible
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {plan !== 'elite' && (
                <span className="text-sm text-muted-foreground">
                  {activeJobs.length} / {jobLimit} slots used
                </span>
              )}
              <Button 
                size="sm" 
                onClick={() => setShowForm(true)}
                disabled={plan !== 'elite' && activeJobs.length >= jobLimit}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-1" />
                Post Job
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No job postings yet</h3>
              <p className="text-muted-foreground mb-4">
                Post your first opportunity to attract qualified construction professionals.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Post Your First Opportunity
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => {
                const daysLeft = Math.ceil(
                  (new Date(job.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                const isExpired = daysLeft <= 0;
                const statusInfo = statusLabels[job.status];

                return (
                  <div 
                    key={job.id} 
                    className={`p-4 border rounded-lg ${isExpired ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-foreground">{job.title}</h4>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          <Badge variant="outline">{jobTypeLabels[job.job_type]}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {isExpired ? 'Expired' : `${daysLeft} days left`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {job.views} views
                          </span>
                        </div>
                        {job.status === 'rejected' && job.rejection_reason && (
                          <p className="text-sm text-destructive mt-2">
                            Rejection reason: {job.rejection_reason}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteJob(job)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <JobPostingForm
        businessId={businessId}
        businessName={businessName}
        subscriptionPlan={subscriptionPlan}
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={refetch}
      />

      <AlertDialog open={!!deleteJob} onOpenChange={() => setDeleteJob(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Posting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteJob?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
