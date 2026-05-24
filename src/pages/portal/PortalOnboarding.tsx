import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePortalUser } from "@/hooks/usePortalUser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  User, Camera, FileText, Building2, CheckCircle2, 
  Upload, Loader2, AlertCircle, Shield
} from "lucide-react";
import Cropper from "react-easy-crop";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STEPS = [
  { id: 1, title: "Personal Details", icon: User },
  { id: 2, title: "Professional Photo", icon: Camera },
  { id: 3, title: "Tax Information", icon: FileText },
  { id: 4, title: "Bank Details", icon: Building2 },
  { id: 5, title: "Review & Sign", icon: CheckCircle2 },
];

export default function PortalOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { portalUser, refresh } = usePortalUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [enhancingPhoto, setEnhancingPhoto] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    legal_full_name: "",
    job_title: "",
    phone_number: "",
    bio: "",
    qualifications: [] as string[],
    ird_number: "",
    gst_registered: false,
    bank_account_number: "",
    agreement_signed: false,
  });

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  // Qualification input
  const [qualificationInput, setQualificationInput] = useState("");

  useEffect(() => {
    if (portalUser) {
      setFormData({
        legal_full_name: portalUser.legal_full_name || "",
        job_title: (portalUser as any).job_title || "",
        phone_number: (portalUser as any).phone_number || "",
        bio: (portalUser as any).bio || "",
        qualifications: (portalUser as any).qualifications || [],
        ird_number: portalUser.ird_number || "",
        gst_registered: portalUser.gst_registered || false,
        bank_account_number: portalUser.bank_account_number || "",
        agreement_signed: !!(portalUser as any).agreement_signed_at,
      });
      if ((portalUser as any).profile_photo_url) {
        setPhotoPreview((portalUser as any).profile_photo_url);
      }
    }
  }, [portalUser]);

  const onCropComplete = useCallback((_: any, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Photo must be less than 10MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = async (): Promise<Blob> => {
    if (!photoPreview || !croppedAreaPixels) {
      throw new Error("No image to crop");
    }

    const image = new Image();
    image.src = photoPreview;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // Set canvas size to 800x800 for HD quality
    canvas.width = 800;
    canvas.height = 800;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      800,
      800
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, "image/png", 1.0);
    });
  };

  const uploadAndEnhancePhoto = async () => {
    if (!photoPreview || !croppedAreaPixels || !portalUser) return;

    setEnhancingPhoto(true);
    try {
      // Get cropped image
      const croppedBlob = await getCroppedImg();
      
      // Upload original cropped photo
      const fileName = `${portalUser.id}/original-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("staff-photos")
        .upload(fileName, croppedBlob, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("staff-photos")
        .getPublicUrl(fileName);

      const originalUrl = urlData.publicUrl;

      // Update portal user with original photo
      await supabase
        .from("portal_users")
        .update({ 
          profile_photo_url: originalUrl,
          photo_status: "processing"
        } as any)
        .eq("id", portalUser.id);

      // Call enhancement edge function
      const { data: enhanceData, error: enhanceError } = await supabase.functions.invoke(
        "enhance-staff-photo",
        {
          body: { imageUrl: originalUrl, portalUserId: portalUser.id },
        }
      );

      if (enhanceError) {
        console.error("Enhancement error:", enhanceError);
        toast.info("Photo uploaded. Enhancement will be processed shortly.");
      } else {
        toast.success("Photo uploaded and enhanced to HD quality!");
        if (enhanceData?.hdImageUrl) {
          setPhotoPreview(enhanceData.hdImageUrl);
        }
      }

      setShowCropper(false);
      await refresh();
    } catch (error) {
      console.error("Photo upload error:", error);
      toast.error("Failed to upload photo");
    } finally {
      setEnhancingPhoto(false);
    }
  };

  const addQualification = () => {
    if (qualificationInput.trim()) {
      setFormData({
        ...formData,
        qualifications: [...formData.qualifications, qualificationInput.trim()],
      });
      setQualificationInput("");
    }
  };

  const removeQualification = (index: number) => {
    setFormData({
      ...formData,
      qualifications: formData.qualifications.filter((_, i) => i !== index),
    });
  };

  const saveStepData = async () => {
    if (!portalUser) return;

    setLoading(true);
    try {
      const updateData: any = {};

      switch (currentStep) {
        case 1:
          updateData.legal_full_name = formData.legal_full_name;
          updateData.job_title = formData.job_title;
          updateData.phone_number = formData.phone_number;
          updateData.bio = formData.bio;
          updateData.qualifications = formData.qualifications;
          break;
        case 3:
          updateData.ird_number = formData.ird_number;
          updateData.gst_registered = formData.gst_registered;
          break;
        case 4:
          updateData.bank_account_number = formData.bank_account_number;
          break;
        case 5:
          if (formData.agreement_signed) {
            updateData.agreement_signed_at = new Date().toISOString();
            updateData.onboarding_completed_at = new Date().toISOString();
            updateData.profile_completed = true;
            updateData.profile_completed_at = new Date().toISOString();
            updateData.status = "active";
          }
          break;
      }

      const { error } = await supabase
        .from("portal_users")
        .update(updateData)
        .eq("id", portalUser.id);

      if (error) throw error;

      await refresh();
      toast.success("Progress saved!");

      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
      } else if (formData.agreement_signed) {
        toast.success("Onboarding complete! Welcome to Wellington EcoBuild.");
        navigate("/portal");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to Wellington EcoBuild
          </h1>
          <p className="text-muted-foreground">
            Complete your professional profile to get started
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <Progress value={progress} className="h-2 mb-4" />
          <div className="flex justify-between">
              {STEPS.map((step) => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center ${
                      step.id === currentStep
                        ? "text-primary"
                        : step.id < currentStep
                        ? "text-green-600"
                        : "text-muted-foreground"
                    }`}
                  >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                    step.id === currentStep
                      ? "bg-primary text-primary-foreground"
                      : step.id < currentStep
                      ? "bg-green-600 text-white"
                      : "bg-muted"
                  }`}
                  >
                    {step.id < currentStep ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs hidden sm:block">{step.title}</span>
                </div>
                );
              })}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const CurrentIcon = STEPS[currentStep - 1].icon;
                return CurrentIcon ? <CurrentIcon className="h-5 w-5" /> : null;
              })()}
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Enter your personal and professional details"}
              {currentStep === 2 && "Upload a professional headshot photo (will be enhanced to HD)"}
              {currentStep === 3 && "Provide your IRD and GST information"}
              {currentStep === 4 && "Enter your bank account for payments"}
              {currentStep === 5 && "Review your information and sign the agreement"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Personal Details */}
            {currentStep === 1 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="legal_full_name">Legal Full Name *</Label>
                    <Input
                      id="legal_full_name"
                      value={formData.legal_full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, legal_full_name: e.target.value })
                      }
                      placeholder="John William Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Job Title / Role *</Label>
                    <Input
                      id="job_title"
                      value={formData.job_title}
                      onChange={(e) =>
                        setFormData({ ...formData, job_title: e.target.value })
                      }
                      placeholder="Project Manager"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                    placeholder="+64 21 123 4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Short Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Brief description of your experience and expertise..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Qualifications & Certifications</Label>
                  <div className="flex gap-2">
                    <Input
                      value={qualificationInput}
                      onChange={(e) => setQualificationInput(e.target.value)}
                      placeholder="e.g., Licensed Building Practitioner"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addQualification())}
                    />
                    <Button type="button" onClick={addQualification} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.qualifications.map((qual, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeQualification(index)}
                      >
                        {qual} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Professional Photo */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    Photo Guidelines
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Professional headshot with clear face visibility</li>
                    <li>• Plain or neutral background preferred</li>
                    <li>• Good lighting, no heavy shadows</li>
                    <li>• Minimum 400x400 pixels (will be enhanced to HD)</li>
                    <li>• Professional attire recommended</li>
                  </ul>
                </div>

                {showCropper && photoPreview ? (
                  <div className="space-y-4">
                    <div className="relative h-80 bg-black rounded-lg overflow-hidden">
                      <Cropper
                        image={photoPreview}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        cropShape="round"
                        showGrid={false}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <Label className="text-sm">Zoom:</Label>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCropper(false);
                          setPhotoPreview(null);
                          setPhotoFile(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={uploadAndEnhancePhoto} disabled={enhancingPhoto}>
                        {enhancingPhoto ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enhancing to HD...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload & Enhance to HD
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    {photoPreview && !showCropper ? (
                      <div className="relative">
                        <img
                          src={photoPreview}
                          alt="Profile"
                          className="w-48 h-48 rounded-full object-cover border-4 border-primary/20"
                        />
                        <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                          HD Enhanced
                        </Badge>
                      </div>
                    ) : (
                      <div className="w-48 h-48 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                        <Camera className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label htmlFor="photo-upload">
                        <Button asChild variant={photoPreview ? "outline" : "default"}>
                          <span>
                            <Camera className="h-4 w-4 mr-2" />
                            {photoPreview ? "Change Photo" : "Upload Photo"}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Tax Information */}
            {currentStep === 3 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ird_number">IRD Number *</Label>
                  <Input
                    id="ird_number"
                    value={formData.ird_number}
                    onChange={(e) =>
                      setFormData({ ...formData, ird_number: e.target.value })
                    }
                    placeholder="123-456-789"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your IRD number is required for tax purposes
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="gst_registered"
                    checked={formData.gst_registered}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, gst_registered: checked as boolean })
                    }
                  />
                  <Label htmlFor="gst_registered">
                    I am GST registered (invoices will include 15% GST)
                  </Label>
                </div>
              </>
            )}

            {/* Step 4: Bank Details */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_account_number">NZ Bank Account Number *</Label>
                  <Input
                    id="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_account_number: e.target.value })
                    }
                    placeholder="00-0000-0000000-000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Payments will be made to this account
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 border">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Your information is secure</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bank details are encrypted and only used for payment processing
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Review & Sign */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Personal Details</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Name:</span> {formData.legal_full_name || "Not provided"}</p>
                      <p><span className="text-muted-foreground">Role:</span> {formData.job_title || "Not provided"}</p>
                      <p><span className="text-muted-foreground">Phone:</span> {formData.phone_number || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Tax Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">IRD:</span> {formData.ird_number || "Not provided"}</p>
                      <p><span className="text-muted-foreground">GST:</span> {formData.gst_registered ? "Registered" : "Not registered"}</p>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-muted/20">
                  <h4 className="font-medium mb-3">Contractor Agreement</h4>
                  <div className="text-sm text-muted-foreground space-y-2 max-h-40 overflow-y-auto mb-4">
                    <p>By checking the box below, I confirm that:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>I am an independent contractor and not an employee</li>
                      <li>The information provided is accurate and complete</li>
                      <li>I will comply with all health and safety requirements</li>
                      <li>I am responsible for my own tax obligations</li>
                      <li>I agree to the Wellington EcoBuild contractor terms</li>
                    </ul>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="agreement"
                      checked={formData.agreement_signed}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, agreement_signed: checked as boolean })
                      }
                    />
                    <Label htmlFor="agreement" className="font-medium">
                      I have read and agree to the contractor agreement
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1 || loading}
              >
                Back
              </Button>
              <Button onClick={saveStepData} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : currentStep === 5 ? (
                  "Complete Onboarding"
                ) : (
                  "Save & Continue"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
