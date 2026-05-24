import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bell, 
  RefreshCw,
  Mail,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface DunningRecord {
  id: string;
  business_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  dunning_type: string;
  email_sent_at: string;
  next_reminder_at: string | null;
  attempt_count: number;
  status: string;
  created_at: string;
  business?: {
    name: string;
    email: string;
  };
}

const dunningTypeLabels: Record<string, { label: string; color: string; icon: any }> = {
  renewal_reminder: { 
    label: 'Renewal Reminder', 
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    icon: Bell 
  },
  payment_failed: { 
    label: 'Payment Failed', 
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    icon: AlertTriangle 
  },
  final_notice: { 
    label: 'Final Notice', 
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    icon: AlertTriangle 
  },
};

const statusBadges: Record<string, JSX.Element> = {
  sent: <Badge variant="secondary"><Mail className="h-3 w-3 mr-1" />Sent</Badge>,
  resolved: <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>,
  escalated: <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Escalated</Badge>,
};

export function DunningManagementWidget() {
  const [records, setRecords] = useState<DunningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dunning_records')
      .select(`
        *,
        business:businesses(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setRecords(data as unknown as DunningRecord[]);
    }
    setLoading(false);
  };

  const runRenewalCheck = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription-renewals');
      
      if (error) throw error;
      
      toast.success(`Renewal check complete. ${data?.remindersSent || 0} reminders sent.`);
      fetchRecords();
    } catch (err) {
      toast.error('Failed to run renewal check');
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  const markResolved = async (id: string) => {
    const { error } = await supabase
      .from('dunning_records')
      .update({ status: 'resolved' })
      .eq('id', id);

    if (!error) {
      setRecords((prev) => 
        prev.map((r) => r.id === id ? { ...r, status: 'resolved' } : r)
      );
      toast.success('Marked as resolved');
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Dunning Management
          </CardTitle>
          <CardDescription>Payment reminders and failed payment tracking</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runRenewalCheck} 
            disabled={checking}
          >
            <Send className={`h-4 w-4 mr-2 ${checking ? 'animate-pulse' : ''}`} />
            Check Renewals
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchRecords} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px] pr-4">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-50" />
              <p>No dunning records yet</p>
              <p className="text-sm">Payment reminders will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => {
                const typeInfo = dunningTypeLabels[record.dunning_type] || {
                  label: record.dunning_type,
                  color: 'bg-muted',
                  icon: Mail,
                };
                const Icon = typeInfo.icon;

                return (
                  <div
                    key={record.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${typeInfo.color}`}
                  >
                    <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">
                          {record.business?.name || 'Unknown Business'}
                        </span>
                        {statusBadges[record.status] || <Badge variant="outline">{record.status}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {typeInfo.label} • Attempt #{record.attempt_count}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sent {formatDistanceToNow(new Date(record.email_sent_at), { addSuffix: true })}
                      </p>
                      {record.next_reminder_at && record.status !== 'resolved' && (
                        <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Next: {format(new Date(record.next_reminder_at), 'MMM d, h:mm a')}
                        </p>
                      )}
                      {record.status !== 'resolved' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 h-7 text-xs"
                          onClick={() => markResolved(record.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
