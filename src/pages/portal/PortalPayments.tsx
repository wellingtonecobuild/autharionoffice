import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, 
  Download, 
  DollarSign, 
  FileText, 
  CheckCircle,
  Calendar,
  TrendingUp,
  Shield,
  Loader2,
  Building2,
  Receipt
} from 'lucide-react';

interface PaymentRecord {
  id: string;
  payment_date: string;
  amount: number;
  gst_amount: number;
  net_amount: number;
  payment_reference: string | null;
  payment_method: string | null;
  description: string | null;
  invoice_id: string | null;
  created_at: string;
}

interface PortalUser {
  id: string;
  email: string;
  legal_full_name: string | null;
  role: string;
}

export default function PortalPayments() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentRecord[]>([]);
  const [dateFilter, setDateFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/portal/login');
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    filterPayments();
  }, [payments, dateFilter]);

  const fetchData = async () => {
    try {
      // Get portal user
      const { data: pUser, error: pError } = await supabase
        .from('portal_users')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (pError || !pUser) {
        toast.error('Portal user not found');
        navigate('/portal/login');
        return;
      }

      setPortalUser(pUser as PortalUser);

      // Get all payments
      const { data: paymentData, error: payError } = await supabase
        .from('portal_payment_records')
        .select('*')
        .eq('portal_user_id', pUser.id)
        .order('payment_date', { ascending: false });

      if (!payError && paymentData) {
        setPayments(paymentData as PaymentRecord[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    const now = new Date();
    let filtered = [...payments];

    switch (dateFilter) {
      case 'this-month':
        filtered = payments.filter(p => {
          const date = new Date(p.payment_date);
          return date >= startOfMonth(now) && date <= endOfMonth(now);
        });
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        filtered = payments.filter(p => {
          const date = new Date(p.payment_date);
          return date >= startOfMonth(lastMonth) && date <= endOfMonth(lastMonth);
        });
        break;
      case 'last-3-months':
        const threeMonthsAgo = subMonths(now, 3);
        filtered = payments.filter(p => {
          const date = new Date(p.payment_date);
          return date >= threeMonthsAgo;
        });
        break;
      case 'this-year':
        filtered = payments.filter(p => {
          const date = new Date(p.payment_date);
          return date >= startOfYear(now) && date <= endOfYear(now);
        });
        break;
      case 'last-year':
        const lastYear = new Date(now.getFullYear() - 1, 0, 1);
        filtered = payments.filter(p => {
          const date = new Date(p.payment_date);
          return date >= startOfYear(lastYear) && date <= endOfYear(lastYear);
        });
        break;
      default:
        break;
    }

    setFilteredPayments(filtered);
  };

  const calculateTotals = () => {
    return filteredPayments.reduce(
      (acc, p) => ({
        total: acc.total + Number(p.amount),
        gst: acc.gst + Number(p.gst_amount || 0),
        net: acc.net + Number(p.net_amount || 0),
      }),
      { total: 0, gst: 0, net: 0 }
    );
  };

  const downloadProofOfIncome = async () => {
    if (!portalUser) return;
    setExporting(true);

    try {
      const response = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { 
          type: 'payment_summary',
          portalUserId: portalUser.id,
          dateFilter: dateFilter !== 'all' ? dateFilter : undefined
        }
      });

      if (response.error) throw response.error;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(response.data.html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }

      toast.success('Proof of income document generated');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate proof of income');
    } finally {
      setExporting(false);
    }
  };

  const totals = calculateTotals();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Payment History | Wellington EcoBuild Portal</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link to="/portal/dashboard">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                  <span className="font-semibold text-slate-900">Wellington EcoBuild</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Payment History</h1>
            <p className="text-slate-600 mt-1">
              View your payment records and download official proof of income documents
            </p>
          </div>

          {/* Proof of Income Banner */}
          <Card className="mb-8 bg-gradient-to-r from-emerald-600 to-emerald-700 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Shield className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Official Proof of Income</h2>
                    <p className="text-emerald-100 mt-1">
                      Download government-ready payment summaries for banks, WINZ, IRD, or landlords
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={downloadProofOfIncome}
                  disabled={exporting || payments.length === 0}
                  className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Proof of Income
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Filters and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {/* Filter Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Date Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                    <SelectItem value="this-year">This Year</SelectItem>
                    <SelectItem value="last-year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Total Payments */}
            <Card className="bg-emerald-50 border-emerald-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-emerald-700">
                  <DollarSign className="h-4 w-4 inline mr-2" />
                  Total Received
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-800">
                  ${totals.total.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-emerald-600">{filteredPayments.length} payments</p>
              </CardContent>
            </Card>

            {/* GST */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">
                  <Receipt className="h-4 w-4 inline mr-2" />
                  GST Included
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-800">
                  ${totals.gst.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-slate-500">15% GST</p>
              </CardContent>
            </Card>

            {/* Net Amount */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">
                  <TrendingUp className="h-4 w-4 inline mr-2" />
                  Net Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-800">
                  ${totals.net.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-slate-500">Before GST</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Records */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment Records</CardTitle>
                  <CardDescription>
                    Complete history of payments received from Wellington EcoBuild
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                  {filteredPayments.length} Records
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredPayments.length === 0 ? (
                <div className="text-center py-16">
                  <DollarSign className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-700 mb-2">No Payment Records</h3>
                  <p className="text-slate-500 mb-6">
                    {dateFilter === 'all' 
                      ? "You haven't received any payments yet. Submit an invoice to get started."
                      : "No payments found for the selected period. Try adjusting the date filter."}
                  </p>
                  <Link to="/portal/invoices/new">
                    <Button>
                      <FileText className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPayments.map((payment) => (
                    <div 
                      key={payment.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-white border border-emerald-100 hover:border-emerald-200 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            ${Number(payment.amount).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm text-slate-600">
                            {format(new Date(payment.payment_date), 'EEEE, d MMMM yyyy')}
                          </p>
                          {payment.description && (
                            <p className="text-sm text-slate-500 mt-1">{payment.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {payment.payment_reference && (
                          <p className="text-sm font-mono text-slate-600">
                            Ref: {payment.payment_reference}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <span>GST: ${Number(payment.gst_amount || 0).toFixed(2)}</span>
                          <Separator orientation="vertical" className="h-3" />
                          <span>Net: ${Number(payment.net_amount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Footer */}
          <div className="mt-8 p-6 bg-slate-100 rounded-xl border border-slate-200">
            <div className="flex items-start gap-4">
              <Shield className="h-6 w-6 text-slate-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">About Proof of Income Documents</h3>
                <p className="text-sm text-slate-600">
                  Payment summaries generated from this portal are official documents from Wellington EcoBuild 
                  confirming your contracting income. These documents can be used for:
                </p>
                <ul className="text-sm text-slate-600 mt-2 space-y-1 list-disc list-inside">
                  <li>Bank loan and mortgage applications</li>
                  <li>WINZ income verification</li>
                  <li>IRD tax filing</li>
                  <li>Rental applications and landlord verification</li>
                  <li>ACC levy calculations</li>
                </ul>
                <p className="text-sm text-slate-500 mt-3">
                  For verification, third parties can contact {' '}
                  <a href="mailto:info@wellingtonecobuild.nz" className="text-emerald-600 hover:underline">
                    info@wellingtonecobuild.nz
                  </a>
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
