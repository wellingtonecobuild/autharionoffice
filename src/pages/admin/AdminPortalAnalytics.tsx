import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  FileText,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, subYears } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, Legend } from 'recharts';

interface Invoice {
  id: string;
  total_amount: number;
  gst_amount: number;
  status: string;
  invoice_date: string;
  paid_at: string | null;
  portal_user: {
    role: string;
    legal_full_name: string | null;
  } | null;
}

interface MonthlyData {
  month: string;
  invoiced: number;
  paid: number;
  gst: number;
}

interface ContractorData {
  name: string;
  total: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminPortalAnalytics() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('12months');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let startDate: Date;
      const endDate = new Date();

      switch (period) {
        case '3months':
          startDate = subMonths(endDate, 3);
          break;
        case '6months':
          startDate = subMonths(endDate, 6);
          break;
        case 'ytd':
          startDate = startOfYear(endDate);
          break;
        case 'lastyear':
          startDate = startOfYear(subYears(endDate, 1));
          break;
        default:
          startDate = subMonths(endDate, 12);
      }

      const { data, error } = await supabase
        .from('contractor_invoices')
        .select(`
          id,
          total_amount,
          gst_amount,
          status,
          invoice_date,
          paid_at,
          portal_user:portal_users(role, legal_full_name)
        `)
        .gte('invoice_date', startDate.toISOString())
        .order('invoice_date', { ascending: true });

      if (error) throw error;
      setInvoices((data || []) as Invoice[]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate stats
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalGST = invoices.reduce((sum, inv) => sum + (inv.gst_amount || 0), 0);
  const pendingPayment = invoices.filter(inv => inv.status === 'approved').reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  // Monthly breakdown
  const monthlyData: MonthlyData[] = [];
  const monthMap = new Map<string, { invoiced: number; paid: number; gst: number }>();
  
  invoices.forEach(inv => {
    const month = format(new Date(inv.invoice_date), 'MMM yyyy');
    const existing = monthMap.get(month) || { invoiced: 0, paid: 0, gst: 0 };
    existing.invoiced += inv.total_amount || 0;
    existing.gst += inv.gst_amount || 0;
    if (inv.status === 'paid') {
      existing.paid += inv.total_amount || 0;
    }
    monthMap.set(month, existing);
  });

  monthMap.forEach((value, key) => {
    monthlyData.push({ month: key, ...value });
  });

  // Contractor breakdown
  const contractorMap = new Map<string, number>();
  invoices.forEach(inv => {
    if (inv.portal_user) {
      const name = inv.portal_user.legal_full_name || 'Unknown';
      contractorMap.set(name, (contractorMap.get(name) || 0) + (inv.total_amount || 0));
    }
  });

  const contractorData: ContractorData[] = Array.from(contractorMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // Status breakdown
  const statusCounts = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const exportToCSV = () => {
    const headers = ['Invoice ID', 'Date', 'Contractor', 'Amount', 'GST', 'Status', 'Paid At'];
    const rows = invoices.map(inv => [
      inv.id,
      inv.invoice_date,
      inv.portal_user?.legal_full_name || 'Unknown',
      inv.total_amount,
      inv.gst_amount,
      inv.status,
      inv.paid_at || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portal-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  return (
    <AdminLayout title="Portal Analytics">
      <div className="space-y-6">
        <AdminPageHeader
          title="Portal Analytics"
          onRefresh={fetchData}
          showLiveIndicator
          actions={
            <div className="flex items-center gap-3">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[160px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="12months">Last 12 Months</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                  <SelectItem value="lastyear">Last Year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          }
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Total Paid</p>
                  <p className="text-3xl font-bold">${totalPaid.toLocaleString()}</p>
                  <p className="text-emerald-100 text-xs mt-1">
                    {invoices.filter(i => i.status === 'paid').length} invoices
                  </p>
                </div>
                <DollarSign className="h-12 w-12 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Invoiced</p>
                  <p className="text-2xl font-bold">${totalInvoiced.toLocaleString()}</p>
                  <p className="text-muted-foreground text-xs mt-1">{invoices.length} total invoices</p>
                </div>
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-700 text-sm">Pending Payment</p>
                  <p className="text-2xl font-bold text-amber-800">${pendingPayment.toLocaleString()}</p>
                  <p className="text-amber-600 text-xs mt-1">Approved, awaiting payment</p>
                </div>
                <TrendingUp className="h-10 w-10 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-700 text-sm">Total GST Collected</p>
                  <p className="text-2xl font-bold text-blue-800">${totalGST.toLocaleString()}</p>
                  <p className="text-blue-600 text-xs mt-1">For IRD GST returns</p>
                </div>
                <BarChart3 className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Payment Trend
              </CardTitle>
              <CardDescription>Invoiced vs Paid amounts over time</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                </div>
              ) : monthlyData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Area type="monotone" dataKey="invoiced" stackId="1" stroke="#3b82f6" fill="#93c5fd" name="Invoiced" />
                    <Area type="monotone" dataKey="paid" stackId="2" stroke="#10b981" fill="#6ee7b7" name="Paid" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Contractor Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Contractors by Earnings
              </CardTitle>
              <CardDescription>Payment breakdown by contractor</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                </div>
              ) : contractorData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={contractorData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* GST Summary and Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* GST Monthly */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Monthly GST Breakdown
              </CardTitle>
              <CardDescription>GST collected for IRD reporting</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[250px] flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                </div>
              ) : monthlyData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Bar dataKey="gst" fill="#3b82f6" radius={[4, 4, 0, 0]} name="GST" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Invoice Status Distribution
              </CardTitle>
              <CardDescription>Current status of all invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[250px] flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                </div>
              ) : statusData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPie>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
