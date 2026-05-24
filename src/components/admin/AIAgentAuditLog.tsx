import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import {
  FileText,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Wrench,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PAGE_SIZE = 20;

const AIAgentAuditLog = () => {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Fetch action logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ['ai-agent-action-logs', page, statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('ai_agent_action_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== 'all') {
        query = query.eq('action_status', statusFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('action_type', typeFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: data || [], total: count || 0 };
    },
  });

  // Fetch scan history for additional context
  const { data: recentScans } = useQuery({
    queryKey: ['ai-agent-recent-scans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_assistant_scans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: Clock, color: 'bg-yellow-500', label: 'Pending' },
    approved: { icon: CheckCircle, color: 'bg-green-500', label: 'Approved' },
    executed: { icon: Wrench, color: 'bg-blue-500', label: 'Executed' },
    rejected: { icon: XCircle, color: 'bg-red-500', label: 'Rejected' },
    failed: { icon: AlertTriangle, color: 'bg-red-500', label: 'Failed' },
  };

  const exportLogs = () => {
    if (!logs?.logs) return;

    const csvContent = [
      ['Timestamp', 'Type', 'Status', 'Description', 'Resource', 'Details'].join(','),
      ...logs.logs.map((log: any) => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.action_type,
        log.action_status,
        `"${log.description.replace(/"/g, '""')}"`,
        log.affected_resource || '-',
        `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-agent-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil((logs?.total || 0) / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Scan History Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Scan History
          </CardTitle>
          <CardDescription>
            Summary of automated and manual scans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issues Found</TableHead>
                  <TableHead>Fixes Recommended</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentScans?.slice(0, 10).map((scan: any) => (
                  <TableRow key={scan.id}>
                    <TableCell className="text-sm">
                      {format(new Date(scan.created_at), 'PPp')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {scan.scan_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={scan.status === 'completed' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {scan.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(scan.summary as any)?.issues_found || 0}
                    </TableCell>
                    <TableCell>
                      {(scan.summary as any)?.fixes_recommended || 0}
                    </TableCell>
                  </TableRow>
                ))}
                {!recentScans?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No scans recorded yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Log */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                AI Agent Action Log
              </CardTitle>
              <CardDescription>
                Detailed audit trail of all AI agent actions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="executed">Executed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportLogs}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading audit logs...
            </div>
          ) : logs?.logs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No action logs recorded yet</p>
              <p className="text-sm">AI agent actions will appear here</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs?.logs?.map((log: any) => {
                      const status = statusConfig[log.action_status] || statusConfig.pending;
                      const StatusIcon = status.icon;
                      
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(log.created_at), 'PP p')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {log.action_type?.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${status.color} text-white`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {log.description}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.affected_resource || '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, logs?.total || 0)} of {logs?.total || 0}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Action Log Details</DialogTitle>
            <DialogDescription>
              Complete details for this AI agent action
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Timestamp</Label>
                  <p>{format(new Date(selectedLog.created_at), 'PPpp')}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Action Type</Label>
                  <p className="capitalize">{selectedLog.action_type?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <Badge className="mt-1">
                    {selectedLog.action_status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Requires Approval</Label>
                  <p>{selectedLog.requires_approval ? 'Yes' : 'No'}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">Description</Label>
                <p>{selectedLog.description}</p>
              </div>

              {selectedLog.affected_resource && (
                <div>
                  <Label className="text-sm text-muted-foreground">Affected Resource</Label>
                  <p>{selectedLog.affected_resource} {selectedLog.affected_resource_id && `(${selectedLog.affected_resource_id})`}</p>
                </div>
              )}

              {selectedLog.error_message && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <Label className="text-sm text-red-600">Error Message</Label>
                  <p className="text-red-600">{selectedLog.error_message}</p>
                </div>
              )}

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <Label className="text-sm text-muted-foreground">Details</Label>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.approved_at && (
                <div>
                  <Label className="text-sm text-muted-foreground">Approved At</Label>
                  <p>{format(new Date(selectedLog.approved_at), 'PPpp')}</p>
                </div>
              )}

              {selectedLog.executed_at && (
                <div>
                  <Label className="text-sm text-muted-foreground">Executed At</Label>
                  <p>{format(new Date(selectedLog.executed_at), 'PPpp')}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={`font-medium ${className || ''}`}>{children}</p>
);

export default AIAgentAuditLog;
