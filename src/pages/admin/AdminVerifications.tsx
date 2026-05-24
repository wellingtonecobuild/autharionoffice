import { useEffect, useState, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/useAdmin';
import { BusinessDetailDialog } from '@/components/admin/BusinessDetailDialog';
import { DocumentActions } from '@/components/admin/DocumentActions';
import { DocumentHistoryButton } from '@/components/admin/DocumentHistory';
import {
  CheckCircle,
  XCircle,
  FileText,
  Building2,
  Loader2,
  ExternalLink,
  Clock,
  ShieldCheck,
  ShieldX,
  Star,
  Crown,
  Sparkles,
  Search,
  MapPin,
  Mail,
  Phone,
  Eye,
  RefreshCw,
  Calendar,
  AlertTriangle,
  Ban,
  History,
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';

interface Business {
  id: string;
  name: string;
  category: string;
  city: string;
  address: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  full_description: string | null;
  hours: string | null;
  images: string[] | null;
  certifications: string[] | null;
  materials: string[] | null;
  sub_categories: string[] | null;
  verification_status: string;
  verification_documents: any[];
  verification_requested_at: string;
  verification_rejection_reason: string | null;
  is_verified: boolean;
  is_featured: boolean;
  status: string;
  subscription_plan: string;
  rating: number | null;
  review_count: number | null;
  created_at: string;
  admin_notes: string | null;
  rejection_reason: string | null;
  owner_id: string;
}

interface VerificationSubmission {
  id: string;
  user_id: string;
  business_id: string | null;
  document_name: string;
  document_type: string;
  document_description: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  expiry_date: string | null;
  is_legacy?: boolean;
  business?: {
    name: string;
    category: string;
    city: string;
  };
}

export default function AdminVerifications() {
  const { toast } = useToast();
  const { user } = useAdmin();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [submissions, setSubmissions] = useState<VerificationSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<VerificationSubmission | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectSubmissionDialogOpen, setRejectSubmissionDialogOpen] = useState(false);
  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [replacementReason, setReplacementReason] = useState('');
  const [replacementInstructions, setReplacementInstructions] = useState('');
  const [expiryDialogOpen, setExpiryDialogOpen] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [selectedBusinessForSuspend, setSelectedBusinessForSuspend] = useState<Business | null>(null);

  // Auto-refresh every 5 seconds
  useAutoRefresh(useCallback(() => fetchAllData(), []));

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    try {
      const all = await fetchAllBusinesses();
      await Promise.all([fetchPendingBusinesses(), fetchSubmissions(all)]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPendingBusinesses() {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .in('status', ['pending'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setBusinesses((data || []) as Business[]);
    } catch (error) {
      console.error('Error fetching pending businesses:', error);
    }
  }

  async function fetchAllBusinesses(): Promise<Business[]> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = (data || []) as Business[];
      setAllBusinesses(list);
      return list;
    } catch (error) {
      console.error('Error fetching all businesses:', error);
      return [];
    }
  }

  async function fetchSubmissions(businessList: Business[] = allBusinesses) {
    try {
      // 1) New document submissions (stored in verification_submissions)
      const { data, error } = await supabase
        .from('verification_submissions')
        .select(`
          *,
          business:business_id (
            name,
            category,
            city
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2) Legacy verification documents stored on businesses.verification_documents (JSON)
      // This is what the "List Business" flow currently writes.
      const legacyDocs: VerificationSubmission[] = (businessList || [])
        .filter((b) => Array.isArray((b as any).verification_documents) && (b as any).verification_documents.length > 0)
        .flatMap((b) => {
          const docs = ((b as any).verification_documents as any[]) || [];
          return docs.map((doc, idx) => {
            const docName = (doc?.name as string) || `Document ${idx + 1}`;
            const docType = (doc?.type as string) || 'document';
            const fileUrl = (doc?.url as string) || '';
            const createdAt = (b as any).verification_requested_at || (b as any).created_at;
            return {
              id: `${b.id}:${idx}`,
              user_id: (b as any).owner_id,
              business_id: b.id,
              document_name: docName,
              document_type: docType,
              document_description: null,
              file_name: docName,
              file_url: fileUrl,
              file_size: typeof doc?.size === 'number' ? doc.size : null,
              status: (b as any).verification_status || 'pending',
              admin_notes: null,
              created_at: createdAt,
              reviewed_at: null,
              is_legacy: true,
              business: {
                name: (b as any).name,
                category: (b as any).category,
                city: (b as any).city,
              },
            } as VerificationSubmission;
          });
        });

      const merged = ([...(data || []) as VerificationSubmission[], ...legacyDocs])
        .filter((s) => !!s.file_url)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setSubmissions(merged);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  }

  async function approveVerification(business: Business) {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          status: 'active',
          verification_status: 'approved',
          is_verified: true,
          verification_processed_at: new Date().toISOString(),
          verification_processed_by: user?.id,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          rejection_reason: null,
        })
        .eq('id', business.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Business approved and now live' });
      fetchAllData();
    } catch (error) {
      console.error('Error approving business:', error);
      toast({ title: 'Error', description: 'Failed to approve business', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectVerification() {
    if (!selectedBusiness) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          status: 'rejected',
          verification_status: 'rejected',
          verification_rejection_reason: rejectReason,
          rejection_reason: rejectReason,
          verification_processed_at: new Date().toISOString(),
          verification_processed_by: user?.id,
        })
        .eq('id', selectedBusiness.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Business rejected' });
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedBusiness(null);
      fetchAllData();
    } catch (error) {
      console.error('Error rejecting business:', error);
      toast({ title: 'Error', description: 'Failed to reject business', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  async function approveSubmission(submission: VerificationSubmission) {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('verification_submissions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', submission.id);

      if (error) throw error;
      
      // Log the action
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'approve_document',
        entity_type: 'verification_submission',
        entity_id: submission.id,
        metadata: { document_name: submission.document_name, business_id: submission.business_id },
      });

      // Send email notification to business owner
      if (submission.business_id) {
        const business = allBusinesses.find(b => b.id === submission.business_id);
        if (business?.email) {
          try {
            await supabase.functions.invoke('notify-document-status', {
              body: {
                businessName: business.name,
                ownerEmail: business.email,
                ownerId: business.owner_id,
                businessId: business.id,
                documentName: submission.document_name,
                status: 'approved',
              },
            });
          } catch (emailError) {
            console.warn('Failed to send email notification:', emailError);
          }
        }
      }

      toast({ title: 'Success', description: 'Document approved and owner notified' });
      fetchSubmissions(allBusinesses);
    } catch (error) {
      console.error('Error approving submission:', error);
      toast({ title: 'Error', description: 'Failed to approve document', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectSubmission() {
    if (!selectedSubmission) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('verification_submissions')
        .update({
          status: 'rejected',
          admin_notes: rejectReason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;
      
      // Log the action
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'reject_document',
        entity_type: 'verification_submission',
        entity_id: selectedSubmission.id,
        metadata: { document_name: selectedSubmission.document_name, reason: rejectReason },
      });

      // Send email notification to business owner
      if (selectedSubmission.business_id) {
        const business = allBusinesses.find(b => b.id === selectedSubmission.business_id);
        if (business?.email) {
          try {
            await supabase.functions.invoke('notify-document-status', {
              body: {
                businessName: business.name,
                ownerEmail: business.email,
                ownerId: business.owner_id,
                businessId: business.id,
                documentName: selectedSubmission.document_name,
                status: 'rejected',
                reason: rejectReason,
              },
            });
          } catch (emailError) {
            console.warn('Failed to send email notification:', emailError);
          }
        }
      }

      toast({ title: 'Success', description: 'Document rejected and owner notified' });
      setRejectSubmissionDialogOpen(false);
      setRejectReason('');
      setSelectedSubmission(null);
      fetchSubmissions(allBusinesses);
    } catch (error) {
      console.error('Error rejecting submission:', error);
      toast({ title: 'Error', description: 'Failed to reject document', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  async function requestReplacementDocument() {
    if (!selectedSubmission) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('verification_submissions')
        .update({
          status: 'replacement_requested',
          admin_notes: `Replacement requested: ${replacementReason}${replacementInstructions ? `\n\nInstructions: ${replacementInstructions}` : ''}`,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;
      
      // Log the action
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'request_document_replacement',
        entity_type: 'verification_submission',
        entity_id: selectedSubmission.id,
        metadata: { 
          document_name: selectedSubmission.document_name, 
          reason: replacementReason,
          instructions: replacementInstructions 
        },
      });

      // Send email notification to business owner
      if (selectedSubmission.business_id) {
        const business = allBusinesses.find(b => b.id === selectedSubmission.business_id);
        if (business?.email) {
          try {
            await supabase.functions.invoke('notify-document-status', {
              body: {
                businessName: business.name,
                ownerEmail: business.email,
                ownerId: business.owner_id,
                businessId: business.id,
                documentName: selectedSubmission.document_name,
                status: 'replacement_requested',
                reason: replacementReason,
                instructions: replacementInstructions,
              },
            });
          } catch (emailError) {
            console.warn('Failed to send email notification:', emailError);
          }
        }
      }

      toast({ title: 'Success', description: 'Replacement requested and owner notified' });
      setReplacementDialogOpen(false);
      setReplacementReason('');
      setReplacementInstructions('');
      setSelectedSubmission(null);
      fetchSubmissions(allBusinesses);
    } catch (error) {
      console.error('Error requesting replacement:', error);
      toast({ title: 'Error', description: 'Failed to request replacement', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  async function setDocumentExpiry() {
    if (!selectedSubmission || !expiryDate) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('verification_submissions')
        .update({
          expiry_date: expiryDate,
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;
      
      // Log the action
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'set_document_expiry',
        entity_type: 'verification_submission',
        entity_id: selectedSubmission.id,
        metadata: { 
          document_name: selectedSubmission.document_name, 
          expiry_date: expiryDate 
        },
      });

      toast({ title: 'Success', description: 'Document expiry date set' });
      setExpiryDialogOpen(false);
      setExpiryDate('');
      setSelectedSubmission(null);
      fetchSubmissions(allBusinesses);
    } catch (error) {
      console.error('Error setting expiry date:', error);
      toast({ title: 'Error', description: 'Failed to set expiry date', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  async function suspendBusiness() {
    if (!selectedBusinessForSuspend || !suspendReason.trim()) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          status: 'suspended',
          verification_suspended_at: new Date().toISOString(),
          verification_suspension_reason: suspendReason,
          is_verified: false,
        })
        .eq('id', selectedBusinessForSuspend.id);

      if (error) throw error;

      // Log the action
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'suspend_business',
        entity_type: 'business',
        entity_id: selectedBusinessForSuspend.id,
        metadata: { 
          business_name: selectedBusinessForSuspend.name, 
          reason: suspendReason 
        },
      });

      // Send notification email
      if (selectedBusinessForSuspend.email) {
        try {
          await supabase.functions.invoke('notify-business-status', {
            body: {
              businessName: selectedBusinessForSuspend.name,
              ownerEmail: selectedBusinessForSuspend.email,
              ownerId: selectedBusinessForSuspend.owner_id,
              businessId: selectedBusinessForSuspend.id,
              status: 'suspended',
              reason: suspendReason,
            },
          });
        } catch (emailError) {
          console.warn('Failed to send suspension email:', emailError);
        }
      }

      toast({ title: 'Success', description: 'Business suspended. Listing is now hidden from public view.' });
      setSuspendDialogOpen(false);
      setSuspendReason('');
      setSelectedBusinessForSuspend(null);
      fetchAllData();
    } catch (error) {
      console.error('Error suspending business:', error);
      toast({ title: 'Error', description: 'Failed to suspend business', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  async function unsuspendBusiness(business: Business) {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          status: 'active',
          verification_suspended_at: null,
          verification_suspension_reason: null,
        })
        .eq('id', business.id);

      if (error) throw error;

      // Log the action
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'unsuspend_business',
        entity_type: 'business',
        entity_id: business.id,
        metadata: { business_name: business.name },
      });

      toast({ title: 'Success', description: 'Business suspension lifted. Listing is now visible.' });
      fetchAllData();
    } catch (error) {
      console.error('Error unsuspending business:', error);
      toast({ title: 'Error', description: 'Failed to unsuspend business', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  function getExpiryStatus(expiryDate: string | null): { status: 'ok' | 'warning' | 'urgent' | 'expired'; daysLeft: number | null } {
    if (!expiryDate) return { status: 'ok', daysLeft: null };
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return { status: 'expired', daysLeft };
    if (daysLeft <= 7) return { status: 'urgent', daysLeft };
    if (daysLeft <= 30) return { status: 'warning', daysLeft };
    return { status: 'ok', daysLeft };
  }
  
  // Get expiring documents (within 30 days or expired)
  const expiringDocuments = submissions.filter(s => {
    if (!s.expiry_date || s.status !== 'approved') return false;
    const { status } = getExpiryStatus(s.expiry_date);
    return status === 'expired' || status === 'urgent' || status === 'warning';
  });

  async function deleteSubmission(submission: VerificationSubmission) {
    try {
      // For legacy documents stored on the business record
      if (submission.is_legacy && submission.business_id) {
        const [businessId, indexStr] = submission.id.split(':');
        const business = allBusinesses.find(b => b.id === businessId);
        if (business && Array.isArray(business.verification_documents)) {
          const updatedDocs = business.verification_documents.filter((_, i) => i !== parseInt(indexStr));
          const { error } = await supabase
            .from('businesses')
            .update({ verification_documents: updatedDocs })
            .eq('id', businessId);
          
          if (error) throw error;
        }
      } else {
        // Delete from verification_submissions table
        const { error } = await supabase
          .from('verification_submissions')
          .delete()
          .eq('id', submission.id);

        if (error) throw error;
      }

      // Try to delete the file from storage
      try {
        const objectPath = extractObjectPath(submission.file_url);
        if (objectPath) {
          await supabase.storage.from('verification-documents').remove([objectPath]);
        }
      } catch (storageError) {
        console.warn('Could not delete file from storage:', storageError);
      }

      // Log the action
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'delete_document',
        entity_type: 'verification_submission',
        entity_id: submission.id,
        metadata: { document_name: submission.document_name, file_url: submission.file_url },
      });

      toast({ title: 'Success', description: 'Document deleted' });
      fetchAllData();
    } catch (error) {
      console.error('Error deleting submission:', error);
      throw error;
    }
  }

  function extractObjectPath(fileUrl: string): string | null {
    const trimmed = (fileUrl || '').trim();
    if (!trimmed) return null;
    
    if (!/^https?:\/\//i.test(trimmed)) {
      return trimmed.replace(/^\/+/, '');
    }

    try {
      const decoded = decodeURIComponent(trimmed);
      const marker = '/verification-documents/';
      const idx = decoded.indexOf(marker);
      if (idx === -1) return null;
      const after = decoded.slice(idx + marker.length);
      return after.split('?')[0] || null;
    } catch {
      return null;
    }
  }

  async function approveLegacyDocument(submission: VerificationSubmission) {
    if (!submission.is_legacy || !submission.business_id) return;
    setActionLoading(true);
    try {
      const [businessId, indexStr] = submission.id.split(':');
      const business = allBusinesses.find(b => b.id === businessId);
      if (business && Array.isArray(business.verification_documents)) {
        const updatedDocs = business.verification_documents.map((doc: any, i: number) => {
          if (i === parseInt(indexStr)) {
            return { ...doc, status: 'approved', reviewed_at: new Date().toISOString() };
          }
          return doc;
        });
        
        const { error } = await supabase
          .from('businesses')
          .update({ 
            verification_documents: updatedDocs,
            verification_status: 'approved',
            is_verified: true,
            verification_processed_at: new Date().toISOString(),
            verification_processed_by: user?.id,
          })
          .eq('id', businessId);
        
        if (error) throw error;
      }

      // Log the action
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'approve_legacy_document',
        entity_type: 'business_document',
        entity_id: submission.id,
        metadata: { 
          document_name: submission.document_name, 
          business_id: submission.business_id,
          business_name: submission.business?.name 
        },
      });

      // Send notification email
      if (submission.business_id) {
        const business = allBusinesses.find(b => b.id === submission.business_id);
        if (business?.email) {
          try {
            await supabase.functions.invoke('notify-document-status', {
              body: {
                businessName: business.name,
                ownerEmail: business.email,
                ownerId: business.owner_id,
                businessId: business.id,
                documentName: submission.document_name,
                status: 'approved',
              },
            });
          } catch (emailError) {
            console.warn('Failed to send email notification:', emailError);
          }
        }
      }

      toast({ title: 'Success', description: 'Document approved and owner notified' });
      fetchAllData();
    } catch (error) {
      console.error('Error approving legacy document:', error);
      toast({ title: 'Error', description: 'Failed to approve document', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectLegacyDocument(submission: VerificationSubmission) {
    if (!submission.is_legacy || !submission.business_id) return;
    setActionLoading(true);
    try {
      const [businessId, indexStr] = submission.id.split(':');
      const business = allBusinesses.find(b => b.id === businessId);
      if (business && Array.isArray(business.verification_documents)) {
        const updatedDocs = business.verification_documents.map((doc: any, i: number) => {
          if (i === parseInt(indexStr)) {
            return { ...doc, status: 'rejected', reviewed_at: new Date().toISOString() };
          }
          return doc;
        });
        
        const { error } = await supabase
          .from('businesses')
          .update({ 
            verification_documents: updatedDocs,
            verification_status: 'rejected',
            verification_processed_at: new Date().toISOString(),
            verification_processed_by: user?.id,
          })
          .eq('id', businessId);
        
        if (error) throw error;
      }

      // Log the action
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'reject_legacy_document',
        entity_type: 'business_document',
        entity_id: submission.id,
        metadata: { 
          document_name: submission.document_name, 
          business_id: submission.business_id,
          business_name: submission.business?.name 
        },
      });

      // Send notification email
      if (submission.business_id) {
        const business = allBusinesses.find(b => b.id === submission.business_id);
        if (business?.email) {
          try {
            await supabase.functions.invoke('notify-document-status', {
              body: {
                businessName: business.name,
                ownerEmail: business.email,
                ownerId: business.owner_id,
                businessId: business.id,
                documentName: submission.document_name,
                status: 'rejected',
              },
            });
          } catch (emailError) {
            console.warn('Failed to send email notification:', emailError);
          }
        }
      }

      toast({ title: 'Success', description: 'Document rejected and owner notified' });
      fetchAllData();
    } catch (error) {
      console.error('Error rejecting legacy document:', error);
      toast({ title: 'Error', description: 'Failed to reject document', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleFeatured(business: Business) {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ is_featured: !business.is_featured })
        .eq('id', business.id);

      if (error) throw error;
      toast({ title: 'Success', description: business.is_featured ? 'Removed from featured' : 'Marked as featured' });
      fetchAllData();
    } catch (error) {
      console.error('Error toggling featured:', error);
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  const filteredBusinesses = allBusinesses.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingBusinesses = filteredBusinesses.filter(b => b.status === 'pending');
  const approvedBusinesses = filteredBusinesses.filter(b => b.status === 'approved' || b.status === 'active');
  const rejectedBusinesses = filteredBusinesses.filter(b => b.status === 'rejected');
  const suspendedBusinesses = filteredBusinesses.filter(b => b.status === 'suspended');
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'approved':
      case 'active':
        return <Badge className="gap-1 bg-green-600"><ShieldCheck className="h-3 w-3" />Active</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><ShieldX className="h-3 w-3" />Rejected</Badge>;
      case 'suspended':
        return <Badge variant="destructive" className="gap-1 bg-red-800"><Ban className="h-3 w-3" />Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'elite':
        return <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white gap-1"><Crown className="h-3 w-3" />Elite</Badge>;
      case 'premium':
        return <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white gap-1"><Sparkles className="h-3 w-3" />Premium</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  const BusinessCard = ({ business, showActions = false }: { business: Business; showActions?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{business.name}</span>
              {business.is_verified && <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />}
              {business.is_featured && <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{business.city}</span>
              <span>•</span>
              <span className="capitalize">{business.category.replace(/-/g, ' ')}</span>
              {business.created_at && (
                <>
                  <span>•</span>
                  <span>{format(new Date(business.created_at), 'MMM d, yyyy')}</span>
                </>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1 flex-shrink-0">
            {getStatusBadge(business.status)}
            {getPlanBadge(business.subscription_plan)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Quick Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {business.email && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{business.email}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{business.phone}</span>
              </div>
            )}
          </div>

          {business.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{business.description}</p>
          )}

          {/* Certifications */}
          {business.certifications && business.certifications.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {business.certifications.slice(0, 3).map((cert, i) => (
                <Badge key={i} variant="outline" className="text-xs">{cert}</Badge>
              ))}
              {business.certifications.length > 3 && (
                <Badge variant="outline" className="text-xs">+{business.certifications.length - 3} more</Badge>
              )}
            </div>
          )}

          {/* Documents Preview */}
          {business.verification_documents && business.verification_documents.length > 0 && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {business.verification_documents.length} document(s) uploaded
              </span>
            </div>
          )}

          {/* Images Preview */}
          {business.images && business.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {business.images.slice(0, 4).map((img, i) => (
                <img 
                  key={i} 
                  src={img} 
                  alt={`Preview ${i + 1}`} 
                  className="h-16 w-24 object-cover rounded border flex-shrink-0"
                />
              ))}
              {business.images.length > 4 && (
                <div className="h-16 w-24 bg-muted rounded border flex items-center justify-center flex-shrink-0">
                  <span className="text-sm text-muted-foreground">+{business.images.length - 4}</span>
                </div>
              )}
            </div>
          )}

          {/* Rejection Reason */}
          {business.rejection_reason && (
            <div className="p-2 bg-destructive/10 rounded text-sm">
              <strong className="text-destructive">Rejected:</strong> {business.rejection_reason}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedBusiness(business);
                setDetailDialogOpen(true);
              }}
            >
              <Eye className="h-4 w-4 mr-1" /> View Details
            </Button>
            
            {showActions && business.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => approveVerification(business)}
                  disabled={actionLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setSelectedBusiness(business);
                    setRejectDialogOpen(true);
                  }}
                  disabled={actionLoading}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
              </>
            )}
            
            {(business.status === 'approved' || business.status === 'active') && (
              <Button
                variant={business.is_featured ? "secondary" : "outline"}
                size="sm"
                onClick={() => toggleFeatured(business)}
                disabled={actionLoading}
              >
                <Star className={`h-4 w-4 mr-1 ${business.is_featured ? 'fill-amber-500 text-amber-500' : ''}`} />
                {business.is_featured ? 'Unfeature' : 'Feature'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout title="Business & Verification Management">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold">{pendingBusinesses.length}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Listings</p>
                  <p className="text-2xl font-bold">{approvedBusinesses.length}</p>
                </div>
                <ShieldCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold">{rejectedBusinesses.length}</p>
                </div>
                <ShieldX className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Document Submissions</p>
                  <p className="text-2xl font-bold">{pendingSubmissions.length}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Businesses</p>
                  <p className="text-2xl font-bold">{allBusinesses.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search businesses by name, city, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              Pending Review
              {pendingBusinesses.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingBusinesses.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              Active
              <Badge variant="secondary" className="ml-1">{approvedBusinesses.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              Rejected
              {rejectedBusinesses.length > 0 && (
                <Badge variant="secondary" className="ml-1">{rejectedBusinesses.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              Documents
              {pendingSubmissions.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingSubmissions.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : pendingBusinesses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="font-semibold text-lg">All caught up!</h3>
                  <p className="text-muted-foreground">No pending business reviews</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingBusinesses.map((business) => (
                  <BusinessCard key={business.id} business={business} showActions />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            {approvedBusinesses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg">No active listings</h3>
                  <p className="text-muted-foreground">Approved businesses will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {approvedBusinesses.map((business) => (
                  <BusinessCard key={business.id} business={business} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-4">
            {rejectedBusinesses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ShieldX className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg">No rejected listings</h3>
                  <p className="text-muted-foreground">Rejected businesses will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rejectedBusinesses.map((business) => (
                  <BusinessCard key={business.id} business={business} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            {submissions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg">No document submissions</h3>
                  <p className="text-muted-foreground">Document submissions will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {submissions.map((submission) => (
                  <Card key={submission.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <FileText className="h-5 w-5" />
                            {submission.document_name}
                          </CardTitle>
                          <CardDescription>
                            {submission.document_type} • {submission.business?.name || 'No business linked'}
                            <span className="ml-2">
                              • {format(new Date(submission.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={
                            submission.status === 'approved' ? 'default' :
                            submission.status === 'rejected' ? 'destructive' : 
                            submission.status === 'replacement_requested' ? 'outline' : 'secondary'
                          }
                          className={submission.status === 'replacement_requested' ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/20' : ''}
                        >
                          {submission.status === 'replacement_requested' ? 'Replacement Requested' : submission.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {submission.document_description && (
                          <p className="text-sm text-muted-foreground">{submission.document_description}</p>
                        )}
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <DocumentActions 
                            fileUrl={submission.file_url} 
                            fileName={submission.file_name}
                            showDelete={true}
                            onDelete={() => deleteSubmission(submission)}
                            compact
                          />
                          <DocumentHistoryButton
                            documentId={submission.id}
                            documentName={submission.document_name}
                            compact
                          />
                          {submission.file_size && (
                            <span className="text-xs text-muted-foreground">
                              {(submission.file_size / 1024).toFixed(0)} KB
                            </span>
                          )}
                        </div>

                        {submission.status === 'pending' && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t">
                            {submission.is_legacy ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => approveLegacyDocument(submission)}
                                  disabled={actionLoading}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => rejectLegacyDocument(submission)}
                                  disabled={actionLoading}
                                >
                                  <XCircle className="h-4 w-4 mr-1" /> Reject
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => approveSubmission(submission)}
                                  disabled={actionLoading}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSubmission(submission);
                                    setReplacementDialogOpen(true);
                                  }}
                                  disabled={actionLoading}
                                  className="text-primary border-primary hover:bg-primary hover:text-primary-foreground"
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" /> Request Replacement
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSubmission(submission);
                                    setRejectSubmissionDialogOpen(true);
                                  }}
                                  disabled={actionLoading}
                                >
                                  <XCircle className="h-4 w-4 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                        )}

                        {submission.status === 'replacement_requested' && (
                          <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-1">
                              <RefreshCw className="h-4 w-4" />
                              <strong>Replacement requested</strong> - Awaiting new document from owner
                            </p>
                          </div>
                        )}

                        {/* Expiry Status */}
                        {!submission.is_legacy && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {submission.expiry_date ? (
                              (() => {
                                const { status, daysLeft } = getExpiryStatus(submission.expiry_date);
                                return (
                                  <div className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded ${
                                    status === 'expired' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                    status === 'urgent' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                    status === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  }`}>
                                    {status === 'expired' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
                                    <span>
                                      {status === 'expired' ? 'Expired' : 
                                       status === 'urgent' ? `Expires in ${daysLeft} days` :
                                       status === 'warning' ? `Expires in ${daysLeft} days` :
                                       `Expires: ${format(new Date(submission.expiry_date), 'MMM d, yyyy')}`}
                                    </span>
                                  </div>
                                );
                              })()
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedSubmission(submission);
                                  setExpiryDate(submission.expiry_date || '');
                                  setExpiryDialogOpen(true);
                                }}
                                className="text-muted-foreground h-7"
                              >
                                <Calendar className="h-3.5 w-3.5 mr-1" />
                                Set Expiry
                              </Button>
                            )}
                            {submission.expiry_date && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedSubmission(submission);
                                  setExpiryDate(submission.expiry_date || '');
                                  setExpiryDialogOpen(true);
                                }}
                                className="h-7 px-2"
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                        )}

                        {submission.admin_notes && (
                          <div className="p-2 bg-muted rounded">
                            <p className="text-sm"><strong>Admin Notes:</strong> {submission.admin_notes}</p>
                          </div>
                        )}

                        {submission.reviewed_at && (
                          <div className="text-xs text-muted-foreground">
                            Reviewed: {format(new Date(submission.reviewed_at), 'MMM d, yyyy h:mm a')}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Business Detail Dialog */}
      <BusinessDetailDialog
        business={selectedBusiness}
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) setSelectedBusiness(null);
        }}
        onUpdate={fetchAllData}
        adminUserId={user?.id}
      />

      {/* Reject Business Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Business</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{selectedBusiness?.name}".
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={rejectVerification}
              disabled={!rejectReason.trim() || actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Document Dialog */}
      <Dialog open={rejectSubmissionDialogOpen} onOpenChange={setRejectSubmissionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{selectedSubmission?.document_name}".
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectSubmissionDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={rejectSubmission}
              disabled={!rejectReason.trim() || actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Replacement Dialog */}
      <Dialog open={replacementDialogOpen} onOpenChange={setReplacementDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Request Document Replacement
            </DialogTitle>
            <DialogDescription>
              Request a new version of "{selectedSubmission?.document_name}" from the business owner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Reason for replacement <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="e.g., Document is blurry, expired, missing information..."
                value={replacementReason}
                onChange={(e) => setReplacementReason(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Instructions for owner (optional)
              </label>
              <Textarea
                placeholder="e.g., Please provide a current certificate dated within the last 12 months..."
                value={replacementInstructions}
                onChange={(e) => setReplacementInstructions(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                These instructions will be included in the email sent to the business owner.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setReplacementDialogOpen(false);
              setReplacementReason('');
              setReplacementInstructions('');
              setSelectedSubmission(null);
            }}>Cancel</Button>
            <Button
              onClick={requestReplacementDocument}
              disabled={!replacementReason.trim() || actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <RefreshCw className="h-4 w-4 mr-2" />
              Request Replacement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Expiry Date Dialog */}
      <Dialog open={expiryDialogOpen} onOpenChange={setExpiryDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Set Document Expiry
            </DialogTitle>
            <DialogDescription>
              Set an expiry date for "{selectedSubmission?.document_name}". You'll be notified when it's about to expire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Expiry Date
              </label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Admin notifications will be sent 30 and 7 days before expiry.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setExpiryDialogOpen(false);
              setExpiryDate('');
              setSelectedSubmission(null);
            }}>Cancel</Button>
            <Button
              onClick={setDocumentExpiry}
              disabled={!expiryDate || actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Calendar className="h-4 w-4 mr-2" />
              Set Expiry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Business Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Suspend Business Account
            </DialogTitle>
            <DialogDescription>
              Suspending "{selectedBusinessForSuspend?.name}" will immediately hide it from public view. This action is reversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Reason for suspension <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="e.g., Expired credentials, fraudulent documentation, substantiated complaints..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSuspendDialogOpen(false);
              setSuspendReason('');
              setSelectedBusinessForSuspend(null);
            }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={suspendBusiness}
              disabled={!suspendReason.trim() || actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Ban className="h-4 w-4 mr-2" />
              Suspend Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
