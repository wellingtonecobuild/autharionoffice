import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Leaf, Check, Loader2, Lock, Crown, Star } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { trackListBusinessStart, trackListBusinessComplete } from "@/lib/analytics";
import { CertificationUpload } from "@/components/verification/CertificationUpload";
import { normalizeWebsiteUrl, validateUrlAccessibility } from "@/lib/validation";
import { BusinessImageUpload, UploadedImage } from "@/components/verification/BusinessImageUpload";
import { LogoUpload, UploadedLogo } from "@/components/verification/LogoUpload";
import { ProgressStepper } from "@/components/listing/ProgressStepper";
import { FeaturedImageReminder } from "@/components/verification/FeaturedImageReminder";
import { BeforeAfterPairManager, BeforeAfterPair } from "@/components/verification/BeforeAfterPairManager";
import type { Database } from "@/integrations/supabase/types";

type BusinessCategory = Database["public"]["Enums"]["business_category"];
type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];

// Plan limits for form validation
const planLimits = {
  free: {
    descriptionMax: 200,
    fullDescriptionMax: 500,
    certificationsMax: 2,
    imagesMax: 1, // Default image only, no custom images
    hasWebsite: false,
    hasLogo: false,
    hasLeadForm: false,
    hasJobs: false,
  },
  premium: {
    descriptionMax: 500,
    fullDescriptionMax: 2000,
    certificationsMax: 5,
    imagesMax: 10,
    hasWebsite: true,
    hasLogo: true,
    hasLeadForm: true,
    hasJobs: false,
  },
  elite: {
    descriptionMax: 1000,
    fullDescriptionMax: 5000,
    certificationsMax: 10,
    imagesMax: 20,
    hasWebsite: true,
    hasLogo: true,
    hasLeadForm: true,
    hasJobs: true,
  },
};

const planFeatures = {
  free: {
    name: "Free",
    benefits: [
      "Basic directory listing",
      "Business name & short description (200 chars)",
      "Location on map",
      "Up to 2 certifications displayed",
    ],
    excluded: ["Logo display", "Feature images", "Website link", "Lead contact form", "Post job opportunities", "Verified badge"],
  },
  premium: {
    name: "Premium",
    benefits: [
      "Everything in Free",
      "Extended description (500 chars)",
      "Full description (2000 chars)",
      "Logo visible on listing",
      "Up to 10 feature images",
      "Up to 5 certifications",
      "Website link displayed",
      "Lead contact form",
      "Priority in search results",
    ],
    excluded: ["Post job opportunities", "Verified badge (Elite only)"],
  },
  elite: {
    name: "Elite",
    benefits: [
      "Everything in Premium",
      "Maximum description (1000 chars)",
      "Full description (5000 chars)",
      "Up to 20 feature images",
      "Up to 10 certifications",
      "Post job opportunities",
      "Apply for verified badge (subject to review)",
      "Featured placement",
      "Analytics dashboard",
      "Spotlight placement",
    ],
    excluded: [],
  },
};

const categories: { label: string; value: BusinessCategory }[] = [
  { label: "Certified Eco-Builders", value: "eco-builders" },
  { label: "Sustainable Material Suppliers", value: "suppliers" },
  { label: "Green Architects & Designers", value: "architects" },
  { label: "Renovation & Retrofitting Specialists", value: "renovation" },
];

const locations = ["Wellington City", "Lower Hutt", "Upper Hutt", "Porirua", "Kāpiti Coast"];

