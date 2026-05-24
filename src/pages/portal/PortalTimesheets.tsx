import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { 
  Building2, 
  Clock, 
  Plus, 
  ArrowLeft, 
  Send, 
  Loader2,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  CalendarDays,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, parseISO, isWithinInterval } from 'date-fns';

interface PortalUser {
  id: string;
  email: string;
  legal_full_name: string | null;
  gst_registered: boolean;
  hourly_rate: number | null;
}

interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  description: string;
  isNew?: boolean;
}

interface SubmittedTimesheet {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  period_start: string;
  period_end: string;
  submitted_at: string;
  paid_at: string | null;
}

export default function PortalTimesheets() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [submittedTimesheets, setSubmittedTimesheets] = useState<SubmittedTimesheet[]>([]);
  
  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
  });

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
          await signOut();
          navigate('/portal/login');
          return;
        }

        if (!pUser.profile_completed) {
          toast.error('Please complete your profile first');
          navigate('/portal/profile');
          return;
        }

        setPortalUser(pUser as PortalUser);

        // Get submitted timesheets (invoices)
        const { data: invoices } = await supabase
          .from('contractor_invoices')
          .select('id, invoice_number, status, total_amount, period_start, period_end, submitted_at, paid_at')
          .eq('portal_user_id', pUser.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (invoices) {
          setSubmittedTimesheets(invoices as SubmittedTimesheet[]);
        }

        // Initialize entries for current week
        initializeWeekEntries();
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate, signOut]);

  useEffect(() => {
    initializeWeekEntries();
  }, [currentWeekStart, portalUser]);

  const initializeWeekEntries = () => {
    const newEntries: TimeEntry[] = weekDays.map(day => ({
      id: format(day, 'yyyy-MM-dd'),
      date: format(day, 'yyyy-MM-dd'),
      hours: 0,
      description: '',
      isNew: true
    }));
    setEntries(newEntries);
  };

  const updateEntry = (date: string, field: 'hours' | 'description', value: string | number) => {
    setEntries(prev => prev.map(entry => 
      entry.date === date ? { ...entry, [field]: value } : entry
    ));
  };

  const calculateTotals = () => {
    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
    const rate = portalUser?.hourly_rate || 0;
    const subtotal = totalHours * rate;
    const gst = portalUser?.gst_registered ? subtotal * 0.15 : 0;
    return { totalHours, subtotal, gst, total: subtotal + gst };
  };

  const isWeekAlreadySubmitted = () => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return submittedTimesheets.some(ts => {
      if (!ts.period_start || !ts.period_end) return false;
      const tsStart = parseISO(ts.period_start);
      const tsEnd = parseISO(ts.period_end);
      return isWithinInterval(currentWeekStart, { start: tsStart, end: tsEnd }) ||
             isWithinInterval(weekEnd, { start: tsStart, end: tsEnd });
    });
  };

  const submitTimesheet = async () => {
    const entriesWithHours = entries.filter(e => e.hours > 0);
    
    if (entriesWithHours.length === 0) {
      toast.error('Please enter hours for at least one day');
      return;
    }

    if (isWeekAlreadySubmitted()) {
      toast.error('This week has already been submitted');
      return;
    }

    setSubmitting(true);

    try {
      const totals = calculateTotals();
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      
      // Generate invoice number
      const { data: invoiceNum } = await supabase.rpc('generate_invoice_number');
      
      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('contractor_invoices')
        .insert({
          invoice_number: invoiceNum || `TS-${Date.now()}`,
          portal_user_id: portalUser!.id,
          invoice_date: new Date().toISOString().split('T')[0],
          period_start: format(currentWeekStart, 'yyyy-MM-dd'),
          period_end: format(weekEnd, 'yyyy-MM-dd'),
          description: `Timesheet for week ${format(currentWeekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM yyyy')}`,
          subtotal: totals.subtotal,
          gst_amount: totals.gst,
          total_amount: totals.total,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create line items for each day with hours
      const lineItems = entriesWithHours.map((entry, index) => ({
        invoice_id: invoice.id,
        description: entry.description || `Work on ${format(parseISO(entry.date), 'EEEE, dd MMM')}`,
        quantity: entry.hours,
        unit_price: portalUser?.hourly_rate || 0,
        amount: entry.hours * (portalUser?.hourly_rate || 0),
        date_of_service: entry.date,
        sort_order: index
      }));

      const { error: itemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItems);

      if (itemsError) throw itemsError;

      // Notify admin
      supabase.functions.invoke('portal-invoice-action', {
        body: { invoiceId: invoice.id, action: 'submit' }
      }).catch(console.error);

      toast.success('Timesheet submitted for approval!');
      
      // Refresh submitted timesheets
      setSubmittedTimesheets(prev => [{
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        status: 'submitted',
        total_amount: totals.total,
        period_start: format(currentWeekStart, 'yyyy-MM-dd'),
        period_end: format(weekEnd, 'yyyy-MM-dd'),
        submitted_at: new Date().toISOString(),
        paid_at: null
      }, ...prev]);

      // Move to next week
      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    } catch (error: any) {
      console.error('Error submitting timesheet:', error);
      toast.error(error.message || 'Failed to submit timesheet');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, paidAt: string | null) => {
    if (paidAt) {
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          PAID
        </Badge>
      );
    }
    
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      submitted: { bg: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="h-3 w-3 mr-1" /> },
      approved: { bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      rejected: { bg: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
    };
    
    const style = styles[status] || styles.submitted;
    return (
      <Badge className={style.bg}>
        {style.icon}
        {status.toUpperCase()}
      </Badge>
    );
  };

  const totals = calculateTotals();

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
        <title>Timesheets | Wellington EcoBuild Portal</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Link to="/portal/dashboard" className="text-slate-500 hover:text-slate-700">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-slate-900">Weekly Timesheets</h1>
                  <p className="text-xs text-slate-500">Submit your hours for payment</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Timesheet Entry */}
            <div className="lg:col-span-2 space-y-6">
              {/* Week Navigation */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous Week
                    </Button>
                    <div className="text-center">
                      <p className="font-semibold text-slate-900">
                        {format(currentWeekStart, 'dd MMM')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd MMM yyyy')}
                      </p>
                      <p className="text-xs text-slate-500">Week {format(currentWeekStart, 'w')} of {format(currentWeekStart, 'yyyy')}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
                    >
                      Next Week
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Already Submitted Warning */}
              {isWeekAlreadySubmitted() && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">Week Already Submitted</p>
                    <p className="text-sm text-amber-700">This week has already been submitted. Select a different week.</p>
                  </div>
                </div>
              )}

              {/* Timesheet Grid */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Enter Hours
                  </CardTitle>
                  <CardDescription>
                    Record your working hours for each day. Your hourly rate: 
                    <span className="font-semibold text-slate-900 ml-1">
                      ${portalUser?.hourly_rate?.toFixed(2) || '0.00'}/hr
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {entries.map((entry) => {
                      const date = parseISO(entry.date);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      
                      return (
                        <div 
                          key={entry.id} 
                          className={`p-4 rounded-lg border ${isWeekend ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="w-32 flex-shrink-0">
                              <p className={`font-medium ${isWeekend ? 'text-slate-500' : 'text-slate-900'}`}>
                                {format(date, 'EEEE')}
                              </p>
                              <p className="text-sm text-slate-500">{format(date, 'dd MMM')}</p>
                            </div>
                            
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <Label className="text-xs">Hours</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="24"
                                  step="0.5"
                                  value={entry.hours || ''}
                                  onChange={(e) => updateEntry(entry.date, 'hours', parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="h-9"
                                  disabled={isWeekAlreadySubmitted()}
                                />
                              </div>
                              
                              <div className="sm:col-span-2 space-y-1">
                                <Label className="text-xs">Description (optional)</Label>
                                <Input
                                  value={entry.description}
                                  onChange={(e) => updateEntry(entry.date, 'description', e.target.value)}
                                  placeholder="What did you work on?"
                                  className="h-9"
                                  disabled={isWeekAlreadySubmitted()}
                                />
                              </div>
                            </div>
                            
                            <div className="w-24 text-right flex-shrink-0">
                              <p className="text-sm text-slate-500">Amount</p>
                              <p className="font-semibold text-slate-900">
                                ${(entry.hours * (portalUser?.hourly_rate || 0)).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Summary Card */}
              <Card className="sticky top-24">
                <CardHeader className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-t-lg">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Weekly Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total Hours</span>
                      <span className="text-2xl font-bold text-slate-900">{totals.totalHours.toFixed(1)}</span>
                    </div>
                    
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Subtotal</span>
                        <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                      </div>
                      {portalUser?.gst_registered && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">GST (15%)</span>
                          <span>${totals.gst.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Total Amount</span>
                        <span className="text-emerald-600">${totals.total.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button 
                      onClick={submitTimesheet}
                      disabled={submitting || totals.totalHours === 0 || isWeekAlreadySubmitted()}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 mt-4"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit for Approval
                        </>
                      )}
                    </Button>

                    {!portalUser?.gst_registered && (
                      <p className="text-xs text-slate-500 text-center">
                        Not GST registered
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Submissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  {submittedTimesheets.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No submissions yet</p>
                  ) : (
                    <div className="space-y-3">
                      {submittedTimesheets.slice(0, 5).map((ts) => (
                        <div 
                          key={ts.id} 
                          className={`p-3 rounded-lg border ${ts.paid_at ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{ts.invoice_number}</span>
                            {getStatusBadge(ts.status, ts.paid_at)}
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span>
                              {ts.period_start && ts.period_end 
                                ? `${format(parseISO(ts.period_start), 'dd MMM')} - ${format(parseISO(ts.period_end), 'dd MMM')}`
                                : 'N/A'
                              }
                            </span>
                            <span className="font-semibold text-slate-900">${ts.total_amount?.toFixed(2)}</span>
                          </div>
                          {ts.paid_at && (
                            <p className="text-xs text-emerald-700 mt-1">
                              Paid on {format(parseISO(ts.paid_at), 'dd MMM yyyy')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Link to="/portal/payments" className="block mt-4">
                    <Button variant="outline" size="sm" className="w-full">
                      View All Payments
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
