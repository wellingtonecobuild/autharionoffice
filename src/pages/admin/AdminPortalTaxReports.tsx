import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FileText, 
  Download, 
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Building2,
  Printer
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, getYear, getMonth } from 'date-fns';

interface ContractorSummary {
  portal_user_id: string;
  legal_full_name: string;
  ird_number: string | null;
  gst_registered: boolean;
  total_invoiced: number;
  total_gst: number;
  total_paid: number;
  invoice_count: number;
}

interface GSTSummary {
  period: string;
  total_sales: number;
  gst_collected: number;
  net_amount: number;
}

export default function AdminPortalTaxReports() {
  const [contractors, setContractors] = useState<ContractorSummary[]>([]);
  const [gstSummary, setGstSummary] = useState<GSTSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(getYear(new Date()).toString());
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'quarterly'>('monthly');

  const currentYear = getYear(new Date());
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = new Date(parseInt(selectedYear), 0, 1);
      const endDate = new Date(parseInt(selectedYear), 11, 31);

      // Fetch all invoices for the year with portal user info
      const { data: invoices, error } = await supabase
        .from('contractor_invoices')
        .select(`
          id,
          portal_user_id,
          total_amount,
          gst_amount,
          status,
          invoice_date,
          portal_user:portal_users(legal_full_name, ird_number, gst_registered)
        `)
        .gte('invoice_date', startDate.toISOString())
        .lte('invoice_date', endDate.toISOString());

      if (error) throw error;

      // Calculate contractor summaries
      const contractorMap = new Map<string, ContractorSummary>();
      
      (invoices || []).forEach((inv: any) => {
        const id = inv.portal_user_id;
        const existing = contractorMap.get(id) || {
          portal_user_id: id,
          legal_full_name: inv.portal_user?.legal_full_name || 'Unknown',
          ird_number: inv.portal_user?.ird_number || null,
          gst_registered: inv.portal_user?.gst_registered || false,
          total_invoiced: 0,
          total_gst: 0,
          total_paid: 0,
          invoice_count: 0,
        };

        existing.total_invoiced += inv.total_amount || 0;
        existing.total_gst += inv.gst_amount || 0;
        existing.invoice_count += 1;
        if (inv.status === 'paid') {
          existing.total_paid += inv.total_amount || 0;
        }
        
        contractorMap.set(id, existing);
      });

      setContractors(Array.from(contractorMap.values()).sort((a, b) => b.total_paid - a.total_paid));

      // Calculate GST periods
      const gstPeriods: GSTSummary[] = [];
      
      if (selectedPeriod === 'monthly') {
        for (let month = 0; month < 12; month++) {
          const periodStart = new Date(parseInt(selectedYear), month, 1);
          const periodEnd = endOfMonth(periodStart);
          
          const periodInvoices = (invoices || []).filter((inv: any) => {
            const invDate = new Date(inv.invoice_date);
            return invDate >= periodStart && invDate <= periodEnd;
          });

          const totalSales = periodInvoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);
          const gstCollected = periodInvoices.reduce((sum: number, inv: any) => sum + (inv.gst_amount || 0), 0);

          gstPeriods.push({
            period: format(periodStart, 'MMMM yyyy'),
            total_sales: totalSales,
            gst_collected: gstCollected,
            net_amount: totalSales - gstCollected,
          });
        }
      } else {
        // Quarterly (NZ GST periods: Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)
        const quarters = [
          { name: 'Q1 (Jan-Mar)', start: 0, end: 2 },
          { name: 'Q2 (Apr-Jun)', start: 3, end: 5 },
          { name: 'Q3 (Jul-Sep)', start: 6, end: 8 },
          { name: 'Q4 (Oct-Dec)', start: 9, end: 11 },
        ];

        quarters.forEach(q => {
          const periodStart = new Date(parseInt(selectedYear), q.start, 1);
          const periodEnd = endOfMonth(new Date(parseInt(selectedYear), q.end, 1));
          
          const periodInvoices = (invoices || []).filter((inv: any) => {
            const invDate = new Date(inv.invoice_date);
            return invDate >= periodStart && invDate <= periodEnd;
          });

          const totalSales = periodInvoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);
          const gstCollected = periodInvoices.reduce((sum: number, inv: any) => sum + (inv.gst_amount || 0), 0);

          gstPeriods.push({
            period: `${q.name} ${selectedYear}`,
            total_sales: totalSales,
            gst_collected: gstCollected,
            net_amount: totalSales - gstCollected,
          });
        });
      }

      setGstSummary(gstPeriods);
    } catch (error) {
      console.error('Error fetching tax data:', error);
      toast.error('Failed to load tax reports');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportContractorReport = () => {
    const headers = ['Legal Name', 'IRD Number', 'GST Registered', 'Total Invoiced', 'Total GST', 'Total Paid', 'Invoice Count'];
    const rows = contractors.map(c => [
      c.legal_full_name,
      c.ird_number || 'Not provided',
      c.gst_registered ? 'Yes' : 'No',
      c.total_invoiced.toFixed(2),
      c.total_gst.toFixed(2),
      c.total_paid.toFixed(2),
      c.invoice_count
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contractor-payments-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Contractor report exported');
  };

  const exportGSTReport = () => {
    const headers = ['Period', 'Total Sales (incl GST)', 'GST Collected', 'Net Amount'];
    const rows = gstSummary.map(g => [
      g.period,
      g.total_sales.toFixed(2),
      g.gst_collected.toFixed(2),
      g.net_amount.toFixed(2)
    ]);

    // Add totals row
    const totalSales = gstSummary.reduce((sum, g) => sum + g.total_sales, 0);
    const totalGST = gstSummary.reduce((sum, g) => sum + g.gst_collected, 0);
    const totalNet = gstSummary.reduce((sum, g) => sum + g.net_amount, 0);
    rows.push(['TOTAL', totalSales.toFixed(2), totalGST.toFixed(2), totalNet.toFixed(2)]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gst-summary-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('GST report exported');
  };

  // Totals
  const totalPaid = contractors.reduce((sum, c) => sum + c.total_paid, 0);
  const totalGST = gstSummary.reduce((sum, g) => sum + g.gst_collected, 0);

  return (
    <AdminLayout title="Tax Reports">
      <div className="space-y-6">
        <AdminPageHeader
          title="Tax Period Reports"
          onRefresh={fetchData}
          showLiveIndicator
          actions={
            <div className="flex items-center gap-3">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Total Paid to Contractors</p>
                  <p className="text-3xl font-bold">${totalPaid.toLocaleString()}</p>
                </div>
                <DollarSign className="h-12 w-12 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total GST Collected</p>
                  <p className="text-3xl font-bold">${totalGST.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Active Contractors</p>
                  <p className="text-2xl font-bold">{contractors.length}</p>
                </div>
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Tax Year</p>
                  <p className="text-2xl font-bold">{selectedYear}</p>
                </div>
                <Calendar className="h-10 w-10 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* GST Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                GST Summary - {selectedYear}
              </CardTitle>
              <CardDescription>
                For IRD GST returns ({selectedPeriod === 'monthly' ? 'monthly' : 'quarterly'} breakdown)
              </CardDescription>
            </div>
            <Button variant="outline" onClick={exportGSTReport}>
              <Download className="h-4 w-4 mr-2" />
              Export GST Report
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Total Sales (incl GST)</TableHead>
                  <TableHead className="text-right">GST Collected</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : gstSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No data for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {gstSummary.map((g, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{g.period}</TableCell>
                        <TableCell className="text-right">${g.total_sales.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-blue-600 font-medium">${g.gst_collected.toLocaleString()}</TableCell>
                        <TableCell className="text-right">${g.net_amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">
                        ${gstSummary.reduce((s, g) => s + g.total_sales, 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        ${gstSummary.reduce((s, g) => s + g.gst_collected, 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${gstSummary.reduce((s, g) => s + g.net_amount, 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Contractor Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Annual Contractor Payments - {selectedYear}
              </CardTitle>
              <CardDescription>
                IR348 Schedule of Payments to Contractors
              </CardDescription>
            </div>
            <Button variant="outline" onClick={exportContractorReport}>
              <Download className="h-4 w-4 mr-2" />
              Export IR348 Report
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contractor Name</TableHead>
                  <TableHead>IRD Number</TableHead>
                  <TableHead>GST Reg.</TableHead>
                  <TableHead className="text-right">Total Invoiced</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-center">Invoices</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : contractors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No contractor data for this year
                    </TableCell>
                  </TableRow>
                ) : (
                  contractors.map((c) => (
                    <TableRow key={c.portal_user_id}>
                      <TableCell className="font-medium">{c.legal_full_name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {c.ird_number || <span className="text-amber-600">Not provided</span>}
                      </TableCell>
                      <TableCell>
                        {c.gst_registered ? (
                          <Badge className="bg-blue-100 text-blue-800">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">${c.total_invoiced.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${c.total_gst.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        ${c.total_paid.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">{c.invoice_count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
