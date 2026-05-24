import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import SiteHealthDashboard from '@/components/admin/SiteHealthDashboard';
import AIAgentSettings from '@/components/admin/AIAgentSettings';
import AIAgentAuditLog from '@/components/admin/AIAgentAuditLog';
import {
  Bot,
  Play,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Link,
  Image,
  CreditCard,
  FileText,
  Loader2,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Wrench,
  Settings,
  Activity,
  BarChart3,
  Zap
} from 'lucide-react';

type ScanType = 'full' | 'links' | 'forms' | 'payments' | 'security' | 'qa';

const severityColors: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-500 text-white',
  info: 'bg-gray-500 text-white',
};

const categoryIcons: Record<string, any> = {
  broken_link: Link,
  failed_form: FileText,
  payment_error: CreditCard,
  missing_image: Image,
  subscription_mismatch: AlertTriangle,
  security: Shield,
  performance: Clock,
  qa_failure: AlertTriangle,
};

export default function AdminAssistant() {
  const queryClient = useQueryClient();
  const [selectedScanType, setSelectedScanType] = useState<ScanType>('full');
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedFix, setSelectedFix] = useState<any>(null);

  // Fetch recent scans
  const { data: scans, isLoading: scansLoading, refetch: refetchScans } = useQuery({
    queryKey: ['admin-assistant-scans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_assistant_scans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Fetch open issues
  const { data: issues, isLoading: issuesLoading, refetch: refetchIssues } = useQuery({
    queryKey: ['admin-assistant-issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_assistant_issues')
        .select('*, admin_assistant_fixes(*)')
        .in('status', ['open', 'acknowledged'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch pending fixes
  const { data: pendingFixes, refetch: refetchFixes } = useQuery({
    queryKey: ['admin-assistant-pending-fixes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_assistant_fixes')
        .select('*, admin_assistant_issues(*)')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Auto-refresh
  useAutoRefresh(useCallback(() => {
    refetchScans();
    refetchIssues();
    refetchFixes();
  }, [refetchScans, refetchIssues, refetchFixes]));

  // Run scan mutation
  const runScanMutation = useMutation({
    mutationFn: async (scanType: ScanType) => {
      const { data, error } = await supabase.functions.invoke('run-admin-assistant', {
        body: { scanType },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Scan completed: ${data.issues_found} issues found`);
      queryClient.invalidateQueries({ queryKey: ['admin-assistant-scans'] });
      queryClient.invalidateQueries({ queryKey: ['admin-assistant-issues'] });
      queryClient.invalidateQueries({ queryKey: ['admin-assistant-pending-fixes'] });
    },
    onError: (error: any) => {
      toast.error(`Scan failed: ${error.message}`);
    },
  });

  // Execute fix mutation
  const executeFixMutation = useMutation({
    mutationFn: async (fixId: string) => {
      const { data, error } = await supabase.functions.invoke('execute-ai-fix', {
        body: { fixId },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Execution failed');
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Fix executed successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-assistant-pending-fixes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-assistant-issues'] });
      queryClient.invalidateQueries({ queryKey: ['ai-agent-action-logs'] });
      queryClient.invalidateQueries({ queryKey: ['ai-issue-counts'] });
    },
    onError: (error: any) => {
      toast.error(`Execution failed: ${error.message}`);
    },
  });

  // Approve fix mutation - now with auto-execution for safe fixes
  const approveFix = async (fixId: string, autoExecute: boolean = true) => {
    const { error } = await supabase
      .from('admin_assistant_fixes')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', fixId);

    if (error) {
      toast.error('Failed to approve fix');
      return;
    }

    toast.success('Fix approved');
    refetchFixes();
    refetchIssues();

    // Auto-execute safe fixes
    if (autoExecute) {
      const fix = pendingFixes?.find((f: any) => f.id === fixId);
      const safeTypes = ['automatic', 'cache_cleanup', 'webhook_retry', 'broken_link', 'image'];
      const isSafe = safeTypes.some(t => fix?.fix_type?.toLowerCase().includes(t));
      
      if (isSafe) {
        toast.info('Auto-executing safe fix...');
        executeFixMutation.mutate(fixId);
      }
    }
  };

  // Reject fix mutation
  const rejectFix = async () => {
    if (!selectedFix) return;

    const { error } = await supabase
      .from('admin_assistant_fixes')
      .update({
        approval_status: 'rejected',
        rejection_reason: rejectReason,
      })
      .eq('id', selectedFix.id);

    if (error) {
      toast.error('Failed to reject fix');
    } else {
      toast.success('Fix rejected');
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedFix(null);
      refetchFixes();
    }
  };

  // Update issue status
  const updateIssueStatus = async (issueId: string, status: string) => {
    const { error } = await supabase
      .from('admin_assistant_issues')
      .update({
        status,
        ...(status === 'acknowledged' ? { acknowledged_at: new Date().toISOString() } : {}),
        ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
      })
      .eq('id', issueId);

    if (error) {
      toast.error('Failed to update issue');
    } else {
      toast.success(`Issue marked as ${status}`);
      refetchIssues();
    }
  };

  const stats = {
    totalScans: scans?.length || 0,
    openIssues: issues?.filter(i => i.status === 'open').length || 0,
    criticalIssues: issues?.filter(i => i.severity === 'critical').length || 0,
    pendingFixes: pendingFixes?.length || 0,
  };

  return (
    <AdminLayout title="AI Admin Assistant">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">AI Admin Assistant</h1>
              <p className="text-muted-foreground">Automated monitoring, testing & recommendations</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={selectedScanType} onValueChange={(v) => setSelectedScanType(v as ScanType)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Scan</SelectItem>
                <SelectItem value="payments">Payments</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="qa">QA Tests</SelectItem>
                <SelectItem value="links">Links</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => runScanMutation.mutate(selectedScanType)}
              disabled={runScanMutation.isPending}
            >
              {runScanMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Scan
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalScans}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.openIssues}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.criticalIssues}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Fixes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.pendingFixes}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="dashboard" className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              Health Dashboard
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Issues {stats.openIssues > 0 && <Badge className="ml-1" variant="destructive">{stats.openIssues}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="fixes" className="flex items-center gap-1">
              <Wrench className="h-4 w-4" />
              Fixes {stats.pendingFixes > 0 && <Badge className="ml-1">{stats.pendingFixes}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Audit Log
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Health Dashboard Tab */}
          <TabsContent value="dashboard">
            <SiteHealthDashboard />
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues">
            <Card>
              <CardHeader>
                <CardTitle>Detected Issues</CardTitle>
                <CardDescription>Issues requiring admin attention - no fixes applied without approval</CardDescription>
              </CardHeader>
              <CardContent>
                {issuesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : issues?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No open issues - system is healthy!</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severity</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Affected</TableHead>
                        <TableHead>Fixes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issues?.map((issue) => {
                        const IconComponent = categoryIcons[issue.category] || AlertTriangle;
                        return (
                          <TableRow key={issue.id}>
                            <TableCell>
                              <Badge className={severityColors[issue.severity]}>
                                {issue.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4" />
                                <span className="capitalize">{issue.category.replace('_', ' ')}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-sm">
                                <p className="font-medium">{issue.title}</p>
                                <p className="text-sm text-muted-foreground truncate">{issue.description}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {issue.affected_resource?.slice(0, 30) || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {issue.admin_assistant_fixes?.length || 0} fixes
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedIssue(issue)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateIssueStatus(issue.id, 'resolved')}
                                >
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateIssueStatus(issue.id, 'ignored')}
                                >
                                  <XCircle className="h-4 w-4 text-gray-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Fixes Tab */}
          <TabsContent value="fixes">
            <Card>
              <CardHeader>
                <CardTitle>Fix Recommendations Awaiting Approval</CardTitle>
                <CardDescription>AI-generated recommendations - admin approval required before implementation</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingFixes?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="h-12 w-12 mx-auto mb-4" />
                    <p>No pending fix recommendations</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingFixes?.map((fix) => {
                      const safeTypes = ['automatic', 'cache_cleanup', 'webhook_retry', 'broken_link', 'image'];
                      const isSafeFix = safeTypes.some(t => fix.fix_type?.toLowerCase().includes(t));
                      
                      return (
                        <Card key={fix.id} className={`border-l-4 ${isSafeFix ? 'border-l-green-500' : 'border-l-blue-500'}`}>
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline">{fix.fix_type}</Badge>
                                  <Badge variant="secondary">{fix.estimated_effort}</Badge>
                                  {isSafeFix && (
                                    <Badge variant="default" className="bg-green-500">
                                      <Zap className="h-3 w-3 mr-1" />
                                      Auto-executable
                                    </Badge>
                                  )}
                                </div>
                                <p className="font-medium mb-1">
                                  Issue: {(fix.admin_assistant_issues as any)?.title}
                                </p>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {fix.recommendation}
                                </p>
                                {fix.fix_details && Object.keys(fix.fix_details).length > 0 && (
                                  <details className="text-sm">
                                    <summary className="cursor-pointer text-primary">View details</summary>
                                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                      {JSON.stringify(fix.fix_details, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                              <div className="flex flex-col gap-2 ml-4">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => approveFix(fix.id, true)}
                                  disabled={executeFixMutation.isPending}
                                >
                                  {executeFixMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <ThumbsUp className="h-4 w-4 mr-1" />
                                  )}
                                  {isSafeFix ? 'Approve & Execute' : 'Approve'}
                                </Button>
                                {!isSafeFix && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => approveFix(fix.id, false)}
                                  >
                                    Approve Only
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedFix(fix);
                                    setRejectDialogOpen(true);
                                  }}
                                >
                                  <ThumbsDown className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scan History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Scan History</CardTitle>
                <CardDescription>Previous automated scans and their results</CardDescription>
              </CardHeader>
              <CardContent>
                {scansLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Issues Found</TableHead>
                        <TableHead>Fixes Recommended</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scans?.map((scan) => (
                        <TableRow key={scan.id}>
                          <TableCell>
                            {format(new Date(scan.created_at), 'PPp')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {scan.scan_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={scan.status === 'completed' ? 'default' : scan.status === 'running' ? 'secondary' : 'destructive'}>
                              {scan.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {(scan.summary as any)?.issues_found || 0}
                          </TableCell>
                          <TableCell>
                            {(scan.summary as any)?.fixes_recommended || 0}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {scan.completed_at
                              ? `${Math.round((new Date(scan.completed_at).getTime() - new Date(scan.started_at).getTime()) / 1000)}s`
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit">
            <AIAgentAuditLog />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <AIAgentSettings />
          </TabsContent>
        </Tabs>

        {/* Issue Detail Dialog */}
        <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Badge className={severityColors[selectedIssue?.severity || 'medium']}>
                  {selectedIssue?.severity}
                </Badge>
                {selectedIssue?.title}
              </DialogTitle>
              <DialogDescription>
                Category: {selectedIssue?.category?.replace('_', ' ')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Description</Label>
                <p className="text-sm mt-1">{selectedIssue?.description}</p>
              </div>
              {selectedIssue?.affected_resource && (
                <div>
                  <Label>Affected Resource</Label>
                  <p className="text-sm mt-1 font-mono bg-muted p-2 rounded">
                    {selectedIssue.affected_resource}
                  </p>
                </div>
              )}
              {selectedIssue?.metadata && Object.keys(selectedIssue.metadata).length > 0 && (
                <div>
                  <Label>Additional Details</Label>
                  <pre className="text-xs mt-1 bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(selectedIssue.metadata, null, 2)}
                  </pre>
                </div>
              )}
              {selectedIssue?.admin_assistant_fixes?.length > 0 && (
                <div>
                  <Label>Recommended Fixes</Label>
                  <div className="space-y-2 mt-2">
                    {selectedIssue.admin_assistant_fixes.map((fix: any) => (
                      <div key={fix.id} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{fix.fix_type}</Badge>
                          <Badge variant="secondary">{fix.estimated_effort}</Badge>
                          <Badge variant={fix.approval_status === 'approved' ? 'default' : fix.approval_status === 'rejected' ? 'destructive' : 'outline'}>
                            {fix.approval_status}
                          </Badge>
                        </div>
                        <p className="text-sm">{fix.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedIssue(null)}>
                Close
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  updateIssueStatus(selectedIssue.id, 'resolved');
                  setSelectedIssue(null);
                }}
              >
                Mark Resolved
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Fix Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Fix Recommendation</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this fix.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Reason for Rejection</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why is this fix not appropriate..."
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={rejectFix}>
                Reject Fix
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
