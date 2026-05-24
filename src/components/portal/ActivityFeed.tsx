import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  FileText, 
  Mail, 
  Phone, 
  Clock, 
  DollarSign,
  CheckCircle,
  Send,
  Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  action: string;
  created_at: string;
  invoice_id: string | null;
  new_value: any;
  old_value: any;
}

interface ActivityFeedProps {
  portalUserId: string;
  limit?: number;
}

const getActivityIcon = (action: string) => {
  if (action.includes('invoice')) {
    return <FileText className="h-4 w-4 text-emerald-600" />;
  }
  if (action.includes('email')) {
    return <Mail className="h-4 w-4 text-blue-600" />;
  }
  if (action.includes('call')) {
    return <Phone className="h-4 w-4 text-indigo-600" />;
  }
  if (action.includes('timesheet')) {
    return <Clock className="h-4 w-4 text-amber-600" />;
  }
  if (action.includes('payment')) {
    return <DollarSign className="h-4 w-4 text-purple-600" />;
  }
  if (action.includes('approved') || action.includes('verified')) {
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  }
  if (action.includes('sent') || action.includes('submitted')) {
    return <Send className="h-4 w-4 text-blue-600" />;
  }
  if (action.includes('viewed') || action.includes('read')) {
    return <Eye className="h-4 w-4 text-slate-600" />;
  }
  return <Activity className="h-4 w-4 text-slate-500" />;
};

const getActivityColor = (action: string): string => {
  if (action.includes('approved') || action.includes('paid') || action.includes('verified')) {
    return 'bg-emerald-50 border-emerald-200';
  }
  if (action.includes('rejected') || action.includes('failed')) {
    return 'bg-red-50 border-red-200';
  }
  if (action.includes('submitted') || action.includes('sent')) {
    return 'bg-blue-50 border-blue-200';
  }
  if (action.includes('pending') || action.includes('draft')) {
    return 'bg-amber-50 border-amber-200';
  }
  return 'bg-slate-50 border-slate-200';
};

export const ActivityFeed = ({ portalUserId, limit = 10 }: ActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const { data, error } = await supabase
          .from('portal_audit_log')
          .select('*')
          .eq('portal_user_id', portalUserId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        setActivities(data || []);
      } catch (err) {
        console.error('Error fetching activities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('portal_activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'portal_audit_log',
          filter: `portal_user_id=eq.${portalUserId}`,
        },
        (payload) => {
          setActivities(prev => [payload.new as ActivityItem, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [portalUserId, limit]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600" />
          Recent Activity
          {activities.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {activities.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {activities.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No recent activity
            </p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${getActivityColor(activity.action)}`}
                >
                <div className="mt-0.5">
                    {getActivityIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {activity.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {activity.invoice_id ? `Invoice update` : 'Activity recorded'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
