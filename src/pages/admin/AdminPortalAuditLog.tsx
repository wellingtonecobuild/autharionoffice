import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Search,
  Clock,
  User,
  FileText,
  DollarSign,
  Shield,
  AlertCircle,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditEntry {
  id: string;
  action: string;
  portal_user_id: string | null;
  invoice_id: string | null;
  old_value: any;
  new_value: any;
  performed_by: string | null;
  ip_address: string | null;
  created_at: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  invoice: FileText,
  payment: DollarSign,
  user: User,
  default: AlertCircle,
};

const CATEGORY_COLORS: Record<string, string> = {
  invoice: 'bg-blue-100 text-blue-800',
  payment: 'bg-emerald-100 text-emerald-800',
  user: 'bg-purple-100 text-purple-800',
  default: 'bg-slate-100 text-slate-800',
};

export default function AdminPortalAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('portal_invoice_audit_log' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setEntries((data as unknown as AuditEntry[]) || []);
    } catch (error) {
      console.error('Error fetching audit log:', error);
      toast.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      entry.action.toLowerCase().includes(search) ||
      entry.performed_by?.toLowerCase().includes(search)
    );
  });

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Action', 'Performed By', 'Details'];
    const rows = filteredEntries.map(entry => [
      entry.created_at,
      entry.action,
      entry.performed_by || 'System',
      JSON.stringify(entry.new_value || {})
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit log exported');
  };

  const getCategoryIcon = (action: string) => {
    if (action.toLowerCase().includes('invoice')) return <FileText className="h-4 w-4" />;
    if (action.toLowerCase().includes('payment') || action.toLowerCase().includes('paid')) return <DollarSign className="h-4 w-4" />;
    if (action.toLowerCase().includes('user')) return <User className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getCategoryColor = (action: string) => {
    if (action.toLowerCase().includes('invoice')) return CATEGORY_COLORS.invoice;
    if (action.toLowerCase().includes('payment') || action.toLowerCase().includes('paid')) return CATEGORY_COLORS.payment;
    if (action.toLowerCase().includes('user')) return CATEGORY_COLORS.user;
    return CATEGORY_COLORS.default;
  };

  return (
    <AdminLayout title="Portal Audit Log">
      <div className="space-y-6">
        <AdminPageHeader
          title="Portal Audit Log"
          onRefresh={fetchData}
          showLiveIndicator
          actions={
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          }
        />

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search actions, users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit entries found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredEntries.map((entry) => (
                <div 
                  key={entry.id}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border-l-2 border-transparent hover:border-l-emerald-500"
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getCategoryColor(entry.action)}`}>
                      {getCategoryIcon(entry.action)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900">{entry.action}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {entry.performed_by ? (
                        <span>By <span className="font-medium">{entry.performed_by}</span></span>
                      ) : (
                        <span>System action</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(entry.created_at), 'dd MMM yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), 'HH:mm:ss')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
