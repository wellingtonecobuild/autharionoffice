import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle, 
  X, 
  Shield, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Calendar,
  AlertCircle,
  Ban,
  Building2,
  Award,
  FileCheck,
  ShieldCheck,
  Info,
  User,
  Phone,
  Mail,
  Briefcase,
  Hash
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";

const DOCUMENT_TYPES = [
  { value: "nz_driver_licence", label: "NZ Driver Licence", category: "identity" },
  { value: "nz_passport", label: "NZ Passport", category: "identity" },
  { value: "realme_identity", label: "RealMe Verified Identity", category: "identity" },
  { value: "nzbn", label: "NZBN (NZ Business Number)", category: "business" },
  { value: "companies_office", label: "Companies Office Registration", category: "business" },
  { value: "lbp_registration", label: "Licensed Building Practitioner (LBP)", category: "professional" },
  { value: "nzrab", label: "Registered Architect (NZRAB)", category: "professional" },
  { value: "homestar", label: "Homestar Certification", category: "sustainability" },
  { value: "passive_house", label: "Passive House Certification", category: "sustainability" },
  { value: "nzgbc", label: "Green Building Council NZ Membership", category: "sustainability" },
  { value: "site_safe", label: "Site Safe Certification", category: "compliance" },
  { value: "master_builders", label: "NZ Master Builders Membership", category: "professional" },
  { value: "cbanz", label: "Certified Builder (CBANZ)", category: "professional" },
  { value: "branz", label: "BRANZ Appraised Products Supplier", category: "professional" },
  { value: "eeca", label: "EECA Accreditation", category: "sustainability" },
  { value: "iso_14001", label: "ISO 14001 Environmental Certification", category: "compliance" },
  { value: "worksafe", label: "WorkSafe NZ Certification", category: "compliance" },
  { value: "sbnz", label: "Sustainable Business Network NZ Membership", category: "sustainability" },
  { value: "public_liability_insurance", label: "Public Liability Insurance", category: "insurance" },
  { value: "professional_indemnity", label: "Professional Indemnity Insurance", category: "insurance" },
  { value: "trade_certificate", label: "Trade Certificate/Qualification", category: "professional" },
  { value: "other", label: "Other Document/Certificate", category: "other" },
];

const QUALIFICATION_TYPES = [
  { value: "lbp", label: "Licensed Building Practitioner (LBP)" },
  { value: "trade_certificate", label: "Trade Certificate" },
  { value: "nz_id", label: "NZ Government ID" },
  { value: "business_registration", label: "Business Registration" },
  { value: "professional_membership", label: "Professional Membership" },
  { value: "insurance", label: "Insurance Certificate" },
  { value: "sustainability_certification", label: "Sustainability Certification" },
  { value: "health_safety", label: "Health & Safety Certification" },
  { value: "other", label: "Other Qualification" },
];

const BUSINESS_TYPES = [
  { value: "company", label: "Registered Company (Ltd)" },
  { value: "sole_trader", label: "Sole Trader" },
  { value: "partnership", label: "Partnership" },
  { value: "trust", label: "Trust" },
];

const CATEGORY_LABELS: Record<string, { label: string; icon: typeof Shield }> = {
  identity: { label: "Identity Documents", icon: Shield },
  business: { label: "Business Registration", icon: Building2 },
  professional: { label: "Professional Credentials", icon: Award },
  sustainability: { label: "Sustainability Certifications", icon: FileCheck },
  insurance: { label: "Insurance & Compliance", icon: ShieldCheck },
  compliance: { label: "Compliance Documents", icon: FileCheck },
  other: { label: "Other Documents", icon: FileText },
};

interface VerificationSubmission {
  id: string;
  verification_id: string | null;
  document_type: string;
  document_name: string;
  document_description: string | null;
  file_url: string;
  file_name: string;
  file_format: string | null;
  file_size: number | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  uploaded_at: string | null;
  expiry_date: string | null;
  reviewed_at: string | null;
  company_name: string | null;
  contact_person: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_type: string | null;
  qualification_type: string | null;
  certificate_name: string | null;
  version_number: number | null;
}

type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'replacement_requested' | 'expired' | 'suspended';

