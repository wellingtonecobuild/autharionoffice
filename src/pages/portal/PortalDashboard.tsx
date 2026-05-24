import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { 
  Building2, 
  FileText, 
  DollarSign, 
  Plus, 
  User, 
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Download,
  MessageSquare,
  FolderOpen,
  ArrowRight,
  Bell,
  Calendar,
  LayoutDashboard,
  ChevronRight,
  Mail,
  Phone,
  History
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { SessionTimeoutWarning } from '@/components/portal/SessionTimeoutWarning';
import { ActivityFeed } from '@/components/portal/ActivityFeed';
import { PerformanceMetrics } from '@/components/portal/PerformanceMetrics';
import { UpcomingDeadlines } from '@/components/portal/UpcomingDeadlines';
import { DarkModeToggle } from '@/components/portal/DarkModeToggle';

interface PortalUser {
  id: string;
  email: string;
  legal_full_name: string | null;
  role: 'contractor' | 'employee';
  profile_completed: boolean;
  gst_registered: boolean;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  invoice_date: string;
  submitted_at: string | null;
}

interface PaymentRecord {
  id: string;
  amount: number;
  payment_date: string;
  payment_reference: string | null;
}

interface Thread {
  id: string;
  subject: string;
  status: string;
  last_message_at: string | null;
}

export default function PortalDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/portal/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Get portal user
        const { data: pUser, error: pError } = await supabase
          .from('portal_users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (pError || !pUser) {
          toast.error('Portal account not found');
          await signOut();
          navigate('/portal/login');
          return;
        }

        setPortalUser(pUser as PortalUser);

        // Check if user has seen welcome page
        const hasSeenWelcome = localStorage.getItem(`portal_welcomed_${pUser.id}`);
        if (!hasSeenWelcome) {
          navigate('/portal/welcome');
          return;
        }

        if (!pUser.profile_completed) {
          navigate('/portal/profile');
          return;
        }

        // Get invoices, payments, and messages in parallel
        const [invRes, payRes, msgRes] = await Promise.all([
          supabase
            .from('contractor_invoices')
            .select('*')
            .eq('portal_user_id', pUser.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('portal_payment_records')
            .select('*')
            .eq('portal_user_id', pUser.id)
            .order('payment_date', { ascending: false })
            .limit(5),
          supabase
            .from('communication_participants')
            .select('thread_id')
            .eq('user_id', user.id)
        ]);

        if (invRes.data) setInvoices(invRes.data as Invoice[]);
        if (payRes.data) setPayments(payRes.data as PaymentRecord[]);
        
        // Count unread messages
        if (msgRes.data && msgRes.data.length > 0) {
          const threadIds = msgRes.data.map(p => p.thread_id);
          const { count } = await supabase
            .from('communication_messages')
            .select('*', { count: 'exact', head: true })
            .in('thread_id', threadIds)
            .neq('sender_role', 'contractor')
            .is('read_at', null);
          setUnreadMessages(count || 0);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate, signOut]);

  const handleLogout = async () => {
    await signOut();
    navigate('/portal/login');
  };

  const downloadPaymentSummary = async () => {
    if (!portalUser) return;
    
    try {
      const response = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { 
          type: 'payment_summary',
          portalUserId: portalUser.id
        }
      });

      if (response.error) throw response.error;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(response.data.html);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate payment summary');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      submitted: 'bg-amber-100 text-amber-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-emerald-100 text-emerald-800'
    };
    return <Badge className={styles[status] || styles.draft}>{status}</Badge>;
  };

  // Stats
  const draftCount = invoices.filter(i => i.status === 'draft').length;
  const pendingCount = invoices.filter(i => i.status === 'submitted').length;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = invoices
    .filter(i => ['submitted', 'approved'].includes(i.status))
    .reduce((sum, i) => sum + i.total_amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard | Wellington EcoBuild Portal</title>
      </Helmet>

      <SessionTimeoutWarning onLogout={handleLogout} />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-slate-900 dark:text-white">Wellington EcoBuild</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Contractor Portal</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DarkModeToggle />
                <Link to="/portal/communication">
                  <Button variant="ghost" size="sm" className="relative">
                    <MessageSquare className="h-4 w-4" />
                    {unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadMessages}
                      </span>
                    )}
                  </Button>
                </Link>
                <Link to="/portal/profile">
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              Welcome back, {portalUser?.legal_full_name?.split(' ')[0] || 'Contractor'}
            </h2>
            <p className="text-slate-500">Here's an overview of your invoices and payments</p>
          </div>

          {/* Primary Action - Send Email */}
          <div className="mb-6">
            <Link to="/portal/communication?compose=true" className="block">
              <Card className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 transition-all cursor-pointer border-0 shadow-lg hover:shadow-xl">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center">
                      <Mail className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">Send Email</p>
                      <p className="text-emerald-100 text-sm">Compose and send professional emails to builders, clients & construction companies</p>
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-white/80" />
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Quick Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            <Link to="/portal/invoices" className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 hover:border-emerald-300">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-2">
                    <FileText className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Invoices</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/portal/invoices/new" className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 hover:border-emerald-300">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-2">
                    <Plus className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">New Invoice</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/portal/payments" className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 hover:border-emerald-300">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center mb-2">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Payments</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/portal/timesheets" className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 hover:border-emerald-300">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center mb-2">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Timesheets</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/portal/documents" className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 hover:border-emerald-300">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
                    <FolderOpen className="h-6 w-6 text-slate-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Documents</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/portal/communication" className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 hover:border-emerald-300 relative">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-xl bg-rose-100 flex items-center justify-center mb-2 relative">
                    <MessageSquare className="h-6 w-6 text-rose-600" />
                    {unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadMessages}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-700">Messages</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/portal/call-log" className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 hover:border-emerald-300">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-2">
                    <Phone className="h-6 w-6 text-indigo-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Call Log</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Draft Invoices</p>
                    <p className="text-2xl font-bold">{draftCount}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Review</p>
                    <p className="text-2xl font-bold">{pendingCount}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Payment</p>
                    <p className="text-2xl font-bold">${pendingAmount.toLocaleString()}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-700">Total Paid</p>
                    <p className="text-2xl font-bold text-emerald-800">${totalPaid.toLocaleString()}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-emerald-200 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-emerald-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Invoices */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Recent Invoices</CardTitle>
                    <CardDescription>Your latest submitted invoices</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Link to="/portal/invoices">
                      <Button variant="outline" size="sm">
                        View All
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    <Link to="/portal/invoices/new">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" />
                        New Invoice
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {invoices.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500">No invoices yet</p>
                      <Link to="/portal/invoices/new">
                        <Button variant="outline" className="mt-4">
                          Create Your First Invoice
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <Link 
                          key={invoice.id} 
                          to="/portal/invoices"
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-slate-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                              <p className="text-sm text-slate-500">
                                {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-semibold">${invoice.total_amount?.toFixed(2)}</span>
                            {getStatusBadge(invoice.status)}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recent Payments */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Payment History</CardTitle>
                    <CardDescription>Recent payments received</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadPaymentSummary}>
                    <Download className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-6">
                      <DollarSign className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500">No payments yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {payments.slice(0, 4).map((payment) => (
                        <div 
                          key={payment.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100"
                        >
                          <div>
                            <p className="font-medium text-emerald-900">
                              ${payment.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-emerald-700">
                              {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                            </p>
                          </div>
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        </div>
                      ))}
                    </div>
                  )}
                  {payments.length > 4 && (
                    <Link to="/portal/payments" className="block mt-3">
                      <Button variant="ghost" size="sm" className="w-full">
                        View All Payments
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link to="/portal/timesheets" className="block">
                    <Button variant="outline" className="w-full justify-start bg-emerald-50 border-emerald-200 hover:bg-emerald-100">
                      <Clock className="h-4 w-4 mr-2 text-emerald-600" />
                      Submit Weekly Hours
                    </Button>
                  </Link>
                  <Link to="/portal/invoices/new" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Custom Invoice
                    </Button>
                  </Link>
                  <Link to="/portal/communication" className="block">
                    <Button variant="outline" className="w-full justify-start relative">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Contact Admin
                      {unreadMessages > 0 && (
                        <Badge className="ml-auto bg-red-500 text-white">{unreadMessages} new</Badge>
                      )}
                    </Button>
                  </Link>
                  <Link to="/portal/documents" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Upload Documents
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start" onClick={downloadPaymentSummary}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Payment Summary
                  </Button>
                </CardContent>
              </Card>

              {/* Help Card */}
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Need Help?</p>
                      <p className="text-sm text-slate-300">We're here for you</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 mb-4">
                    Have questions about invoicing, payments, or anything else? Send us a message.
                  </p>
                  <Link to="/portal/communication">
                    <Button className="w-full bg-white text-slate-900 hover:bg-slate-100">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
