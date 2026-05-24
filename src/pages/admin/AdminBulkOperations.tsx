import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Layers, Mail, Download, Trash2, RefreshCw, Play, Loader2,
  CheckCircle, XCircle, Clock, AlertTriangle, Users, Building2,
  FileText, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface BulkOperation {
  id: string;
  operation_type: string;
  entity_type: string;
  entity_ids: string[];
  total_count: number;
  success_count: number;
  failed_count: number;
  status: string;
  parameters: any;
  results: any;
  error_log: any[];
  started_at: string;
  completed_at: string | null;
  performed_by: string | null;
}

interface SelectableEntity {
  id: string;
  name: string;
  email?: string;
  status?: string;
  selected: boolean;
}

export default function AdminBulkOperations() {
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewOpDialogOpen, setIsNewOpDialogOpen] = useState(false);
  const [selectedEntityType, setSelectedEntityType] = useState<string>('businesses');
  const [selectedOperationType, setSelectedOperationType] = useState<string>('email');
  const [entities, setEntities] = useState<SelectableEntity[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchOperations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bulk_operations')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setOperations((data || []) as BulkOperation[]);
    } catch (error) {
      console.error('Error fetching operations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  const fetchEntities = async (entityType: string) => {
    setLoadingEntities(true);
    try {
      let data: any[] = [];
      
      switch (entityType) {
        case 'businesses':
          const { data: bizData } = await supabase
            .from('businesses')
            .select('id, name, email, status')
            .order('name');
          data = bizData || [];
          break;
        case 'leads':
          const { data: leadData } = await supabase
            .from('leads')
            .select('id, name, email, status')
            .order('created_at', { ascending: false });
          data = leadData || [];
          break;
        case 'portal_users':
          const { data: portalData } = await supabase
            .from('portal_users')
            .select('id, full_name, email, status')
            .order('full_name');
          data = (portalData || []).map((p: any) => ({ id: p.id, name: p.full_name, email: p.email, status: p.status }));
          break;
      }

      setEntities(data.map(e => ({ ...e, selected: false })));
    } catch (error) {
      console.error('Error fetching entities:', error);
    } finally {
      setLoadingEntities(false);
    }
  };

  useEffect(() => {
    if (isNewOpDialogOpen) {
      fetchEntities(selectedEntityType);
    }
  }, [selectedEntityType, isNewOpDialogOpen]);

  const toggleSelectAll = (checked: boolean) => {
    setEntities(entities.map(e => ({ ...e, selected: checked })));
  };

  const toggleEntity = (id: string) => {
    setEntities(entities.map(e => 
      e.id === id ? { ...e, selected: !e.selected } : e
    ));
  };

  const selectedCount = entities.filter(e => e.selected).length;

  const handleExecuteOperation = async () => {
    const selectedIds = entities.filter(e => e.selected).map(e => e.id);
    
    if (selectedIds.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    setProcessing(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      // Create the bulk operation record
      const { data: operation, error } = await supabase
        .from('bulk_operations')
        .insert({
          operation_type: selectedOperationType,
          entity_type: selectedEntityType,
          entity_ids: selectedIds,
          total_count: selectedIds.length,
          status: 'processing',
          parameters: {
            email_subject: emailSubject,
            email_body: emailBody,
          },
          performed_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Simulate processing (in real implementation, this would be handled by an edge function)
      toast.success(`Bulk operation started for ${selectedIds.length} items`);
      setIsNewOpDialogOpen(false);
      fetchOperations();

      // Reset form
      setEmailSubject('');
      setEmailBody('');
      setEntities(entities.map(e => ({ ...e, selected: false })));
    } catch (error) {
      console.error('Error creating operation:', error);
      toast.error('Failed to start bulk operation');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-700"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'status_update':
        return <RefreshCw className="h-4 w-4" />;
      case 'export':
        return <Download className="h-4 w-4" />;
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };

  return (
    <AdminLayout title="Bulk Operations">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Execute mass operations on multiple records efficiently
            </p>
          </div>
          <Button onClick={() => setIsNewOpDialogOpen(true)} className="gap-2">
            <Layers className="h-4 w-4" />
            New Bulk Operation
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Layers className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{operations.length}</p>
                  <p className="text-xs text-muted-foreground">Total Operations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {operations.filter(o => o.status === 'processing').length}
                  </p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {operations.filter(o => o.status === 'completed').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {operations.filter(o => o.status === 'failed').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operations History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Operation History</CardTitle>
            <CardDescription>Recent bulk operations and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operation</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : operations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No bulk operations yet
                    </TableCell>
                  </TableRow>
                ) : (
                  operations.map((op) => {
                    const progress = op.total_count > 0 
                      ? Math.round(((op.success_count + op.failed_count) / op.total_count) * 100)
                      : 0;
                    
                    return (
                      <TableRow key={op.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded bg-muted">
                              {getOperationIcon(op.operation_type)}
                            </div>
                            <span className="font-medium capitalize">
                              {op.operation_type.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {op.entity_type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={progress} className="h-2 w-24" />
                            <p className="text-xs text-muted-foreground">
                              {op.success_count}/{op.total_count} ({progress}%)
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(op.status)}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(op.started_at), 'dd MMM HH:mm')}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {op.completed_at 
                            ? `${Math.round((new Date(op.completed_at).getTime() - new Date(op.started_at).getTime()) / 1000)}s`
                            : '—'
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* New Operation Dialog */}
        <Dialog open={isNewOpDialogOpen} onOpenChange={setIsNewOpDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Bulk Operation</DialogTitle>
              <DialogDescription>
                Select items and configure the operation to execute
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Entity Type</Label>
                  <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="businesses">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Businesses
                        </div>
                      </SelectItem>
                      <SelectItem value="leads">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Leads
                        </div>
                      </SelectItem>
                      <SelectItem value="portal_users">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Portal Users
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Operation Type</Label>
                  <Select value={selectedOperationType} onValueChange={setSelectedOperationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Send Email
                        </div>
                      </SelectItem>
                      <SelectItem value="status_update">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Update Status
                        </div>
                      </SelectItem>
                      <SelectItem value="export">
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          Export Data
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Email Configuration */}
              {selectedOperationType === 'email' && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label>Email Subject</Label>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Important Update from Wellington EcoBuild"
                    />
                  </div>
                  <div>
                    <Label>Email Body</Label>
                    <Textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Dear {{name}},&#10;&#10;We wanted to inform you..."
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use {"{{name}}"}, {"{{email}}"} for personalization
                    </p>
                  </div>
                </div>
              )}

              {/* Entity Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Select Items ({selectedCount} selected)</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedCount === entities.length && entities.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm">Select All</span>
                  </div>
                </div>
                
                <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                  {loadingEntities ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entities.map((entity) => (
                          <TableRow 
                            key={entity.id}
                            className="cursor-pointer"
                            onClick={() => toggleEntity(entity.id)}
                          >
                            <TableCell>
                              <Checkbox checked={entity.selected} />
                            </TableCell>
                            <TableCell className="font-medium">{entity.name}</TableCell>
                            <TableCell className="text-muted-foreground">{entity.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {entity.status || 'active'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewOpDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleExecuteOperation} 
                disabled={selectedCount === 0 || processing}
                className="gap-2"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Execute on {selectedCount} Items
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
