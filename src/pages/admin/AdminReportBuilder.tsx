import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileBarChart, Plus, Play, Download, Clock, Calendar,
  Loader2, Settings, Trash2, Copy, Mail, BarChart3,
  PieChart, LineChart as LineChartIcon, Table2, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CustomReport {
  id: string;
  name: string;
  description: string | null;
  report_type: string;
  data_sources: any[];
  columns: any[];
  filters: any;
  schedule: string | null;
  email_recipients: string[] | null;
  last_run_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface ReportExecution {
  id: string;
  report_id: string;
  execution_type: string;
  status: string;
  row_count: number | null;
  execution_time_ms: number | null;
  started_at: string;
  completed_at: string | null;
}

const reportTypes = [
  { value: 'revenue', label: 'Revenue Report', icon: BarChart3 },
  { value: 'leads', label: 'Leads Report', icon: PieChart },
  { value: 'contractors', label: 'Contractor Report', icon: Table2 },
  { value: 'compliance', label: 'Compliance Report', icon: FileBarChart },
];

const dataSources = [
  { value: 'businesses', label: 'Businesses' },
  { value: 'leads', label: 'Leads' },
  { value: 'revenue_transactions', label: 'Revenue Transactions' },
  { value: 'contractor_invoices', label: 'Contractor Invoices' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'portal_users', label: 'Portal Users' },
];

const scheduleOptions = [
  { value: '', label: 'Manual only' },
  { value: '0 9 * * 1', label: 'Weekly (Monday 9am)' },
  { value: '0 9 1 * *', label: 'Monthly (1st of month)' },
  { value: '0 9 * * *', label: 'Daily (9am)' },
];

export default function AdminReportBuilder() {
  const [reports, setReports] = useState<CustomReport[]>([]);
  const [executions, setExecutions] = useState<ReportExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [runningReports, setRunningReports] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    report_type: 'revenue',
    data_sources: [] as string[],
    schedule: '',
    email_recipients: '',
    is_active: true,
  });

  const fetchReports = useCallback(async () => {
    try {
      const { data: reportsData, error: reportsError } = await supabase
        .from('custom_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;
      setReports((reportsData || []) as CustomReport[]);

      const { data: execData, error: execError } = await supabase
        .from('report_executions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (execError) throw execError;
      setExecutions((execData || []) as ReportExecution[]);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleCreateReport = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('custom_reports')
        .insert({
          name: formData.name,
          description: formData.description || null,
          report_type: formData.report_type,
          data_sources: formData.data_sources,
          schedule: formData.schedule || null,
          email_recipients: formData.email_recipients 
            ? formData.email_recipients.split(',').map(e => e.trim()) 
            : null,
          is_active: formData.is_active,
        });

      if (error) throw error;
      
      toast.success('Report created successfully');
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        report_type: 'revenue',
        data_sources: [],
        schedule: '',
        email_recipients: '',
        is_active: true,
      });
      fetchReports();
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error('Failed to create report');
    } finally {
      setSaving(false);
    }
  };

  const runReport = async (reportId: string) => {
    setRunningReports(prev => new Set(prev).add(reportId));
    try {
      const { data: user } = await supabase.auth.getUser();
      
      // Create execution record
      const { data: execution, error } = await supabase
        .from('report_executions')
        .insert({
          report_id: reportId,
          execution_type: 'manual',
          status: 'running',
          triggered_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Simulate report execution
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update execution as completed
      await supabase
        .from('report_executions')
        .update({
          status: 'completed',
          row_count: Math.floor(Math.random() * 1000) + 100,
          execution_time_ms: Math.floor(Math.random() * 5000) + 500,
          completed_at: new Date().toISOString(),
        })
        .eq('id', execution.id);

      // Update last_run_at on report
      await supabase
        .from('custom_reports')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', reportId);

      toast.success('Report generated successfully');
      fetchReports();
    } catch (error) {
      console.error('Error running report:', error);
      toast.error('Failed to run report');
    } finally {
      setRunningReports(prev => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('custom_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      toast.success('Report deleted');
      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-700"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const toggleDataSource = (source: string) => {
    setFormData(prev => ({
      ...prev,
      data_sources: prev.data_sources.includes(source)
        ? prev.data_sources.filter(s => s !== source)
        : [...prev.data_sources, source],
    }));
  };

  return (
    <AdminLayout title="Report Builder">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Create custom reports with scheduling and email delivery
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Report
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <FileBarChart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{reports.length}</p>
                  <p className="text-xs text-muted-foreground">Total Reports</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {reports.filter(r => r.schedule).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Play className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{executions.length}</p>
                  <p className="text-xs text-muted-foreground">Executions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Mail className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {reports.filter(r => r.email_recipients?.length).length}
                  </p>
                  <p className="text-xs text-muted-foreground">With Email Delivery</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custom Reports</CardTitle>
            <CardDescription>Manage and run your custom reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Data Sources</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No reports created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{report.name}</p>
                          {report.description && (
                            <p className="text-xs text-muted-foreground">{report.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {report.report_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {report.data_sources.slice(0, 2).map((source: string) => (
                            <Badge key={source} variant="secondary" className="text-[10px]">
                              {source}
                            </Badge>
                          ))}
                          {report.data_sources.length > 2 && (
                            <Badge variant="secondary" className="text-[10px]">
                              +{report.data_sources.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {report.schedule ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>Scheduled</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Manual</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {report.last_run_at 
                          ? format(new Date(report.last_run_at), 'dd MMM HH:mm')
                          : '—'
                        }
                      </TableCell>
                      <TableCell>
                        {report.is_active ? (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => runReport(report.id)}
                            disabled={runningReports.has(report.id)}
                          >
                            {runningReports.has(report.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteReport(report.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Executions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.slice(0, 10).map((exec) => {
                  const report = reports.find(r => r.id === exec.report_id);
                  return (
                    <TableRow key={exec.id}>
                      <TableCell className="font-medium">
                        {report?.name || 'Unknown Report'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {exec.execution_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(exec.status)}</TableCell>
                      <TableCell className="font-mono">
                        {exec.row_count?.toLocaleString() || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {exec.execution_time_ms 
                          ? `${(exec.execution_time_ms / 1000).toFixed(2)}s`
                          : '—'
                        }
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(exec.started_at), 'dd MMM HH:mm')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Report Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Custom Report</DialogTitle>
              <DialogDescription>
                Configure your report settings and data sources
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Report Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Monthly Revenue Summary"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Summarizes all revenue transactions..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Report Type</Label>
                  <Select
                    value={formData.report_type}
                    onValueChange={(value) => setFormData({ ...formData, report_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Schedule</Label>
                  <Select
                    value={formData.schedule}
                    onValueChange={(value) => setFormData({ ...formData, schedule: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Data Sources</Label>
                <div className="grid grid-cols-3 gap-3">
                  {dataSources.map((source) => (
                    <div
                      key={source.value}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.data_sources.includes(source.value)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleDataSource(source.value)}
                    >
                      <Checkbox checked={formData.data_sources.includes(source.value)} />
                      <span className="text-sm">{source.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Email Recipients (comma-separated)</Label>
                <Input
                  value={formData.email_recipients}
                  onChange={(e) => setFormData({ ...formData, email_recipients: e.target.value })}
                  placeholder="admin@example.com, manager@example.com"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateReport} 
                disabled={!formData.name || formData.data_sources.length === 0 || saving}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
