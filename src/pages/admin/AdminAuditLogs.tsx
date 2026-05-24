import { useEffect, useState, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, Shield, Clock, FileText, Eye, Download, Filter, Database, Lock } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: any;
  new_data: any;
  metadata: any;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useAutoRefresh(useCallback(() => fetchLogs(), []));

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          profiles:admin_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs((data || []) as any);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes('approve')) return '✓';
    if (action.includes('reject') || action.includes('suspend')) return '✗';
    if (action.includes('create') || action.includes('insert')) return '+';
    if (action.includes('update') || action.includes('edit')) return '~';
    if (action.includes('delete')) return '−';
    if (action.includes('view') || action.includes('export')) return '○';
    return '•';
  };

  const getActionColor = (action: string) => {
    if (action.includes('approve') || action.includes('create')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (action.includes('reject') || action.includes('delete') || action.includes('suspend')) return 'text-red-600 bg-red-50 border-red-200';
    if (action.includes('update') || action.includes('edit')) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (action.includes('export') || action.includes('view')) return 'text-slate-600 bg-slate-50 border-slate-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))].sort();
  const uniqueEntities = [...new Set(logs.map(l => l.entity_type))].sort();

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      log.profiles?.email?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(search.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    
    return matchesSearch && matchesAction && matchesEntity;
  });

  const handleExport = () => {
    const headers = ['Timestamp', 'Admin', 'Action', 'Entity Type', 'Entity ID', 'Details'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.profiles?.email || log.admin_id,
      log.action,
      log.entity_type,
      log.entity_id || '',
      JSON.stringify(log.metadata || {})
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const viewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  return (
    <AdminLayout title="Audit Logs">
      <div className="space-y-4">
        {/* Header Banner */}
        <div className="bg-slate-800 text-white rounded p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-700 rounded">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Immutable Audit Trail</h2>
                <p className="text-sm text-slate-300">All administrative actions are permanently logged</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              <span>READ-ONLY</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Filters
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Filter by entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {uniqueEntities.map(entity => (
                    <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
            <div className="mt-3 text-xs text-slate-500 font-mono">
              Showing {filteredLogs.length} of {logs.length} records
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="border-slate-200 shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100 hover:bg-slate-100">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 w-[180px]">
                    Timestamp
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Administrator
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Action
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Entity
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 w-[100px]">
                    Details
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                      <p className="text-sm text-slate-500 mt-2">Loading audit records...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                      No audit logs match your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {format(new Date(log.created_at), 'yyyy-MM-dd')}
                          <span className="text-slate-400">
                            {format(new Date(log.created_at), 'HH:mm:ss')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded bg-slate-200 flex items-center justify-center">
                            <Shield className="h-3 w-3 text-slate-500" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800">
                              {log.profiles?.full_name || 'System'}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              {log.profiles?.email || log.admin_id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium ${getActionColor(log.action)}`}>
                          <span className="font-mono">{getActionIcon(log.action)}</span>
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium text-slate-700 capitalize">
                            {log.entity_type.replace(/_/g, ' ')}
                          </div>
                          {log.entity_id && (
                            <div className="text-xs text-slate-400 font-mono">
                              ID: {log.entity_id.slice(0, 12)}...
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => viewDetails(log)}
                          className="h-7 px-2"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Audit Log Details
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Log ID</div>
                    <div className="font-mono text-sm">{selectedLog.id}</div>
                  </div>
                  <div className="bg-slate-50 rounded p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Timestamp</div>
                    <div className="font-mono text-sm">
                      {format(new Date(selectedLog.created_at), 'yyyy-MM-dd HH:mm:ss.SSS')}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Administrator</div>
                    <div className="text-sm">{selectedLog.profiles?.full_name || 'Unknown'}</div>
                    <div className="text-xs text-slate-500 font-mono">{selectedLog.profiles?.email}</div>
                  </div>
                  <div className="bg-slate-50 rounded p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Admin ID</div>
                    <div className="font-mono text-sm">{selectedLog.admin_id}</div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded p-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Action</div>
                  <Badge className={getActionColor(selectedLog.action)}>
                    {selectedLog.action.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className="bg-slate-50 rounded p-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Entity</div>
                  <div className="text-sm">
                    <span className="font-medium capitalize">{selectedLog.entity_type.replace(/_/g, ' ')}</span>
                    {selectedLog.entity_id && (
                      <span className="ml-2 font-mono text-slate-500">({selectedLog.entity_id})</span>
                    )}
                  </div>
                </div>

                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="bg-slate-50 rounded p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Metadata</div>
                    <pre className="text-xs font-mono bg-slate-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.old_data && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-3">
                    <div className="text-xs text-amber-600 uppercase tracking-wider mb-2">Previous State</div>
                    <pre className="text-xs font-mono bg-amber-100/50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_data && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
                    <div className="text-xs text-emerald-600 uppercase tracking-wider mb-2">New State</div>
                    <pre className="text-xs font-mono bg-emerald-100/50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="border-t pt-4 text-center">
                  <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                    <Lock className="h-3 w-3" />
                    This record is immutable and cannot be modified or deleted
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
