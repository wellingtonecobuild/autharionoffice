import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  DollarSign,
  Phone,
  Mail,
  FileText,
  Star
} from 'lucide-react';

interface MetricsData {
  totalInvoices: number;
  paidInvoices: number;
  totalEarned: number;
  avgResponseTime: number;
  callsLogged: number;
  emailsSent: number;
  hoursLogged: number;
  completionRate: number;
}

interface PerformanceMetricsProps {
  portalUserId: string;
  userId: string;
}

export const PerformanceMetrics = ({ portalUserId, userId }: PerformanceMetricsProps) => {
  const [metrics, setMetrics] = useState<MetricsData>({
    totalInvoices: 0,
    paidInvoices: 0,
    totalEarned: 0,
    avgResponseTime: 0,
    callsLogged: 0,
    emailsSent: 0,
    hoursLogged: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch all metrics in parallel
        const [invoicesRes, paymentsRes, callsRes, emailsRes] = await Promise.all([
          supabase
            .from('contractor_invoices')
            .select('id, status, total_amount')
            .eq('portal_user_id', portalUserId),
          supabase
            .from('portal_payment_records')
            .select('amount')
            .eq('portal_user_id', portalUserId),
          supabase
            .from('contractor_call_logs')
            .select('id')
            .eq('portal_user_id', portalUserId),
          supabase
            .from('email_logs')
            .select('id')
            .eq('sent_by', userId),
        ]);

        const invoices = invoicesRes.data || [];
        const payments = paymentsRes.data || [];
        const calls = callsRes.data || [];
        const emails = emailsRes.data || [];

        const paidInvoices = invoices.filter(i => i.status === 'paid');
        const totalEarned = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const completionRate = invoices.length > 0 
          ? (paidInvoices.length / invoices.length) * 100 
          : 0;

        setMetrics({
          totalInvoices: invoices.length,
          paidInvoices: paidInvoices.length,
          totalEarned,
          avgResponseTime: 2.4, // Placeholder - would need message timestamps
          callsLogged: calls.length,
          emailsSent: emails.length,
          hoursLogged: 0, // Would come from timesheets
          completionRate: Math.round(completionRate),
        });
      } catch (err) {
        console.error('Error fetching metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [portalUserId, userId]);

  const metricCards = [
    {
      label: 'Total Earned',
      value: `$${metrics.totalEarned.toLocaleString()}`,
      icon: DollarSign,
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Invoices Paid',
      value: `${metrics.paidInvoices}/${metrics.totalInvoices}`,
      icon: FileText,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Completion Rate',
      value: `${metrics.completionRate}%`,
      icon: TrendingUp,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Calls Logged',
      value: metrics.callsLogged.toString(),
      icon: Phone,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      label: 'Emails Sent',
      value: metrics.emailsSent.toString(),
      icon: Mail,
      color: 'rose',
      bgColor: 'bg-rose-50',
      iconColor: 'text-rose-600',
    },
    {
      label: 'Avg Response',
      value: `${metrics.avgResponseTime}h`,
      icon: Clock,
      color: 'amber',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-10 bg-slate-200 rounded mb-2" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {metricCards.map((metric) => (
        <Card key={metric.label} className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${metric.bgColor} flex items-center justify-center`}>
                <metric.icon className={`h-5 w-5 ${metric.iconColor}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{metric.value}</p>
                <p className="text-xs text-slate-500">{metric.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
