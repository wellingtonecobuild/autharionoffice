import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePortalUser } from '@/hooks/usePortalUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import {
  Building2,
  FileText,
  Download,
  Printer,
  ArrowLeft,
  User,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Calendar,
  Hash,
  Receipt,
  CreditCard
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
  approved_by: string | null;
  paid_at: string | null;
  paid_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  payment_reference: string | null;
  payment_method: string | null;
  payment_date: string | null;
  admin_notes: string | null;
  created_at: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export default function PortalInvoiceView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, signOut } = useAuth();
  const { portalUser, loading: portalLoading } = usePortalUser();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!portalLoading && !portalUser) {
      navigate('/portal/login');
    }
  }, [portalUser, portalLoading, navigate]);

  const fetchInvoice = async () => {
    if (!portalUser || !id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contractor_invoices')
        .select('*')
        .eq('id', id)
        .eq('portal_user_id', portalUser.id)
        .single();

      if (error) throw error;
      setInvoice(data);

      // Note: If invoice items table exists, uncomment this
      // const { data: itemsData } = await supabase
      //   .from('contractor_invoice_items')
      //   .select('*')
      //   .eq('invoice_id', id)
      //   .order('created_at', { ascending: true });
      // if (itemsData) setItems(itemsData as InvoiceItem[]);
    } catch (err: any) {
      console.error('Error fetching invoice:', err);
      toast.error('Failed to load invoice');
      navigate('/portal/invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (portalUser && id) {
      fetchInvoice();
    }
  }, [portalUser, id]);

  const handleDownload = async () => {
    if (!invoice) return;
    
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

  const handleSubmit = async () => {
    if (!invoice || invoice.status !== 'draft') return;

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
      fetchInvoice();
    } catch (err: any) {
      console.error('Error submitting invoice:', err);
      toast.error('Failed to submit invoice');
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode; label: string; bg: string }> = {
      draft: { 
        color: 'text-slate-700', 
        icon: <FileText className="h-5 w-5" />, 
        label: 'Draft',
        bg: 'bg-slate-100'
      },
      submitted: { 
        color: 'text-amber-800', 
        icon: <Clock className="h-5 w-5" />, 
        label: 'Pending Review',
        bg: 'bg-amber-100'
      },
      approved: { 
        color: 'text-blue-800', 
        icon: <CheckCircle className="h-5 w-5" />, 
        label: 'Approved',
        bg: 'bg-blue-100'
      },
      rejected: { 
        color: 'text-red-800', 
        icon: <XCircle className="h-5 w-5" />, 
        label: 'Rejected',
        bg: 'bg-red-100'
      },
      paid: { 
        color: 'text-emerald-800', 
        icon: <DollarSign className="h-5 w-5" />, 
        label: 'Paid',
        bg: 'bg-emerald-100'
      }
    };
    return configs[status] || configs.draft;
  };

  if (portalLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600">Invoice not found</p>
          <Link to="/portal/invoices">
            <Button variant="outline" className="mt-4">Back to Invoices</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(invoice.status);

  return (
    <>
      <Helmet>
        <title>{invoice.invoice_number} | Wellington EcoBuild Portal</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <Link to="/portal/invoices" className="text-slate-500 hover:text-slate-700">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="font-semibold text-slate-900">{invoice.invoice_number}</h1>
                  <p className="text-xs text-slate-500">Invoice Details</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {invoice.status === 'draft' && (
                  <Button 
                    size="sm" 
                    onClick={handleSubmit}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status Banner */}
          <div className={cn(
            "rounded-xl p-4 mb-6 flex items-center justify-between",
            statusConfig.bg
          )}>
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-full", statusConfig.bg, statusConfig.color)}>
                {statusConfig.icon}
              </div>
              <div>
                <p className={cn("font-semibold", statusConfig.color)}>{statusConfig.label}</p>
                <p className="text-sm text-slate-600">
                  {invoice.status === 'paid' && invoice.paid_at && (
                    <>Paid on {format(new Date(invoice.paid_at), 'PPP')}</>
                  )}
                  {invoice.status === 'submitted' && invoice.submitted_at && (
                    <>Submitted on {format(new Date(invoice.submitted_at), 'PPP')}</>
                  )}
                  {invoice.status === 'approved' && invoice.approved_at && (
                    <>Approved on {format(new Date(invoice.approved_at), 'PPP')}</>
                  )}
                  {invoice.status === 'rejected' && invoice.rejected_at && (
                    <>Rejected on {format(new Date(invoice.rejected_at), 'PPP')}</>
                  )}
                  {invoice.status === 'draft' && (
                    <>Created on {format(new Date(invoice.created_at), 'PPP')}</>
                  )}
                </p>
              </div>
            </div>
            {invoice.status === 'paid' && invoice.payment_reference && (
              <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                Ref: {invoice.payment_reference}
              </Badge>
            )}
          </div>

          {/* Rejection Reason */}
          {invoice.status === 'rejected' && invoice.rejection_reason && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Rejection Reason</p>
                    <p className="text-sm text-red-700 mt-1">{invoice.rejection_reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Invoice Details */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Details</CardTitle>
                  <CardDescription>
                    {invoice.description || 'Services rendered'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Invoice Number</p>
                        <p className="font-medium">{invoice.invoice_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Invoice Date</p>
                        <p className="font-medium">{format(new Date(invoice.invoice_date), 'PPP')}</p>
                      </div>
                    </div>
                    {invoice.due_date && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Due Date</p>
                          <p className="font-medium">{format(new Date(invoice.due_date), 'PPP')}</p>
                        </div>
                      </div>
                    )}
                    {invoice.period_start && invoice.period_end && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Period</p>
                          <p className="font-medium">
                            {format(new Date(invoice.period_start), 'dd MMM')} - {format(new Date(invoice.period_end), 'dd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator className="my-6" />

                  {/* Line Items */}
                  {items.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-3">Line Items</h4>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                              <p className="font-medium">{item.description}</p>
                              <p className="text-sm text-slate-500">
                                {item.quantity} × ${item.unit_price.toFixed(2)}
                              </p>
                            </div>
                            <p className="font-semibold">${item.total.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Subtotal</span>
                        <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">GST (15%)</span>
                        <span className="font-medium">${invoice.gst_amount.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between text-lg">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold text-emerald-600">${invoice.total_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Payment Info */}
              {invoice.status === 'paid' && (
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-emerald-800 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {invoice.payment_date && (
                      <div>
                        <p className="text-xs text-emerald-700">Payment Date</p>
                        <p className="font-medium text-emerald-900">
                          {format(new Date(invoice.payment_date), 'PPP')}
                        </p>
                      </div>
                    )}
                    {invoice.payment_method && (
                      <div>
                        <p className="text-xs text-emerald-700">Payment Method</p>
                        <p className="font-medium text-emerald-900 capitalize">{invoice.payment_method}</p>
                      </div>
                    )}
                    {invoice.payment_reference && (
                      <div>
                        <p className="text-xs text-emerald-700">Reference</p>
                        <p className="font-medium text-emerald-900">{invoice.payment_reference}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Admin Notes */}
              {invoice.admin_notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Admin Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600">{invoice.admin_notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={handleDownload}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Invoice
                  </Button>
                  {invoice.status === 'draft' && (
                    <Button 
                      className="w-full justify-start bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleSubmit}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submit for Review
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-slate-400 mt-2" />
                      <div>
                        <p className="text-sm font-medium">Created</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(invoice.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                    {invoice.submitted_at && (
                      <div className="flex items-start gap-3">
                        <div className="h-2 w-2 rounded-full bg-amber-400 mt-2" />
                        <div>
                          <p className="text-sm font-medium">Submitted</p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(invoice.submitted_at), 'PPp')}
                          </p>
                        </div>
                      </div>
                    )}
                    {invoice.approved_at && (
                      <div className="flex items-start gap-3">
                        <div className="h-2 w-2 rounded-full bg-blue-400 mt-2" />
                        <div>
                          <p className="text-sm font-medium">Approved</p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(invoice.approved_at), 'PPp')}
                          </p>
                        </div>
                      </div>
                    )}
                    {invoice.rejected_at && (
                      <div className="flex items-start gap-3">
                        <div className="h-2 w-2 rounded-full bg-red-400 mt-2" />
                        <div>
                          <p className="text-sm font-medium">Rejected</p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(invoice.rejected_at), 'PPp')}
                          </p>
                        </div>
                      </div>
                    )}
                    {invoice.paid_at && (
                      <div className="flex items-start gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 mt-2" />
                        <div>
                          <p className="text-sm font-medium">Paid</p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(invoice.paid_at), 'PPp')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