// Dynamic schema based on plan
const createFormSchema = (plan: SubscriptionPlan) => {
  const limits = planLimits[plan];
  const isPaidPlan = plan === "premium" || plan === "elite";
  
  return z.object({
    businessName: z.string().min(2, "Business name must be at least 2 characters").max(100),
    // Email and phone only required for paid plans
    email: isPaidPlan 
      ? z.string().email("Please enter a valid email")
      : z.string().optional(),
    phone: isPaidPlan 
      ? z.string().min(6, "Please enter a valid phone number").max(20)
      : z.string().optional(),
    category: z.enum(["eco-builders", "suppliers", "architects", "renovation"] as const, {
      required_error: "Please select a category",
    }),
    city: z.string().min(1, "Please select a location"),
    address: z.string().max(200).optional(),
    description: z.string()
      .min(20, "Description must be at least 20 characters")
      .max(limits.descriptionMax, `Description must be under ${limits.descriptionMax} characters for ${plan} plan`),
    fullDescription: z.string()
      .max(limits.fullDescriptionMax, `Full description must be under ${limits.fullDescriptionMax} characters for ${plan} plan`)
      .optional(),
    certifications: z.string().optional(),
    website: z.string().optional().refine((val) => {
      if (!val || val.trim() === '') return true;
      const cleaned = val.trim();
      // Block if contains spaces
      if (cleaned.includes(' ')) return false;
      // Must contain at least one letter
      if (!/[a-zA-Z]/.test(cleaned)) return false;
      // Must have a dot (TLD) or be very short
      return cleaned.includes('.') || cleaned.length <= 3;
    }, {
      message: "Please enter a valid website address",
    }),
    hours: z.string().optional(),
    sustainabilityFocus: z.string().optional(),
    terms: z.boolean().refine((val) => val === true, "You must agree to the terms"),
  });
};

const formSchema = createFormSchema("free");

type FormData = z.infer<typeof formSchema>;

const STORAGE_KEY = "listBusiness_formData";

