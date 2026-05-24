import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useJobSeekerProfile } from "@/hooks/useJobApplications";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Upload, 
  FileText, 
  Briefcase, 
  MapPin, 
  Phone, 
  Mail,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const tradeRoles = [
  "Builder",
  "Apprentice",
  "Site Manager",
  "Foreman",
  "Project Manager",
  "Carpenter",
  "Electrician",
  "Plumber",
  "Architect",
  "Designer",
  "Engineer",
  "Estimator",
  "Sustainability Consultant",
  "Labourer",
  "Other",
];

const eligibilityOptions = [
  { value: "nz_citizen", label: "New Zealand Citizen" },
  { value: "nz_resident", label: "NZ Permanent Resident" },
  { value: "work_visa", label: "Work Visa Holder" },
  { value: "other", label: "Other" },
];

const JobSeekerProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, saveProfile } = useJobSeekerProfile();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    trade_role: "",
    work_eligibility: "nz_citizen",
    bio: "",
    years_experience: "",
    cv_url: "",
    cv_file_name: "",
    cover_letter_default: "",
    is_available: true,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        email: profile.email || user?.email || "",
        phone: profile.phone || "",
        location: profile.location || "",
        trade_role: profile.trade_role || "",
        work_eligibility: profile.work_eligibility || "nz_citizen",
        bio: profile.bio || "",
        years_experience: profile.years_experience?.toString() || "",
        cv_url: profile.cv_url || "",
        cv_file_name: profile.cv_file_name || "",
        cover_letter_default: profile.cover_letter_default || "",
        is_available: profile.is_available ?? true,
      });
    } else if (user) {
      setForm(prev => ({
        ...prev,
        email: user.email || "",
      }));
    }
  }, [profile, user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

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

      setForm(prev => ({
        ...prev,
        cv_url: publicUrl,
        cv_file_name: file.name,
      }));

      toast({ title: "CV uploaded", description: "Your CV has been uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.full_name || !form.email) {
      toast({ title: "Missing fields", description: "Please fill in your name and email", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await saveProfile({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        location: form.location || null,
        trade_role: form.trade_role || null,
        work_eligibility: form.work_eligibility,
        bio: form.bio || null,
        years_experience: form.years_experience ? parseInt(form.years_experience) : null,
        cv_url: form.cv_url || null,
        cv_file_name: form.cv_file_name || null,
        cover_letter_default: form.cover_letter_default || null,
        is_available: form.is_available,
      });

      if (error) throw error;
      toast({ title: "Profile saved", description: "Your job seeker profile has been updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || profileLoading) {
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

  const isComplete = form.full_name && form.email && form.trade_role && form.cv_url;

  return (
    <>
      <Helmet>
        <title>My Job Seeker Profile | Wellington EcoBuild</title>
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24 min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                Job Seeker Profile
              </h1>
              <p className="text-muted-foreground">
                Complete your profile to apply for construction opportunities
              </p>
            </div>

            {/* Completion Status */}
            <Card className={`mb-6 ${isComplete ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  {isComplete ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">
                      {isComplete ? "Profile complete" : "Profile incomplete"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isComplete 
                        ? "You can now apply for jobs on the platform" 
                        : "Please fill in required fields to apply for jobs"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form */}
            <div className="space-y-6">
              {/* Personal Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        placeholder="John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="john@example.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+64 21 123 4567"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="location"
                          value={form.location}
                          onChange={(e) => setForm({ ...form, location: e.target.value })}
                          placeholder="Wellington CBD"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Professional Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Trade / Role *</Label>
                      <Select 
                        value={form.trade_role} 
                        onValueChange={(v) => setForm({ ...form, trade_role: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          {tradeRoles.map((role) => (
                            <SelectItem key={role} value={role.toLowerCase().replace(/ /g, '_')}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Years of Experience</Label>
                      <Input
                        type="number"
                        value={form.years_experience}
                        onChange={(e) => setForm({ ...form, years_experience: e.target.value })}
                        placeholder="5"
                        min="0"
                        max="50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Work Eligibility (NZ)</Label>
                    <Select 
                      value={form.work_eligibility} 
                      onValueChange={(v) => setForm({ ...form, work_eligibility: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibilityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">About Me</Label>
                    <Textarea
                      id="bio"
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="Brief introduction about yourself and your experience..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* CV Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    CV / Resume *
                  </CardTitle>
                  <CardDescription>
                    Upload your CV (PDF or Word document, max 5MB)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {form.cv_file_name ? (
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-medium">{form.cv_file_name}</p>
                          <p className="text-sm text-muted-foreground">CV uploaded</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={form.cv_url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                        <label htmlFor="cv-replace">
                          <Button variant="outline" size="sm" asChild>
                            <span>Replace</span>
                          </Button>
                          <input
                            id="cv-replace"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleCvUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="cv-upload" className="cursor-pointer">
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                        {uploading ? (
                          <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                        ) : (
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        )}
                        <p className="font-medium text-foreground">
                          {uploading ? "Uploading..." : "Click to upload your CV"}
                        </p>
                        <p className="text-sm text-muted-foreground">PDF or Word document</p>
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
                </CardContent>
              </Card>

              {/* Default Cover Letter */}
              <Card>
                <CardHeader>
                  <CardTitle>Default Cover Letter</CardTitle>
                  <CardDescription>
                    This will be pre-filled when you apply for jobs (you can customize per application)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={form.cover_letter_default}
                    onChange={(e) => setForm({ ...form, cover_letter_default: e.target.value })}
                    placeholder="Write a general cover letter that you can use as a starting point..."
                    rows={5}
                  />
                </CardContent>
              </Card>

              {/* Availability */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Available for work</p>
                      <p className="text-sm text-muted-foreground">
                        Show that you're actively looking for opportunities
                      </p>
                    </div>
                    <Switch
                      checked={form.is_available}
                      onCheckedChange={(checked) => setForm({ ...form, is_available: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => navigate("/jobs")}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default JobSeekerProfile;