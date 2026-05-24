import { useState } from "react";
import { useApplicantProfile, WorkHistory, Education, Certification, Skill } from "@/hooks/useApplicantProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Briefcase,
  GraduationCap,
  Award,
  FileText,
  Upload,
  CheckCircle,
  Building2,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function ApplicantProfileSection() {
  const {
    profile,
    loading,
    addWorkHistory,
    deleteWorkHistory,
    addEducation,
    deleteEducation,
    addCertification,
    deleteCertification,
    addSkill,
    deleteSkill,
    uploadDocument,
    deleteDocument,
    setPrimaryDocument,
  } = useApplicantProfile();

  const [workDialogOpen, setWorkDialogOpen] = useState(false);
  const [eduDialogOpen, setEduDialogOpen] = useState(false);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [workForm, setWorkForm] = useState({
    company_name: "",
    job_title: "",
    location: "",
    start_date: "",
    end_date: "",
    is_current: false,
    description: "",
  });

  const [eduForm, setEduForm] = useState({
    institution: "",
    degree: "",
    field_of_study: "",
    start_date: "",
    end_date: "",
    is_current: false,
    description: "",
  });

  const [certForm, setCertForm] = useState({
    name: "",
    issuing_organization: "",
    issue_date: "",
    expiry_date: "",
    credential_id: "",
    credential_url: "",
  });

  const [skillForm, setSkillForm] = useState({
    skill_name: "",
    proficiency_level: "intermediate",
    years_experience: "",
  });

  const handleAddWork = async () => {
    if (!workForm.company_name || !workForm.job_title || !workForm.start_date) {
      toast.error("Please fill in required fields");
      return;
    }
    setSubmitting(true);
    const { error } = await addWorkHistory(workForm as any);
    if (error) {
      toast.error("Failed to add work experience");
    } else {
      toast.success("Work experience added");
      setWorkDialogOpen(false);
      setWorkForm({ company_name: "", job_title: "", location: "", start_date: "", end_date: "", is_current: false, description: "" });
    }
    setSubmitting(false);
  };

  const handleAddEducation = async () => {
    if (!eduForm.institution || !eduForm.degree) {
      toast.error("Please fill in required fields");
      return;
    }
    setSubmitting(true);
    const { error } = await addEducation(eduForm as any);
    if (error) {
      toast.error("Failed to add education");
    } else {
      toast.success("Education added");
      setEduDialogOpen(false);
      setEduForm({ institution: "", degree: "", field_of_study: "", start_date: "", end_date: "", is_current: false, description: "" });
    }
    setSubmitting(false);
  };

  const handleAddCertification = async () => {
    if (!certForm.name || !certForm.issuing_organization) {
      toast.error("Please fill in required fields");
      return;
    }
    setSubmitting(true);
    const { error } = await addCertification(certForm as any);
    if (error) {
      toast.error("Failed to add certification");
    } else {
      toast.success("Certification added");
      setCertDialogOpen(false);
      setCertForm({ name: "", issuing_organization: "", issue_date: "", expiry_date: "", credential_id: "", credential_url: "" });
    }
    setSubmitting(false);
  };

  const handleAddSkill = async () => {
    if (!skillForm.skill_name) {
      toast.error("Please enter a skill name");
      return;
    }
    setSubmitting(true);
    const { error } = await addSkill({
      skill_name: skillForm.skill_name,
      proficiency_level: skillForm.proficiency_level,
      years_experience: skillForm.years_experience ? parseInt(skillForm.years_experience) : null,
    } as any);
    if (error) {
      toast.error("Failed to add skill");
    } else {
      toast.success("Skill added");
      setSkillDialogOpen(false);
      setSkillForm({ skill_name: "", proficiency_level: "intermediate", years_experience: "" });
    }
    setSubmitting(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    const { error } = await uploadDocument(file, documentType, true);
    if (error) {
      toast.error("Failed to upload document");
    } else {
      toast.success("Document uploaded");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDeleteDocument = async (id: string, fileUrl: string) => {
    const { error } = await deleteDocument(id, fileUrl);
    if (error) {
      toast.error("Failed to delete document");
    } else {
      toast.success("Document deleted");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const resumes = profile.documents.filter(d => d.document_type === 'resume' || d.document_type === 'cv');
  const certificates = profile.documents.filter(d => d.document_type === 'certificate');

  return (
    <div className="space-y-6">
      {/* Work History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Work Experience
              </CardTitle>
              <CardDescription>Add your professional experience</CardDescription>
            </div>
            <Dialog open={workDialogOpen} onOpenChange={setWorkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Work Experience</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Job Title *</Label>
                      <Input value={workForm.job_title} onChange={(e) => setWorkForm({...workForm, job_title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Company *</Label>
                      <Input value={workForm.company_name} onChange={(e) => setWorkForm({...workForm, company_name: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={workForm.location} onChange={(e) => setWorkForm({...workForm, location: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Input type="date" value={workForm.start_date} onChange={(e) => setWorkForm({...workForm, start_date: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input type="date" value={workForm.end_date} onChange={(e) => setWorkForm({...workForm, end_date: e.target.value})} disabled={workForm.is_current} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="current-work" checked={workForm.is_current} onChange={(e) => setWorkForm({...workForm, is_current: e.target.checked, end_date: ""})} />
                    <Label htmlFor="current-work">I currently work here</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={workForm.description} onChange={(e) => setWorkForm({...workForm, description: e.target.value})} rows={3} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setWorkDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddWork} disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Add Experience
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {profile.workHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No work experience added yet</p>
          ) : (
            <div className="space-y-4">
              {profile.workHistory.map((work) => (
                <div key={work.id} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="p-2 bg-background rounded">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{work.job_title}</p>
                    <p className="text-sm text-muted-foreground">{work.company_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(work.start_date), 'MMM yyyy')} - {work.is_current ? 'Present' : work.end_date ? format(new Date(work.end_date), 'MMM yyyy') : ''}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteWorkHistory(work.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Education
              </CardTitle>
              <CardDescription>Add your educational background</CardDescription>
            </div>
            <Dialog open={eduDialogOpen} onOpenChange={setEduDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Education</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Institution *</Label>
                    <Input value={eduForm.institution} onChange={(e) => setEduForm({...eduForm, institution: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Degree *</Label>
                      <Input value={eduForm.degree} onChange={(e) => setEduForm({...eduForm, degree: e.target.value})} placeholder="e.g. Bachelor's" />
                    </div>
                    <div className="space-y-2">
                      <Label>Field of Study</Label>
                      <Input value={eduForm.field_of_study} onChange={(e) => setEduForm({...eduForm, field_of_study: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input type="date" value={eduForm.start_date} onChange={(e) => setEduForm({...eduForm, start_date: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input type="date" value={eduForm.end_date} onChange={(e) => setEduForm({...eduForm, end_date: e.target.value})} disabled={eduForm.is_current} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEduDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddEducation} disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Add Education
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {profile.education.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No education added yet</p>
          ) : (
            <div className="space-y-4">
              {profile.education.map((edu) => (
                <div key={edu.id} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="p-2 bg-background rounded">
                    <GraduationCap className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{edu.degree}</p>
                    <p className="text-sm text-muted-foreground">{edu.institution}</p>
                    {edu.field_of_study && <p className="text-xs text-muted-foreground">{edu.field_of_study}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteEducation(edu.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Certifications
              </CardTitle>
              <CardDescription>Add your professional certifications</CardDescription>
            </div>
            <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Certification</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Certification Name *</Label>
                    <Input value={certForm.name} onChange={(e) => setCertForm({...certForm, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Issuing Organization *</Label>
                    <Input value={certForm.issuing_organization} onChange={(e) => setCertForm({...certForm, issuing_organization: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Issue Date</Label>
                      <Input type="date" value={certForm.issue_date} onChange={(e) => setCertForm({...certForm, issue_date: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input type="date" value={certForm.expiry_date} onChange={(e) => setCertForm({...certForm, expiry_date: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Credential ID</Label>
                    <Input value={certForm.credential_id} onChange={(e) => setCertForm({...certForm, credential_id: e.target.value})} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCertDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddCertification} disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Add Certification
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {profile.certifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No certifications added yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.certifications.map((cert) => (
                <Badge key={cert.id} variant="secondary" className="gap-2 py-2 pr-1">
                  <Award className="w-3 h-3" />
                  {cert.name}
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => deleteCertification(cert.id)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Skills</CardTitle>
              <CardDescription>Add your professional skills</CardDescription>
            </div>
            <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Skill</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Skill Name *</Label>
                    <Input value={skillForm.skill_name} onChange={(e) => setSkillForm({...skillForm, skill_name: e.target.value})} placeholder="e.g. Project Management" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Proficiency</Label>
                      <Select value={skillForm.proficiency_level} onValueChange={(v) => setSkillForm({...skillForm, proficiency_level: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Years Experience</Label>
                      <Input type="number" value={skillForm.years_experience} onChange={(e) => setSkillForm({...skillForm, years_experience: e.target.value})} min="0" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSkillDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddSkill} disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Add Skill
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {profile.skills.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No skills added yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <Badge key={skill.id} variant="outline" className="gap-2 py-2 pr-1">
                  {skill.skill_name}
                  {skill.proficiency_level && <span className="text-xs opacity-70">• {skill.proficiency_level}</span>}
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => deleteSkill(skill.id)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents
          </CardTitle>
          <CardDescription>Upload your resume and certificates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resume Upload */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Resume / CV</Label>
            <div className="space-y-2">
              {resumes.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                    </p>
                  </div>
                  {doc.is_primary && <Badge variant="secondary">Primary</Badge>}
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(doc.id, doc.file_url)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-accent transition-colors">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Uploading..." : "Upload Resume (PDF, DOC, DOCX)"}
                </span>
                <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => handleFileUpload(e, 'resume')} disabled={uploading} />
              </label>
            </div>
          </div>

          {/* Certificate Upload */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Certificate Documents</Label>
            <div className="space-y-2">
              {certificates.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Award className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(doc.id, doc.file_url)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-accent transition-colors">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Uploading..." : "Upload Certificate"}
                </span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleFileUpload(e, 'certificate')} disabled={uploading} />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
