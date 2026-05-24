import { useState, useCallback, useEffect } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFinancialData } from '@/hooks/useFinancialData';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears, parseISO } from 'date-fns';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  RefreshCw, 
  Download, 
  Plus,
  FileText,
  Calendar,
  Building,
  BarChart3,
  Send,
  Loader2,
  Trash2,
  Lock,
  Database,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  FileCheck,
  Stamp,
  Scale,
  Landmark,
  Receipt,
  ClipboardCheck,
  History
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// GST Rate in New Zealand
const GST_RATE = 0.15;
const NZ_IRD_LOGO = "🏛️"; // Government symbol placeholder

export default function AdminRevenue() {
  const { 
    transactions, 
    metrics, 
    loading, 
    syncing, 
    dateRange, 
    setDateRange,
    syncStripeData,
    addManualEntry,
    deleteTransaction,
    logAuditAction
  } = useFinancialData();

  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [sendingReceipt, setSendingReceipt] = useState<string | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<string | null>(null);
  const [reportPeriod, setReportPeriod] = useState<'monthly' | 'quarterly' | 'annually'>('monthly');
  const [selectedReportDate, setSelectedReportDate] = useState(new Date());
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [manualForm, setManualForm] = useState({
    amount: '',
    paymentType: 'subscription',
    businessName: '',
    businessEmail: '',
    notes: ''
  });

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    setLoadingAuditLogs(true);
    try {
      const { data, error } = await supabase
        .from('financial_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const handleSendReceipt = async (transaction: typeof transactions[0]) => {
    if (!transaction.business_email) {
      toast.error('No email address available for this transaction');
      return;
    }

    setSendingReceipt(transaction.id);
    try {
      const { error } = await supabase.functions.invoke('notify-payment-status', {
        body: {
          businessId: transaction.business_id || '',
          status: 'payment_received',
          businessName: transaction.business_name,
          businessEmail: transaction.business_email,
          plan: transaction.subscription_tier || transaction.payment_type,
          amount: Number(transaction.amount_nzd),
          transactionId: transaction.transaction_id,
          paymentDate: transaction.created_at
        }
      });

      if (error) throw error;
      
      await logAuditAction('send_receipt', { 
        transaction_id: transaction.transaction_id,
        business_email: transaction.business_email 
      });
      
      toast.success(`Receipt sent to ${transaction.business_email}`);
    } catch (error: any) {
      console.error('Error sending receipt:', error);
      toast.error('Failed to send receipt');
    } finally {
      setSendingReceipt(null);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    setDeletingTransaction(transactionId);
    try {
      await deleteTransaction(transactionId);
      toast.success('Transaction deleted');
    } catch (error) {
      toast.error('Failed to delete transaction');
    } finally {
      setDeletingTransaction(null);
    }
  };

  useAutoRefresh(useCallback(() => { syncStripeData(); }, [syncStripeData]));

  const handleSyncStripe = async () => {
    try {
      const result = await syncStripeData();
      toast.success(result?.message || 'Stripe data synced successfully');
    } catch (error) {
      toast.error('Failed to sync Stripe data');
    }
  };

  const handleAddManualEntry = async () => {
    if (!manualForm.amount || !manualForm.businessName) {
      toast.error('Amount and business name are required');
      return;
    }

    try {
      await addManualEntry({
        amount_nzd: parseFloat(manualForm.amount),
        payment_type: manualForm.paymentType,
        business_name: manualForm.businessName,
        business_email: manualForm.businessEmail || undefined,
        notes: manualForm.notes || undefined
      });
      toast.success('Manual entry added successfully');
      setManualEntryOpen(false);
      setManualForm({ amount: '', paymentType: 'subscription', businessName: '', businessEmail: '', notes: '' });
    } catch (error) {
      toast.error('Failed to add manual entry');
    }
  };

  // Get period dates based on selection
  const getPeriodDates = (period: 'monthly' | 'quarterly' | 'annually', date: Date) => {
    switch (period) {
      case 'monthly':
        return { start: startOfMonth(date), end: endOfMonth(date) };
      case 'quarterly':
        return { start: startOfQuarter(date), end: endOfQuarter(date) };
      case 'annually':
        return { start: startOfYear(date), end: endOfYear(date) };
    }
  };

  // Filter transactions for period
  const getTransactionsForPeriod = (start: Date, end: Date) => {
    return transactions.filter(t => {
      const date = new Date(t.created_at);
      return date >= start && date <= end;
    });
  };

  const exportToCSV = async () => {
    await logAuditAction('export_csv', { transaction_count: transactions.length, date_range: dateRange });
    
    const headers = ['Date', 'Transaction ID', 'Business Name', 'Email', 'Gross Amount (NZD)', 'GST Component', 'Net Amount', 'Type', 'Tier', 'Status', 'Manual', 'Stripe Invoice', 'IRD Reference'];
    const rows = transactions.map(t => {
      const gst = Number(t.gst_amount);
      const gross = Number(t.amount_nzd);
      const net = gross - gst;
      return [
        format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss'),
        t.transaction_id,
        t.business_name,
        t.business_email || '',
        gross.toFixed(2),
        gst.toFixed(2),
        net.toFixed(2),
        t.payment_type,
        t.subscription_tier || '',
        t.payment_status,
        t.is_manual ? 'Yes' : 'No',
        t.stripe_invoice_id || '',
        `IRD-${format(new Date(t.created_at), 'yyyyMMdd')}-${t.transaction_id.slice(-6).toUpperCase()}`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wellington-ecobuild-revenue-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  // Enhanced government-level PDF export
  const exportToOfficialPDF = async (reportType: 'financial' | 'gst' | 'income-verification' | 'tax-summary') => {
    await logAuditAction(`export_${reportType}_pdf`, { transaction_count: transactions.length, date_range: dateRange, report_type: reportType });
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to export PDF');
      return;
    }

    const { start, end } = getPeriodDates(reportPeriod, selectedReportDate);
    const periodTransactions = getTransactionsForPeriod(start, end);
    
    const totalGross = periodTransactions.reduce((sum, t) => sum + Number(t.amount_nzd), 0);
    const totalGst = periodTransactions.reduce((sum, t) => sum + Number(t.gst_amount), 0);
    const totalNet = totalGross - totalGst;
    
    const documentId = `WEB-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const reportPeriodLabel = reportPeriod === 'monthly' 
      ? format(selectedReportDate, 'MMMM yyyy')
      : reportPeriod === 'quarterly'
      ? `Q${Math.ceil((selectedReportDate.getMonth() + 1) / 3)} ${format(selectedReportDate, 'yyyy')}`
      : format(selectedReportDate, 'yyyy');

    let reportContent = '';

    if (reportType === 'financial') {
      reportContent = generateFinancialReport(periodTransactions, totalGross, totalGst, totalNet, documentId, reportPeriodLabel, start, end);
    } else if (reportType === 'gst') {
      reportContent = generateGSTReturn(periodTransactions, totalGross, totalGst, totalNet, documentId, reportPeriodLabel, start, end);
    } else if (reportType === 'income-verification') {
      reportContent = generateIncomeVerification(totalGross, totalNet, documentId, reportPeriodLabel);
    } else if (reportType === 'tax-summary') {
      reportContent = generateTaxSummary(periodTransactions, totalGross, totalGst, totalNet, documentId, reportPeriodLabel, start, end);
    }

    printWindow.document.write(reportContent);
    printWindow.document.close();
    printWindow.print();
    toast.success(`${reportType === 'gst' ? 'GST Return' : reportType === 'income-verification' ? 'Income Verification' : reportType === 'tax-summary' ? 'Tax Summary' : 'Financial Report'} generated`);
  };

  // Generate comprehensive financial report
  const generateFinancialReport = (periodTx: any[], totalGross: number, totalGst: number, totalNet: number, docId: string, periodLabel: string, start: Date, end: Date) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Wellington EcoBuild - Official Financial Statement</title>
          <style>
            ${getOfficialStyles()}
          </style>
        </head>
        <body>
          ${getDocumentHeader('OFFICIAL FINANCIAL STATEMENT', docId)}
          
          <div class="classification">CONFIDENTIAL • FOR OFFICIAL USE ONLY</div>
          
          <div class="entity-info">
            <div class="entity-section">
              <h3>REPORTING ENTITY</h3>
              <table class="info-table">
                <tr><td class="label">Legal Name:</td><td class="value">Wellington EcoBuild Limited</td></tr>
                <tr><td class="label">Trading As:</td><td class="value">Wellington EcoBuild</td></tr>
                <tr><td class="label">Founder & CEO:</td><td class="value">Beveck Chiwawa</td></tr>
                <tr><td class="label">Domain:</td><td class="value">wellingtonecobuild.nz</td></tr>
                <tr><td class="label">Industry:</td><td class="value">Construction Directory Services (ANZSIC M6920)</td></tr>
                <tr><td class="label">GST Registered:</td><td class="value">Yes</td></tr>
              </table>
            </div>
            <div class="entity-section">
              <h3>REPORT PARAMETERS</h3>
              <table class="info-table">
                <tr><td class="label">Reporting Period:</td><td class="value">${periodLabel}</td></tr>
                <tr><td class="label">Period Start:</td><td class="value">${format(start, 'dd MMMM yyyy')}</td></tr>
                <tr><td class="label">Period End:</td><td class="value">${format(end, 'dd MMMM yyyy')}</td></tr>
                <tr><td class="label">Currency:</td><td class="value">New Zealand Dollar (NZD)</td></tr>
                <tr><td class="label">GST Rate:</td><td class="value">15%</td></tr>
              </table>
            </div>
          </div>

          <div class="section">
            <h2>EXECUTIVE SUMMARY</h2>
            <div class="summary-grid">
              <div class="summary-card primary">
                <div class="card-label">TOTAL GROSS REVENUE</div>
                <div class="card-value">$${totalGross.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</div>
                <div class="card-note">Including GST</div>
              </div>
              <div class="summary-card">
                <div class="card-label">GST COLLECTED</div>
                <div class="card-value">$${totalGst.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</div>
                <div class="card-note">Payable to IRD</div>
              </div>
              <div class="summary-card">
                <div class="card-label">NET REVENUE</div>
                <div class="card-value">$${totalNet.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</div>
                <div class="card-note">Excluding GST</div>
              </div>
              <div class="summary-card">
                <div class="card-label">TRANSACTIONS</div>
                <div class="card-value">${periodTx.length}</div>
                <div class="card-note">This Period</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>REVENUE BREAKDOWN BY CATEGORY</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Revenue Category</th>
                  <th class="right">Transaction Count</th>
                  <th class="right">Gross Revenue (NZD)</th>
                  <th class="right">GST Component</th>
                  <th class="right">Net Revenue (NZD)</th>
                </tr>
              </thead>
              <tbody>
                ${generateCategoryBreakdown(periodTx)}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td><strong>TOTAL</strong></td>
                  <td class="right"><strong>${periodTx.length}</strong></td>
                  <td class="right"><strong>$${totalGross.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</strong></td>
                  <td class="right"><strong>$${totalGst.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</strong></td>
                  <td class="right"><strong>$${totalNet.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="section">
            <h2>DETAILED TRANSACTION LEDGER</h2>
            <table class="data-table compact">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th class="right">Gross (NZD)</th>
                  <th class="right">GST</th>
                  <th class="right">Net (NZD)</th>
                </tr>
              </thead>
              <tbody>
                ${periodTx.map(t => `
                  <tr>
                    <td class="mono">${format(new Date(t.created_at), 'dd/MM/yyyy')}</td>
                    <td class="mono">${t.transaction_id.slice(-8).toUpperCase()}</td>
                    <td>${t.business_name}${t.is_manual ? ' <span class="manual-badge">MANUAL</span>' : ''}</td>
                    <td>${(t.subscription_tier || t.payment_type).toUpperCase()}</td>
                    <td class="right mono">$${Number(t.amount_nzd).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</td>
                    <td class="right mono">$${Number(t.gst_amount).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</td>
                    <td class="right mono">$${(Number(t.amount_nzd) - Number(t.gst_amount)).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          ${getDocumentFooter(docId)}
        </body>
      </html>
    `;
  };

  // Generate GST Return
  const generateGSTReturn = (periodTx: any[], totalGross: number, totalGst: number, totalNet: number, docId: string, periodLabel: string, start: Date, end: Date) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Wellington EcoBuild - GST Return</title>
          <style>
            ${getOfficialStyles()}
            .gst-box { border: 3px solid #1e293b; padding: 20px; margin: 20px 0; background: #f8fafc; }
            .gst-box h3 { margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
            .gst-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .gst-row:last-child { border-bottom: none; }
            .gst-row.total { background: #1e293b; color: white; margin: 10px -20px -20px; padding: 15px 20px; }
            .box-number { display: inline-block; background: #1e293b; color: white; padding: 2px 8px; font-size: 10px; margin-right: 10px; }
          </style>
        </head>
        <body>
          ${getDocumentHeader('GST RETURN WORKSHEET', docId)}
          
          <div class="classification">TAX DOCUMENT • IRD REFERENCE COPY</div>
          
          <div class="entity-info">
            <div class="entity-section">
              <h3>REGISTERED PERSON</h3>
              <table class="info-table">
                <tr><td class="label">Name:</td><td class="value">Wellington EcoBuild Limited</td></tr>
                <tr><td class="label">Director:</td><td class="value">Beveck Chiwawa (Founder & CEO)</td></tr>
                <tr><td class="label">Filing Basis:</td><td class="value">Invoice Basis</td></tr>
                <tr><td class="label">Filing Frequency:</td><td class="value">${reportPeriod === 'monthly' ? 'Monthly' : reportPeriod === 'quarterly' ? 'Two-Monthly' : 'Six-Monthly'}</td></tr>
              </table>
            </div>
            <div class="entity-section">
              <h3>RETURN PERIOD</h3>
              <table class="info-table">
                <tr><td class="label">Period:</td><td class="value">${periodLabel}</td></tr>
                <tr><td class="label">From:</td><td class="value">${format(start, 'dd MMMM yyyy')}</td></tr>
                <tr><td class="label">To:</td><td class="value">${format(end, 'dd MMMM yyyy')}</td></tr>
              </table>
            </div>
          </div>

          <div class="gst-box">
            <h3>OUTPUT TAX (GST COLLECTED ON SALES)</h3>
            <div class="gst-row">
              <span><span class="box-number">5</span> Total sales and income (including GST)</span>
              <span class="mono"><strong>$${totalGross.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</strong></span>
            </div>
            <div class="gst-row">
              <span><span class="box-number">6</span> Zero-rated supplies</span>
              <span class="mono">$0.00</span>
            </div>
            <div class="gst-row">
              <span><span class="box-number">7</span> Total taxable supplies (Box 5 minus Box 6)</span>
              <span class="mono"><strong>$${totalGross.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</strong></span>
            </div>
            <div class="gst-row total">
              <span><span class="box-number">8</span> GST collected on sales</span>
              <span class="mono"><strong>$${totalGst.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</strong></span>
            </div>
          </div>

          <div class="gst-box">
            <h3>INPUT TAX (GST PAID ON PURCHASES)</h3>
            <div class="gst-row">
              <span><span class="box-number">11</span> Total purchases and expenses (including GST)</span>
              <span class="mono">$0.00 *</span>
            </div>
            <div class="gst-row total">
              <span><span class="box-number">13</span> GST credit claimed</span>
              <span class="mono"><strong>$0.00</strong></span>
            </div>
          </div>

          <div class="gst-box" style="border-color: #16a34a; background: #f0fdf4;">
            <h3 style="color: #16a34a;">GST TO PAY / REFUND</h3>
            <div class="gst-row">
              <span><span class="box-number" style="background: #16a34a;">15</span> GST to pay (Box 8 minus Box 13)</span>
              <span class="mono" style="font-size: 24px;"><strong>$${totalGst.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</strong></span>
            </div>
          </div>

          <div class="note-box">
            <p><strong>* Note:</strong> Input tax claims for business expenses should be calculated separately and added to Box 11. This worksheet shows sales data only.</p>
            <p style="margin-top: 10px;">This document is a working copy for GST calculation purposes. The official return must be filed through myIR.</p>
          </div>

          <div class="section">
            <h2>SUPPORTING TRANSACTION SCHEDULE</h2>
            <table class="data-table compact">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice/Reference</th>
                  <th>Customer</th>
                  <th class="right">Taxable Supply</th>
                  <th class="right">GST @ 15%</th>
                </tr>
              </thead>
              <tbody>
                ${periodTx.map(t => `
                  <tr>
                    <td class="mono">${format(new Date(t.created_at), 'dd/MM/yyyy')}</td>
                    <td class="mono">${t.stripe_invoice_id || t.transaction_id.slice(-10).toUpperCase()}</td>
                    <td>${t.business_name}</td>
                    <td class="right mono">$${(Number(t.amount_nzd) - Number(t.gst_amount)).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</td>
                    <td class="right mono">$${Number(t.gst_amount).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="3"><strong>TOTAL TAXABLE SUPPLIES</strong></td>
                  <td class="right"><strong>$${totalNet.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</strong></td>
                  <td class="right"><strong>$${totalGst.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          ${getDocumentFooter(docId)}
        </body>
      </html>
    `;
  };

  // Generate Income Verification Certificate
  const generateIncomeVerification = (totalGross: number, totalNet: number, docId: string, periodLabel: string) => {
    const allTimeGross = transactions.reduce((sum, t) => sum + Number(t.amount_nzd), 0);
    const allTimeNet = transactions.reduce((sum, t) => sum + Number(t.amount_nzd) - Number(t.gst_amount), 0);
    const avgMonthlyGross = metrics?.revenueThisYear ? metrics.revenueThisYear / 12 : 0;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Wellington EcoBuild - Income Verification Certificate</title>
          <style>
            ${getOfficialStyles()}
            .certificate { border: 5px double #1e293b; padding: 40px; margin: 30px 0; position: relative; }
            .certificate::before { content: ''; position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px; border: 1px solid #94a3b8; pointer-events: none; }
            .certificate-title { text-align: center; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 30px; }
            .certificate-body { font-size: 14px; line-height: 2; text-align: justify; }
            .highlight-value { font-weight: bold; font-size: 16px; background: #fef3c7; padding: 2px 8px; }
            .signature-block { margin-top: 50px; display: flex; justify-content: space-between; }
            .signature-line { width: 200px; border-top: 2px solid #1e293b; padding-top: 10px; text-align: center; }
            .seal { position: absolute; right: 50px; bottom: 80px; width: 100px; height: 100px; border: 3px solid #1e293b; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; text-transform: uppercase; text-align: center; transform: rotate(-15deg); }
          </style>
        </head>
        <body>
          ${getDocumentHeader('INCOME VERIFICATION CERTIFICATE', docId)}
          
          <div class="classification">OFFICIAL DOCUMENT • SUITABLE FOR THIRD PARTY VERIFICATION</div>

          <div class="certificate">
            <div class="certificate-title">Certificate of Income Verification</div>
            
            <div class="certificate-body">
              <p>This is to certify that <strong>Wellington EcoBuild Limited</strong>, trading as <strong>Wellington EcoBuild</strong>, operating the online platform at <strong>wellingtonecobuild.nz</strong>, has generated the following verified income:</p>

              <table style="width: 100%; margin: 30px 0; border-collapse: collapse;">
                <tr style="background: #f8fafc;">
                  <td style="padding: 15px; border: 1px solid #e2e8f0; font-weight: bold;">Period Under Review</td>
                  <td style="padding: 15px; border: 1px solid #e2e8f0;">${periodLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 15px; border: 1px solid #e2e8f0; font-weight: bold;">Gross Revenue (Incl. GST)</td>
                  <td style="padding: 15px; border: 1px solid #e2e8f0; font-size: 18px;"><strong>$${totalGross.toLocaleString('en-NZ', { minimumFractionDigits: 2 })} NZD</strong></td>
                </tr>
                <tr style="background: #f8fafc;">
                  <td style="padding: 15px; border: 1px solid #e2e8f0; font-weight: bold;">Net Revenue (Excl. GST)</td>
                  <td style="padding: 15px; border: 1px solid #e2e8f0; font-size: 18px;"><strong>$${totalNet.toLocaleString('en-NZ', { minimumFractionDigits: 2 })} NZD</strong></td>
                </tr>
                <tr>
                  <td style="padding: 15px; border: 1px solid #e2e8f0; font-weight: bold;">Lifetime Total Revenue</td>
                  <td style="padding: 15px; border: 1px solid #e2e8f0;"><strong>$${allTimeGross.toLocaleString('en-NZ', { minimumFractionDigits: 2 })} NZD</strong></td>
                </tr>
                <tr style="background: #f8fafc;">
                  <td style="padding: 15px; border: 1px solid #e2e8f0; font-weight: bold;">Average Monthly Revenue (Est.)</td>
                  <td style="padding: 15px; border: 1px solid #e2e8f0;"><strong>$${avgMonthlyGross.toLocaleString('en-NZ', { minimumFractionDigits: 2 })} NZD</strong></td>
                </tr>
              </table>

              <p>The above figures are derived from our official financial records and payment processing systems (Stripe). All transactions are subject to audit and have been recorded in accordance with New Zealand financial reporting standards.</p>

              <p>This certificate is issued for the purpose of income verification and may be relied upon by financial institutions, government agencies, and other authorised parties conducting due diligence.</p>
            </div>

            <div class="signature-block">
              <div class="signature-line">
                <div style="font-style: italic; margin-bottom: 5px;">Beveck Chiwawa</div>
                <div>Founder & CEO</div>
                <div style="font-size: 10px; color: #64748b;">Wellington EcoBuild</div>
              </div>
              <div class="signature-line">
                <div>Date of Issue</div>
                <div style="font-weight: bold;">${format(new Date(), 'dd MMMM yyyy')}</div>
              </div>
            </div>

            <div class="seal">
              <div>
                <div style="font-size: 16px;">⚡</div>
                OFFICIAL<br/>DOCUMENT
              </div>
            </div>
          </div>

          <div class="note-box">
            <p><strong>Verification:</strong> The authenticity of this document can be verified by contacting Wellington EcoBuild directly. Document Reference: <span class="mono">${docId}</span></p>
          </div>

          ${getDocumentFooter(docId)}
        </body>
      </html>
    `;
  };

  // Generate Tax Summary Report
  const generateTaxSummary = (periodTx: any[], totalGross: number, totalGst: number, totalNet: number, docId: string, periodLabel: string, start: Date, end: Date) => {
    // Monthly breakdown
    const monthlyBreakdown: { [key: string]: { gross: number; gst: number; count: number } } = {};
    periodTx.forEach(t => {
      const month = format(new Date(t.created_at), 'MMM yyyy');
      if (!monthlyBreakdown[month]) {
        monthlyBreakdown[month] = { gross: 0, gst: 0, count: 0 };
      }
      monthlyBreakdown[month].gross += Number(t.amount_nzd);
      monthlyBreakdown[month].gst += Number(t.gst_amount);
      monthlyBreakdown[month].count++;
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Wellington EcoBuild - Tax Summary Report</title>
          <style>
            ${getOfficialStyles()}
          </style>
        </head>
        <body>
          ${getDocumentHeader('ANNUAL TAX SUMMARY REPORT', docId)}
          
          <div class="classification">TAX COMPLIANCE DOCUMENT • FOR IRD PURPOSES</div>
          
          <div class="entity-info">
            <div class="entity-section">
              <h3>TAXPAYER INFORMATION</h3>
              <table class="info-table">
                <tr><td class="label">Legal Entity:</td><td class="value">Wellington EcoBuild Limited</td></tr>
                <tr><td class="label">Director:</td><td class="value">Beveck Chiwawa (Founder & CEO)</td></tr>
                <tr><td class="label">Nature of Business:</td><td class="value">Online Business Directory Services</td></tr>
                <tr><td class="label">Accounting Basis:</td><td class="value">Accrual</td></tr>
                <tr><td class="label">Balance Date:</td><td class="value">31 March</td></tr>
              </table>
            </div>
            <div class="entity-section">
              <h3>TAX PERIOD</h3>
              <table class="info-table">
                <tr><td class="label">Financial Year:</td><td class="value">${periodLabel}</td></tr>
                <tr><td class="label">From:</td><td class="value">${format(start, 'dd MMMM yyyy')}</td></tr>
                <tr><td class="label">To:</td><td class="value">${format(end, 'dd MMMM yyyy')}</td></tr>
              </table>
            </div>
          </div>

          <div class="section">
            <h2>INCOME SUMMARY</h2>
            <div class="summary-grid" style="grid-template-columns: repeat(3, 1fr);">
              <div class="summary-card primary">
                <div class="card-label">GROSS INCOME</div>
                <div class="card-value">$${totalGross.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</div>
                <div class="card-note">Total receipts incl. GST</div>
              </div>
              <div class="summary-card">
                <div class="card-label">GST LIABILITY</div>
                <div class="card-value">$${totalGst.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</div>
                <div class="card-note">Output tax payable</div>
              </div>
              <div class="summary-card">
                <div class="card-label">TAXABLE INCOME</div>
                <div class="card-value">$${totalNet.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</div>
                <div class="card-note">Subject to income tax</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>MONTHLY INCOME SCHEDULE</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th class="right">Transactions</th>
                  <th class="right">Gross Revenue</th>
                  <th class="right">GST Component</th>
                  <th class="right">Net Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(monthlyBreakdown).map(([month, data]) => `
                  <tr>
                    <td>${month}</td>
                    <td class="right">${data.count}</td>
                    <td class="right mono">$${data.gross.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</td>
                    <td class="right mono">$${data.gst.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</td>
                    <td class="right mono">$${(data.gross - data.gst).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td><strong>ANNUAL TOTAL</strong></td>
                  <td class="right"><strong>${periodTx.length}</strong></td>
                  <td class="right"><strong>$${totalGross.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</strong></td>
                  <td class="right"><strong>$${totalGst.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</strong></td>
                  <td class="right"><strong>$${totalNet.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="section">
            <h2>TAX OBLIGATIONS CHECKLIST</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Tax Type</th>
                  <th>Filing Requirement</th>
                  <th>Estimated Liability</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>GST</strong></td>
                  <td>As per registration frequency</td>
                  <td class="mono">$${totalGst.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</td>
                  <td><span style="color: #16a34a;">●</span> Filed via myIR</td>
                </tr>
                <tr>
                  <td><strong>Income Tax</strong></td>
                  <td>IR4 Company Return</td>
                  <td class="mono">Calculated by accountant</td>
                  <td><span style="color: #ca8a04;">●</span> Due 7 months after balance date</td>
                </tr>
                <tr>
                  <td><strong>FBT</strong></td>
                  <td>If applicable</td>
                  <td class="mono">N/A</td>
                  <td><span style="color: #64748b;">●</span> Not applicable</td>
                </tr>
                <tr>
                  <td><strong>PAYE</strong></td>
                  <td>If employees</td>
                  <td class="mono">Separate payroll records</td>
                  <td><span style="color: #64748b;">●</span> See payroll system</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="note-box">
            <p><strong>Disclaimer:</strong> This summary is provided for informational purposes and to assist with tax preparation. Final tax obligations should be calculated by a qualified tax professional and filed through the appropriate IRD channels.</p>
          </div>

          ${getDocumentFooter(docId)}
        </body>
      </html>
    `;
  };

  // Helper: Generate category breakdown
  const generateCategoryBreakdown = (periodTx: any[]) => {
    const categories: { [key: string]: { count: number; gross: number; gst: number } } = {};
    periodTx.forEach(t => {
      const cat = t.subscription_tier || t.payment_type || 'Other';
      if (!categories[cat]) {
        categories[cat] = { count: 0, gross: 0, gst: 0 };
      }
      categories[cat].count++;
      categories[cat].gross += Number(t.amount_nzd);
      categories[cat].gst += Number(t.gst_amount);
    });

    return Object.entries(categories).map(([category, data]) => `
      <tr>
        <td>${category.charAt(0).toUpperCase() + category.slice(1)} Subscriptions</td>
        <td class="right">${data.count}</td>
        <td class="right mono">$${data.gross.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</td>
        <td class="right mono">$${data.gst.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</td>
        <td class="right mono">$${(data.gross - data.gst).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');
  };

  // Helper: Official document styles
  const getOfficialStyles = () => `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Times New Roman', Georgia, serif; 
      padding: 40px; 
      background: #fff; 
      color: #1e293b; 
      font-size: 11px;
      line-height: 1.5;
    }
    .document-header {
      border-bottom: 4px solid #1e293b;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .document-header h1 {
      font-size: 24px;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .document-header .subtitle {
      font-size: 14px;
      letter-spacing: 2px;
      color: #64748b;
      text-transform: uppercase;
    }
    .document-meta {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      font-size: 10px;
      color: #64748b;
    }
    .classification {
      background: #1e293b;
      color: white;
      text-align: center;
      padding: 8px;
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: -20px -40px 20px;
    }
    .entity-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin: 30px 0;
      padding: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .entity-section h3 {
      font-size: 10px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
    }
    .info-table { width: 100%; }
    .info-table td { padding: 3px 0; }
    .info-table .label { color: #64748b; width: 40%; }
    .info-table .value { font-weight: 600; }
    .section { margin: 30px 0; }
    .section h2 {
      font-size: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #1e293b;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 5px;
      margin-bottom: 15px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
    }
    .summary-card {
      border: 2px solid #e2e8f0;
      padding: 15px;
      text-align: center;
    }
    .summary-card.primary {
      border-color: #1e293b;
      background: #1e293b;
      color: white;
    }
    .summary-card .card-label {
      font-size: 9px;
      letter-spacing: 1px;
      text-transform: uppercase;
      opacity: 0.7;
    }
    .summary-card .card-value {
      font-size: 22px;
      font-weight: bold;
      margin: 5px 0;
    }
    .summary-card .card-note {
      font-size: 9px;
      opacity: 0.6;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    .data-table th {
      background: #1e293b;
      color: white;
      padding: 10px 8px;
      text-align: left;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .data-table td {
      padding: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table tr:nth-child(even) { background: #f8fafc; }
    .data-table .right { text-align: right; }
    .data-table .mono { font-family: 'Courier New', monospace; }
    .data-table.compact td { padding: 5px 8px; font-size: 9px; }
    .data-table tfoot .total-row {
      background: #f1f5f9;
      font-weight: bold;
    }
    .data-table tfoot .total-row td {
      border-top: 2px solid #1e293b;
      border-bottom: 2px solid #1e293b;
    }
    .manual-badge {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      padding: 1px 4px;
      font-size: 8px;
      border-radius: 2px;
      margin-left: 5px;
    }
    .mono { font-family: 'Courier New', monospace; }
    .note-box {
      background: #fffbeb;
      border: 1px solid #fbbf24;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      font-size: 10px;
    }
    .document-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 3px solid #1e293b;
    }
    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer-text {
      font-size: 9px;
      color: #64748b;
      line-height: 1.6;
    }
    .footer-seal {
      text-align: right;
    }
    .seal-box {
      display: inline-block;
      border: 2px solid #1e293b;
      padding: 10px 20px;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    @media print {
      body { padding: 20px; }
      .classification { margin: -20px -20px 20px; }
    }
  `;

  // Helper: Document header
  const getDocumentHeader = (title: string, docId: string) => `
    <div class="document-header">
      <h1>${NZ_IRD_LOGO} Wellington EcoBuild</h1>
      <div class="subtitle">${title}</div>
      <div class="document-meta">
        <span>Document ID: ${docId}</span>
        <span>Generated: ${format(new Date(), 'dd MMMM yyyy HH:mm:ss')} NZST</span>
        <span>Authorised by: Beveck Chiwawa, Founder & CEO</span>
      </div>
    </div>
  `;

  // Helper: Document footer
  const getDocumentFooter = (docId: string) => `
    <div class="document-footer">
      <div class="footer-content">
        <div class="footer-text">
          <p><strong>Wellington EcoBuild Limited</strong></p>
          <p>Founder & CEO: Beveck Chiwawa</p>
          <p>Website: wellingtonecobuild.nz</p>
          <p style="margin-top: 10px;">This document is an official financial record generated by Wellington EcoBuild's Financial Management System.</p>
          <p>All transactions are immutable, timestamped, and subject to audit. Unauthorized alteration is prohibited.</p>
          <p style="margin-top: 10px;">Document Reference: ${docId}</p>
        </div>
        <div class="footer-seal">
          <div class="seal-box">
            <div style="font-size: 16px; margin-bottom: 5px;">✓</div>
            OFFICIAL DOCUMENT<br/>
            Beveck Chiwawa<br/>
            <span style="font-size: 8px;">Founder & CEO</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const monthlyData = transactions.reduce((acc, t) => {
    const month = format(new Date(t.created_at), 'MMM yyyy');
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.revenue += Number(t.amount_nzd);
      existing.gst += Number(t.gst_amount);
    } else {
      acc.push({ month, revenue: Number(t.amount_nzd), gst: Number(t.gst_amount) });
    }
    return acc;
  }, [] as { month: string; revenue: number; gst: number }[]).reverse();

  const tierData = [
    { name: 'Premium', value: metrics?.premiumCount || 0, revenue: transactions.filter(t => t.subscription_tier === 'premium').reduce((sum, t) => sum + Number(t.amount_nzd), 0) },
    { name: 'Elite', value: metrics?.eliteCount || 0, revenue: transactions.filter(t => t.subscription_tier === 'elite').reduce((sum, t) => sum + Number(t.amount_nzd), 0) },
    { name: 'Spotlight', value: metrics?.spotlightCount || 0, revenue: transactions.filter(t => t.subscription_tier === 'spotlight').reduce((sum, t) => sum + Number(t.amount_nzd), 0) },
  ].filter(d => d.value > 0 || d.revenue > 0);

  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b'];

  if (loading) {
    return (
      <AdminLayout title="Financial Compliance Centre">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-mono">LOADING FINANCIAL DATA...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Financial Compliance Centre">
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-lg">
                <Landmark className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Wellington Ecobuild Financial Reporting</h2>
                <p className="text-slate-300 text-sm">IRD-Compliant Income Tracking • GST Management • Audit Trail</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleSyncStripe} disabled={syncing} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sync Stripe
              </Button>
              <Dialog open={manualEntryOpen} onOpenChange={setManualEntryOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <Plus className="h-4 w-4 mr-2" />
                    Manual Entry
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Manual Income Entry</DialogTitle>
                    <DialogDescription>
                      Record offline or manual payments. All entries are logged in the immutable audit trail.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Amount (NZD incl. GST)</Label>
                        <Input 
                          type="number" 
                          placeholder="0.00"
                          value={manualForm.amount}
                          onChange={e => setManualForm({ ...manualForm, amount: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Type</Label>
                        <Select value={manualForm.paymentType} onValueChange={v => setManualForm({ ...manualForm, paymentType: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="subscription">Subscription</SelectItem>
                            <SelectItem value="spotlight">Spotlight</SelectItem>
                            <SelectItem value="manual">Other Income</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Business Name</Label>
                      <Input 
                        placeholder="Business name"
                        value={manualForm.businessName}
                        onChange={e => setManualForm({ ...manualForm, businessName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Business Email (optional)</Label>
                      <Input 
                        type="email"
                        placeholder="email@business.com"
                        value={manualForm.businessEmail}
                        onChange={e => setManualForm({ ...manualForm, businessEmail: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea 
                        placeholder="Additional notes about this payment..."
                        value={manualForm.notes}
                        onChange={e => setManualForm({ ...manualForm, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setManualEntryOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddManualEntry}>
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Record Entry
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard 
            label="Total Revenue" 
            value={`$${metrics?.totalRevenue.toLocaleString('en-NZ', { minimumFractionDigits: 2 }) || '0.00'}`}
            sublabel="All Time (NZD)"
            icon={DollarSign}
            highlight
          />
          <MetricCard 
            label="GST Liability" 
            value={`$${transactions.reduce((sum, t) => sum + Number(t.gst_amount), 0).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}`}
            sublabel="Output Tax"
            icon={Scale}
          />
          <MetricCard 
            label="This Month" 
            value={`$${metrics?.revenueThisMonth.toLocaleString('en-NZ', { minimumFractionDigits: 2 }) || '0.00'}`}
            sublabel="Gross Revenue"
            icon={Calendar}
          />
          <MetricCard 
            label="This Year" 
            value={`$${metrics?.revenueThisYear.toLocaleString('en-NZ', { minimumFractionDigits: 2 }) || '0.00'}`}
            sublabel="YTD Revenue"
            icon={BarChart3}
          />
          <MetricCard 
            label="Active Subs" 
            value={metrics?.activeSubscriptions || 0}
            sublabel={`${metrics?.premiumCount || 0} Premium / ${metrics?.eliteCount || 0} Elite`}
            icon={Users}
          />
          <MetricCard 
            label="Transactions" 
            value={transactions.length}
            sublabel="Total Records"
            icon={Receipt}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ledger" className="space-y-4">
          <TabsList className="bg-slate-100 p-1 h-auto flex-wrap">
            <TabsTrigger value="ledger" className="data-[state=active]:bg-white">
              <Database className="h-4 w-4 mr-2" />
              Transaction Ledger
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-white">
              <FileCheck className="h-4 w-4 mr-2" />
              Official Reports
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-white">
              <History className="h-4 w-4 mr-2" />
              Audit Trail
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-white">
              <Stamp className="h-4 w-4 mr-2" />
              Income Profile
            </TabsTrigger>
          </TabsList>

          {/* Transaction Ledger */}
          <TabsContent value="ledger" className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-500" />
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Immutable Transaction Record
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">IRD Compliant</Badge>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Label className="text-xs text-slate-500">From:</Label>
                    <Input 
                      type="date" 
                      className="h-8 w-auto text-xs"
                      onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value ? new Date(e.target.value) : null }))}
                    />
                    <Label className="text-xs text-slate-500">To:</Label>
                    <Input 
                      type="date"
                      className="h-8 w-auto text-xs"
                      onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value ? new Date(e.target.value) : null }))}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100 hover:bg-slate-100">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600">Date</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600">IRD Ref</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600">Business</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600">Type</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 text-right">Gross (NZD)</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 text-right">GST</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 text-right">Net</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600">Status</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                            <Database className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                            <p>No transactions found. Click "Sync Stripe" to import payments.</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map(transaction => {
                          const gross = Number(transaction.amount_nzd);
                          const gst = Number(transaction.gst_amount);
                          const net = gross - gst;
                          return (
                            <TableRow key={transaction.id} className="hover:bg-slate-50">
                              <TableCell className="font-mono text-xs">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  {format(new Date(transaction.created_at), 'dd/MM/yyyy')}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-slate-500">
                                {transaction.transaction_id.slice(-8).toUpperCase()}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm text-slate-800">{transaction.business_name}</p>
                                  {transaction.business_email && (
                                    <p className="text-xs text-slate-500 font-mono">{transaction.business_email}</p>
                                  )}
                                  {transaction.is_manual && (
                                    <Badge variant="outline" className="mt-1 text-xs bg-amber-50 text-amber-700 border-amber-200">
                                      Manual Entry
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={`text-xs px-2 py-1 rounded font-medium ${
                                  transaction.subscription_tier === 'elite' 
                                    ? 'bg-purple-100 text-purple-700' 
                                    : transaction.subscription_tier === 'premium'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {(transaction.subscription_tier || transaction.payment_type).toUpperCase()}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-slate-800">
                                ${gross.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-slate-500">
                                ${gst.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-emerald-600">
                                ${net.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded font-medium ${
                                  transaction.payment_status === 'paid' 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {transaction.payment_status === 'paid' ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <AlertCircle className="h-3 w-3" />
                                  )}
                                  {transaction.payment_status.toUpperCase()}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => handleSendReceipt(transaction)}
                                    disabled={!transaction.business_email || sendingReceipt === transaction.id}
                                    title="Send Receipt"
                                  >
                                    {sendingReceipt === transaction.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Send className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteTransaction(transaction.id)}
                                    disabled={deletingTransaction === transaction.id}
                                    title="Delete"
                                  >
                                    {deletingTransaction === transaction.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono">
                    {transactions.length} record(s) • All actions logged in audit trail
                  </span>
                  <Button variant="outline" size="sm" onClick={exportToCSV}>
                    <Download className="h-3 w-3 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Official Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="py-4 px-6 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-t-lg">
                <div className="flex items-center gap-3">
                  <FileCheck className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-white">Official Report Generation</CardTitle>
                    <CardDescription className="text-slate-300">
                      Generate IRD-compliant financial reports, GST returns, and income verification documents
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Period Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Report Period</Label>
                    <Select value={reportPeriod} onValueChange={(v: any) => setReportPeriod(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Select Date</Label>
                    <Input 
                      type="date"
                      value={format(selectedReportDate, 'yyyy-MM-dd')}
                      onChange={e => e.target.value && setSelectedReportDate(new Date(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Period Preview</Label>
                    <p className="text-sm font-medium text-slate-700 py-2">
                      {reportPeriod === 'monthly' && format(selectedReportDate, 'MMMM yyyy')}
                      {reportPeriod === 'quarterly' && `Q${Math.ceil((selectedReportDate.getMonth() + 1) / 3)} ${format(selectedReportDate, 'yyyy')}`}
                      {reportPeriod === 'annually' && format(selectedReportDate, 'yyyy')}
                    </p>
                  </div>
                </div>

                {/* Report Types */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => exportToOfficialPDF('financial')}
                    className="flex items-start gap-4 p-5 border-2 border-slate-200 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all text-left group"
                  >
                    <div className="p-3 bg-slate-100 rounded-lg group-hover:bg-slate-800 group-hover:text-white transition-colors">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800">Financial Statement</h3>
                      <p className="text-sm text-slate-500 mt-1">Comprehensive revenue report with category breakdowns, transaction ledger, and executive summary</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">PDF</Badge>
                        <Badge variant="outline" className="text-xs">Print-Ready</Badge>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => exportToOfficialPDF('gst')}
                    className="flex items-start gap-4 p-5 border-2 border-slate-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left group"
                  >
                    <div className="p-3 bg-emerald-100 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Scale className="h-6 w-6 text-emerald-600 group-hover:text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800">GST Return Worksheet</h3>
                      <p className="text-sm text-slate-500 mt-1">IRD-format GST calculation with output tax, taxable supplies schedule, and Box 5-15 calculations</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">IRD Format</Badge>
                        <Badge variant="outline" className="text-xs">GST-101</Badge>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => exportToOfficialPDF('income-verification')}
                    className="flex items-start gap-4 p-5 border-2 border-slate-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-all text-left group"
                  >
                    <div className="p-3 bg-amber-100 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <Stamp className="h-6 w-6 text-amber-600 group-hover:text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800">Income Verification Certificate</h3>
                      <p className="text-sm text-slate-500 mt-1">Official certificate for banks, immigration, or third-party verification with lifetime and period summaries</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Official</Badge>
                        <Badge variant="outline" className="text-xs">Signed</Badge>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => exportToOfficialPDF('tax-summary')}
                    className="flex items-start gap-4 p-5 border-2 border-slate-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
                  >
                    <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <ClipboardCheck className="h-6 w-6 text-purple-600 group-hover:text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800">Annual Tax Summary</h3>
                      <p className="text-sm text-slate-500 mt-1">Complete tax year overview with monthly schedule, tax obligations checklist, and compliance status</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">Tax Year</Badge>
                        <Badge variant="outline" className="text-xs">Accountant-Ready</Badge>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Quick Export */}
                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <h4 className="font-medium text-sm text-slate-700 mb-3">Quick Data Export</h4>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={exportToCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      Export All to CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Revenue Trend (Monthly)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[300px]">
                    {monthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#64748b" />
                          <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                          <Tooltip 
                            formatter={(value, name) => [
                              `$${Number(value).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}`, 
                              name === 'revenue' ? 'Gross Revenue' : 'GST'
                            ]}
                            contentStyle={{ fontSize: 12, borderRadius: 4 }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="revenue" stroke="#1e293b" strokeWidth={2} dot={{ fill: '#1e293b' }} name="Gross Revenue" />
                          <Line type="monotone" dataKey="gst" stroke="#16a34a" strokeWidth={2} dot={{ fill: '#16a34a' }} name="GST Component" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        No data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Revenue by Subscription Tier
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[300px]">
                    {tierData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={tierData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="revenue"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {tierData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [`$${Number(value).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}`, 'Revenue']}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        No data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Analytics */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Revenue by Product Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[250px]">
                  {tierData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tierData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                        <Tooltip 
                          formatter={(value) => [`$${Number(value).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}`, 'Revenue']}
                          contentStyle={{ fontSize: 12, borderRadius: 4 }}
                        />
                        <Bar dataKey="revenue" fill="#1e293b" name="Revenue (NZD)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      No data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit" className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Financial Audit Trail
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">Immutable</Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={loadingAuditLogs}>
                    <RefreshCw className={`h-3 w-3 mr-2 ${loadingAuditLogs ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100 hover:bg-slate-100">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600">Timestamp</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600">Action</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600">Details</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600">Admin ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingAuditLogs ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                          </TableCell>
                        </TableRow>
                      ) : auditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                            <History className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                            <p>No audit logs found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        auditLogs.map(log => (
                          <TableRow key={log.id} className="hover:bg-slate-50">
                            <TableCell className="font-mono text-xs">
                              {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                log.action.includes('delete') ? 'destructive' :
                                log.action.includes('export') ? 'secondary' :
                                'default'
                              } className="text-xs">
                                {log.action.replace(/_/g, ' ').toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 max-w-md truncate">
                              {JSON.stringify(log.details)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-400">
                              {log.admin_id?.slice(0, 8)}...
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    All financial actions are permanently logged. Audit records cannot be modified or deleted.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Income Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="py-6 px-8 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-lg">
                    <Landmark className="h-8 w-8" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-xl">Official Income Profile</CardTitle>
                    <CardDescription className="text-slate-300">
                      Verified revenue documentation for Wellington EcoBuild
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-8">
                  {/* Company Info */}
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Entity Information</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <Label className="text-xs text-slate-500 uppercase tracking-wider">Registered Name</Label>
                        <p className="font-semibold text-slate-800 mt-1">Wellington EcoBuild Limited</p>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <Label className="text-xs text-slate-500 uppercase tracking-wider">Trading As</Label>
                        <p className="font-semibold text-slate-800 mt-1">Wellington EcoBuild</p>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <Label className="text-xs text-slate-500 uppercase tracking-wider">Domain</Label>
                        <p className="font-semibold text-slate-800 mt-1">wellingtonecobuild.nz</p>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <Label className="text-xs text-slate-500 uppercase tracking-wider">Currency</Label>
                        <p className="font-semibold text-slate-800 mt-1">NZD</p>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Summary */}
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Revenue Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-6 border-2 border-slate-800 rounded-lg text-center bg-slate-800 text-white">
                        <p className="text-xs uppercase tracking-wider opacity-70">Lifetime Revenue</p>
                        <p className="text-3xl font-bold mt-2">${metrics?.totalRevenue.toLocaleString('en-NZ', { minimumFractionDigits: 2 }) || '0.00'}</p>
                        <p className="text-xs opacity-50 mt-1">Gross (incl. GST)</p>
                      </div>
                      <div className="p-6 border border-slate-200 rounded-lg text-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">This Week</p>
                        <p className="text-2xl font-bold text-slate-800 mt-2">${metrics?.revenueThisWeek.toLocaleString('en-NZ', { minimumFractionDigits: 2 }) || '0.00'}</p>
                      </div>
                      <div className="p-6 border border-slate-200 rounded-lg text-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">This Month</p>
                        <p className="text-2xl font-bold text-slate-800 mt-2">${metrics?.revenueThisMonth.toLocaleString('en-NZ', { minimumFractionDigits: 2 }) || '0.00'}</p>
                      </div>
                      <div className="p-6 border border-slate-200 rounded-lg text-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">This Year</p>
                        <p className="text-2xl font-bold text-slate-800 mt-2">${metrics?.revenueThisYear.toLocaleString('en-NZ', { minimumFractionDigits: 2 }) || '0.00'}</p>
                      </div>
                    </div>
                  </div>

                  {/* GST Summary */}
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">GST Summary</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-6 border border-emerald-200 rounded-lg text-center bg-emerald-50">
                        <p className="text-xs text-emerald-600 uppercase tracking-wider">Total GST Collected</p>
                        <p className="text-2xl font-bold text-emerald-800 mt-2">
                          ${transactions.reduce((sum, t) => sum + Number(t.gst_amount), 0).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-emerald-600 mt-1">Output Tax</p>
                      </div>
                      <div className="p-6 border border-slate-200 rounded-lg text-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">GST Rate</p>
                        <p className="text-2xl font-bold text-slate-800 mt-2">15%</p>
                        <p className="text-xs text-slate-500 mt-1">Standard Rate</p>
                      </div>
                      <div className="p-6 border border-slate-200 rounded-lg text-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Net Revenue</p>
                        <p className="text-2xl font-bold text-slate-800 mt-2">
                          ${(metrics?.totalRevenue ? metrics.totalRevenue - transactions.reduce((sum, t) => sum + Number(t.gst_amount), 0) : 0).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Excl. GST</p>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Breakdown */}
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Active Subscriptions</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
                        <p className="text-xs text-blue-600 uppercase tracking-wider">Premium</p>
                        <p className="text-3xl font-bold text-blue-800 mt-2">{metrics?.premiumCount || 0}</p>
                        <p className="text-xs text-blue-600 mt-1">Active</p>
                      </div>
                      <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg text-center">
                        <p className="text-xs text-purple-600 uppercase tracking-wider">Elite</p>
                        <p className="text-3xl font-bold text-purple-800 mt-2">{metrics?.eliteCount || 0}</p>
                        <p className="text-xs text-purple-600 mt-1">Active</p>
                      </div>
                      <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg text-center">
                        <p className="text-xs text-amber-600 uppercase tracking-wider">Spotlight</p>
                        <p className="text-3xl font-bold text-amber-800 mt-2">{metrics?.spotlightCount || 0}</p>
                        <p className="text-xs text-amber-600 mt-1">Purchases</p>
                      </div>
                    </div>
                  </div>

                  {/* Official Note */}
                  <div className="p-6 bg-slate-100 border border-slate-300 rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-slate-800 rounded text-white">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">Official Financial Record</p>
                        <p className="text-sm text-slate-600 mt-1">
                          This profile represents verified income data from Wellington EcoBuild's payment processing systems. 
                          All transactions are immutable, timestamped, and auditable. Data is suitable for official verification purposes.
                        </p>
                        <p className="text-xs text-slate-500 mt-3 font-mono">
                          Profile generated: {format(new Date(), 'dd MMMM yyyy HH:mm:ss')} NZST
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// Helper Component
function MetricCard({ label, value, sublabel, icon: Icon, highlight }: {
  label: string;
  value: string | number;
  sublabel: string;
  icon: any;
  highlight?: boolean;
}) {
  return (
    <div className={`border rounded-lg p-4 transition-all ${highlight ? 'border-slate-800 bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium uppercase tracking-wider ${highlight ? 'text-slate-300' : 'text-slate-500'}`}>
          {label}
        </span>
        <Icon className={`h-4 w-4 ${highlight ? 'text-slate-400' : 'text-slate-400'}`} />
      </div>
      <p className={`text-xl font-bold ${highlight ? 'text-white' : 'text-slate-800'}`}>{value}</p>
      <p className={`text-xs mt-1 ${highlight ? 'text-slate-400' : 'text-slate-500'}`}>{sublabel}</p>
    </div>
  );
}