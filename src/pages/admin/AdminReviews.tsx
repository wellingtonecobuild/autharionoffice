import { useEffect, useState, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Search, Star, Trash2, Loader2, ExternalLink, CheckCircle, XCircle, Clock, Eye, Flag, FileText, Shield, AlertTriangle, Globe, User, Download } from 'lucide-react';
import { format } from 'date-fns';

interface Review {
  id: string;
  rating: number;
  text: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  user_id: string | null;
  business_id: string;
  reviewer_ip: string | null;
  is_flagged: boolean | null;
  flag_reason: string | null;
  flagged_at: string | null;
  is_verified_client: boolean | null;
  proof_document_url: string | null;
  proof_document_name: string | null;
  verification_requested_at: string | null;
  project_type: string | null;
  business_response: string | null;
  guest_name: string | null;
  guest_initial: string | null;
  guest_email: string | null;
  businesses?: {
    name: string;
  };
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  new_build: "New Build",
  renovation: "Renovation",
  retrofit: "Retrofit",
  supply_only: "Supply Only",
  design_planning: "Design / Planning",
};

export default function AdminReviews() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moderateDialogOpen, setModerateDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [moderating, setModerating] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [verifyingClient, setVerifyingClient] = useState(false);

  // Auto-refresh every 5 seconds
  useAutoRefresh(useCallback(() => fetchReviews(), []));

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          businesses (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews((data || []) as Review[]);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  async function logAuditAction(action: string, entityId: string, metadata?: Record<string, any>) {
    try {
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        entity_type: 'review',
        entity_id: entityId,
        action,
        metadata,
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  }

  async function moderateReview(newStatus: 'approved' | 'rejected') {
    if (!selectedReview || !user) return;
    setModerating(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          status: newStatus,
          admin_notes: adminNotes.trim() || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          is_flagged: false, // Clear flag when moderated
        })
        .eq('id', selectedReview.id);

      if (error) throw error;

      await logAuditAction(
        newStatus === 'approved' ? 'review_approved' : 'review_rejected',
        selectedReview.id,
        { business_name: selectedReview.businesses?.name, admin_notes: adminNotes.trim() }
      );

      toast({ 
        title: 'Success', 
        description: `Review ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully` 
      });
      setModerateDialogOpen(false);
      setSelectedReview(null);
      setAdminNotes('');
      fetchReviews();
    } catch (error) {
      console.error('Error moderating review:', error);
      toast({ title: 'Error', description: 'Failed to moderate review', variant: 'destructive' });
    } finally {
      setModerating(false);
    }
  }

  async function deleteReview() {
    if (!selectedReview || !user) return;
    try {
      await logAuditAction('review_deleted', selectedReview.id, {
        business_name: selectedReview.businesses?.name,
        rating: selectedReview.rating,
        text: selectedReview.text,
      });

      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', selectedReview.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Review deleted successfully' });
      setDeleteDialogOpen(false);
      setSelectedReview(null);
      fetchReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({ title: 'Error', description: 'Failed to delete review', variant: 'destructive' });
    }
  }

  async function clearFlag() {
    if (!selectedReview || !user) return;
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          is_flagged: false,
          flag_reason: null,
          flagged_at: null,
        })
        .eq('id', selectedReview.id);

      if (error) throw error;

      await logAuditAction('review_flag_cleared', selectedReview.id, {
        business_name: selectedReview.businesses?.name,
        previous_flag_reason: selectedReview.flag_reason,
      });

      toast({ title: 'Flag cleared' });
      setModerateDialogOpen(false);
      fetchReviews();
    } catch (error) {
      console.error('Error clearing flag:', error);
      toast({ title: 'Error', description: 'Failed to clear flag', variant: 'destructive' });
    }
  }

  async function verifyClient(approve: boolean) {
    if (!selectedReview || !user) return;
    setVerifyingClient(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          is_verified_client: approve,
          verification_processed_at: new Date().toISOString(),
          verification_processed_by: user.id,
        })
        .eq('id', selectedReview.id);

      if (error) throw error;

      await logAuditAction(
        approve ? 'verified_client_approved' : 'verified_client_rejected',
        selectedReview.id,
        { business_name: selectedReview.businesses?.name }
      );

      toast({ 
        title: approve ? 'Verified Client badge granted' : 'Verification rejected',
        description: approve 
          ? 'The reviewer now has the Verified Client badge'
          : 'The verification request has been rejected'
      });
      fetchReviews();
      setModerateDialogOpen(false);
    } catch (error) {
      console.error('Error verifying client:', error);
      toast({ title: 'Error', description: 'Failed to update verification', variant: 'destructive' });
    } finally {
      setVerifyingClient(false);
    }
  }

  async function downloadProofDocument() {
    if (!selectedReview?.proof_document_url) return;
    try {
      const { data, error } = await supabase.storage
        .from('review-proofs')
        .download(selectedReview.proof_document_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedReview.proof_document_name || 'proof-document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({ title: 'Error', description: 'Failed to download document', variant: 'destructive' });
    }
  }

  const getFilteredReviews = () => {
    let filtered = reviews;

    // Tab filter
    if (activeTab === 'pending') {
      filtered = filtered.filter(r => r.status === 'pending');
    } else if (activeTab === 'flagged') {
      filtered = filtered.filter(r => r.is_flagged);
    } else if (activeTab === 'verification') {
      filtered = filtered.filter(r => r.verification_requested_at && !r.is_verified_client);
    }

    // Search filter
    if (search) {
      filtered = filtered.filter(r => 
        r.businesses?.name.toLowerCase().includes(search.toLowerCase()) ||
        r.text?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    return filtered;
  };

  const filteredReviews = getFilteredReviews();

  const pendingCount = reviews.filter(r => r.status === 'pending').length;
  const approvedCount = reviews.filter(r => r.status === 'approved').length;
  const rejectedCount = reviews.filter(r => r.status === 'rejected').length;
  const flaggedCount = reviews.filter(r => r.is_flagged).length;
  const verificationPendingCount = reviews.filter(r => r.verification_requested_at && !r.is_verified_client).length;

  const avgRating = approvedCount > 0
    ? (reviews.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.rating, 0) / approvedCount).toFixed(1)
    : '0';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <AdminLayout title="Reviews Management">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Awaiting moderation</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Flagged</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{flaggedCount}</div>
              <p className="text-xs text-muted-foreground">Reported concerns</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Verification Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{verificationPendingCount}</div>
              <p className="text-xs text-muted-foreground">Verified client pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
              <p className="text-xs text-muted-foreground">Published reviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-1">
                {avgRating}
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              </div>
              <p className="text-xs text-muted-foreground">Approved reviews only</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Filters */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All Reviews</TabsTrigger>
              <TabsTrigger value="pending" className="gap-1">
                Pending
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">{pendingCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="flagged" className="gap-1">
                <Flag className="w-3 h-3" />
                Flagged
                {flaggedCount > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">{flaggedCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="verification" className="gap-1">
                <Shield className="w-3 h-3" />
                Verification
                {verificationPendingCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">{verificationPendingCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reviews..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Reviews Table */}
          <Card className="mt-4">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredReviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No reviews found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReviews.map((review) => (
                      <TableRow key={review.id} className={review.is_flagged ? 'bg-red-500/5' : ''}>
                        <TableCell>
                          <a
                            href={`/business/${review.business_id}`}
                            target="_blank"
                            className="font-medium hover:underline flex items-center gap-1"
                          >
                            {review.businesses?.name}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          <p className="truncate text-sm">{review.text || 'No comment'}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(review.status)}
                            {review.is_verified_client && (
                              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                                <Shield className="w-3 h-3 mr-1" />Verified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {review.is_flagged && (
                              <Badge variant="destructive" className="text-xs">
                                <Flag className="w-3 h-3 mr-1" />Flagged
                              </Badge>
                            )}
                            {review.verification_requested_at && !review.is_verified_client && (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                                <FileText className="w-3 h-3 mr-1" />Proof
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(review.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedReview(review);
                                setAdminNotes(review.admin_notes || '');
                                setModerateDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {review.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    await supabase
                                      .from('reviews')
                                      .update({
                                        status: 'approved',
                                        reviewed_at: new Date().toISOString(),
                                        reviewed_by: user?.id,
                                      })
                                      .eq('id', review.id);
                                    await logAuditAction('review_approved', review.id, {
                                      business_name: review.businesses?.name
                                    });
                                    toast({ title: 'Review approved' });
                                    fetchReviews();
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedReview(review);
                                    setAdminNotes('');
                                    setModerateDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedReview(review);
                                setDeleteDialogOpen(true);
                              }}
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
            </CardContent>
          </Card>
        </Tabs>
      </div>

      {/* Enhanced Moderate Dialog */}
      <Dialog open={moderateDialogOpen} onOpenChange={setModerateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
            <DialogDescription>
              Review for {selectedReview?.businesses?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReview && (
            <div className="space-y-4">
              {/* Rating and Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Rating:</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < selectedReview.rating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {getStatusBadge(selectedReview.status)}
              </div>

              {/* Project Type */}
              {selectedReview.project_type && (
                <div>
                  <span className="text-sm font-medium">Project Type:</span>
                  <Badge variant="outline" className="ml-2">
                    {PROJECT_TYPE_LABELS[selectedReview.project_type] || selectedReview.project_type}
                  </Badge>
                </div>
              )}
              
              {/* Review Text */}
              <div>
                <span className="text-sm font-medium">Review:</span>
                <p className="mt-1 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {selectedReview.text || 'No comment provided'}
                </p>
              </div>

              {/* Business Response */}
              {selectedReview.business_response && (
                <div>
                  <span className="text-sm font-medium">Business Response:</span>
                  <p className="mt-1 text-sm text-muted-foreground bg-accent/10 p-3 rounded-lg border-l-4 border-accent">
                    {selectedReview.business_response}
                  </p>
                </div>
              )}

              <Separator />

              {/* Anti-Abuse Info */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Reviewer Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedReview.user_id ? (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Signed-in User:</span>
                      <code className="bg-background px-2 py-0.5 rounded text-xs truncate max-w-[150px]">
                        {selectedReview.user_id}
                      </code>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Guest Name:</span>
                        <span className="font-medium">
                          {selectedReview.guest_name} {selectedReview.guest_initial}.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Guest Email:</span>
                        <code className="bg-background px-2 py-0.5 rounded text-xs">
                          {selectedReview.guest_email || 'Not provided'}
                        </code>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">IP Address:</span>
                    <code className="bg-background px-2 py-0.5 rounded text-xs">
                      {selectedReview.reviewer_ip || 'Not recorded'}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Submitted:</span>
                    <span className="text-xs">
                      {format(new Date(selectedReview.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Flag Information */}
              {selectedReview.is_flagged && (
                <div className="bg-red-500/10 p-4 rounded-lg space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-red-600">
                    <Flag className="w-4 h-4" />
                    Flagged Review
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    <strong>Reason:</strong> {selectedReview.flag_reason || 'No reason provided'}
                  </p>
                  {selectedReview.flagged_at && (
                    <p className="text-xs text-muted-foreground">
                      Flagged on {format(new Date(selectedReview.flagged_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                  <Button variant="outline" size="sm" onClick={clearFlag}>
                    Clear Flag
                  </Button>
                </div>
              )}

              {/* Verified Client Proof */}
              {selectedReview.verification_requested_at && (
                <div className={`p-4 rounded-lg space-y-3 ${selectedReview.is_verified_client ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {selectedReview.is_verified_client ? 'Verified Client' : 'Verification Request'}
                  </h4>
                  {selectedReview.proof_document_name && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{selectedReview.proof_document_name}</span>
                      <Button variant="outline" size="sm" onClick={downloadProofDocument}>
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  )}
                  {selectedReview.verification_requested_at && !selectedReview.is_verified_client && (
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => verifyClient(true)}
                        disabled={verifyingClient}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {verifyingClient ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                        Grant Verified Badge
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => verifyClient(false)}
                        disabled={verifyingClient}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                  {selectedReview.is_verified_client && (
                    <Badge className="bg-green-500/20 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified Client Badge Granted
                    </Badge>
                  )}
                </div>
              )}

              <Separator />

              {/* Admin Notes */}
              <div>
                <label className="text-sm font-medium">Admin Notes (optional)</label>
                <Textarea
                  placeholder="Add notes about this review..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setModerateDialogOpen(false)}>
              Cancel
            </Button>
            {selectedReview?.status !== 'approved' && (
              <Button 
                onClick={() => moderateReview('approved')} 
                disabled={moderating}
                className="bg-green-600 hover:bg-green-700"
              >
                {moderating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Approve
              </Button>
            )}
            {selectedReview?.status !== 'rejected' && (
              <Button 
                variant="destructive" 
                onClick={() => moderateReview('rejected')} 
                disabled={moderating}
              >
                {moderating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Reject
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone and will be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteReview} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
