import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  History, 
  Search, 
  Filter,
  Eye,
  FileText,
  Mail,
  Phone,
  Clock,
  DollarSign,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ExportButton, formatters } from './ExportButton';
import { ExportColumn } from '@/utils/exportUtils';

interface AuditEntry {
  id: string;
  action: string;
  old_value: any;
  new_value: any;
  performed_by: string;
  ip_address: string | null;
  created_at: string;
  invoice_id: string | null;
}

interface AuditTrailViewerProps {
  portalUserId: string;
}

const getActionIcon = (action: string) => {
  if (action.includes('invoice')) return <FileText className="h-4 w-4 text-emerald-600" />;
  if (action.includes('email')) return <Mail className="h-4 w-4 text-blue-600" />;
  if (action.includes('call')) return <Phone className="h-4 w-4 text-indigo-600" />;
  if (action.includes('timesheet') || action.includes('hours')) return <Clock className="h-4 w-4 text-amber-600" />;
  if (action.includes('payment')) return <DollarSign className="h-4 w-4 text-purple-600" />;
  return <History className="h-4 w-4 text-slate-600" />;
};

const getActionColor = (action: string) => {
  if (action.includes('created') || action.includes('submitted')) return 'bg-blue-100 text-blue-800';
  if (action.includes('approved') || action.includes('paid')) return 'bg-emerald-100 text-emerald-800';
  if (action.includes('rejected') || action.includes('deleted')) return 'bg-red-100 text-red-800';
  if (action.includes('updated') || action.includes('modified')) return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-800';
};

export const AuditTrailViewer = ({ portalUserId }: AuditTrailViewerProps) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const exportColumns: ExportColumn[] = [
    { key: 'created_at', header: 'Date & Time', formatter: formatters.dateTime },
    { key: 'action', header: 'Action', formatter: formatters.status },
    { key: 'ip_address', header: 'IP Address' },
  ];

  useEffect(() => {
    const fetchAuditLog = async () => {
      try {
        const { data, error } = await supabase
          .from('portal_audit_log')
          .select('*')
          .eq('portal_user_id', portalUserId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setEntries(data || []);
      } catch (err) {
        console.error('Error fetching audit log:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLog();
  }, [portalUserId]);

  const filteredEntries = entries.filter(entry => 
    entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entry.ip_address && entry.ip_address.includes(searchQuery))
  );

  const viewDetails = (entry: AuditEntry) => {
    setSelectedEntry(entry);
    setShowDetails(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-slate-600" />
                Activity Audit Trail
              </CardTitle>
              <CardDescription>
                Complete history of all your portal activities
              </CardDescription>
            </div>
            <ExportButton
              data={filteredEntries}
              columns={exportColumns}
              filename={`audit-trail-${format(new Date(), 'yyyy-MM-dd')}`}
              title="Activity Audit Trail"
              subtitle={`${filteredEntries.length} records`}
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Entries */}
          <ScrollArea className="h-[500px]">
            {filteredEntries.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                No activities found
              </p>
            ) : (
              <div className="space-y-2">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors cursor-pointer"
                    onClick={() => viewDetails(entry)}
                  >
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      {getActionIcon(entry.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getActionColor(entry.action)}>
                          {entry.action.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                        {entry.ip_address && (
                          <span className="text-slate-400">
                            IP: {entry.ip_address}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Activity Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Action</p>
                  <Badge className={getActionColor(selectedEntry.action)}>
                    {selectedEntry.action.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Date & Time</p>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedEntry.created_at), 'PPpp')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">IP Address</p>
                  <p className="text-sm font-mono">
                    {selectedEntry.ip_address || 'Not recorded'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Time Ago</p>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(selectedEntry.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {selectedEntry.old_value && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Previous Value</p>
                  <pre className="text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedEntry.old_value, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEntry.new_value && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">New Value</p>
                  <pre className="text-xs bg-emerald-50 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedEntry.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
