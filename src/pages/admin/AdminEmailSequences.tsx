import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Mail, Plus, Play, Pause, Edit, Trash2, Loader2, 
  Users, Clock, CheckCircle, XCircle, BarChart3,
  ArrowRight, Settings, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EmailSequence {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_conditions: any;
  is_active: boolean;
  created_at: string;
  steps?: EmailSequenceStep[];
  enrollments_count?: number;
}

interface EmailSequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  delay_days: number;
  delay_hours: number;
  subject: string;
  body_html: string;
  is_active: boolean;
}

interface Enrollment {
  id: string;
  sequence_id: string;
  recipient_email: string;
  recipient_name: string | null;
  recipient_type: string;
  current_step: number;
  status: string;
  enrolled_at: string;
  next_email_at: string | null;
}

const triggerTypes = [
  { value: 'manual', label: 'Manual Enrollment' },
  { value: 'on_signup', label: 'On User Signup' },
  { value: 'on_lead', label: 'On New Lead' },
  { value: 'on_payment', label: 'On Payment' },
  { value: 'on_trial_end', label: 'Before Trial Ends' },
];

export default function AdminEmailSequences() {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSequence, setSelectedSequence] = useState<EmailSequence | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'manual',
    is_active: true,
  });

  const [stepFormData, setStepFormData] = useState({
    step_order: 1,
    delay_days: 0,
    delay_hours: 0,
    subject: '',
    body_html: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const { data: seqData, error: seqError } = await supabase
        .from('email_sequences')
        .select('*')
        .order('created_at', { ascending: false });

      if (seqError) throw seqError;
      
      // Get enrollment counts
      const sequencesWithCounts = await Promise.all((seqData || []).map(async (seq) => {
        const { count } = await supabase
          .from('email_sequence_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('sequence_id', seq.id);
        
        const { data: steps } = await supabase
          .from('email_sequence_steps')
          .select('*')
          .eq('sequence_id', seq.id)
          .order('step_order');
        
        return { ...seq, enrollments_count: count || 0, steps: steps || [] };
      }));

      setSequences(sequencesWithCounts as EmailSequence[]);

      // Fetch recent enrollments
      const { data: enrollData } = await supabase
        .from('email_sequence_enrollments')
        .select('*')
        .order('enrolled_at', { ascending: false })
        .limit(100);

      setEnrollments((enrollData || []) as Enrollment[]);
    } catch (error) {
      console.error('Error fetching sequences:', error);
      toast.error('Failed to load email sequences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSequence = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('email_sequences')
        .insert({
          name: formData.name,
          description: formData.description || null,
          trigger_type: formData.trigger_type,
          is_active: formData.is_active,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Email sequence created');
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '', trigger_type: 'manual', is_active: true });
      fetchData();
    } catch (error) {
      console.error('Error creating sequence:', error);
      toast.error('Failed to create sequence');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = async () => {
    if (!selectedSequence) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_sequence_steps')
        .insert({
          sequence_id: selectedSequence.id,
          ...stepFormData,
        });

      if (error) throw error;
      
      toast.success('Step added to sequence');
      setIsStepDialogOpen(false);
      setStepFormData({ step_order: 1, delay_days: 0, delay_hours: 0, subject: '', body_html: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding step:', error);
      toast.error('Failed to add step');
    } finally {
      setSaving(false);
    }
  };

  const toggleSequenceStatus = async (sequence: EmailSequence) => {
    try {
      const { error } = await supabase
        .from('email_sequences')
        .update({ is_active: !sequence.is_active })
        .eq('id', sequence.id);

      if (error) throw error;
      toast.success(sequence.is_active ? 'Sequence paused' : 'Sequence activated');
      fetchData();
    } catch (error) {
      console.error('Error toggling sequence:', error);
      toast.error('Failed to update sequence');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Active</Badge>;
      case 'paused':
        return <Badge className="bg-amber-100 text-amber-700">Paused</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="Email Sequences">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Automated email campaigns to nurture leads and engage users
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Sequence
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{sequences.length}</p>
                  <p className="text-xs text-muted-foreground">Total Sequences</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Play className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {sequences.filter(s => s.is_active).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Sequences</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {enrollments.filter(e => e.status === 'active').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Enrollments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {enrollments.filter(e => e.status === 'completed').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sequences">
          <TabsList>
            <TabsTrigger value="sequences">Sequences</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          </TabsList>

          <TabsContent value="sequences" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sequence</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Enrollments</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : sequences.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        No email sequences created yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    sequences.map((sequence) => (
                      <TableRow key={sequence.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sequence.name}</p>
                            {sequence.description && (
                              <p className="text-xs text-muted-foreground">{sequence.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            <Zap className="h-3 w-3 mr-1" />
                            {sequence.trigger_type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">{sequence.steps?.length || 0}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">{sequence.enrollments_count}</span>
                        </TableCell>
                        <TableCell>
                          {sequence.is_active ? (
                            <Badge className="bg-green-100 text-green-700">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Paused</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSequenceStatus(sequence)}
                            >
                              {sequence.is_active ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSequence(sequence);
                                setStepFormData({
                                  ...stepFormData,
                                  step_order: (sequence.steps?.length || 0) + 1,
                                });
                                setIsStepDialogOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="enrollments" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Next Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        No enrollments yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    enrollments.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{enrollment.recipient_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{enrollment.recipient_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {enrollment.recipient_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">Step {enrollment.current_step}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(enrollment.enrolled_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {enrollment.next_email_at 
                            ? format(new Date(enrollment.next_email_at), 'dd MMM HH:mm')
                            : '—'
                          }
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Sequence Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Email Sequence</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Sequence Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Welcome Series"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Onboarding emails for new users..."
                />
              </div>
              <div>
                <Label>Trigger</Label>
                <Select
                  value={formData.trigger_type}
                  onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Button onClick={handleCreateSequence} disabled={!formData.name || saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Sequence
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Step Dialog */}
        <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Email Step</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Step Order</Label>
                  <Input
                    type="number"
                    value={stepFormData.step_order}
                    onChange={(e) => setStepFormData({ ...stepFormData, step_order: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Delay (Days)</Label>
                  <Input
                    type="number"
                    value={stepFormData.delay_days}
                    onChange={(e) => setStepFormData({ ...stepFormData, delay_days: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Delay (Hours)</Label>
                  <Input
                    type="number"
                    value={stepFormData.delay_hours}
                    onChange={(e) => setStepFormData({ ...stepFormData, delay_hours: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>Subject Line</Label>
                <Input
                  value={stepFormData.subject}
                  onChange={(e) => setStepFormData({ ...stepFormData, subject: e.target.value })}
                  placeholder="Welcome to Wellington EcoBuild!"
                />
              </div>
              <div>
                <Label>Email Body (HTML)</Label>
                <Textarea
                  value={stepFormData.body_html}
                  onChange={(e) => setStepFormData({ ...stepFormData, body_html: e.target.value })}
                  placeholder="<h1>Hello {{name}}!</h1><p>Welcome...</p>"
                  rows={8}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStepDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddStep} disabled={!stepFormData.subject || saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Step
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
