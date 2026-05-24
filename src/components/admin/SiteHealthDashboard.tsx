import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  Zap,
  Database,
  Globe,
  CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';

interface HealthMetric {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  value: string | number;
  icon: any;
  description: string;
}

const SiteHealthDashboard = () => {
  // Fetch latest scan
  const { data: latestScan } = useQuery({
    queryKey: ['latest-ai-scan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_assistant_scans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch issue counts by severity
  const { data: issueCounts } = useQuery({
    queryKey: ['ai-issue-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_assistant_issues')
        .select('severity, status')
        .in('status', ['open', 'acknowledged']);
      if (error) throw error;
      
      const counts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: data?.length || 0,
      };
      
      data?.forEach((issue) => {
        if (issue.severity in counts) {
          counts[issue.severity as keyof typeof counts]++;
        }
      });
      
      return counts;
    },
  });

  // Fetch system health metrics
  const { data: systemMetrics } = useQuery({
    queryKey: ['system-health-metrics'],
    queryFn: async () => {
      const [
        { count: activeBusinesses },
        { count: pendingBusinesses },
        { count: failedPayments },
        { count: failedWebhooks },
        { count: brokenLinks },
        { count: pendingReviews },
      ] = await Promise.all([
        supabase.from('businesses').select('*', { count: 'exact', head: true }).in('status', ['active', 'approved']),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('payment_status', 'failed'),
        supabase.from('webhook_events').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
        supabase.from('url_validation_cache').select('*', { count: 'exact', head: true }).eq('is_valid', false),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      return {
        activeBusinesses: activeBusinesses || 0,
        pendingBusinesses: pendingBusinesses || 0,
        failedPayments: failedPayments || 0,
        failedWebhooks: failedWebhooks || 0,
        brokenLinks: brokenLinks || 0,
        pendingReviews: pendingReviews || 0,
      };
    },
  });

  // Calculate overall health status
  const getOverallStatus = () => {
    if (!issueCounts) return 'healthy';
    if (issueCounts.critical > 0) return 'critical';
    if (issueCounts.high > 2 || (systemMetrics?.failedPayments || 0) > 0) return 'warning';
    return 'healthy';
  };

  const overallStatus = getOverallStatus();

  const healthMetrics: HealthMetric[] = [
    {
      name: 'Active Businesses',
      status: 'healthy',
      value: systemMetrics?.activeBusinesses || 0,
      icon: Database,
      description: 'Businesses currently live',
    },
    {
      name: 'Payment Issues',
      status: (systemMetrics?.failedPayments || 0) > 0 ? 'critical' : 'healthy',
      value: systemMetrics?.failedPayments || 0,
      icon: CreditCard,
      description: 'Failed payment attempts',
    },
    {
      name: 'Webhook Failures',
      status: (systemMetrics?.failedWebhooks || 0) > 3 ? 'warning' : 'healthy',
      value: systemMetrics?.failedWebhooks || 0,
      icon: Zap,
      description: 'Failed webhook events',
    },
    {
      name: 'Broken Links',
      status: (systemMetrics?.brokenLinks || 0) > 5 ? 'warning' : 'healthy',
      value: systemMetrics?.brokenLinks || 0,
      icon: Globe,
      description: 'Invalid URLs detected',
    },
    {
      name: 'Pending Reviews',
      status: (systemMetrics?.pendingReviews || 0) > 10 ? 'warning' : 'healthy',
      value: systemMetrics?.pendingReviews || 0,
      icon: Clock,
      description: 'Awaiting moderation',
    },
    {
      name: 'Security Status',
      status: issueCounts?.critical === 0 ? 'healthy' : 'critical',
      value: issueCounts?.critical === 0 ? 'Secure' : `${issueCounts?.critical} issues`,
      icon: Shield,
      description: 'Critical security issues',
    },
  ];

  const statusConfig = {
    healthy: {
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800',
      icon: CheckCircle,
      label: 'Healthy',
    },
    warning: {
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      icon: AlertTriangle,
      label: 'Warning',
    },
    critical: {
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      borderColor: 'border-red-200 dark:border-red-800',
      icon: XCircle,
      label: 'Critical',
    },
  };

  const currentStatus = statusConfig[overallStatus];
  const StatusIcon = currentStatus.icon;

  // Calculate health score
  const healthScore = Math.max(0, 100 - (
    (issueCounts?.critical || 0) * 25 +
    (issueCounts?.high || 0) * 10 +
    (issueCounts?.medium || 0) * 3 +
    (systemMetrics?.failedPayments || 0) * 15
  ));

  return (
    <div className="space-y-6">
      {/* Overall Status Card */}
      <Card className={`${currentStatus.bgColor} ${currentStatus.borderColor} border-2`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-full ${currentStatus.color}`}>
                <StatusIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${currentStatus.textColor}`}>
                  System Status: {currentStatus.label}
                </h2>
                <p className="text-muted-foreground">
                  {latestScan 
                    ? `Last scan: ${format(new Date(latestScan.created_at), 'PPp')}`
                    : 'No scans completed yet'
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${currentStatus.textColor}`}>
                {healthScore}%
              </div>
              <p className="text-sm text-muted-foreground">Health Score</p>
            </div>
          </div>
          <div className="mt-4">
            <Progress 
              value={healthScore} 
              className="h-3"
            />
          </div>
        </CardContent>
      </Card>

      {/* Issue Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{issueCounts?.critical || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">High</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{issueCounts?.high || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Medium</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{issueCounts?.medium || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Low</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{issueCounts?.low || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {healthMetrics.map((metric) => {
          const config = statusConfig[metric.status];
          const MetricIcon = metric.icon;
          
          return (
            <Card key={metric.name} className={`${config.borderColor} border`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.name}</p>
                    <p className="text-2xl font-bold mt-1">{metric.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <MetricIcon className={`h-5 w-5 ${config.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Monitoring Activity
          </CardTitle>
          <CardDescription>
            AI agent is continuously monitoring for issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75" />
            </div>
            <span className="text-sm text-muted-foreground">
              Active monitoring • {issueCounts?.total || 0} open issues
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteHealthDashboard;
