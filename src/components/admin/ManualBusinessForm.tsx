import { useState, useEffect } from 'react';
import { optimizeImage, blobToFile, getOptimalFormat } from '@/lib/imageOptimization';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BusinessImageUpload, UploadedImage } from '@/components/verification/BusinessImageUpload';
import { LogoUpload, UploadedLogo } from '@/components/verification/LogoUpload';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionPlans, FeatureToggle } from '@/hooks/useSubscriptionPlans';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import {
  Crown,
  Sparkles,
  Leaf,
  Award,
  MapPin,
  Clock,
  Loader2,
  CreditCard,
  CheckCircle,
  XCircle,
  Shield,
  Star,
  Briefcase,
  Eye,
  Phone,
  Mail,
  Globe,
  BarChart,
  Headphones,
  Building2,
  DollarSign,
  Link as LinkIcon,
  FileCheck,
  Upload,
  FileText,
  Trash2,
} from 'lucide-react';

type BusinessCategory = Database['public']['Enums']['business_category'];
type SubscriptionPlan = Database['public']['Enums']['subscription_plan'];

interface VerificationDocument {
  name: string;
  url: string;
  type: string;
  size: number;
  document_type?: string;
  status?: string;
  uploaded_at?: string;
}

interface BusinessFormData {
  name: string;
  description: string;
  full_description: string;
  category: BusinessCategory;
  sub_categories: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  hours: string;
  latitude: string;
  longitude: string;
  map_visible: boolean;
  is_verified: boolean;
  is_featured: boolean;
  subscription_plan: SubscriptionPlan;
  status: string;
  certifications: string;
  materials: string;
  images: UploadedImage[];
  logo: UploadedLogo | null;
  verification_documents: VerificationDocument[];
  // Payment & Billing fields
  payment_status: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  admin_notes: string;
}

interface ManualBusinessFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBusiness?: any;
  userId: string;
  onSaved: () => void;
}

const initialFormData: BusinessFormData = {
  name: '',
  description: '',
  full_description: '',
  category: 'eco-builders',
  sub_categories: '',
  city: 'Wellington',
  address: '',
  phone: '',
  email: '',
  website: '',
  hours: '',
  latitude: '',
  longitude: '',
  map_visible: true,
  is_verified: false,
  is_featured: false,
  subscription_plan: 'elite',
  status: 'active',
  certifications: '',
  materials: '',
  images: [],
  logo: null,
  verification_documents: [],
  payment_status: 'paid',
  stripe_customer_id: '',
  stripe_subscription_id: '',
  admin_notes: '',
};

const WELLINGTON_CITIES = [
  'Wellington',
  'Lower Hutt',
  'Upper Hutt',
  'Porirua',
  'Kāpiti Coast',
];

const SUB_CATEGORY_OPTIONS: Record<BusinessCategory, string[]> = {
  'eco-builders': [
    'Passive House Certified',
    'Net Zero Builders',
    'Timber Frame Specialists',
    'Prefab & Modular',
    'Retrofit Specialists',
    'Commercial Green Building',
  ],
  'suppliers': [
    'Insulation',
    'Windows & Doors',
    'Timber & Lumber',
    'Roofing',
    'Solar & Energy',
    'Paint & Finishes',
    'Plumbing',
    'Electrical',
  ],
  'architects': [
    'Residential',
    'Commercial',
    'Sustainable Design',
    'Heritage',
    'Landscape',
    'Interior Design',
  ],
  'renovation': [
    'Kitchen & Bathroom',
    'Energy Retrofit',
    'Extensions',
    'Earthquake Strengthening',
    'Heritage Restoration',
    'Accessibility',
  ],
};

const CERTIFICATION_OPTIONS = [
  'Homestar Certified',
  'Passive House Certified',
  'Green Building Council Member',
  'NZGBC Accredited',
  'EnergyStar Partner',
  'Carbon Neutral Certified',
  'B Corp Certified',
  'ISO 14001',
  'LicensedBP',
  'Master Builder',
];

const MATERIAL_OPTIONS = [
  'Recycled Materials',
  'FSC Certified Timber',
  'Low VOC Products',
  'Locally Sourced',
  'Renewable Materials',
  'Non-Toxic Finishes',
  'Energy Efficient Products',
  'Recycled Steel',
  'Hemp Building Materials',
  'Natural Insulation',
];

// Feature toggles for each plan (default values if not in database)
const DEFAULT_FEATURE_TOGGLES: Record<SubscriptionPlan, Partial<FeatureToggle>> = {
  free: {
    show_phone: false,
    show_email: false,
    show_website: true,
    show_verified_badge: false,
    show_reviews: true,
    priority_placement: false,
    job_postings: 0,
  },
  premium: {
    show_phone: true,
    show_email: true,
    show_website: true,
    show_verified_badge: true,
    show_reviews: true,
    priority_placement: true,
    job_postings: 3,
    analytics: true,
  },
  elite: {
    show_phone: true,
    show_email: true,
    show_website: true,
    show_verified_badge: true,
    show_reviews: true,
    priority_placement: true,
    job_postings: -1, // Unlimited
    spotlight_jobs: true,
    top_tier_placement: true,
    featured_badge: true,
    analytics: true,
    priority_support: true,
  },
};

export function ManualBusinessForm({
  open,
  onOpenChange,
  editingBusiness,
  userId,
  onSaved,
}: ManualBusinessFormProps) {
  const { toast } = useToast();
  const { plans, getPlanByKey } = useSubscriptionPlans();
  const [formData, setFormData] = useState<BusinessFormData>(initialFormData);
  const [formTab, setFormTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [customFeatureToggles, setCustomFeatureToggles] = useState<Partial<FeatureToggle> | null>(null);

  // Load form data when editing
  useEffect(() => {
    if (editingBusiness) {
      const verificationDocs = Array.isArray(editingBusiness.verification_documents) 
        ? editingBusiness.verification_documents.map((doc: any) => ({
            name: doc.name || doc.file_name || 'Document',
            url: doc.url || doc.file_url || '',
            type: doc.type || 'application/pdf',
            size: doc.size || 0,
            document_type: doc.document_type || 'other',
            status: doc.status || 'pending',
            uploaded_at: doc.uploaded_at || new Date().toISOString(),
          }))
        : [];
      
      setFormData({
        name: editingBusiness.name || '',
        description: editingBusiness.description || '',
        full_description: editingBusiness.full_description || '',
        category: editingBusiness.category || 'eco-builders',
        sub_categories: editingBusiness.sub_categories?.join(', ') || '',
        city: editingBusiness.city || 'Wellington',
        address: editingBusiness.address || '',
        phone: editingBusiness.phone || '',
        email: editingBusiness.email || '',
        website: editingBusiness.website || '',
        hours: editingBusiness.hours || '',
        latitude: editingBusiness.latitude?.toString() || '',
        longitude: editingBusiness.longitude?.toString() || '',
        map_visible: editingBusiness.map_visible ?? true,
        is_verified: editingBusiness.is_verified ?? false,
        is_featured: editingBusiness.is_featured ?? false,
        subscription_plan: editingBusiness.subscription_plan || 'elite',
        status: editingBusiness.status || 'active',
        certifications: editingBusiness.certifications?.join(', ') || '',
        materials: editingBusiness.materials?.join(', ') || '',
        images: editingBusiness.images?.map((url: string, i: number) => ({ 
          name: `Image ${i + 1}`, url, type: 'image/jpeg', size: 0 
        })) || [],
        logo: editingBusiness.social_links?.logo 
          ? { name: 'Logo', url: editingBusiness.social_links.logo, type: 'image/png', size: 0 } 
          : null,
        verification_documents: verificationDocs,
        payment_status: editingBusiness.payment_status || 'none',
        stripe_customer_id: editingBusiness.stripe_customer_id || '',
        stripe_subscription_id: editingBusiness.stripe_subscription_id || '',
        admin_notes: editingBusiness.admin_notes || '',
      });
    } else {
      setFormData(initialFormData);
    }
    setFormTab('basic');
    setCustomFeatureToggles(null);
  }, [editingBusiness, open]);

  // Get current plan's feature toggles
  const getCurrentFeatureToggles = (): Partial<FeatureToggle> => {
    if (customFeatureToggles) return customFeatureToggles;
    const plan = getPlanByKey(formData.subscription_plan);
    return plan?.feature_toggles || DEFAULT_FEATURE_TOGGLES[formData.subscription_plan] || {};
  };

  const handleSubCategoryToggle = (subCat: string) => {
    const current = formData.sub_categories.split(',').map(s => s.trim()).filter(Boolean);
    const index = current.indexOf(subCat);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(subCat);
    }
    setFormData({ ...formData, sub_categories: current.join(', ') });
  };

  const handleCertificationToggle = (cert: string) => {
    const current = formData.certifications.split(',').map(s => s.trim()).filter(Boolean);
    const index = current.indexOf(cert);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(cert);
    }
    setFormData({ ...formData, certifications: current.join(', ') });
  };

  const handleMaterialToggle = (mat: string) => {
    const current = formData.materials.split(',').map(s => s.trim()).filter(Boolean);
    const index = current.indexOf(mat);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(mat);
    }
    setFormData({ ...formData, materials: current.join(', ') });
  };

  const handlePlanChange = (plan: SubscriptionPlan) => {
    setFormData({ ...formData, subscription_plan: plan });
    setCustomFeatureToggles(null); // Reset custom toggles when plan changes
  };

  const handleFeatureToggleChange = (key: keyof FeatureToggle, value: boolean | number) => {
    const currentToggles = getCurrentFeatureToggles();
    setCustomFeatureToggles({
      ...currentToggles,
      [key]: value,
    });
  };

  const logAuditAction = async (action: string, entityId: string, metadata?: Record<string, any>) => {
    try {
      await supabase.from('audit_logs').insert({
        admin_id: userId,
        entity_type: 'business',
        entity_id: entityId,
        action,
        metadata,
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  };

  const handleSave = async () => {
    // Admin has no restrictions - can submit with any data
    setSaving(true);
    try {
      const imageUrls = formData.images.map(img => img.url);
      const subCats = formData.sub_categories.split(',').map(s => s.trim()).filter(Boolean);
      const certs = formData.certifications.split(',').map(s => s.trim()).filter(Boolean);
      const mats = formData.materials.split(',').map(s => s.trim()).filter(Boolean);

      const businessData = {
        name: formData.name.trim() || 'Untitled Business',
        description: formData.description.trim() || null,
        full_description: formData.full_description.trim() || null,
        category: formData.category,
        sub_categories: subCats.length > 0 ? subCats : null,
        city: formData.city || 'Wellington',
        address: formData.address.trim() || 'Address not provided',
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        website: formData.website.trim() || null,
        hours: formData.hours.trim() || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        map_visible: formData.map_visible,
        is_verified: formData.is_verified,
        is_featured: formData.is_featured,
        subscription_plan: formData.subscription_plan,
        status: formData.status,
        certifications: certs.length > 0 ? certs : null,
        materials: mats.length > 0 ? mats : null,
        images: imageUrls.length > 0 ? imageUrls : null,
        social_links: formData.logo ? { logo: formData.logo.url } : null,
        verification_documents: formData.verification_documents.length > 0 
          ? formData.verification_documents.map(doc => ({
              name: doc.name,
              url: doc.url,
              type: doc.type,
              size: doc.size,
              document_type: doc.document_type || 'other',
              status: doc.status || 'approved',
              uploaded_at: doc.uploaded_at || new Date().toISOString(),
            })) as any
          : null,
        payment_status: formData.payment_status,
        stripe_customer_id: formData.stripe_customer_id.trim() || null,
        stripe_subscription_id: formData.stripe_subscription_id.trim() || null,
        admin_notes: formData.admin_notes.trim() || null,
        // Auto-set verification fields if verified
        verification_status: formData.is_verified ? 'approved' : 'none',
        verification_processed_at: formData.is_verified ? new Date().toISOString() : null,
        verification_processed_by: formData.is_verified ? userId : null,
        // Auto-set approval fields if active
        approved_at: formData.status === 'active' || formData.status === 'approved' 
          ? new Date().toISOString() : null,
        approved_by: formData.status === 'active' || formData.status === 'approved' 
          ? userId : null,
      };

      if (editingBusiness) {
        const { error } = await supabase
          .from('businesses')
          .update(businessData)
          .eq('id', editingBusiness.id);

        if (error) throw error;

        await logAuditAction('admin_business_updated', editingBusiness.id, {
          changes: businessData,
          subscription_plan: formData.subscription_plan,
          payment_status: formData.payment_status,
        });

        toast({ title: 'Success', description: 'Business updated successfully' });
      } else {
        const { data, error } = await supabase
          .from('businesses')
          .insert({
            ...businessData,
            owner_id: userId,
            claimed: false, // Mark as unclaimed so it auto-links when owner signs up
          })
          .select()
          .single();

        if (error) throw error;

        await logAuditAction('admin_business_created', data.id, {
          name: formData.name,
          subscription_plan: formData.subscription_plan,
          payment_status: formData.payment_status,
          is_verified: formData.is_verified,
          is_featured: formData.is_featured,
        });

        toast({ title: 'Success', description: 'Business created successfully' });
      }

      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      console.error('Error saving business:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to save business', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const currentToggles = getCurrentFeatureToggles();
  const selectedPlan = getPlanByKey(formData.subscription_plan);

  const getPlanBadge = (plan: SubscriptionPlan) => {
    switch (plan) {
      case 'elite':
        return <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white gap-1"><Crown className="h-3 w-3" />Elite</Badge>;
      case 'premium':
        return <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white gap-1"><Sparkles className="h-3 w-3" />Premium</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {editingBusiness ? 'Edit Business' : 'Add New Business (Admin)'}
            {getPlanBadge(formData.subscription_plan)}
          </DialogTitle>
          <DialogDescription>
            {editingBusiness 
              ? 'Update business details, subscription, and billing settings.' 
              : 'Create a new business listing with full admin control over subscription and features.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={formTab} onValueChange={setFormTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="EcoBuilders Wellington"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ 
                    ...formData, 
                    category: v as BusinessCategory, 
                    sub_categories: '' 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eco-builders">Eco Builders</SelectItem>
                    <SelectItem value="suppliers">Suppliers</SelectItem>
                    <SelectItem value="architects">Architects</SelectItem>
                    <SelectItem value="renovation">Renovation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="A brief description of the business (displayed on cards)..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_description">Full Description</Label>
              <Textarea
                id="full_description"
                value={formData.full_description}
                onChange={(e) => setFormData({ ...formData, full_description: e.target.value })}
                placeholder="Detailed description of the business, services, history, mission..."
                rows={4}
              />
            </div>

            <Separator />
            <h4 className="font-medium flex items-center gap-2"><MapPin className="h-4 w-4" /> Location</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Eco Street"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Select
                  value={formData.city}
                  onValueChange={(v) => setFormData({ ...formData, city: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WELLINGTON_CITIES.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.0001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="-41.2865"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.0001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="174.7762"
                />
              </div>
            </div>

            <Separator />
            <h4 className="font-medium">Contact Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+64 4 123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours" className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> Business Hours
              </Label>
              <Input
                id="hours"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="Mon-Fri 8am-5pm, Sat 9am-1pm"
              />
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label className="flex items-center gap-2">Sub-Categories</Label>
              <p className="text-xs text-muted-foreground">Select all that apply to this business</p>
              <div className="flex flex-wrap gap-2">
                {SUB_CATEGORY_OPTIONS[formData.category]?.map((subCat) => {
                  const isSelected = formData.sub_categories.split(',').map(s => s.trim()).includes(subCat);
                  return (
                    <Badge
                      key={subCat}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-primary/80"
                      onClick={() => handleSubCategoryToggle(subCat)}
                    >
                      {subCat}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Award className="h-4 w-4" /> Certifications
              </Label>
              <div className="flex flex-wrap gap-2">
                {CERTIFICATION_OPTIONS.map((cert) => {
                  const isSelected = formData.certifications.split(',').map(s => s.trim()).includes(cert);
                  return (
                    <Badge
                      key={cert}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-primary/80"
                      onClick={() => handleCertificationToggle(cert)}
                    >
                      {cert}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Leaf className="h-4 w-4" /> Sustainable Materials & Practices
              </Label>
              <div className="flex flex-wrap gap-2">
                {MATERIAL_OPTIONS.map((mat) => {
                  const isSelected = formData.materials.split(',').map(s => s.trim()).includes(mat);
                  return (
                    <Badge
                      key={mat}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-primary/80"
                      onClick={() => handleMaterialToggle(mat)}
                    >
                      {mat}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-6 mt-4">
            <LogoUpload
              userId={userId}
              logo={formData.logo}
              onLogoChange={(logo) => setFormData({ ...formData, logo })}
            />

            <Separator />

            <BusinessImageUpload
              userId={userId}
              images={formData.images}
              onImagesChange={(images) => setFormData({ ...formData, images })}
              maxImages={20}
              label="Business Images (Feature Image + Gallery)"
              description="Upload photos of your work, projects, completed builds, or products. The first image will be the feature image."
            />
          </TabsContent>

          {/* Documents Tab - Admin Document Storage */}
          <TabsContent value="documents" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Verification Documents
                </CardTitle>
                <CardDescription>
                  Upload and manage verification documents for this business. All documents are stored securely.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Document Upload */}
                <div className="border-2 border-dashed border-border rounded-lg p-6">
                  <div className="flex flex-col items-center gap-4">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium">Upload Documents</p>
                      <p className="text-sm text-muted-foreground">
                        PDF, JPG, PNG up to 10MB each
                      </p>
                    </div>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      multiple
                      className="max-w-xs"
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files) return;
                        
                        const optimalFormat = await getOptimalFormat();
                        
                        for (let i = 0; i < files.length; i++) {
                          const file = files[i];
                          if (file.size > 10 * 1024 * 1024) {
                            toast({ title: 'Error', description: `File ${file.name} exceeds 10MB limit`, variant: 'destructive' });
                            continue;
                          }
                          
                          try {
                            let fileToUpload = file;
                            let finalSize = file.size;
                            
                            // If it's an image, enhance to HD quality
                            if (file.type.startsWith('image/')) {
                              const optimized = await optimizeImage(file, {
                                maxWidth: 1920,
                                maxHeight: 1080,
                                minWidth: 1280,
                                minHeight: 720,
                                quality: 0.92,
                                format: optimalFormat,
                                enhanceToHD: true,
                              });
                              fileToUpload = blobToFile(optimized.blob, file.name);
                              finalSize = optimized.optimizedSize;
                              
                              if (optimized.wasUpscaled) {
                                toast({ title: 'HD Enhanced', description: `${file.name} enhanced to ${optimized.width}x${optimized.height}` });
                              }
                            }
                            
                            const fileName = `admin-docs/${userId}/${Date.now()}-${fileToUpload.name}`;
                            
                            const { error: uploadError } = await supabase.storage
                              .from('verification-documents')
                              .upload(fileName, fileToUpload);
                            
                            if (uploadError) throw uploadError;
                            
                            const { data: urlData } = supabase.storage
                              .from('verification-documents')
                              .getPublicUrl(fileName);
                            
                            const newDoc: VerificationDocument = {
                              name: file.name,
                              url: urlData.publicUrl,
                              type: fileToUpload.type,
                              size: finalSize,
                              document_type: 'other',
                              status: 'approved',
                              uploaded_at: new Date().toISOString(),
                            };
                            
                            setFormData(prev => ({
                              ...prev,
                              verification_documents: [...prev.verification_documents, newDoc]
                            }));
                            
                            toast({ title: 'Success', description: `${file.name} uploaded` });
                          } catch (err: any) {
                            toast({ title: 'Error', description: err.message || 'Upload failed', variant: 'destructive' });
                          }
                        }
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>

                {/* Document List */}
                {formData.verification_documents.length > 0 ? (
                  <div className="space-y-3">
                    <Label>Uploaded Documents ({formData.verification_documents.length})</Label>
                    <div className="space-y-3">
                      {formData.verification_documents.map((doc, index) => (
                        <div 
                          key={index} 
                          className="p-4 bg-muted/50 rounded-lg border space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div className="flex-1">
                                <Input
                                  value={doc.name}
                                  onChange={(e) => {
                                    const updated = [...formData.verification_documents];
                                    updated[index] = { ...updated[index], name: e.target.value };
                                    setFormData({ ...formData, verification_documents: updated });
                                  }}
                                  className="font-medium text-sm h-8"
                                  placeholder="Document name"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(doc.url, '_blank')}
                              >
                                View
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  const updated = formData.verification_documents.filter((_, i) => i !== index);
                                  setFormData({ ...formData, verification_documents: updated });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">Document Type</Label>
                              <Input
                                value={doc.document_type || ''}
                                onChange={(e) => {
                                  const updated = [...formData.verification_documents];
                                  updated[index] = { ...updated[index], document_type: e.target.value };
                                  setFormData({ ...formData, verification_documents: updated });
                                }}
                                className="h-8 mt-1"
                                placeholder="e.g., Business License, Certificate, ID"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Status</Label>
                              <Select
                                value={doc.status || 'approved'}
                                onValueChange={(status) => {
                                  const updated = [...formData.verification_documents];
                                  updated[index] = { ...updated[index], status };
                                  setFormData({ ...formData, verification_documents: updated });
                                }}
                              >
                                <SelectTrigger className="h-8 mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No documents uploaded yet</p>
                  </div>
                )}

                {/* Document Type Quick Add */}
                <Separator />
                <div className="space-y-2">
                  <Label>Document Type (for new uploads)</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'identity', label: 'ID Document' },
                      { value: 'business', label: 'Business Registration' },
                      { value: 'professional', label: 'Professional License' },
                      { value: 'insurance', label: 'Insurance' },
                      { value: 'certification', label: 'Certification' },
                    ].map((type) => (
                      <Badge 
                        key={type.value}
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary/10"
                      >
                        {type.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab - NEW */}
          <TabsContent value="subscription" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscription Plan Assignment
                </CardTitle>
                <CardDescription>
                  Assign a subscription plan and customize feature access for this business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Plan Selection */}
                <div className="grid grid-cols-3 gap-4">
                  {(['free', 'premium', 'elite'] as SubscriptionPlan[]).map((plan) => {
                    const isSelected = formData.subscription_plan === plan;
                    const planData = getPlanByKey(plan);
                    return (
                      <Card 
                        key={plan}
                        className={`cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-2 border-primary ring-2 ring-primary/20' 
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => handlePlanChange(plan)}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="mb-2">
                            {getPlanBadge(plan)}
                          </div>
                          <p className="text-2xl font-bold">
                            ${planData?.price_monthly || 0}
                            <span className="text-sm font-normal text-muted-foreground">/mo</span>
                          </p>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto mt-2" />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Separator />

                {/* Feature Toggles */}
                <div>
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Plan Benefits (Customizable)
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    These are the default features for {formData.subscription_plan} plan. You can override individual features.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm">Show Phone Number</span>
                      </div>
                      <Switch
                        checked={currentToggles.show_phone}
                        onCheckedChange={(v) => handleFeatureToggleChange('show_phone', v)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">Show Email</span>
                      </div>
                      <Switch
                        checked={currentToggles.show_email}
                        onCheckedChange={(v) => handleFeatureToggleChange('show_email', v)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span className="text-sm">Show Website</span>
                      </div>
                      <Switch
                        checked={currentToggles.show_website}
                        onCheckedChange={(v) => handleFeatureToggleChange('show_website', v)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span className="text-sm">Verified Badge</span>
                      </div>
                      <Switch
                        checked={currentToggles.show_verified_badge}
                        onCheckedChange={(v) => handleFeatureToggleChange('show_verified_badge', v)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        <span className="text-sm">Show Reviews</span>
                      </div>
                      <Switch
                        checked={currentToggles.show_reviews}
                        onCheckedChange={(v) => handleFeatureToggleChange('show_reviews', v)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span className="text-sm">Priority Placement</span>
                      </div>
                      <Switch
                        checked={currentToggles.priority_placement}
                        onCheckedChange={(v) => handleFeatureToggleChange('priority_placement', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        <span className="text-sm">Job Postings</span>
                      </div>
                      <Select
                        value={currentToggles.job_postings?.toString() || '0'}
                        onValueChange={(v) => handleFeatureToggleChange('job_postings', parseInt(v))}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="-1">Unlimited</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <BarChart className="h-4 w-4" />
                        <span className="text-sm">Analytics Access</span>
                      </div>
                      <Switch
                        checked={currentToggles.analytics || false}
                        onCheckedChange={(v) => handleFeatureToggleChange('analytics', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-sm">Spotlight Jobs</span>
                      </div>
                      <Switch
                        checked={currentToggles.spotlight_jobs || false}
                        onCheckedChange={(v) => handleFeatureToggleChange('spotlight_jobs', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Headphones className="h-4 w-4" />
                        <span className="text-sm">Priority Support</span>
                      </div>
                      <Switch
                        checked={currentToggles.priority_support || false}
                        onCheckedChange={(v) => handleFeatureToggleChange('priority_support', v)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PUBLIC VISIBILITY PREVIEW - Shows what will be visible on the live listing */}
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Public Visibility Preview
                </CardTitle>
                <CardDescription>
                  Confirm what will be publicly visible based on the current plan selection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">Business Information</p>
                      <ul className="space-y-1.5">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Business Name</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Description</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Category & Address</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Gallery Images</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">Contact Details (Plan-Based)</p>
                      <ul className="space-y-1.5">
                        <li className="flex items-center gap-2">
                          {currentToggles.show_phone ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={!currentToggles.show_phone ? 'text-muted-foreground' : ''}>
                            Phone: {formData.phone || '(not provided)'}
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          {currentToggles.show_email ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={!currentToggles.show_email ? 'text-muted-foreground' : ''}>
                            Email: {formData.email || '(not provided)'}
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          {currentToggles.show_website ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={!currentToggles.show_website ? 'text-muted-foreground' : ''}>
                            Website: {formData.website || '(not provided)'}
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-3 gap-3">
                    <div className={`p-3 rounded-lg border ${currentToggles.show_verified_badge ? 'bg-green-500/10 border-green-500/30' : 'bg-muted border-muted'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {currentToggles.show_verified_badge ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium text-sm">Verified Badge</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {currentToggles.show_verified_badge ? 'Will display' : 'Hidden'}
                      </p>
                    </div>

                    <div className={`p-3 rounded-lg border ${currentToggles.priority_placement ? 'bg-green-500/10 border-green-500/30' : 'bg-muted border-muted'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {currentToggles.priority_placement ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium text-sm">Priority Placement</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {currentToggles.priority_placement ? 'Ranked higher in search' : 'Standard ranking'}
                      </p>
                    </div>

                    <div className={`p-3 rounded-lg border ${currentToggles.job_postings !== 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-muted border-muted'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {currentToggles.job_postings !== 0 ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium text-sm">Job Postings</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {currentToggles.job_postings === -1 ? 'Unlimited' : currentToggles.job_postings === 0 ? 'Not allowed' : `${currentToggles.job_postings} max`}
                      </p>
                    </div>
                  </div>

                  {/* Warning for Free plan with contact info */}
                  {formData.subscription_plan === 'free' && (formData.phone || formData.email) && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <p className="text-sm text-amber-600 font-medium">
                        ⚠️ Contact details provided but won't be visible on Free plan
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upgrade to Premium or Elite to display phone and email publicly.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab - NEW */}
          <TabsContent value="billing" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Billing & Payment Status
                </CardTitle>
                <CardDescription>
                  Manually set payment status and link to Stripe records
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Status */}
                <div className="space-y-2">
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select
                    value={formData.payment_status}
                    onValueChange={(v) => setFormData({ ...formData, payment_status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Payment Required</SelectItem>
                      <SelectItem value="pending">Pending Payment</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="active">Active Subscription</SelectItem>
                      <SelectItem value="held">Payment Held</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="failed">Payment Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Set to "Paid" or "Active" for manually added businesses with confirmed payment
                  </p>
                </div>

                <Separator />

                {/* Stripe Integration */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Stripe Integration (Optional)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Link this business to existing Stripe records for recurring billing
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stripe_customer_id">Stripe Customer ID</Label>
                      <Input
                        id="stripe_customer_id"
                        value={formData.stripe_customer_id}
                        onChange={(e) => setFormData({ ...formData, stripe_customer_id: e.target.value })}
                        placeholder="cus_xxxxxxxxxxxxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stripe_subscription_id">Stripe Subscription ID</Label>
                      <Input
                        id="stripe_subscription_id"
                        value={formData.stripe_subscription_id}
                        onChange={(e) => setFormData({ ...formData, stripe_subscription_id: e.target.value })}
                        placeholder="sub_xxxxxxxxxxxxx"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Quick Actions */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Manual Payment Confirmation
                  </h4>
                  <p className="text-sm text-green-600 mb-3">
                    For manually added businesses, set status to "Paid" or "Active Subscription" to activate all plan features immediately.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, payment_status: 'paid' })}
                      className={formData.payment_status === 'paid' ? 'border-green-500 bg-green-50' : ''}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark as Paid
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, payment_status: 'active' })}
                      className={formData.payment_status === 'active' ? 'border-green-500 bg-green-50' : ''}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Mark as Active Subscription
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Listing Status & Visibility</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Listing Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending">Pending Review</SelectItem>
                        <SelectItem value="active">Active (Live)</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <Label htmlFor="map_visible">Show on Map</Label>
                      <p className="text-xs text-muted-foreground">Display on interactive map</p>
                    </div>
                    <Switch
                      id="map_visible"
                      checked={formData.map_visible}
                      onCheckedChange={(v) => setFormData({ ...formData, map_visible: v })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <Label htmlFor="is_verified" className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-500" />
                        Verified Professional
                      </Label>
                      <p className="text-xs text-muted-foreground">Show verified badge (Premium/Elite only)</p>
                    </div>
                    <Switch
                      id="is_verified"
                      checked={formData.is_verified}
                      onCheckedChange={(v) => setFormData({ ...formData, is_verified: v })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <Label htmlFor="is_featured" className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        Featured Listing
                      </Label>
                      <p className="text-xs text-muted-foreground">Highlight in featured sections</p>
                    </div>
                    <Switch
                      id="is_featured"
                      checked={formData.is_featured}
                      onCheckedChange={(v) => setFormData({ ...formData, is_featured: v })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Admin Notes
                </CardTitle>
                <CardDescription>Internal notes visible only to admins</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.admin_notes}
                  onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                  placeholder="Add internal notes about this business, payment history, special arrangements..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editingBusiness ? 'Save Changes' : 'Create Business'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
