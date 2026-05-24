import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePortalUser } from '@/hooks/usePortalUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import {
  Building2,
  FileText,
  Plus,
  Search,
  Download,
  Eye,
  Trash2,
  Filter,
  ArrowLeft,
  User,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Printer,
  Send,
  RefreshCw,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  period_start: string | null;
  period_end: string | null;
  description: string | null;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  payment_reference: string | null;
  created_at: string;
}

export default function PortalInvoices() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { portalUser, loading: portalLoading } = usePortalUser();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!portalLoading && !portalUser) {
      navigate('/portal/login');
    }
  }, [portalUser, portalLoading, navigate]);

  const fetchInvoices = async () => {
    if (!portalUser) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contractor_invoices')
        .select('*')
        .eq('portal_user_id', portalUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (portalUser) {
      fetchInvoices();
    }
  }, [portalUser]);

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const response = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { 
          type: 'invoice',
          invoiceId: invoice.id
        }
      });

      if (response.error) throw response.error;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(response.data.html);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice PDF');
    }
  };

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;
    
    if (selectedInvoice.status !== 'draft') {
      toast.error('Only draft invoices can be deleted');
      return;
    }
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('contractor_invoices')
        .delete()
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      toast.success('Invoice deleted');
      setShowDeleteConfirm(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      console.error('Error deleting invoice:', err);
      toast.error('Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmitInvoice = async (invoice: Invoice) => {
    if (invoice.status !== 'draft') {
      toast.error('Only draft invoices can be submitted');
      return;
    }

    try {
      const { error } = await supabase
        .from('contractor_invoices')
        .update({ 
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (error) throw error;

      toast.success('Invoice submitted for review');
      fetchInvoices();
    } catch (err: any) {
      console.error('Error submitting invoice:', err);
      toast.error('Failed to submit invoice');
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode }> = {
      draft: { color: 'bg-slate-100 text-slate-700', icon: <FileText className="h-3 w-3" /> },
      submitted: { color: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3 w-3" /> },
      approved: { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      paid: { color: 'bg-emerald-100 text-emerald-800', icon: <DollarSign className="h-3 w-3" /> }
    };
    const config = configs[status] || configs.draft;
    return (
      <Badge className={cn("flex items-center gap-1", config.color)}>
        {config.icon}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const draftCount = invoices.filter(i => i.status === 'draft').length;
  const submittedCount = invoices.filter(i => i.status === 'submitted').length;
  const paidTotal = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.total_amount, 0);
  const pendingTotal = invoices
    .filter(i => ['submitted', 'approved'].includes(i.status))
    .reduce((sum, i) => sum + i.total_amount, 0);

  const handleLogout = async () => {
    await signOut();
    navigate('/portal/login');
  };

  if (portalLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Invoices | Wellington EcoBuild Portal</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <Link to="/portal/dashboard" className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-slate-900">Wellington EcoBuild</h1>
                    <p className="text-xs text-slate-500">Contractor Portal</p>
                  </div>
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <Link to="/portal/dashboard">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Link to="/portal/profile">
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">My Invoices</h2>
              <p className="text-slate-500">Manage and track all your invoices</p>
            </div>
            <Link to="/portal/invoices/new">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Drafts</p>
                    <p className="text-2xl font-bold">{draftCount}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Review</p>
                    <p className="text-2xl font-bold">{submittedCount}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Payment</p>
                    <p className="text-2xl font-bold">${pendingTotal.toLocaleString()}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-700">Total Paid</p>
                    <p className="text-2xl font-bold text-emerald-800">${paidTotal.toLocaleString()}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-emerald-200 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-emerald-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchInvoices}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invoices Table */}
          <Card>
            <CardContent className="p-0">
              {filteredInvoices.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-700">No invoices found</h3>
                  <p className="text-slate-500 mt-1">
                    {invoices.length === 0 
                      ? "Create your first invoice to get started"
                      : "Try adjusting your search or filter"
                    }
                  </p>
                  {invoices.length === 0 && (
                    <Link to="/portal/invoices/new">
                      <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Invoice
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/portal/invoices/${invoice.id}`)}>
                          <TableCell className="font-medium text-emerald-600 hover:underline">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {invoice.period_start && invoice.period_end ? (
                              <>
                                {format(new Date(invoice.period_start), 'dd MMM')} -{' '}
                                {format(new Date(invoice.period_end), 'dd MMM')}
                              </>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {invoice.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ${invoice.total_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Link to={`/portal/invoices/${invoice.id}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              {invoice.status === 'draft' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSubmitInvoice(invoice)}
                                    className="text-emerald-600 hover:text-emerald-700"
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedInvoice(invoice);
                                      setShowDeleteConfirm(true);
                                    }}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadInvoice(invoice)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadInvoice(invoice)}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Summary */}
          {filteredInvoices.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="bg-slate-100 rounded-lg p-4 text-sm">
                <p className="text-slate-600">
                  Showing {filteredInvoices.length} of {invoices.length} invoices
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Invoice?</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete invoice {selectedInvoice?.invoice_number}? 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteInvoice}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
