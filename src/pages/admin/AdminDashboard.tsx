import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2,
  ShieldCheck,
  FileText,
  MessageSquare,
  AlertTriangle,
  Clock,
  Mail,
  Users,
  RefreshCw,
  ChevronRight,
  Activity,
  Database,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { WebhookEventsWidget } from '@/components/admin/WebhookEventsWidget';
import { DunningManagementWidget } from '@/components/admin/DunningManagementWidget';
import { PendingApprovalsWidget } from '@/components/admin/PendingApprovalsWidget';
import { WebsiteAnalyticsPanel } from '@/components/admin/WebsiteAnalyticsPanel';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

interface DashboardStats {
  totalBusinesses: number;
  freeBusinesses: number;
  premiumBusinesses: number;
  eliteBusinesses: number;
  pendingListings: number;
  pendingVerifications: number;
  pendingDocuments: number;
  totalLeads: number;
  verifiedBusinesses: number;
  suspendedBusinesses: number;
  rejectedBusinesses: number;
}

interface UnreadContact {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  created_at: string;
}

interface UnreadLead {
  id: string;
  name: string;
  email: string;
  created_at: string;
  business_name: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBusinesses: 0,
    freeBusinesses: 0,
    premiumBusinesses: 0,
    eliteBusinesses: 0,
    pendingListings: 0,
    pendingVerifications: 0,
    pendingDocuments: 0,
    totalLeads: 0,
    verifiedBusinesses: 0,
    suspendedBusinesses: 0,
    rejectedBusinesses: 0,
  });
  const [recentBusinesses, setRecentBusinesses] = useState<any[]>([]);
  const [unreadContacts, setUnreadContacts] = useState<UnreadContact[]>([]);
  const [unreadLeads, setUnreadLeads] = useState<UnreadLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchDashboardData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const { data: businesses, error: bizError } = await supabase
        .from('businesses')
        .select('*');

      if (bizError) throw bizError;

      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      const { count: pendingDocsCount } = await supabase
        .from('verification_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const bizList = businesses || [];
      
      setStats({
        totalBusinesses: bizList.length,
        freeBusinesses: bizList.filter(b => b.subscription_plan === 'free').length,
        premiumBusinesses: bizList.filter(b => b.subscription_plan === 'premium').length,
        eliteBusinesses: bizList.filter(b => b.subscription_plan === 'elite').length,
        pendingListings: bizList.filter(b => b.status === 'pending').length,
        pendingVerifications: bizList.filter(b => b.verification_status === 'pending').length,
        pendingDocuments: pendingDocsCount || 0,
        totalLeads: leadsCount || 0,
        verifiedBusinesses: bizList.filter(b => b.is_verified).length,
        suspendedBusinesses: bizList.filter(b => b.status === 'suspended').length,
        rejectedBusinesses: bizList.filter(b => b.status === 'rejected').length,
      });

      const { data: recent } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);

      setRecentBusinesses(recent || []);

      const { data: contacts } = await supabase
        .from('contact_submissions')
        .select('id, name, email, subject, created_at')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      setUnreadContacts(contacts || []);

      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, email, created_at, business_id')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (leads && leads.length > 0) {
        const businessIds = [...new Set(leads.map(l => l.business_id))];
        const { data: leadBusinesses } = await supabase
          .from('businesses')
          .select('id, name')
          .in('id', businessIds);

        const businessMap = new Map(leadBusinesses?.map(b => [b.id, b.name]) || []);
        setUnreadLeads(leads.map(l => ({
          ...l,
          business_name: businessMap.get(l.business_id) || 'Unknown Business'
        })));
      } else {
        setUnreadLeads([]);
      }
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData(false);
    setRefreshing(false);
  };

  useAutoRefresh(useCallback(() => fetchDashboardData(false), [fetchDashboardData]));

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const totalPendingActions = stats.pendingListings + stats.pendingVerifications + stats.pendingDocuments;

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* System Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-admin-border rounded-lg px-4 py-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-admin-slate" />
              <span className="text-muted-foreground">Last updated:</span>
              <span className="font-medium text-foreground">
                {lastRefresh ? format(lastRefresh, 'HH:mm:ss') : '--:--:--'}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-admin-border">
              <Activity className="h-4 w-4 text-admin-success" />
              <span className="font-medium text-admin-success">System Online</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleManualRefresh} 
            disabled={refreshing}
            className="border-admin-border hover:bg-admin-border/30"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* Priority Actions Alert */}
        {totalPendingActions > 0 && (
          <div className="bg-admin-warning/10 border border-admin-warning/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-admin-warning/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-admin-warning" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-sm">
                  Action Required
                </h3>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {totalPendingActions} item{totalPendingActions !== 1 ? 's' : ''} require administrative review
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {stats.pendingListings > 0 && (
                    <Link to="/admin/businesses?status=pending">
                      <Badge className="bg-admin-warning/20 text-admin-warning border-admin-warning/30 hover:bg-admin-warning/30 cursor-pointer">
                        {stats.pendingListings} Pending Listings
                      </Badge>
                    </Link>
                  )}
                  {stats.pendingVerifications > 0 && (
                    <Link to="/admin/verifications">
                      <Badge className="bg-admin-warning/20 text-admin-warning border-admin-warning/30 hover:bg-admin-warning/30 cursor-pointer">
                        {stats.pendingVerifications} Verification Requests
                      </Badge>
                    </Link>
                  )}
                  {stats.pendingDocuments > 0 && (
                    <Link to="/admin/verifications">
                      <Badge className="bg-admin-warning/20 text-admin-warning border-admin-warning/30 hover:bg-admin-warning/30 cursor-pointer">
                        {stats.pendingDocuments} Document Reviews
                      </Badge>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard 
            label="Total Listings" 
            value={loading ? '...' : stats.totalBusinesses} 
            icon={Building2}
            href="/admin/businesses"
          />
          <MetricCard 
            label="Verified" 
            value={loading ? '...' : stats.verifiedBusinesses} 
            icon={ShieldCheck}
            variant="success"
            href="/admin/verifications"
          />
          <MetricCard 
            label="Premium" 
            value={loading ? '...' : stats.premiumBusinesses} 
            icon={TrendingUp}
            href="/admin/subscriptions"
          />
          <MetricCard 
            label="Elite" 
            value={loading ? '...' : stats.eliteBusinesses} 
            icon={CheckCircle2}
            variant="teal"
            href="/admin/elite-caps"
          />
          <MetricCard 
            label="Suspended" 
            value={loading ? '...' : stats.suspendedBusinesses} 
            icon={XCircle}
            variant="error"
            href="/admin/businesses?status=suspended"
          />
          <MetricCard 
            label="Total Leads" 
            value={loading ? '...' : stats.totalLeads} 
            icon={MessageSquare}
            href="/admin/leads"
          />
        </div>

        {/* Quick Actions */}
        <Card className="border-admin-border shadow-sm">
          <CardHeader className="py-3 px-4 bg-muted/30 border-b border-admin-border">
            <CardTitle className="text-sm font-semibold text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-admin-border">
              <QuickAction 
                to="/admin/businesses?status=pending"
                icon={Clock}
                label="Review Listings"
                count={stats.pendingListings}
              />
              <QuickAction 
                to="/admin/verifications"
                icon={FileText}
                label="Process Documents"
                count={stats.pendingDocuments}
              />
              <QuickAction 
                to="/admin/revenue"
                icon={Activity}
                label="Financial Reports"
              />
              <QuickAction 
                to="/admin/audit-logs"
                icon={Database}
                label="Audit Logs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Listings */}
          <Card className="border-admin-border shadow-sm">
            <CardHeader className="py-3 px-4 bg-muted/30 border-b border-admin-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Recent Listings
                </CardTitle>
                <Link to="/admin/businesses">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-admin-teal hover:text-admin-teal-dark">
                    View All <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-admin-border">
                {recentBusinesses.map((business) => (
                  <div key={business.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{business.name}</p>
                      <p className="text-xs text-muted-foreground">{business.city} • {business.category}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <StatusBadge status={business.status} />
                      <PlanBadge plan={business.subscription_plan} />
                    </div>
                  </div>
                ))}
                {recentBusinesses.length === 0 && !loading && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No listings found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Communications */}
          <div className="space-y-6">
            {/* Unread Contacts */}
            <Card className="border-admin-border shadow-sm">
              <CardHeader className="py-3 px-4 bg-muted/30 border-b border-admin-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4 text-admin-slate" />
                    Unread Contacts
                    {unreadContacts.length > 0 && (
                      <Badge className="h-5 px-1.5 text-[10px] bg-admin-error text-white border-0">
                        {unreadContacts.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <Link to="/admin/contacts">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-admin-teal hover:text-admin-teal-dark">
                      View All <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {unreadContacts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-admin-success/50" />
                    All caught up
                  </div>
                ) : (
                  <div className="divide-y divide-admin-border">
                    {unreadContacts.slice(0, 3).map((contact) => (
                      <Link key={contact.id} to="/admin/contacts" className="block">
                        <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{contact.subject || contact.email}</p>
                          </div>
                          <span className="text-xs text-muted-foreground ml-3 flex-shrink-0">
                            {format(new Date(contact.created_at), 'MMM d, HH:mm')}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Unread Leads */}
            <Card className="border-admin-border shadow-sm">
              <CardHeader className="py-3 px-4 bg-muted/30 border-b border-admin-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-admin-slate" />
                    Business Inquiries
                    {unreadLeads.length > 0 && (
                      <Badge className="h-5 px-1.5 text-[10px] bg-admin-error text-white border-0">
                        {unreadLeads.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <Link to="/admin/leads">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-admin-teal hover:text-admin-teal-dark">
                      View All <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {unreadLeads.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-admin-success/50" />
                    All caught up
                  </div>
                ) : (
                  <div className="divide-y divide-admin-border">
                    {unreadLeads.slice(0, 3).map((lead) => (
                      <Link key={lead.id} to="/admin/leads" className="block">
                        <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                            <p className="text-xs text-muted-foreground truncate">→ {lead.business_name}</p>
                          </div>
                          <span className="text-xs text-muted-foreground ml-3 flex-shrink-0">
                            {format(new Date(lead.created_at), 'MMM d, HH:mm')}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Website Analytics */}
        <Card className="border-admin-border shadow-sm">
          <CardHeader className="py-3 px-4 bg-muted/30 border-b border-admin-border">
            <CardTitle className="text-sm font-semibold text-foreground">
              Website Traffic Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <WebsiteAnalyticsPanel />
          </CardContent>
        </Card>

        {/* Pending Approvals Widget */}
        <PendingApprovalsWidget />

        {/* Webhook Events & Dunning Management */}
        <div className="grid gap-6 md:grid-cols-2">
          <WebhookEventsWidget />
          <DunningManagementWidget />
        </div>
      </div>
    </AdminLayout>
  );
}

// Helper Components
function MetricCard({ label, value, icon: Icon, variant, href }: { 
  label: string; 
  value: string | number; 
  icon: any;
  variant?: 'success' | 'error' | 'teal';
  href?: string;
}) {
  const variantStyles = {
    success: 'border-admin-success/30 bg-admin-success/5',
    error: 'border-admin-error/30 bg-admin-error/5',
    teal: 'border-admin-teal/30 bg-admin-teal/5',
  };
  const iconStyles = {
    success: 'text-admin-success bg-admin-success/10',
    error: 'text-admin-error bg-admin-error/10',
    teal: 'text-admin-teal bg-admin-teal/10',
  };
  
  const content = (
    <div className={`
      border rounded-lg p-4 transition-all duration-200
      ${variant ? variantStyles[variant] : 'border-admin-border bg-card hover:border-admin-teal/50'}
      ${href ? 'cursor-pointer hover:shadow-sm' : ''}
    `}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${variant ? iconStyles[variant] : 'bg-admin-navy/10 text-admin-navy'}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        {href && <ArrowUpRight className="h-4 w-4 text-admin-slate" />}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
}

function QuickAction({ to, icon: Icon, label, count }: {
  to: string;
  icon: any;
  label: string;
  count?: number;
}) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-4 hover:bg-muted/30 transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-admin-navy/10 flex items-center justify-center group-hover:bg-admin-teal/10 transition-colors">
        <Icon className="h-4 w-4 text-admin-navy group-hover:text-admin-teal transition-colors" />
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {count !== undefined && count > 0 && (
          <Badge className="ml-2 h-5 px-1.5 text-[10px] bg-admin-warning/20 text-admin-warning border-admin-warning/30">
            {count}
          </Badge>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-admin-slate group-hover:text-admin-teal transition-colors" />
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-admin-success/10 text-admin-success border-admin-success/30',
    approved: 'bg-admin-success/10 text-admin-success border-admin-success/30',
    pending: 'bg-admin-warning/10 text-admin-warning border-admin-warning/30',
    suspended: 'bg-admin-error/10 text-admin-error border-admin-error/30',
    rejected: 'bg-admin-error/10 text-admin-error border-admin-error/30',
    draft: 'bg-muted text-muted-foreground border-admin-border',
  };
  
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold uppercase tracking-wide ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    elite: 'bg-admin-teal/10 text-admin-teal border-admin-teal/30',
    premium: 'bg-admin-navy/10 text-admin-navy border-admin-navy/30',
    free: 'bg-muted text-muted-foreground border-admin-border',
  };
  
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold uppercase tracking-wide ${styles[plan] || styles.free}`}>
      {plan}
    </span>
  );
}