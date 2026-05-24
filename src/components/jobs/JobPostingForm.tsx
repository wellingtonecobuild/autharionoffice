import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Briefcase, Calendar, Mail, Link, Info, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JobPostingFormProps {
  businessId: string;
  businessName: string;
  subscriptionPlan?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function JobPostingForm({ 
  businessId, 
  businessName, 
  subscriptionPlan = "premium",
  open, 
  onOpenChange,
  onSuccess 
}: JobPostingFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  
  // Determine max duration based on plan
  const isElite = subscriptionPlan === "elite";
  const maxDays = isElite ? 60 : 30;
  
  const [form, setForm] = useState({
    title: "",
    location: "Wellington",
    job_type: "full_time",
    summary: "",
    responsibilities: "",
    requirements: "",
    sustainability_relevance: "",
    application_method: "url", // Default to external URL
    application_email: "",
    application_url: "",
    expires_days: maxDays.toString(),
  });

  // Update default duration when plan changes
  useEffect(() => {
    const newMaxDays = isElite ? 60 : 30;
    if (parseInt(form.expires_days) > newMaxDays) {
      setForm(prev => ({ ...prev, expires_days: newMaxDays.toString() }));
    }
  }, [subscriptionPlan, isElite]);

  const handleSubmit = async () => {
    if (!form.title || !form.summary || !form.responsibilities || !form.requirements) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (form.application_method === "email" && !form.application_email) {
      toast({ title: "Missing email", description: "Please provide an application email", variant: "destructive" });
      return;
    }

    if (form.application_method === "url" && !form.application_url) {
      toast({ title: "Missing URL", description: "Please provide an application URL", variant: "destructive" });
      return;
    }

    // Internal applications don't need additional validation

    // Validate URL format
    if (form.application_method === "url") {
      try {
        new URL(form.application_url);
      } catch {
        toast({ title: "Invalid URL", description: "Please provide a valid application URL (e.g., https://company.com/careers)", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    try {
      const expiresAt = new Date();
      // Enforce max duration based on plan
      const requestedDays = Math.min(parseInt(form.expires_days), maxDays);
      expiresAt.setDate(expiresAt.getDate() + requestedDays);

      const { error } = await supabase.from('jobs').insert([{
        business_id: businessId,
        title: form.title,
        location: form.location,
        job_type: form.job_type as 'full_time' | 'part_time' | 'contract',
        summary: form.summary,
        responsibilities: form.responsibilities,
        requirements: form.requirements,
        sustainability_relevance: form.sustainability_relevance || null,
        application_method: form.application_method,
        application_email: form.application_method === "email" ? form.application_email : null,
        application_url: form.application_method === "url" ? form.application_url : null,
        expires_at: expiresAt.toISOString(),
      }]);

      if (error) throw error;

      toast({ 
        title: "Job submitted", 
        description: "Your job listing is pending admin approval." 
      });
      
      setForm({
        title: "",
        location: "Wellington",
        job_type: "full_time",
        summary: "",
        responsibilities: "",
        requirements: "",
        sustainability_relevance: "",
        application_method: "url",
        application_email: "",
        application_url: "",
        expires_days: maxDays.toString(),
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Job posting error:", err);
      // User-friendly error messages
      if (err.message?.includes("row-level security") || err.code === "42501") {
        toast({ 
          title: "Unable to post job", 
          description: "Your business needs a Premium or Elite subscription to post jobs. Please upgrade your plan.", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Something went wrong", 
          description: "We couldn't submit your job listing. Please try again or contact support.", 
          variant: "destructive" 
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Get available duration options based on plan
  const getDurationOptions = () => {
    const options = [
      { value: "14", label: "14 days" },
      { value: "30", label: "30 days" },
    ];
    
    if (isElite) {
      options.push({ value: "45", label: "45 days" });
      options.push({ value: "60", label: "60 days" });
    }
    
    return options;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Post a Job Opportunity
          </DialogTitle>
          <DialogDescription>
            Create a new job listing for {businessName}. All listings require admin approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan-specific info */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              {isElite 
                ? "Elite plan: Job listings can be active for up to 60 days."
                : "Premium plan: Job listings can be active for up to 30 days. Upgrade to Elite for 60-day listings."}
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Senior Project Manager"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                placeholder="e.g. Wellington CBD"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Job Type *</Label>
              <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full-time</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Listing Duration</Label>
              <Select value={form.expires_days} onValueChange={(v) => setForm({ ...form, expires_days: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getDurationOptions().map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Role Summary *</Label>
            <Textarea
              id="summary"
              placeholder="Brief overview of the position..."
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsibilities">Responsibilities *</Label>
            <Textarea
              id="responsibilities"
              placeholder="Key duties and responsibilities..."
              value={form.responsibilities}
              onChange={(e) => setForm({ ...form, responsibilities: e.target.value })}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements *</Label>
            <Textarea
              id="requirements"
              placeholder="Required qualifications and experience..."
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sustainability">Sustainability Relevance (optional)</Label>
            <Textarea
              id="sustainability"
              placeholder="How does this role contribute to sustainable construction?"
              value={form.sustainability_relevance}
              onChange={(e) => setForm({ ...form, sustainability_relevance: e.target.value })}
              rows={2}
            />
          </div>

          <div className="border-t pt-4">
            <Label className="mb-3 block">Application Method *</Label>
            <div className="space-y-4">
              <Select 
                value={form.application_method} 
                onValueChange={(v) => setForm({ ...form, application_method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Internal Applications (Recommended)</span>
                      <span className="text-xs text-muted-foreground">Receive applications directly on Wellington EcoBuild</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="url">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">External Application Link</span>
                      <span className="text-xs text-muted-foreground">Redirect applicants to your website</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Email Application</span>
                      <span className="text-xs text-muted-foreground">Receive applications via email</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {form.application_method === "internal" && (
                <Alert className="border-primary/20 bg-primary/5">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <AlertDescription className="text-sm">
                    Applications will be delivered to your employer dashboard. You can chat with applicants, 
                    download CVs, and manage application status directly on the platform.
                  </AlertDescription>
                </Alert>
              )}
              
              {form.application_method === "email" && (
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="careers@company.com"
                    value={form.application_email}
                    onChange={(e) => setForm({ ...form, application_email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              )}
              
              {form.application_method === "url" && (
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="https://company.com/careers/apply"
                    value={form.application_url}
                    onChange={(e) => setForm({ ...form, application_url: e.target.value })}
                    className="pl-10"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit for Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}