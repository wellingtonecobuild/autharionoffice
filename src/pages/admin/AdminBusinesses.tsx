import { useEffect, useState, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ManualBusinessForm } from '@/components/admin/ManualBusinessForm';
import {
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Star,
  StarOff,
  Ban,
  RotateCcw,
  Loader2,
  Plus,
  MapPin,
  Crown,
  Sparkles,
  FileText,
  Mail,
  MailX,
  Trash2,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type BusinessCategory = Database['public']['Enums']['business_category'];
type SubscriptionPlan = Database['public']['Enums']['subscription_plan'];

interface Business {
  id: string;
  name: string;
  description: string | null;
  full_description: string | null;
  category: BusinessCategory;
  sub_categories: string[] | null;
  city: string;
  address: string;
  status: string;
  subscription_plan: SubscriptionPlan;
  is_verified: boolean;
  is_featured: boolean;
  created_at: string;
  owner_id: string;
  latitude: number | null;
  longitude: number | null;
  map_visible: boolean;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  images: string[] | null;
  certifications: string[] | null;
  materials: string[] | null;
  social_links: any;
  admin_notes: string | null;
  suspended_at: string | null;
  rejection_reason: string | null;
  payment_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

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

export default function AdminBusinesses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [planFilter, setPlanFilter] = useState('all');
  
  // Dialog states
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Suspend dialog
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendNextSteps, setSuspendNextSteps] = useState('');
  const [sendSuspendEmail, setSendSuspendEmail] = useState(true);
  
  // Unsuspend dialog  
  const [unsuspendDialogOpen, setUnsuspendDialogOpen] = useState(false);
  const [sendUnsuspendEmail, setSendUnsuspendEmail] = useState(true);
  
  // Resubmission dialog
  const [resubmitDialogOpen, setResubmitDialogOpen] = useState(false);
  const [resubmitNotes, setResubmitNotes] = useState('');
  
  // Admin notes dialog
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  
  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Add/Edit dialog - now using ManualBusinessForm component
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);

  const fetchBusinessesCallback = useCallback(() => {
    fetchBusinesses();
  }, [statusFilter, planFilter]);

  useAutoRefresh(fetchBusinessesCallback);

  useEffect(() => {
    fetchBusinesses();
  }, [statusFilter, planFilter]);

  async function fetchBusinesses() {
    setLoading(true);
    try {
      let query = supabase.from('businesses').select('*');

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (planFilter !== 'all') {
        query = query.eq('subscription_plan', planFilter as SubscriptionPlan);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setBusinesses((data || []) as Business[]);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      toast({ title: 'Error', description: 'Failed to fetch businesses', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function updateBusiness(id: string, updates: Record<string, any>) {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Business updated successfully' });
      
      // Log to audit
      await logAuditAction('business_updated', id, updates);
      
      fetchBusinesses();
    } catch (error) {
      console.error('Error updating business:', error);
      toast({ title: 'Error', description: 'Failed to update business', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  async function logAuditAction(action: string, entityId: string, metadata?: Record<string, any>) {
    try {
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        entity_type: 'business',
        entity_id: entityId,
        action,
        metadata,
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  }

  async function approveBusiness(business: Business) {
    setActionLoading(true);
    try {
      // Check if business has held payment that needs to be captured
      if (business.status === 'payment_received' || business.status === 'submitted') {
        // Use manage-held-payment function to capture payment and approve
        const { data, error } = await supabase.functions.invoke('manage-held-payment', {
          body: {
            businessId: business.id,
            action: 'approve',
          },
        });
        
        if (error) throw error;
        
        // Also auto-approve all pending verification documents for this business
        await supabase
          .from('verification_submissions')
          .update({ 
            status: 'approved',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.id 
          })
          .eq('business_id', business.id)
          .eq('status', 'pending');
        
        toast({ title: 'Success', description: 'Business approved, payment captured, and documents approved' });
        await logAuditAction('business_approved_with_payment', business.id, { 
          previousStatus: business.status,
          documentsAutoApproved: true
        });
        fetchBusinesses();
        return;
      }
      
      // Standard approval for non-payment businesses
      await updateBusiness(business.id, {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      });
      
      // Also auto-approve all pending verification documents for this business
      await supabase
        .from('verification_submissions')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id 
        })
        .eq('business_id', business.id)
        .eq('status', 'pending');
      
      // Send approval notification email
      if (business.email) {
        try {
          await supabase.functions.invoke('notify-business-status', {
            body: {
              businessName: business.name,
              ownerEmail: business.email,
              ownerId: business.owner_id,
              businessId: business.id,
              status: 'approved',
            },
          });
          console.log('Approval notification sent to:', business.email);
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
        }
      }
    } catch (error) {
      console.error('Error approving business:', error);
      toast({ title: 'Error', description: 'Failed to approve business', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  async function requestResubmission() {
    if (!selectedBusiness) return;
    
    setActionLoading(true);
    try {
      // Use manage-held-payment function for businesses with held payments
      if (selectedBusiness.status === 'payment_received' || selectedBusiness.status === 'submitted') {
        const { data, error } = await supabase.functions.invoke('manage-held-payment', {
          body: {
            businessId: selectedBusiness.id,
            action: 'resubmit',
            notes: resubmitNotes,
          },
        });
        
        if (error) throw error;
        
        toast({ title: 'Success', description: 'Resubmission requested, payment remains held' });
        await logAuditAction('resubmission_requested', selectedBusiness.id, { 
          notes: resubmitNotes 
        });
      } else {
        // Standard resubmission for other statuses
        await updateBusiness(selectedBusiness.id, {
          status: 'pending_verification',
          resubmission_requested_at: new Date().toISOString(),
          resubmission_notes: resubmitNotes,
        });
        
        // Send resubmission notification email
        if (selectedBusiness.email) {
          try {
            await supabase.functions.invoke('notify-business-status', {
              body: {
                businessName: selectedBusiness.name,
                ownerEmail: selectedBusiness.email,
                ownerId: selectedBusiness.owner_id,
                businessId: selectedBusiness.id,
                status: 'resubmission_required',
                notes: resubmitNotes,
              },
            });
            console.log('Resubmission notification sent to:', selectedBusiness.email);
          } catch (emailError) {
            console.error('Failed to send resubmission email:', emailError);
          }
        }
      }
      
      fetchBusinesses();
      setResubmitDialogOpen(false);
      setResubmitNotes('');
      setSelectedBusiness(null);
    } catch (error) {
      console.error('Error requesting resubmission:', error);
      toast({ title: 'Error', description: 'Failed to request resubmission', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectBusiness() {
    if (!selectedBusiness) return;
    await updateBusiness(selectedBusiness.id, {
      status: 'rejected',
      rejection_reason: rejectReason,
    });
    
    // Send rejection notification email
    if (selectedBusiness.email) {
      try {
        await supabase.functions.invoke('notify-business-status', {
          body: {
            businessName: selectedBusiness.name,
            ownerEmail: selectedBusiness.email,
            ownerId: selectedBusiness.owner_id,
            businessId: selectedBusiness.id,
            status: 'rejected',
            rejectionReason: rejectReason,
          },
        });
        console.log('Rejection notification sent to:', selectedBusiness.email);
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
        // Don't fail the rejection if email fails
      }
    }
    
    setRejectDialogOpen(false);
    setRejectReason('');
    setSelectedBusiness(null);
  }

  async function suspendBusiness() {
    if (!selectedBusiness) return;
    
    setActionLoading(true);
    try {
      await updateBusiness(selectedBusiness.id, {
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        admin_notes: suspendReason ? `Suspended: ${suspendReason}` : selectedBusiness.admin_notes,
      });
      
      // Send suspension notification email
      if (sendSuspendEmail && selectedBusiness.email) {
        try {
          await supabase.functions.invoke('notify-business-status', {
            body: {
              businessName: selectedBusiness.name,
              ownerEmail: selectedBusiness.email,
              ownerId: selectedBusiness.owner_id,
              businessId: selectedBusiness.id,
              status: 'suspended',
              reason: suspendReason,
              nextSteps: suspendNextSteps,
            },
          });
          console.log('Suspension notification sent to:', selectedBusiness.email);
          toast({ title: 'Email Sent', description: 'Suspension notification sent to business owner' });
        } catch (emailError) {
          console.error('Failed to send suspension email:', emailError);
          toast({ title: 'Warning', description: 'Business suspended but email notification failed', variant: 'destructive' });
        }
      }
      
      setSuspendDialogOpen(false);
      setSuspendReason('');
      setSuspendNextSteps('');
      setSelectedBusiness(null);
    } catch (error) {
      console.error('Error suspending business:', error);
    } finally {
      setActionLoading(false);
    }
  }

  async function unsuspendBusiness() {
    if (!selectedBusiness) return;
    
    setActionLoading(true);
    try {
      await updateBusiness(selectedBusiness.id, {
        status: 'active',
        suspended_at: null,
      });
      
      // Send unsuspension notification email
      if (sendUnsuspendEmail && selectedBusiness.email) {
        try {
          await supabase.functions.invoke('notify-business-status', {
            body: {
              businessName: selectedBusiness.name,
              ownerEmail: selectedBusiness.email,
              ownerId: selectedBusiness.owner_id,
              businessId: selectedBusiness.id,
              status: 'unsuspended',
            },
          });
          console.log('Unsuspension notification sent to:', selectedBusiness.email);
          toast({ title: 'Email Sent', description: 'Restoration notification sent to business owner' });
        } catch (emailError) {
          console.error('Failed to send unsuspension email:', emailError);
          toast({ title: 'Warning', description: 'Business restored but email notification failed', variant: 'destructive' });
        }
      }
      
      setUnsuspendDialogOpen(false);
      setSelectedBusiness(null);
    } catch (error) {
      console.error('Error unsuspending business:', error);
    } finally {
      setActionLoading(false);
    }
  }

  async function saveAdminNotes() {
    if (!selectedBusiness) return;
    
    setActionLoading(true);
    try {
      await updateBusiness(selectedBusiness.id, {
        admin_notes: adminNotes.trim() || null,
      });
      
      setNotesDialogOpen(false);
      setAdminNotes('');
      setSelectedBusiness(null);
    } catch (error) {
      console.error('Error saving admin notes:', error);
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteBusiness() {
    if (!selectedBusiness) return;
    
    setActionLoading(true);
    try {
      // Delete related data first (order matters for foreign key constraints)
      const deleteOperations = [
        supabase.from('leads').delete().eq('business_id', selectedBusiness.id),
        supabase.from('reviews').delete().eq('business_id', selectedBusiness.id),
        supabase.from('jobs').delete().eq('business_id', selectedBusiness.id),
        supabase.from('saved_businesses').delete().eq('business_id', selectedBusiness.id),
        supabase.from('verification_submissions').delete().eq('business_id', selectedBusiness.id),
        supabase.from('dunning_records').delete().eq('business_id', selectedBusiness.id),
        supabase.from('partner_referrals').delete().eq('converted_business_id', selectedBusiness.id),
        supabase.from('revenue_transactions').delete().eq('business_id', selectedBusiness.id),
      ];
      
      // Execute all delete operations
      const results = await Promise.all(deleteOperations);
      
      // Check for errors in related deletions
      for (const result of results) {
        if (result.error) {
          console.error('Error deleting related data:', result.error);
        }
      }
      
      // Delete from businesses_public first (if exists)
      await supabase.from('businesses_public').delete().eq('id', selectedBusiness.id);
      
      // Delete the business
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', selectedBusiness.id);

      if (error) throw error;
      
      toast({ title: 'Success', description: 'Business permanently deleted' });
      await logAuditAction('business_deleted', selectedBusiness.id, { 
        name: selectedBusiness.name,
        status: selectedBusiness.status 
      });
      
      setDeleteDialogOpen(false);
      setSelectedBusiness(null);
      fetchBusinesses();
    } catch (error: any) {
      console.error('Error deleting business:', error);
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to delete business', 
        variant: 'destructive' 
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleFeatured(business: Business) {
    await updateBusiness(business.id, { is_featured: !business.is_featured });
  }

  function openAddDialog() {
    setEditingBusiness(null);
    setEditDialogOpen(true);
  }

  function openEditDialog(business: Business) {
    setEditingBusiness(business);
    setEditDialogOpen(true);
  }

  // Business form handling now delegated to ManualBusinessForm component

  const filteredBusinesses = businesses.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.city.toLowerCase().includes(search.toLowerCase())
  );

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
    <AdminLayout title="Business Listings">
      <div className="space-y-6">
        {/* Header with Add Button */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-muted-foreground">Manage all business listings</p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Business
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search businesses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(v) => {
                setStatusFilter(v);
                setSearchParams(v === 'all' ? {} : { status: v });
              }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="payment_received">Payment Received</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="pending_verification">Pending Verification</SelectItem>
                  <SelectItem value="resubmission_required">Resubmission Required</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="elite">Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Businesses Table */}
        <Card>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Coordinates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead className="text-right sticky right-0 z-20 bg-background">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredBusinesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No businesses found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBusinesses.map((business) => (
                    <TableRow key={business.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {business.images?.[0] && (
                            <img
                              src={business.images[0]}
                              alt={`${business.name} thumbnail`}
                              loading="lazy"
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium">{business.name}</div>
                            <div className="text-sm text-muted-foreground capitalize">{business.category.replace(/-/g, ' ')}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{business.city}</TableCell>
                      <TableCell>
                        {business.latitude && business.longitude ? (
                          <div className="flex items-center gap-1 text-sm text-green-600">
                            <MapPin className="h-3 w-3" />
                            <span>{business.latitude.toFixed(4)}, {business.longitude.toFixed(4)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          business.status === 'active' || business.status === 'approved' ? 'default' :
                          business.status === 'pending' || business.status === 'pending_verification' ? 'secondary' :
                          business.status === 'payment_received' ? 'default' :
                          business.status === 'submitted' ? 'secondary' :
                          business.status === 'resubmission_required' ? 'secondary' :
                          business.status === 'suspended' ? 'destructive' : 'outline'
                        } className={
                          business.status === 'payment_received' ? 'bg-green-600 text-white' :
                          business.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                          business.status === 'resubmission_required' ? 'bg-orange-100 text-orange-800' : ''
                        }>
                          {business.status === 'payment_received' ? 'Payment Received' :
                           business.status === 'pending_verification' ? 'Pending Verification' :
                           business.status === 'resubmission_required' ? 'Resubmission Required' :
                           business.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getPlanBadge(business.subscription_plan)}
                      </TableCell>
                      <TableCell>
                        {(business.subscription_plan === 'premium' || business.subscription_plan === 'elite') ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        {business.is_featured ? (
                          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <StarOff className="h-5 w-5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-right sticky right-0 z-10 bg-background">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(business)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {(business.status === 'pending' || business.status === 'payment_received' || business.status === 'pending_verification' || business.status === 'submitted') && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => approveBusiness(business)}
                                disabled={actionLoading}
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedBusiness(business);
                                  setRejectDialogOpen(true);
                                }}
                                disabled={actionLoading}
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedBusiness(business);
                                  setResubmitNotes('');
                                  setResubmitDialogOpen(true);
                                }}
                                disabled={actionLoading}
                                title="Request Resubmission"
                              >
                                <RotateCcw className="h-4 w-4 text-orange-500" />
                              </Button>
                            </>
                          )}
                          {business.status === 'active' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedBusiness(business);
                                setSuspendReason('');
                                setSuspendNextSteps('');
                                setSendSuspendEmail(true);
                                setSuspendDialogOpen(true);
                              }}
                              disabled={actionLoading}
                              title="Suspend"
                            >
                              <Ban className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                          {business.status === 'suspended' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedBusiness(business);
                                setSendUnsuspendEmail(true);
                                setUnsuspendDialogOpen(true);
                              }}
                              disabled={actionLoading}
                              title="Unsuspend"
                            >
                              <RotateCcw className="h-4 w-4 text-green-500" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleFeatured(business)}
                            disabled={actionLoading}
                          >
                            {business.is_featured ? (
                              <StarOff className="h-4 w-4" />
                            ) : (
                              <Star className="h-4 w-4" />
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => {
                              setSelectedBusiness(business);
                              setAdminNotes(business.admin_notes || '');
                              setNotesDialogOpen(true);
                            }}
                            title="Admin Notes"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <a href={`/business/${business.id}`} target="_blank">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedBusiness(business);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={actionLoading}
                            title="Delete Business Permanently"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Listing</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{selectedBusiness?.name}". This will be sent to the business owner.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={rejectBusiness}
              disabled={!rejectReason.trim() || actionLoading}
            >
              Reject Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Resubmission Dialog */}
      <Dialog open={resubmitDialogOpen} onOpenChange={setResubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Resubmission</DialogTitle>
            <DialogDescription>
              Request additional information or documents from "{selectedBusiness?.name}". 
              {selectedBusiness?.status === 'payment_received' && ' The payment will remain held until approved.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="What needs to be corrected or resubmitted..."
            value={resubmitNotes}
            onChange={(e) => setResubmitNotes(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={requestResubmission}
              disabled={!resubmitNotes.trim() || actionLoading}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Request Resubmission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Business Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Permanently Delete Business</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete "{selectedBusiness?.name}" and all associated data including leads, reviews, and job listings.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm">
            <p className="font-medium text-destructive mb-2">Warning:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>All leads associated with this business will be deleted</li>
              <li>All reviews will be permanently removed</li>
              <li>All job listings will be deleted</li>
              <li>This action is irreversible</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteBusiness}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Business Dialog - Using ManualBusinessForm component */}
      {user && (
        <ManualBusinessForm
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          editingBusiness={editingBusiness}
          userId={user.id}
          onSaved={fetchBusinesses}
        />
      )}

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Ban className="h-5 w-5" />
              Suspend Business
            </DialogTitle>
            <DialogDescription>
              Suspending "{selectedBusiness?.name}" will immediately remove it from public view. All data will be preserved.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">Reason for Suspension *</Label>
              <Textarea
                id="suspend-reason"
                placeholder="Enter the reason for suspending this business..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="suspend-next-steps">Next Steps (optional)</Label>
              <Textarea
                id="suspend-next-steps"
                placeholder="Instructions for the business owner to resolve this..."
                value={suspendNextSteps}
                onChange={(e) => setSuspendNextSteps(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                {sendSuspendEmail ? <Mail className="h-4 w-4 text-blue-500" /> : <MailX className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium">Email Notification</p>
                  <p className="text-xs text-muted-foreground">Send suspension email to business owner</p>
                </div>
              </div>
              <Switch
                checked={sendSuspendEmail}
                onCheckedChange={setSendSuspendEmail}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={suspendBusiness}
              disabled={!suspendReason.trim() || actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Suspend Business
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsuspend Dialog */}
      <Dialog open={unsuspendDialogOpen} onOpenChange={setUnsuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <RotateCcw className="h-5 w-5" />
              Restore Business
            </DialogTitle>
            <DialogDescription>
              Restoring "{selectedBusiness?.name}" will make it visible to the public again. The subscription status remains unchanged.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <h4 className="font-medium text-green-700 mb-2">What will happen:</h4>
              <ul className="text-sm text-green-600 space-y-1">
                <li>• Listing will be visible to customers</li>
                <li>• All business data preserved</li>
                <li>• Subscription status unchanged</li>
              </ul>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                {sendUnsuspendEmail ? <Mail className="h-4 w-4 text-blue-500" /> : <MailX className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium">Email Notification</p>
                  <p className="text-xs text-muted-foreground">Send restoration email to business owner</p>
                </div>
              </div>
              <Switch
                checked={sendUnsuspendEmail}
                onCheckedChange={setSendUnsuspendEmail}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUnsuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={unsuspendBusiness}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Restore Business
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Admin Notes
            </DialogTitle>
            <DialogDescription>
              Internal notes for "{selectedBusiness?.name}". These notes are only visible to admins.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder="Add internal notes about this business..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={5}
            />
            
            {selectedBusiness?.suspended_at && (
              <div className="p-3 bg-orange-500/10 rounded-lg text-sm">
                <p className="font-medium text-orange-700">Suspended on:</p>
                <p className="text-orange-600">{new Date(selectedBusiness.suspended_at).toLocaleString()}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAdminNotes} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
