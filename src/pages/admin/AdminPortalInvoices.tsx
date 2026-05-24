import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  FileText, 
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  DollarSign,
  RefreshCw,
  Download,
  Clock,
  AlertCircle,
  Receipt,
  TrendingUp
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: string;
  portal_user_id: string;
  invoice_date: string;
  due_date: string | null;
  description: string | null;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  admin_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payment_date: string | null;
  payment_reference: string | null;
  created_at: string;
  portal_user: {
    email: string;
    legal_full_name: string | null;
    gst_registered: boolean;
  };
  line_items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    date_of_service: string | null;
  }>;
}

export default function AdminPortalInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Action dialogs
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  
  // Form state
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [processing, setProcessing] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contractor_invoices')
        .select(`
          *,
          portal_user:portal_users(email, legal_full_name, gst_registered),
          line_items:invoice_line_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices((data || []) as Invoice[]);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleInvoiceAction = async (action: 'approve' | 'reject' | 'mark_paid') => {
    if (!selectedInvoice || !user?.id) return;
    
    setProcessing(true);
    try {
      const body: any = {
        invoiceId: selectedInvoice.id,
        action,
        adminId: user.id
      };

      if (action === 'reject') {
        body.rejectionReason = rejectionReason;
      }
      if (action === 'mark_paid') {
        body.paymentReference = paymentReference;
        body.paymentDate = paymentDate;
      }

      const response = await supabase.functions.invoke('portal-invoice-action', { body });

      if (response.error) throw response.error;

      toast.success(`Invoice ${action === 'mark_paid' ? 'marked as paid' : action + 'd'} successfully`);
      setShowViewDialog(false);
      setShowRejectDialog(false);
      setShowPayDialog(false);
      setSelectedInvoice(null);
      setRejectionReason('');
      setPaymentReference('');
      fetchInvoices();
    } catch (error: any) {
      console.error('Error processing invoice:', error);
      toast.error(error.message || 'Failed to process invoice');
    } finally {
      setProcessing(false);
    }
  };

  const downloadPDF = async (invoice: Invoice) => {
    try {
      const response = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId: invoice.id, type: 'invoice' }
      });

      if (response.error) throw response.error;

      // Open HTML in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(response.data.html);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.portal_user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.portal_user?.legal_full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingReview = invoices.filter(i => i.status === 'submitted');
  const approvedUnpaid = invoices.filter(i => i.status === 'approved');
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      draft: { bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: <FileText className="h-3 w-3" /> },
      submitted: { bg: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="h-3 w-3" /> },
      approved: { bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { bg: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="h-3 w-3" /> },
      paid: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <DollarSign className="h-3 w-3" /> },
      cancelled: { bg: 'bg-slate-100 text-slate-500 border-slate-200', icon: <AlertCircle className="h-3 w-3" /> }
    };
    const style = styles[status] || styles.draft;
    return (
      <Badge className={`${style.bg} border font-medium flex items-center gap-1`}>
        {style.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <AdminLayout title="Portal Invoices">
      <div className="space-y-6">
        <AdminPageHeader
          title="Contractor Invoices"
          onRefresh={fetchInvoices}
          showLiveIndicator
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{pendingReview.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center gap-3">
              <Receipt className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Payment</p>
                <p className="text-2xl font-bold">{approvedUnpaid.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-green-500/20 bg-green-500/5">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold">${totalPaid.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice #, name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Invoices Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className={invoice.status === 'submitted' ? 'bg-amber-50/50' : ''}>
                    <TableCell className="font-mono font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{invoice.portal_user?.legal_full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{invoice.portal_user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(invoice.invoice_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">${invoice.total_amount?.toFixed(2)}</p>
                        {invoice.gst_amount > 0 && (
                          <p className="text-xs text-muted-foreground">incl. GST ${invoice.gst_amount?.toFixed(2)}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invoice.submitted_at ? format(new Date(invoice.submitted_at), 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedInvoice(invoice); setShowViewDialog(true); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadPDF(invoice)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                          
                          {invoice.status === 'submitted' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => { setSelectedInvoice(invoice); handleInvoiceAction('approve'); }}
                                className="text-emerald-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => { setSelectedInvoice(invoice); setShowRejectDialog(true); }}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {invoice.status === 'approved' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => { setSelectedInvoice(invoice); setShowPayDialog(true); }}
                                className="text-emerald-600"
                              >
                                <DollarSign className="h-4 w-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* View Invoice Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice {selectedInvoice?.invoice_number}</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Contractor</Label>
                    <p className="font-medium">{selectedInvoice.portal_user?.legal_full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedInvoice.portal_user?.email}</p>
                  </div>
                  <div className="text-right">
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-muted-foreground text-xs">Invoice Date</Label>
                    <p className="font-medium">{format(new Date(selectedInvoice.invoice_date), 'dd MMM yyyy')}</p>
                  </div>
                  {selectedInvoice.due_date && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Due Date</Label>
                      <p className="font-medium">{format(new Date(selectedInvoice.due_date), 'dd MMM yyyy')}</p>
                    </div>
                  )}
                  {selectedInvoice.payment_date && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Payment Date</Label>
                      <p className="font-medium">{format(new Date(selectedInvoice.payment_date), 'dd MMM yyyy')}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedInvoice.description && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Description</Label>
                    <p>{selectedInvoice.description}</p>
                  </div>
                )}

                {/* Line Items */}
                <div>
                  <Label className="text-muted-foreground text-xs mb-2 block">Line Items</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.line_items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">${item.unit_price?.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">${item.amount?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="border-t pt-4">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${selectedInvoice.subtotal?.toFixed(2)}</span>
                  </div>
                  {selectedInvoice.gst_amount > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">GST (15%)</span>
                      <span>${selectedInvoice.gst_amount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-t font-semibold text-lg">
                    <span>Total</span>
                    <span>${selectedInvoice.total_amount?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Rejection Reason */}
                {selectedInvoice.rejection_reason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <Label className="text-red-800 text-xs font-medium">Rejection Reason</Label>
                    <p className="text-red-700">{selectedInvoice.rejection_reason}</p>
                  </div>
                )}

                {/* Payment Reference */}
                {selectedInvoice.payment_reference && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <Label className="text-emerald-800 text-xs font-medium">Payment Reference</Label>
                    <p className="text-emerald-700 font-mono">{selectedInvoice.payment_reference}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                Close
              </Button>
              {selectedInvoice && (
                <Button variant="outline" onClick={() => downloadPDF(selectedInvoice)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Textarea
                  placeholder="Please explain why this invoice is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be sent to the contractor so they can correct and resubmit.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleInvoiceAction('reject')}
                disabled={!rejectionReason || processing}
              >
                {processing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Reject Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mark as Paid Dialog */}
        <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark Invoice as Paid</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Invoice Amount</p>
                <p className="text-2xl font-bold">${selectedInvoice?.total_amount?.toFixed(2)}</p>
              </div>
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Reference</Label>
                <Input
                  placeholder="e.g., Bank transfer ref, check number..."
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPayDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleInvoiceAction('mark_paid')}
                disabled={!paymentDate || processing}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {processing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
                Confirm Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
