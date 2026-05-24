import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, Loader2, Activity, Clock, User, Filter, Download, 
  AlertTriangle, Info, AlertCircle, Bug, Zap, RefreshCw,
  Eye, Database, Shield, Mail, CreditCard, FileText
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

interface ActivityItem {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  action_category: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  description: string;
  ip_address: string | null;
  metadata: any;
  severity: string;
  created_at: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  auth: <Shield className="h-4 w-4" />,
  content: <FileText className="h-4 w-4" />,
  financial: <CreditCard className="h-4 w-4" />,
  system: <Database className="h-4 w-4" />,
  communication: <Mail className="h-4 w-4" />,
};

const severityConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  debug: { icon: <Bug className="h-3 w-3" />, color: 'bg-slate-100 text-slate-600 border-slate-200' },
  info: { icon: <Info className="h-3 w-3" />, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  warning: { icon: <AlertTriangle className="h-3 w-3" />, color: 'bg-amber-50 text-amber-600 border-amber-200' },
  error: { icon: <AlertCircle className="h-3 w-3" />, color: 'bg-red-50 text-red-600 border-red-200' },
  critical: { icon: <Zap className="h-3 w-3" />, color: 'bg-red-100 text-red-700 border-red-300' },
};

export default function AdminActivityStream() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const fetchActivities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('activity_stream')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setActivities((data || []) as ActivityItem[]);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useAutoRefresh(fetchActivities);

  useEffect(() => {
    fetchActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('activity-stream')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_stream'
      }, (payload) => {
        setActivities(prev => [payload.new as ActivityItem, ...prev].slice(0, 500));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActivities]);

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = 
      activity.action.toLowerCase().includes(search.toLowerCase()) ||
      activity.description.toLowerCase().includes(search.toLowerCase()) ||
      activity.actor_email?.toLowerCase().includes(search.toLowerCase()) ||
      activity.entity_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || activity.action_category === categoryFilter;
    const matchesSeverity = severityFilter === 'all' || activity.severity === severityFilter;
    
    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const handleExport = () => {
    const headers = ['Timestamp', 'Actor', 'Action', 'Category', 'Entity', 'Description', 'Severity'];
    const rows = filteredActivities.map(a => [
      format(new Date(a.created_at), 'yyyy-MM-dd HH:mm:ss'),
      a.actor_email || 'System',
      a.action,
      a.action_category,
      a.entity_name || '',
      a.description,
      a.severity
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-stream-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uniqueCategories = [...new Set(activities.map(a => a.action_category))].sort();

  return (
    <AdminLayout title="Activity Stream">
      <div className="space-y-4">
        {/* Live Stream Header */}
        <div className="bg-gradient-to-r from-admin-navy to-admin-navy-light text-white rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Live Activity Stream</h2>
                <p className="text-sm text-white/70">Real-time monitoring of all system activities</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-sm">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span>Live</span>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={fetchActivities}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="py-3 px-4 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-xs font-semibold uppercase tracking-wider">Filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
            <div className="mt-3 text-xs text-muted-foreground font-mono">
              Showing {filteredActivities.length} of {activities.length} activities
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card>
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Activity className="h-12 w-12 mb-3 opacity-30" />
                <p>No activities match your filters</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredActivities.map((activity) => {
                  const severity = severityConfig[activity.severity] || severityConfig.info;
                  return (
                    <div key={activity.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Category Icon */}
                        <div className="mt-1 p-2 rounded-lg bg-muted">
                          {categoryIcons[activity.action_category] || <Activity className="h-4 w-4" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-sm">{activity.action.replace(/_/g, ' ')}</span>
                            <Badge variant="outline" className={`text-[10px] ${severity.color}`}>
                              {severity.icon}
                              <span className="ml-1">{activity.severity}</span>
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {activity.action_category}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-foreground/80 mb-2">{activity.description}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {activity.actor_name || activity.actor_email || 'System'}
                            </span>
                            {activity.entity_name && (
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {activity.entity_type}: {activity.entity_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono text-muted-foreground">
                            {format(new Date(activity.created_at), 'HH:mm:ss')}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {format(new Date(activity.created_at), 'dd MMM yyyy')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    </AdminLayout>
  );
}