const STATUS_CONFIG: Record<DocumentStatus, { 
  label: string; 
  icon: typeof Clock; 
  className: string;
  bgClassName: string;
  description: string;
}> = {
  pending: {
    label: "Pending Review",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    bgClassName: "bg-amber-50 border-amber-200",
    description: "Your document is being reviewed by our verification team."
  },
  approved: {
    label: "Verified",
    icon: CheckCircle,
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    bgClassName: "bg-emerald-50 border-emerald-200",
    description: "This document has been verified and approved."
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-500/10 text-red-700 border-red-500/20",
    bgClassName: "bg-red-50 border-red-200",
    description: "This document was not approved. Please review the reason and resubmit."
  },
  replacement_requested: {
    label: "Action Required",
    icon: AlertTriangle,
    className: "bg-orange-500/10 text-orange-700 border-orange-500/20",
    bgClassName: "bg-orange-50 border-orange-200",
    description: "A replacement document has been requested. Please upload a new version."
  },
  expired: {
    label: "Expired",
    icon: Calendar,
    className: "bg-slate-500/10 text-slate-700 border-slate-500/20",
    bgClassName: "bg-slate-50 border-slate-200",
    description: "This document has expired and needs to be renewed."
  },
  suspended: {
    label: "Suspended",
    icon: Ban,
    className: "bg-red-600/10 text-red-800 border-red-600/20",
    bgClassName: "bg-red-100 border-red-300",
    description: "This document has been suspended pending review."
  }
};