const ListBusiness = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [certDocuments, setCertDocuments] = useState<{ name: string; url: string; type: string; size: number }[]>([]);
  const [certDocumentsError, setCertDocumentsError] = useState<string | null>(null);
  const [businessImages, setBusinessImages] = useState<UploadedImage[]>([]);
  const [businessImagesError, setBusinessImagesError] = useState<string | null>(null);
  const [logo, setLogo] = useState<UploadedLogo | null>(null);
  const [beforeAfterPairs, setBeforeAfterPairs] = useState<BeforeAfterPair[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(
    (searchParams.get("plan") as SubscriptionPlan) || "free"
  );
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
    (searchParams.get("billing") as 'monthly' | 'annual') || "monthly"
  );
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const [referrerCode, setReferrerCode] = useState<string | null>(null);
  
  // Edit mode state
  const editBusinessId = searchParams.get("edit");
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [existingBusinessData, setExistingBusinessData] = useState<any>(null);

  // Capture referral code from URL and store it
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      setReferrerCode(refCode);
      localStorage.setItem("business_referrer_code", refCode);
    } else {
      // Check localStorage for previously stored code
      const storedCode = localStorage.getItem("business_referrer_code");
      if (storedCode) {
        setReferrerCode(storedCode);
      }
    }
  }, [searchParams]);

  // Load saved form data from localStorage
  const getSavedFormData = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error loading saved form data:", e);
    }
    return null;
  };

  const savedData = getSavedFormData();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      terms: false,
      businessName: savedData?.businessName || "",
      email: savedData?.email || "",
      phone: savedData?.phone || "",
      address: savedData?.address || "",
      description: savedData?.description || "",
      fullDescription: savedData?.fullDescription || "",
      certifications: savedData?.certifications || "",
      website: savedData?.website || "",
      hours: savedData?.hours || "",
      sustainabilityFocus: savedData?.sustainabilityFocus || "",
    },
  });

  // Watch all form fields for auto-save
  const formValues = watch();

  // Auto-save form data to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const dataToSave = {
        businessName: formValues.businessName,
        email: formValues.email,
        phone: formValues.phone,
        category: formValues.category,
        city: formValues.city,
        address: formValues.address,
        description: formValues.description,
        fullDescription: formValues.fullDescription,
        certifications: formValues.certifications,
        website: formValues.website,
        hours: formValues.hours,
        sustainabilityFocus: formValues.sustainabilityFocus,
        selectedPlan,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }, 500); // Debounce saves by 500ms

    return () => clearTimeout(timeoutId);
  }, [formValues, selectedPlan]);

  // Restore category and city from saved data
  useEffect(() => {
    if (savedData) {
      if (savedData.category) {
        setValue("category", savedData.category);
      }
      if (savedData.city) {
        setValue("city", savedData.city);
      }
      if (savedData.selectedPlan && !searchParams.get("plan")) {
        setSelectedPlan(savedData.selectedPlan);
      }
      setShowRestoredNotice(true);
      setTimeout(() => setShowRestoredNotice(false), 4000);
    }
  }, []);

  // Load existing business data for edit mode
  useEffect(() => {
    const loadEditData = async () => {
      if (!editBusinessId || !user) return;
      
      setLoadingEditData(true);
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", editBusinessId)
          .eq("owner_id", user.id)
          .single();
        
        if (error) {
          console.error("Error loading business:", error);
          toast.error("Could not load business for editing");
          navigate("/dashboard");
          return;
        }
        
        if (data) {
          setIsEditMode(true);
          setExistingBusinessData(data);
          setSelectedPlan(data.subscription_plan as SubscriptionPlan);
          
          // Populate form with existing data
          setValue("businessName", data.name || "");
          setValue("email", data.email || "");
          setValue("phone", data.phone || "");
          setValue("category", data.category as any);
          setValue("city", data.city || "");
          setValue("address", data.address || "");
          setValue("description", data.description || "");
          setValue("fullDescription", data.full_description || "");
          setValue("certifications", data.certifications?.join(", ") || "");
          setValue("website", data.website || "");
          setValue("hours", data.hours || "");
          
          // Load images
          if (data.images && data.images.length > 0) {
            setBusinessImages(data.images.map((url: string, i: number) => ({
              id: `existing-${i}`,
              url,
              name: `Image ${i + 1}`,
              size: 0,
              type: 'image/jpeg',
              isPrimary: i === 0
            })));
          }
          
          // Load verification documents
          if (data.verification_documents && Array.isArray(data.verification_documents)) {
            setCertDocuments(data.verification_documents as any);
          }
          
          // Load logo from social_links
          const socialLinks = data.social_links as Record<string, any> | null;
          if (socialLinks?.logo) {
            setLogo({ url: socialLinks.logo, name: "Logo", type: 'image/png', size: 0 });
          }
          
          // Load before/after pairs
          if (socialLinks?.beforeAfterPairs) {
            setBeforeAfterPairs(socialLinks.beforeAfterPairs);
          }
          
          toast.success("Business loaded for editing");
        }
      } catch (err) {
        console.error("Error in edit mode:", err);
        toast.error("Failed to load business data");
      } finally {
        setLoadingEditData(false);
      }
    };
    
    if (editBusinessId && user) {
      loadEditData();
    }
  }, [editBusinessId, user, navigate, setValue]);

  // Clear saved form data
  const clearSavedData = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      toast.info("Please sign in to list your business");
      const redirectTo = encodeURIComponent(`/list-business${window.location.search}`);
      navigate(`/auth?redirect=${redirectTo}`);
    }
    if (!isEditMode) {
      trackListBusinessStart();
    }
  }, [user, authLoading, navigate, isEditMode]);

  const isPremiumOrElite = selectedPlan === "premium" || selectedPlan === "elite";
  const isElite = selectedPlan === "elite";

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast.error("Please sign in to submit your business");
      return;
    }

    // In edit mode, skip cert validation if they already exist
    if (!isEditMode && certDocuments.length === 0) {
      setCertDocumentsError("Please upload at least one certification document");
      toast.error("Please upload at least one certification document");
      return;
    }
    setCertDocumentsError(null);

    // Validate feature image for Premium & Elite (skip in edit mode if images exist)
    if (isPremiumOrElite && businessImages.length === 0 && !isEditMode) {
      setBusinessImagesError("Please upload at least one feature image for your listing");
      toast.error("Please upload at least one feature image");
      return;
    }
    setBusinessImagesError(null);

    // Normalize website URL instantly (no blocking validation)
    const normalizedWebsite = isPremiumOrElite && data.website?.trim() 
      ? normalizeWebsiteUrl(data.website) 
      : null;

    setIsSubmitting(true);

    // Show immediate feedback
    if (isEditMode) {
      toast.loading("Saving changes...", { id: "save-loading" });
    } else if (selectedPlan !== "free") {
      toast.loading("Preparing your payment...", { id: "checkout-loading" });
    }

    try {
      const certificationsArray = data.certifications
        ? data.certifications.split(",").map((c) => c.trim()).filter(Boolean)
        : null;

      // Prepare images array with URLs
      const imagesArray = businessImages.map(img => img.url);

      const businessData = {
        name: data.businessName,
        category: data.category,
        city: data.city,
        address: data.address || 'Address not provided',
        description: data.description,
        full_description: data.fullDescription || null,
        email: data.email,
        phone: data.phone,
        website: normalizedWebsite,
        hours: data.hours || null,
        certifications: certificationsArray,
        images: imagesArray.length > 0 ? imagesArray : null,
        verification_documents: certDocuments.length > 0 ? certDocuments : existingBusinessData?.verification_documents || null,
        social_links: {
          ...(existingBusinessData?.social_links || {}),
          ...(logo ? { logo: logo.url } : {}),
          ...(referrerCode ? { referrer_code: referrerCode } : {}),
          ...(beforeAfterPairs.length > 0 ? { beforeAfterPairs } : {}),
        },
        updated_at: new Date().toISOString(),
      };

      // EDIT MODE: Update existing business
      if (isEditMode && editBusinessId) {
        const { error } = await supabase
          .from("businesses")
          .update(businessData as any)
          .eq("id", editBusinessId)
          .eq("owner_id", user.id);

        toast.dismiss("save-loading");

        if (error) throw error;

        toast.success("Business updated successfully!");
        navigate("/dashboard");
        return;
      }

      // CREATE MODE: Insert new business
      // IMPORTANT: For paid plans (premium/elite), business is created with "awaiting_payment" status
      // and will ONLY be submitted for review after successful payment via webhook
      // For free plan, business goes directly to "pending" for admin review
      const initialStatus = selectedPlan === "free" ? "pending" : "awaiting_payment";

      const insertData = {
        ...businessData,
        owner_id: user.id,
        status: initialStatus,
        subscription_plan: selectedPlan,
        verification_status: certDocuments.length > 0 ? "pending" : "none",
        verification_requested_at: certDocuments.length > 0 ? new Date().toISOString() : null,
        payment_status: selectedPlan === "free" ? null : "awaiting",
      };

      const { data: insertedBusiness, error } = await supabase
        .from("businesses")
        .insert(insertData as any)
        .select('id')
        .single();

      if (error) throw error;

      // If there's a referrer code and this is a paid plan, create a pending referral
      if (referrerCode && selectedPlan !== "free" && insertedBusiness?.id) {
        try {
          await supabase.from("partner_referrals").insert({
            referrer_name: "Referral via link",
            referrer_email: "pending@verification.com",
            referral_code: referrerCode,
            referred_company_name: data.businessName,
            referred_company_email: data.email || "not-provided@business.com",
            referral_plan: selectedPlan as "premium" | "elite",
            converted_business_id: insertedBusiness.id,
            status: "pending",
            admin_notes: `Auto-created from business listing with referrer code: ${referrerCode}`,
          });
          localStorage.removeItem("business_referrer_code");
        } catch (refError) {
          console.error("Error creating referral:", refError);
        }
      }

      clearSavedData();
      trackListBusinessComplete(insertedBusiness?.id || '', data.category);

      // For paid plans, redirect to Stripe checkout - PAYMENT MUST BE COMPLETED
      // Business will NOT be visible or submitted for review until payment succeeds
      if (selectedPlan !== "free" && insertedBusiness?.id) {
        // Premium Monthly = Free Trial; Premium Annual + Elite = Instant Payment
        const useTrial = selectedPlan === "premium" && billingCycle === "monthly";
        const checkoutFunction = useTrial ? "create-trial-checkout" : "create-business-checkout";
        
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
          checkoutFunction,
          {
            body: {
              businessId: insertedBusiness.id,
              plan: selectedPlan,
              billingCycle: billingCycle,
            },
          }
        );

        toast.dismiss("checkout-loading");

        if (checkoutError || !checkoutData?.url) {
          console.error("Checkout error:", checkoutError);
          toast.error("Payment required. Please complete payment to submit your listing.");
          navigate(`/dashboard?payment_pending=true&business_id=${insertedBusiness.id}`);
          return;
        }

        window.location.href = checkoutData.url;
      } else {
        toast.success("Application submitted! Your listing will be reviewed and you'll receive an email once approved.");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.dismiss("checkout-loading");
      toast.dismiss("save-loading");
      console.error("Error submitting business:", error);
      toast.error(error.message || "Failed to save business. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (authLoading || loadingEditData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          {loadingEditData && <p className="text-muted-foreground">Loading business data...</p>}
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{isEditMode ? "Edit Business" : "Apply to Be Listed"} | Wellington EcoBuild</title>
        <meta name="description" content="Apply to join Wellington's premier directory for sustainable construction. All applications are manually reviewed to maintain quality standards." />
      </Helmet>

      <div className="min-h-screen bg-muted">
        {/* Header */}
        <header className="bg-background border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-display text-lg font-semibold text-foreground">Wellington</span>
                <span className="font-display text-lg font-semibold text-accent">EcoBuild</span>
              </div>
            </Link>
            {isEditMode && (
              <Button variant="outline" asChild>
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            )}
          </div>
        </header>

        <main className="py-12 lg:py-16">
          <div className="container mx-auto px-4">
            {/* Best Experience Notice */}
            <div className="max-w-2xl mx-auto mb-4">
              <div className="p-4 bg-accent/10 border-2 border-accent/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    For the best experience, we recommend submitting listings using a laptop or desktop.
                  </p>
                </div>
              </div>
            </div>

            {/* Edit Mode Banner */}
            {isEditMode && (
              <div className="max-w-2xl mx-auto mb-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-blue-700">
                    You are editing <strong>{existingBusinessData?.name}</strong>. Changes will be saved instantly.
                  </p>
                </div>
              </div>
            )}

            {/* Referral Code Banner */}
            {referrerCode && !isEditMode && (
              <div className="max-w-2xl mx-auto mb-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-700">
                    Referral code <strong>{referrerCode}</strong> applied! Your referrer will be credited when you subscribe.
                  </p>
                </div>
              </div>
            )}

            {/* Progress Stepper - only show in create mode */}
            {!isEditMode && (
              <div className="max-w-2xl mx-auto mb-8">
                <ProgressStepper
                  currentStep={1}
                  steps={[
                    { number: 1, label: "Apply" },
                    { number: 2, label: "Payment" },
                    { number: 3, label: "Review" },
                  ]}
                />
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              {/* Left - Plan Selection & Benefits */}
              <div>
                <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
                  {isEditMode ? "Edit Your Business Listing" : "Apply to Be Listed"}
                </h1>
                <p className="text-muted-foreground text-lg mb-4">
                  Join Wellington's trusted network for eco-conscious construction professionals.
                </p>
                <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 mb-8">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Manual Review:</strong> All applications are reviewed by our team before approval. We only accept a limited number of verified builders per area.
                  </p>
                </div>

                {/* Plan Selector */}
                <div className="mb-8">
                  <Label className="text-base font-semibold mb-3 block">Select Your Plan</Label>
                  <div className="grid gap-3">
                    {(["free", "premium", "elite"] as SubscriptionPlan[]).map((plan) => (
                      <button
                        key={plan}
                        type="button"
                        onClick={() => {
                          setSelectedPlan(plan);
                          // Default paid plans to monthly unless URL already set
                          if (plan === "free") setBillingCycle("monthly");
                        }}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          selectedPlan === plan
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {plan === "elite" && <Crown className="w-5 h-5 text-amber-500" />}
                          {plan === "premium" && <Star className="w-5 h-5 text-primary" />}
                          {plan === "free" && <Check className="w-5 h-5 text-muted-foreground" />}
                          <span className="font-semibold capitalize">{plan}</span>
                          {selectedPlan === plan && (
                            <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                              Selected
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Billing cycle (paid plans only) */}
                  {selectedPlan !== "free" && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium text-foreground mb-2 block">Billing cycle</Label>
                      <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
                        <button
                          type="button"
                          onClick={() => setBillingCycle("monthly")}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            billingCycle === "monthly"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingCycle("annual")}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            billingCycle === "annual"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Annual
                          <span className="ml-1.5 text-xs text-accent">(Save with yearly billing)</span>
                        </button>
                      </div>
                      {billingCycle === "annual" && (
                        <p className="mt-2 text-xs text-muted-foreground">Billed yearly</p>
                      )}
                    </div>
                  )}
                </div>


                {/* Plan Benefits */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                    {selectedPlan === "elite" && <Crown className="w-5 h-5 text-amber-500" />}
                    {selectedPlan === "premium" && <Star className="w-5 h-5 text-primary" />}
                    {planFeatures[selectedPlan].name} Plan Includes:
                  </h3>
                  <div className="space-y-3 mb-4">
                    {planFeatures[selectedPlan].benefits.map((benefit) => (
                      <div key={benefit} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-accent" />
                        </div>
                        <span className="text-sm text-foreground">{benefit}</span>
                      </div>
                    ))}
                  </div>
                  {planFeatures[selectedPlan].excluded.length > 0 && (
                    <>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        Upgrade to unlock:
                      </h4>
                      <div className="space-y-2">
                        {planFeatures[selectedPlan].excluded.map((item) => (
                          <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Lock className="w-4 h-4" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => navigate("/pricing")}
                      >
                        View Pricing Plans
                      </Button>
                    </>
                  )}
                </div>

                {/* Payment Notice for Paid Plans */}
                {selectedPlan !== "free" && (
                  <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-xl">
                    <h4 className="font-semibold text-foreground mb-2">Payment Required</h4>
                    <p className="text-sm text-muted-foreground">
                      Your application will be reviewed after payment. Listings go live only after verification by our team.
                    </p>
                  </div>
                )}
              </div>

              {/* Right - Form */}
              <div className="bg-card rounded-2xl border border-border p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    Business Information
                  </h2>
                  {showRestoredNotice && (
                    <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full animate-fade-in">
                      Draft restored
                    </span>
                  )}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name *</Label>
                    <p className="text-xs text-muted-foreground">Enter "Sole Trader" if self-employed</p>
                    <Input id="businessName" placeholder="Your business name" {...register("businessName")} />
                    {errors.businessName && <p className="text-sm text-destructive">{errors.businessName.message}</p>}
                  </div>

                  {/* Contact fields - Only shown for Premium & Elite */}
                  {isPremiumOrElite ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
                        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input id="phone" placeholder="04 000 0000" {...register("phone")} />
                        {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="category">Primary Category *</Label>
                    <Select onValueChange={(value) => setValue("category", value as BusinessCategory)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Location *</Label>
                    <Select onValueChange={(value) => setValue("city", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your area" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {loc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address *</Label>
                    <Input id="address" placeholder="123 Main Street, Wellington" {...register("address")} />
                    {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description">Short Description * (max {planLimits[selectedPlan].descriptionMax} chars)</Label>
                      <span className={`text-xs ${(formValues.description?.length || 0) > planLimits[selectedPlan].descriptionMax ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {formValues.description?.length || 0}/{planLimits[selectedPlan].descriptionMax}
                      </span>
                    </div>
                    <Textarea
                      id="description"
                      placeholder="Brief overview of your business and services..."
                      rows={3}
                      maxLength={planLimits[selectedPlan].descriptionMax}
                      {...register("description")}
                    />
                    {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="fullDescription">Full Description (max {planLimits[selectedPlan].fullDescriptionMax} chars)</Label>
                      <span className={`text-xs ${(formValues.fullDescription?.length || 0) > planLimits[selectedPlan].fullDescriptionMax ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {formValues.fullDescription?.length || 0}/{planLimits[selectedPlan].fullDescriptionMax}
                      </span>
                    </div>
                    <Textarea
                      id="fullDescription"
                      placeholder="Detailed description of your business, services, sustainability focus, and what makes you unique..."
                      rows={5}
                      maxLength={planLimits[selectedPlan].fullDescriptionMax}
                      {...register("fullDescription")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hours">Business Hours (Optional)</Label>
                    <Input id="hours" placeholder="e.g., Mon-Fri 8am-5pm" {...register("hours")} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="certifications">Certifications & Credentials (max {planLimits[selectedPlan].certificationsMax})</Label>
                    </div>
                    <Input id="certifications" placeholder="e.g., Homestar, Passive House, LBP, NZIA" {...register("certifications")} />
                    <p className="text-xs text-muted-foreground">
                      Separate with commas. {selectedPlan === 'free' ? 'Upgrade for more certifications.' : `Up to ${planLimits[selectedPlan].certificationsMax} will be displayed.`}
                    </p>
                  </div>

                  {/* Certification Document Upload */}
                  {user && (
                    <CertificationUpload
                      userId={user.id}
                      documents={certDocuments}
                      onDocumentsChange={(docs) => {
                        setCertDocuments(docs);
                        if (docs.length > 0) setCertDocumentsError(null);
                      }}
                      disabled={isSubmitting}
                      required
                      error={certDocumentsError || undefined}
                    />
                  )}

                  {/* Logo Upload - Premium & Elite only */}
                  {isPremiumOrElite && user && (
                    <LogoUpload
                      userId={user.id}
                      logo={logo}
                      onLogoChange={setLogo}
                      disabled={isSubmitting}
                    />
                  )}

                  {/* Business Images Upload */}
                  {user && (
                    <div className="space-y-3">
                      <BusinessImageUpload
                        userId={user.id}
                        images={businessImages}
                        onImagesChange={(imgs) => {
                          setBusinessImages(imgs);
                          if (imgs.length > 0) setBusinessImagesError(null);
                        }}
                        disabled={isSubmitting}
                        maxImages={isElite ? 20 : isPremiumOrElite ? 10 : 3}
                        label={isPremiumOrElite ? "Feature Images *" : "Business Images (Optional)"}
                        description={
                          isPremiumOrElite
                            ? "Upload high-quality photos of your work and projects. Feature images are the main visual for your listing."
                            : "Free plan allows up to 3 images. Upgrade for more."
                        }
                        required={isPremiumOrElite}
                        error={businessImagesError || undefined}
                      />
                      
                      {/* Featured image reminder for premium/elite */}
                      {isPremiumOrElite && businessImages.length > 0 && businessImages.length < 3 && (
                        <FeaturedImageReminder
                          imageCount={businessImages.length}
                          minRecommended={3}
                          plan={selectedPlan as "premium" | "elite"}
                        />
                      )}
                      {isPremiumOrElite && businessImages.length >= 3 && (
                        <FeaturedImageReminder
                          imageCount={businessImages.length}
                          minRecommended={3}
                          plan={selectedPlan as "premium" | "elite"}
                        />
                      )}
                      
                      {/* Before/After Pair Manager - For renovation businesses with images */}
                      {formValues.category === "renovation" && businessImages.length >= 2 && (
                        <BeforeAfterPairManager
                          images={businessImages}
                          pairs={beforeAfterPairs}
                          onPairsChange={setBeforeAfterPairs}
                          disabled={isSubmitting}
                          maxPairs={isElite ? 5 : isPremiumOrElite ? 3 : 1}
                        />
                      )}
                    </div>
                  )}

                  {/* Website - Only shown for Premium & Elite */}
                  {isPremiumOrElite ? (
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" placeholder="e.g. wellingtonecobuild.nz" {...register("website")} />
                      <p className="text-xs text-muted-foreground mt-1">You can enter your website with or without https://</p>
                      {errors.website && <p className="text-sm text-destructive">{errors.website.message}</p>}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-muted/50 border border-dashed border-border">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">Website Link</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upgrade to Premium or Elite to display your website.
                      </p>
                    </div>
                  )}

                  {/* Locked Features Notices */}
                  {!isPremiumOrElite && (
                    <div className="p-4 rounded-xl bg-muted/50 border border-dashed border-border">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">Logo & Feature Images</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upgrade to Premium or Elite to display your logo and feature images prominently.
                      </p>
                    </div>
                  )}

                  {!isPremiumOrElite && (
                    <div className="p-4 rounded-xl bg-muted/50 border border-dashed border-border">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">Lead Contact Form</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upgrade to Premium or Elite to receive leads directly through your listing.
                      </p>
                    </div>
                  )}

                  {!isElite && (
                    <div className="p-4 rounded-xl bg-muted/50 border border-dashed border-border">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">Post Job Opportunities</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Job postings available on Elite plan. Verified badge awarded after admin review of credentials.
                      </p>
                    </div>
                  )}

                  {/* Legal Disclaimer */}
                  <div className="p-4 bg-amber-500/5 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Legal Disclaimer:</strong> By submitting this listing, you confirm you are authorised to represent this business and that all information provided is accurate. Providing false or misleading information is prohibited by Wellington EcoBuild and may result in listing removal.
                    </p>
                  </div>

                  {/* Device Recommendation */}
                  <div className="p-3 bg-muted/50 border border-border rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">
                      💻 For the best experience, we recommend submitting listings using a laptop or desktop.
                    </p>
                  </div>

                  {/* Trial Terms Notice for Premium Monthly Only */}
                  {selectedPlan === "premium" && billingCycle === "monthly" && (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-2">
                      <p className="text-sm text-foreground font-medium flex items-center gap-2">
                        <Star className="w-4 h-4 text-green-600" />
                        1-Month Free Trial – No Charge Today
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your trial is free for 1 month. You will not be charged today. Your card will only be charged <strong>$149/month (Premium plan)</strong> if the trial is not cancelled.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ✉️ You'll receive a reminder email 7 days before your trial ends.
                      </p>
                    </div>
                  )}
                  
                  {/* Annual Payment Notice */}
                  {selectedPlan === "premium" && billingCycle === "annual" && (
                    <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg space-y-2">
                      <p className="text-sm text-foreground font-medium flex items-center gap-2">
                        <Crown className="w-4 h-4 text-accent" />
                        Annual Plan – Charged Immediately
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Annual billing saves you ~17%. You'll be charged for the full year at checkout.
                      </p>
                    </div>
                  )}

                  <div className="flex items-start gap-2 pt-2">
                    <Checkbox
                      id="terms"
                      checked={watch("terms")}
                      onCheckedChange={(checked) => setValue("terms", checked === true)}
                    />
                    <label htmlFor="terms" className="text-sm text-muted-foreground">
                      I agree to the{" "}
                      <Link to="/legal" className="text-accent hover:underline">Terms of Service</Link>
                      {" "}and{" "}
                      <Link to="/legal" className="text-accent hover:underline">Privacy Policy</Link>
                    </label>
                  </div>
                  {errors.terms && <p className="text-sm text-destructive">{errors.terms.message}</p>}

                  <Button 
                    className={`w-full ${selectedPlan === "premium" && billingCycle === "monthly" ? "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600" : selectedPlan === "elite" || (selectedPlan === "premium" && billingCycle === "annual") ? "bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70" : ""}`} 
                    size="lg" 
                    type="submit" 
                    disabled={isSubmitting}
                    title={selectedPlan === "premium" && billingCycle === "monthly" ? "No charge today. Cancel anytime before your trial ends to avoid payment." : undefined}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {selectedPlan !== "free" ? "Preparing..." : "Submitting..."}
                      </>
                    ) : selectedPlan === "free" ? (
                      "Submit Free Application"
                    ) : selectedPlan === "premium" && billingCycle === "monthly" ? (
                      <>
                        <Crown className="mr-2 h-4 w-4" />
                        Start Free 1-Month Trial
                      </>
                    ) : (
                      <>
                        <Crown className="mr-2 h-4 w-4" />
                        Upgrade to Premium
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    {selectedPlan === "free"
                      ? "Your listing will be reviewed before going live. Upgrade anytime for more features."
                      : selectedPlan === "premium" && billingCycle === "monthly"
                      ? "Secure checkout powered by Stripe. Card required for verification – not charged today."
                      : "You'll be redirected to secure checkout and charged immediately."}
                  </p>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default ListBusiness;
