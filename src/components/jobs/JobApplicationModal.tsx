import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useJobSeekerProfile, useSubmitApplication } from "@/hooks/useJobApplications";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Upload,
  User
} from "lucide-react";

interface JobApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  businessId: string;
  businessName: string;
  onSuccess?: () => void;
}

export function JobApplicationModal({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  businessId,
  businessName,
  onSuccess,
}: JobApplicationModalProps) {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useJobSeekerProfile();
  const { submitApplication, submitting } = useSubmitApplication();
  const { toast } = useToast();

  const [coverLetter, setCoverLetter] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [cvFileName, setCvFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check if already applied
  useEffect(() => {
    const checkApplication = async () => {
      if (!user?.id || !jobId) return;

      try {
        const { data, error } = await supabase
          .from("job_applications")
          .select("id")
          .eq("job_id", jobId)
          .eq("applicant_id", user.id)
          .maybeSingle();

        setHasApplied(!!data);
      } catch (err) {
        console.error("Error checking application:", err);
      } finally {
        setCheckingStatus(false);
      }
    };

    if (open) {
      checkApplication();
    }
  }, [open, user?.id, jobId]);

  // Pre-fill from profile
  useEffect(() => {
    if (profile) {
      setCoverLetter(profile.cover_letter_default || "");
      setCvUrl(profile.cv_url || "");
      setCvFileName(profile.cv_file_name || "");
    }
  }, [profile]);

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PDF or Word document", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-documents')
        .getPublicUrl(fileName);

      setCvUrl(publicUrl);
      setCvFileName(file.name);
      toast({ title: "CV uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!profile) {
      toast({
        title: "Complete your profile first",
        description: "Please complete your job seeker profile before applying",
        variant: "destructive",
      });
      return;
    }

    if (!cvUrl) {
      toast({
        title: "CV required",
        description: "Please upload your CV to apply",
        variant: "destructive",
      });
      return;
    }

    const { error } = await submitApplication(jobId, businessId, coverLetter, cvUrl, cvFileName);

    if (error) {
      if (error.code === '23505') {
        toast({
          title: "Already applied",
          description: "You have already applied for this position",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Application failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Application submitted!",
        description: "Your application has been sent to the employer",
      });
      onOpenChange(false);
      onSuccess?.();
    }
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in required</DialogTitle>
            <DialogDescription>
              Please sign in or create an account to apply for this position.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (checkingStatus || profileLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (hasApplied) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Already Applied
            </DialogTitle>
            <DialogDescription>
              You have already applied for this position at {businessName}.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertDescription>
              Track your application status in{" "}
              <Link to="/jobs/my-applications" className="text-primary font-medium underline">
                My Applications
              </Link>
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!profile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Complete Your Profile
            </DialogTitle>
            <DialogDescription>
              Before applying, please complete your job seeker profile with your details and CV.
            </DialogDescription>
          </DialogHeader>
          <Alert className="border-yellow-500/30 bg-yellow-500/5">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <AlertDescription>
              Your profile will be shared with employers when you apply for jobs.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button asChild>
              <Link to="/jobs/profile">Create Profile</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply for {jobTitle}</DialogTitle>
          <DialogDescription>
            at {businessName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Profile Summary */}
          <Alert className="border-primary/30 bg-primary/5">
            <User className="w-4 h-4 text-primary" />
            <AlertDescription>
              <span className="font-medium">Applying as:</span> {profile.full_name}
              <br />
              <span className="text-muted-foreground">{profile.email}</span>
            </AlertDescription>
          </Alert>

          {/* CV */}
          <div className="space-y-2">
            <Label>CV / Resume *</Label>
            {cvFileName ? (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{cvFileName}</span>
                </div>
                <label htmlFor="cv-replace" className="cursor-pointer">
                  <span className="text-sm text-primary hover:underline">Replace</span>
                  <input
                    id="cv-replace"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleCvUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <label htmlFor="cv-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                  )}
                  <p className="text-sm font-medium">
                    {uploading ? "Uploading..." : "Upload your CV"}
                  </p>
                  <p className="text-xs text-muted-foreground">PDF or Word (max 5MB)</p>
                </div>
                <input
                  id="cv-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleCvUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {/* Cover Letter */}
          <div className="space-y-2">
            <Label htmlFor="cover-letter">Cover Letter (optional)</Label>
            <Textarea
              id="cover-letter"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Introduce yourself and explain why you're a great fit for this role..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              {coverLetter.length}/1000 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || uploading || !cvUrl}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}