export const DocumentUpload = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [qualificationType, setQualificationType] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [certificateName, setCertificateName] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);

  // Pre-fill email from user profile
  useEffect(() => {
    if (user?.email && !businessEmail) {
      setBusinessEmail(user.email);
    }
  }, [user?.email]);

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["verification-submissions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("verification_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as VerificationSubmission[];
    },
    enabled: !!user,
  });

  // Check if all required fields are filled
  const isFormValid = () => {
    return (
      companyName.trim() !== "" &&
      businessEmail.trim() !== "" &&
      businessPhone.trim() !== "" &&
      businessType !== "" &&
      qualificationType !== "" &&
      documentType !== "" &&
      certificateName.trim() !== "" &&
      selectedFile !== null
    );
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedFile) {
        throw new Error("Please fill in all required fields");
      }

      if (!isFormValid()) {
        throw new Error("Please complete all mandatory fields before submitting");
      }

      setUploading(true);

      const fileExt = selectedFile.name.split(".").pop()?.toUpperCase() || "UNKNOWN";
      const fileName = `${user.id}/${Date.now()}-${selectedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      if (replacingDocId) {
        await supabase
          .from("verification_submissions")
          .update({ status: "superseded" })
          .eq("id", replacingDocId);
      }

      const { error: insertError } = await supabase
        .from("verification_submissions")
        .insert({
          user_id: user.id,
          company_name: companyName.trim(),
          contact_person: contactPerson.trim() || null,
          business_email: businessEmail.trim(),
          business_phone: businessPhone.trim(),
          business_type: businessType,
          qualification_type: qualificationType,
          document_type: documentType,
          certificate_name: certificateName.trim(),
          document_name: documentName.trim() || certificateName.trim(),
          document_description: documentDescription.trim() || null,
          file_url: fileName,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          file_format: fileExt,
          status: "pending",
          document_category: DOCUMENT_TYPES.find(t => t.value === documentType)?.category || "other",
          previous_version_id: replacingDocId || null,
          upload_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });

      if (insertError) throw insertError;

      return true;
    },
    onSuccess: () => {
      toast.success("Document submitted successfully. Our verification team will review it within 3-5 business days.");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["verification-submissions"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to upload document");
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const resetForm = () => {
    setCompanyName("");
    setContactPerson("");
    setBusinessEmail(user?.email || "");
    setBusinessPhone("");
    setBusinessType("");
    setQualificationType("");
    setDocumentType("");
    setCertificateName("");
    setDocumentName("");
    setDocumentDescription("");
    setSelectedFile(null);
    setReplacingDocId(null);
  };

  const deleteMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await supabase
        .from("verification_submissions")
        .delete()
        .eq("id", submissionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document removed");
      queryClient.invalidateQueries({ queryKey: ["verification-submissions"] });
    },
    onError: () => {
      toast.error("Failed to remove document");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleReplaceDocument = (submission: VerificationSubmission) => {
    setReplacingDocId(submission.id);
    setDocumentType(submission.document_type);
    setDocumentName(`${submission.document_name} (Updated)`);
    setCertificateName(submission.certificate_name || "");
    setQualificationType(submission.qualification_type || "");
    setCompanyName(submission.company_name || "");
    setBusinessEmail(submission.business_email || user?.email || "");
    setBusinessPhone(submission.business_phone || "");
    setBusinessType(submission.business_type || "");
    document.getElementById("upload-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { status: "expired", days: Math.abs(days), message: `Expired ${Math.abs(days)} days ago` };
    if (days <= 7) return { status: "urgent", days, message: `Expires in ${days} days` };
    if (days <= 30) return { status: "warning", days, message: `Expires in ${days} days` };
    return { status: "ok", days, message: `Expires ${format(new Date(expiryDate), "MMM d, yyyy")}` };
  };

  const getEffectiveStatus = (submission: VerificationSubmission): DocumentStatus => {
    if (submission.status === "approved" && submission.expiry_date) {
      const expiry = getExpiryStatus(submission.expiry_date);
      if (expiry?.status === "expired") return "expired";
    }
    return submission.status as DocumentStatus;
  };

  const actionRequiredCount = submissions?.filter(s => 
    s.status === "replacement_requested" || 
    s.status === "rejected" ||
    getEffectiveStatus(s) === "expired"
  ).length || 0;

  const pendingCount = submissions?.filter(s => s.status === "pending").length || 0;
  const approvedCount = submissions?.filter(s => s.status === "approved" && getEffectiveStatus(s) !== "expired").length || 0;
  const expiredCount = submissions?.filter(s => getEffectiveStatus(s) === "expired").length || 0;

  if (!user) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="py-12 text-center">
          <Shield className="w-16 h-16 text-muted-foreground/50 mx-auto mb-6" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">Authentication Required</h3>
          <p className="text-muted-foreground mb-6">Please sign in to submit verification documents.</p>
          <Button asChild>
            <a href="/auth">Sign In to Continue</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center gap-4 pb-4 border-b-2 border-primary/20">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Document Verification Portal</h2>
          <p className="text-sm text-muted-foreground">Government-grade verification for professional credentials</p>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-800 uppercase tracking-wide">Pending</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-800 uppercase tracking-wide">Verified</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{approvedCount}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-medium text-red-800 uppercase tracking-wide">Action Required</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{actionRequiredCount}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-medium text-slate-800 uppercase tracking-wide">Expired</span>
          </div>
          <p className="text-2xl font-bold text-slate-700">{expiredCount}</p>
        </div>
      </div>

      {/* Action Required Alert */}
      {actionRequiredCount > 0 && (
        <Alert className="border-2 border-red-300 bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertTitle className="font-semibold text-red-900">Immediate Action Required</AlertTitle>
          <AlertDescription className="text-red-800">
            You have {actionRequiredCount} document{actionRequiredCount > 1 ? 's' : ''} requiring attention. 
            Please review and submit replacement documents to maintain your verification status.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Form */}
      <Card id="upload-form" className="border-2 border-border/50 shadow-sm">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {replacingDocId ? "Submit Replacement Document" : "Submit New Document"}
              </CardTitle>
              <CardDescription>
                All fields marked with <span className="text-red-500">*</span> are mandatory
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {replacingDocId && (
            <Alert className="bg-blue-50 border-blue-200">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Replacement submission in progress. The previous version will be archived upon approval.
                <Button 
                  variant="link" 
                  className="p-0 h-auto ml-2 text-blue-600 font-medium"
                  onClick={() => resetForm()}
                >
                  Cancel
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Section 1: Business/Company Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Business Information</h3>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium">
                  Company Name / Sole Trader Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="companyName"
                  placeholder="e.g., Smith Building Ltd or John Smith"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">Enter "Sole Trader" if self-employed</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="businessType" className="text-sm font-medium">
                  Business Type <span className="text-red-500">*</span>
                </Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessEmail" className="text-sm font-medium">
                  Business Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="businessEmail"
                    type="email"
                    placeholder="contact@business.co.nz"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    className="h-11 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessPhone" className="text-sm font-medium">
                  Business Phone <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="businessPhone"
                    type="tel"
                    placeholder="e.g., 04 123 4567"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    className="h-11 pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPerson" className="text-sm font-medium">
                Contact Person <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="contactPerson"
                  placeholder="Full name of primary contact"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Document Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Document Details</h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qualificationType" className="text-sm font-medium">
                  Qualification Type <span className="text-red-500">*</span>
                </Label>
                <Select value={qualificationType} onValueChange={setQualificationType}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select qualification type" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALIFICATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentType" className="text-sm font-medium">
                  Document Category <span className="text-red-500">*</span>
                </Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([category, { label }]) => {
                      const categoryDocs = DOCUMENT_TYPES.filter(t => t.category === category);
                      if (categoryDocs.length === 0) return null;
                      return (
                        <div key={category}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                            {label}
                          </div>
                          {categoryDocs.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </div>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="certificateName" className="text-sm font-medium">
                  Certificate/ID Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="certificateName"
                  placeholder="e.g., LBP License #12345"
                  value={certificateName}
                  onChange={(e) => setCertificateName(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">Include registration/ID number if applicable</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentName" className="text-sm font-medium">
                  Document Title <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="documentName"
                  placeholder="e.g., LBP Registration Certificate 2024"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentDescription" className="text-sm font-medium">
                Additional Notes <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="documentDescription"
                placeholder="Expiry date, issuing authority, or other relevant details..."
                value={documentDescription}
                onChange={(e) => setDocumentDescription(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Section 3: File Upload */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Upload className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Document Upload</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file" className="text-sm font-medium">
                Upload File <span className="text-red-500">*</span>
              </Label>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                <input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file" className="cursor-pointer block">
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.name.split('.').pop()?.toUpperCase()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedFile(null);
                        }}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="font-medium text-foreground mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground">
                        PDF, JPG, PNG only (max 10MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Requirements Notice */}
          <div className="bg-muted/50 rounded-xl p-4 border">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-2">Submission Requirements</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• All mandatory fields must be completed before submission</li>
                  <li>• Document must be clear, readable, and unexpired</li>
                  <li>• Name must match your business registration</li>
                  <li>• Each submission receives a unique Verification ID for tracking</li>
                  <li>• Review typically completed within 3-5 business days</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={uploading || !isFormValid()}
            className="w-full h-12 text-base font-medium"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting Document...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Submit for Verification
              </>
            )}
          </Button>
          
          {!isFormValid() && (
            <p className="text-xs text-center text-muted-foreground">
              Please complete all required fields to submit
            </p>
          )}
        </CardContent>
      </Card>

      {/* Submitted Documents */}
      <Card className="border-2 border-border/50 shadow-sm">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Submitted Documents</CardTitle>
              <CardDescription>
                Track the status of your verification documents with unique IDs
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : submissions && submissions.length > 0 ? (
            <div className="divide-y divide-border">
              {submissions.map((submission) => {
                const effectiveStatus = getEffectiveStatus(submission);
                const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending;
                const expiryInfo = getExpiryStatus(submission.expiry_date);
                const needsAction = effectiveStatus === "replacement_requested" || 
                                    effectiveStatus === "rejected" || 
                                    effectiveStatus === "expired";
                const Icon = config.icon;
                const docType = DOCUMENT_TYPES.find((t) => t.value === submission.document_type);
                const categoryInfo = docType ? CATEGORY_LABELS[docType.category] : null;
                
                return (
                  <div key={submission.id} className={`py-5 first:pt-0 last:pb-0 ${needsAction ? 'bg-red-50/50 -mx-6 px-6 border-l-4 border-red-400' : ''}`}>
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bgClassName}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 flex-wrap mb-1">
                            <h4 className="font-semibold text-foreground">{submission.certificate_name || submission.document_name}</h4>
                            <Badge className={`${config.className} font-medium`}>
                              {config.label}
                            </Badge>
                            {submission.version_number && submission.version_number > 1 && (
                              <Badge variant="outline" className="text-xs">v{submission.version_number}</Badge>
                            )}
                          </div>
                          
                          {/* Verification ID */}
                          {submission.verification_id && (
                            <div className="flex items-center gap-1 text-xs font-mono text-primary mb-2">
                              <Hash className="w-3 h-3" />
                              {submission.verification_id}
                            </div>
                          )}
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {docType?.label || submission.document_type}
                            {categoryInfo && (
                              <span className="text-muted-foreground/60"> • {categoryInfo.label}</span>
                            )}
                          </p>
                          
                          {/* Business Info */}
                          {submission.company_name && (
                            <p className="text-xs text-muted-foreground mb-1">
                              <span className="font-medium">Business:</span> {submission.company_name}
                              {submission.business_type && ` (${BUSINESS_TYPES.find(t => t.value === submission.business_type)?.label || submission.business_type})`}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>Submitted {format(new Date(submission.uploaded_at || submission.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                            {submission.file_format && (
                              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{submission.file_format}</span>
                            )}
                            {submission.reviewed_at && (
                              <span>Reviewed {format(new Date(submission.reviewed_at), "MMM d, yyyy")}</span>
                            )}
                            {expiryInfo && (
                              <span className={`flex items-center gap-1 ${
                                expiryInfo.status === "expired" ? "text-red-600 font-medium" :
                                expiryInfo.status === "urgent" ? "text-orange-600" :
                                expiryInfo.status === "warning" ? "text-amber-600" :
                                ""
                              }`}>
                                <Calendar className="h-3 w-3" />
                                {expiryInfo.message}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 lg:flex-shrink-0">
                        {needsAction && (
                          <Button
                            size="sm"
                            onClick={() => handleReplaceDocument(submission)}
                            className="gap-1"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Upload Replacement
                          </Button>
                        )}
                        {submission.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(submission.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Admin notes */}
                    {submission.admin_notes && (
                      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-1">Administrator Notes</p>
                        <p className="text-sm text-amber-800 whitespace-pre-wrap">{submission.admin_notes}</p>
                      </div>
                    )}
                    
                    {/* Status description for non-approved */}
                    {effectiveStatus !== "approved" && (
                      <p className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                        <Info className="w-4 h-4 flex-shrink-0" />
                        {config.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No Documents Submitted</h3>
              <p className="text-sm text-muted-foreground">
                Begin the verification process by uploading your first document above.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentUpload;