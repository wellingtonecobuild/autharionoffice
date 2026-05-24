import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DocumentActions } from '@/components/admin/DocumentActions';
import { supabase } from '@/integrations/supabase/client';
import { normalizeWebsiteUrl, displayWebsiteUrl, validateUrlAccessibility } from '@/lib/validation';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Star,
  FileText,
  Download,
  Eye,
  ExternalLink,
  CheckCircle,
  XCircle,
  Sparkles,
  Crown,
  Trash2,
  Save,
  Edit,
  Image as ImageIcon,
  Award,
  Loader2,
} from 'lucide-react';

interface VerificationSubmission {
  id: string;
  document_name: string;
  document_type: string;
  document_description: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  status: string;
  created_at: string;
}

interface BusinessDetailDialogProps {
  business: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  adminUserId?: string;
}

export function BusinessDetailDialog({
  business,
  open,
  onOpenChange,
  onUpdate,
  adminUserId,
}: BusinessDetailDialogProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editedBusiness, setEditedBusiness] = useState(business);
  const [verificationDocs, setVerificationDocs] = useState<VerificationSubmission[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const legacyVerificationDocs = Array.isArray(business?.verification_documents)
    ? (business.verification_documents as any[])
    : [];

  // Fetch verification documents when business changes
  useEffect(() => {
    if (business?.id && open) {
      fetchVerificationDocs();
    }
  }, [business?.id, open]);

  const fetchVerificationDocs = async () => {
    if (!business?.id) return;
    setDocsLoading(true);
    try {
      const { data, error } = await supabase
        .from('verification_submissions')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVerificationDocs(data || []);
    } catch (error) {
      console.error('Error fetching verification documents:', error);
    } finally {
      setDocsLoading(false);
    }
  };

  if (!business) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      // Validate website URL if provided
      if (editedBusiness.website && editedBusiness.website.trim()) {
        const urlValidation = await validateUrlAccessibility(editedBusiness.website);
        if (!urlValidation.valid) {
          toast({ 
            title: 'Invalid Website', 
            description: urlValidation.error || 'Website is not accessible', 
            variant: 'destructive' 
          });
          setLoading(false);
          return;
        }
      }

      // Log certification label changes to audit log
      const certificationChanged = editedBusiness.certification_label !== business.certification_label;
      
      const { error } = await supabase
        .from('businesses')
        .update({
          name: editedBusiness.name,
          description: editedBusiness.description,
          full_description: editedBusiness.full_description,
          category: editedBusiness.category,
          address: editedBusiness.address,
          city: editedBusiness.city,
          email: editedBusiness.email,
          phone: editedBusiness.phone,
          website: normalizeWebsiteUrl(editedBusiness.website),
          hours: editedBusiness.hours,
          subscription_plan: editedBusiness.subscription_plan,
          is_featured: editedBusiness.is_featured,
          is_verified: editedBusiness.is_verified,
          status: editedBusiness.status,
          admin_notes: editedBusiness.admin_notes,
          certification_label: editedBusiness.certification_label || null,
        })
        .eq('id', business.id);
      
      // Log certification label change to audit log
      if (!error && certificationChanged && adminUserId) {
        await supabase.from('audit_logs').insert({
          admin_id: adminUserId,
          action: editedBusiness.certification_label ? 'certification_label_updated' : 'certification_label_removed',
          entity_type: 'business',
          entity_id: business.id,
          old_data: { certification_label: business.certification_label },
          new_data: { certification_label: editedBusiness.certification_label },
          metadata: { business_name: business.name }
        });
      }

      if (error) throw error;
      toast({ title: 'Success', description: 'Business updated successfully' });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating business:', error);
      toast({ title: 'Error', description: 'Failed to update business', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('businesses').delete().eq('id', business.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Business deleted successfully' });
      onOpenChange(false);
      onUpdate();
    } catch (error) {
      console.error('Error deleting business:', error);
      toast({ title: 'Error', description: 'Failed to delete business', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          status: 'active',
          verification_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: adminUserId,
          rejection_reason: null,
        })
        .eq('id', business.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Business approved and now live' });
      onUpdate();
    } catch (error) {
      console.error('Error approving business:', error);
      toast({ title: 'Error', description: 'Failed to approve business', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', business.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Business rejected' });
      onUpdate();
    } catch (error) {
      console.error('Error rejecting business:', error);
      toast({ title: 'Error', description: 'Failed to reject business', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeatured = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ is_featured: !business.is_featured })
        .eq('id', business.id);

      if (error) throw error;
      toast({ 
        title: 'Success', 
        description: business.is_featured ? 'Removed from featured' : 'Marked as featured' 
      });
      onUpdate();
    } catch (error) {
      console.error('Error toggling featured:', error);
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerified = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ 
          is_verified: !business.is_verified,
          verification_status: !business.is_verified ? 'approved' : 'none',
          verification_processed_at: new Date().toISOString(),
          verification_processed_by: adminUserId,
        })
        .eq('id', business.id);

      if (error) throw error;
      toast({ 
        title: 'Success', 
        description: business.is_verified ? 'Verification removed' : 'Business verified' 
      });
      onUpdate();
    } catch (error) {
      console.error('Error toggling verified:', error);
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async (plan: 'free' | 'premium' | 'elite') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ subscription_plan: plan })
        .eq('id', business.id);

      if (error) throw error;
      toast({ title: 'Success', description: `Plan changed to ${plan}` });
      onUpdate();
    } catch (error) {
      console.error('Error changing plan:', error);
      toast({ title: 'Error', description: 'Failed to change plan', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>;
      case 'approved':
      case 'active':
        return <Badge className="bg-green-600">Active</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'elite':
        return <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white"><Crown className="h-3 w-3 mr-1" />Elite</Badge>;
      case 'premium':
        return <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white"><Sparkles className="h-3 w-3 mr-1" />Premium</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Building2 className="h-5 w-5" />
            {business.name}
            {getStatusBadge(business.status)}
            {getPlanBadge(business.subscription_plan)}
            {(business.subscription_plan === 'premium' || business.subscription_plan === 'elite') && (
              <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Verified Professional</Badge>
            )}
            {business.is_featured && (
              <Badge className="bg-amber-500"><Star className="h-3 w-3 mr-1" />Featured</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 p-2">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Business Name</Label>
                      <Input
                        value={editedBusiness.name}
                        onChange={(e) => setEditedBusiness({ ...editedBusiness, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={editedBusiness.category}
                        onValueChange={(value) => setEditedBusiness({ ...editedBusiness, category: value })}
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
                  <div>
                    <Label>Short Description</Label>
                    <Textarea
                      value={editedBusiness.description || ''}
                      onChange={(e) => setEditedBusiness({ ...editedBusiness, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Full Description</Label>
                    <Textarea
                      value={editedBusiness.full_description || ''}
                      onChange={(e) => setEditedBusiness({ ...editedBusiness, full_description: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Address</Label>
                      <Input
                        value={editedBusiness.address || ''}
                        onChange={(e) => setEditedBusiness({ ...editedBusiness, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input
                        value={editedBusiness.city || ''}
                        onChange={(e) => setEditedBusiness({ ...editedBusiness, city: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={editedBusiness.email || ''}
                        onChange={(e) => setEditedBusiness({ ...editedBusiness, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={editedBusiness.phone || ''}
                        onChange={(e) => setEditedBusiness({ ...editedBusiness, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Website</Label>
                      <Input
                        value={editedBusiness.website || ''}
                        onChange={(e) => setEditedBusiness({ ...editedBusiness, website: e.target.value })}
                        placeholder="e.g. wellingtonecobuild.nz"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Enter with or without https://</p>
                    </div>
                  </div>
                  <div>
                    <Label>Business Hours</Label>
                    <Input
                      value={editedBusiness.hours || ''}
                      onChange={(e) => setEditedBusiness({ ...editedBusiness, hours: e.target.value })}
                    />
                  </div>
                  <Separator className="my-4" />
                  <div>
                    <Label className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-teal-600" />
                      Certification Label (Admin Only)
                    </Label>
                    <Input
                      value={editedBusiness.certification_label || ''}
                      onChange={(e) => setEditedBusiness({ ...editedBusiness, certification_label: e.target.value })}
                      placeholder="e.g. Certified by BCITO"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This label will appear on the listing. Only admins can edit this.
                    </p>
                  </div>
                  <div>
                    <Label>Admin Notes</Label>
                    <Textarea
                      value={editedBusiness.admin_notes || ''}
                      onChange={(e) => setEditedBusiness({ ...editedBusiness, admin_notes: e.target.value })}
                      placeholder="Internal notes about this business..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setIsEditing(false);
                      setEditedBusiness(business);
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                        <p className="capitalize">{business.category?.replace(/-/g, ' ')}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-4 w-4" /> Location
                        </h4>
                        <p>{business.address}</p>
                        <p>{business.city}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Mail className="h-4 w-4" /> Email
                        </h4>
                        <p>{business.email || 'Not provided'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Phone className="h-4 w-4" /> Phone
                        </h4>
                        <p>{business.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Globe className="h-4 w-4" /> Website
                        </h4>
                        {business.website && normalizeWebsiteUrl(business.website) ? (
                          <a href={normalizeWebsiteUrl(business.website)!} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            {displayWebsiteUrl(business.website)} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p>Not provided</p>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Clock className="h-4 w-4" /> Business Hours
                        </h4>
                        <p>{business.hours || 'Not specified'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Star className="h-4 w-4" /> Rating
                        </h4>
                        <p>{business.rating ? `${business.rating}/5 (${business.review_count} reviews)` : 'No reviews yet'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Created</h4>
                        <p>{format(new Date(business.created_at), 'MMM d, yyyy h:mm a')}</p>
                      </div>
                    </div>
                  </div>

                  {business.certification_label && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Award className="h-4 w-4 text-teal-600" /> Certification Label
                        </h4>
                        <Badge className="bg-teal-600/90 text-white">
                          <Award className="h-3 w-3 mr-1" />
                          {business.certification_label}
                        </Badge>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                    <p className="text-sm">{business.description || 'No description provided'}</p>
                  </div>

                  {business.full_description && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Full Description</h4>
                      <p className="text-sm whitespace-pre-wrap">{business.full_description}</p>
                    </div>
                  )}

                  {business.certifications && business.certifications.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Award className="h-4 w-4" /> Certifications
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {business.certifications.map((cert: string, i: number) => (
                          <Badge key={i} variant="outline">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {business.materials && business.materials.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Sustainable Materials</h4>
                      <div className="flex flex-wrap gap-2">
                        {business.materials.map((material: string, i: number) => (
                          <Badge key={i} variant="secondary">{material}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {business.sub_categories && business.sub_categories.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Sub-Categories</h4>
                      <div className="flex flex-wrap gap-2">
                        {business.sub_categories.map((sub: string, i: number) => (
                          <Badge key={i} variant="outline">{sub}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {business.rejection_reason && (
                    <div className="p-3 bg-destructive/10 rounded-lg">
                      <h4 className="text-sm font-medium text-destructive mb-1">Rejection Reason</h4>
                      <p className="text-sm">{business.rejection_reason}</p>
                    </div>
                  )}

                  {business.admin_notes && (
                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="text-sm font-medium mb-1">Admin Notes</h4>
                      <p className="text-sm">{business.admin_notes}</p>
                    </div>
                  )}

                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" /> Edit Details
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 p-2">
              <h4 className="font-medium">Verification Documents</h4>
              {docsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : verificationDocs.length > 0 ? (
                <div className="grid gap-3">
                  {verificationDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{doc.document_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.document_type}
                            {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(0)} KB`}
                          </p>
                          {doc.document_description && (
                            <p className="text-xs text-muted-foreground mt-1">{doc.document_description}</p>
                          )}
                          <Badge
                            variant={
                              doc.status === "approved"
                                ? "default"
                                : doc.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="mt-1"
                          >
                            {doc.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <DocumentActions fileUrl={doc.file_url} fileName={doc.file_name} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : legacyVerificationDocs.length > 0 ? (
                <div className="grid gap-3">
                  {legacyVerificationDocs.map((doc: any, idx: number) => {
                    const fileName = (doc?.name as string) || `Document ${idx + 1}`;
                    const fileUrl = (doc?.url as string) || "";
                    const fileType = (doc?.type as string) || "document";
                    const fileSize = typeof doc?.size === "number" ? doc.size : null;

                    return (
                      <div key={`${business.id}-legacy-${idx}`} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-medium">{fileName}</p>
                            <p className="text-sm text-muted-foreground">
                              {fileType}
                              {fileSize && ` • ${(fileSize / 1024).toFixed(0)} KB`}
                            </p>
                            <Badge variant="secondary" className="mt-1">Pending</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <DocumentActions fileUrl={fileUrl} fileName={fileName} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No verification documents uploaded</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="images" className="space-y-6 p-2">
              {/* Logo Section */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Business Logo
                </h4>
                {(() => {
                  const socialLinks = business.social_links && typeof business.social_links === 'object' 
                    ? business.social_links as Record<string, string> 
                    : {};
                  const logoUrl = socialLinks.logo;
                  
                  if (logoUrl) {
                    return (
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-lg border bg-background flex items-center justify-center overflow-hidden">
                          <img
                            src={logoUrl}
                            alt="Business logo"
                            className="max-w-full max-h-full object-contain p-2"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder.svg';
                            }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" asChild>
                            <a href={logoUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 mr-1" /> View
                            </a>
                          </Button>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg inline-flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 opacity-50" />
                      Logo not provided
                    </div>
                  );
                })()}
              </div>

              <Separator />

              {/* Featured Images Section */}
              <div>
                <h4 className="font-medium mb-3">Featured Images</h4>
                {business.images && business.images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {business.images.map((img: string, i: number) => (
                      <div key={i} className="relative group">
                        <img
                          src={img}
                          alt={`Business image ${i + 1}`}
                          className="w-full aspect-video object-cover rounded-lg border"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <Button size="sm" variant="secondary" asChild>
                            <a href={img} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button size="sm" variant="secondary" asChild>
                            <a href={img} download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No images uploaded</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4 p-2">
              <div className="grid grid-cols-2 gap-4">
                {/* Status Actions */}
                <div className="space-y-3">
                  <h4 className="font-medium">Listing Status</h4>
                  <div className="flex flex-col gap-2">
                    {business.status !== 'approved' && business.status !== 'active' && (
                      <Button onClick={handleApprove} disabled={loading} className="justify-start">
                        <CheckCircle className="h-4 w-4 mr-2" /> Approve & Make Live
                      </Button>
                    )}
                    {business.status !== 'rejected' && (
                      <Button variant="destructive" onClick={handleReject} disabled={loading} className="justify-start">
                        <XCircle className="h-4 w-4 mr-2" /> Reject Listing
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleToggleVerified} disabled={loading} className="justify-start">
                      {business.is_verified ? (
                        <><XCircle className="h-4 w-4 mr-2" /> Remove Verification</>
                      ) : (
                        <><CheckCircle className="h-4 w-4 mr-2" /> Mark as Verified</>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Feature Actions */}
                <div className="space-y-3">
                  <h4 className="font-medium">Promotion</h4>
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant={business.is_featured ? "secondary" : "outline"} 
                      onClick={handleToggleFeatured} 
                      disabled={loading}
                      className="justify-start"
                    >
                      <Star className={`h-4 w-4 mr-2 ${business.is_featured ? 'fill-amber-500 text-amber-500' : ''}`} />
                      {business.is_featured ? 'Remove Featured' : 'Mark as Featured'}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Plan Management */}
              <div className="space-y-3">
                <h4 className="font-medium">Subscription Plan</h4>
                <div className="flex gap-2">
                  <Button 
                    variant={business.subscription_plan === 'free' ? 'secondary' : 'outline'}
                    onClick={() => handleChangePlan('free')}
                    disabled={loading}
                  >
                    Free
                  </Button>
                  <Button 
                    variant={business.subscription_plan === 'premium' ? 'secondary' : 'outline'}
                    onClick={() => handleChangePlan('premium')}
                    disabled={loading}
                  >
                    <Sparkles className="h-4 w-4 mr-1" /> Premium
                  </Button>
                  <Button 
                    variant={business.subscription_plan === 'elite' ? 'secondary' : 'outline'}
                    onClick={() => handleChangePlan('elite')}
                    disabled={loading}
                  >
                    <Crown className="h-4 w-4 mr-1" /> Elite
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Danger Zone */}
              <div className="space-y-3">
                <h4 className="font-medium text-destructive">Danger Zone</h4>
                <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Business Permanently
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
