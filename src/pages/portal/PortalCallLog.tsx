import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePortalUser } from '@/hooks/usePortalUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { format, formatDistanceToNow, startOfWeek, startOfMonth } from 'date-fns';
import {
  Building2,
  Phone,
  Plus,
  User,
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Mail,
  Calendar,
  MessageSquare,
  Trash2,
  Edit,
  Eye,
  Shield,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  Voicemail,
  UserCheck,
  Building,
  ArrowLeft,
  Download,
  AlertCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallLog {
  id: string;
  portal_user_id: string;
  contact_type: 'company' | 'individual';
  company_name: string | null;
  contact_name: string;
  phone_number: string;
  email: string | null;
  call_date: string;
  call_time: string;
  call_duration_minutes: number | null;
  call_purpose: string;
  call_outcome: string;
  notes: string | null;
  verification_status: 'pending' | 'verified' | 'disputed' | 'failed';
  verified_at: string | null;
  verification_notes: string | null;
  created_at: string;
}

const CALL_PURPOSES = [
  { value: 'cold_call', label: 'Cold Call', icon: PhoneCall },
  { value: 'follow_up', label: 'Follow Up', icon: Phone },
  { value: 'listing_inquiry', label: 'Listing Inquiry', icon: Building },
  { value: 'partnership', label: 'Partnership', icon: UserCheck },
  { value: 'other', label: 'Other', icon: MessageSquare },
];

const CALL_OUTCOMES = [
  { value: 'interested', label: 'Interested', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-slate-100 text-slate-800' },
  { value: 'callback_requested', label: 'Callback Requested', color: 'bg-blue-100 text-blue-800' },
  { value: 'no_answer', label: 'No Answer', color: 'bg-amber-100 text-amber-800' },
  { value: 'left_voicemail', label: 'Left Voicemail', color: 'bg-purple-100 text-purple-800' },
  { value: 'wrong_number', label: 'Wrong Number', color: 'bg-red-100 text-red-800' },
  { value: 'other', label: 'Other', color: 'bg-slate-100 text-slate-800' },
];

export default function PortalCallLog() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { portalUser, loading: portalLoading } = usePortalUser();
  
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [purposeFilter, setPurposeFilter] = useState<string>('all');
  const [showNewCallDialog, setShowNewCallDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    contact_type: 'company' as 'company' | 'individual',
    company_name: '',
    contact_name: '',
    phone_number: '',
    email: '',
    call_date: format(new Date(), 'yyyy-MM-dd'),
    call_time: format(new Date(), 'HH:mm'),
    call_duration_minutes: '',
    call_purpose: 'cold_call',
    call_outcome: 'interested',
    notes: '',
  });

  useEffect(() => {
    if (!portalLoading && !portalUser) {
      navigate('/portal/login');
    }
  }, [portalUser, portalLoading, navigate]);

  const fetchCallLogs = useCallback(async () => {
    if (!portalUser) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contractor_call_logs')
        .select('*')
        .eq('portal_user_id', portalUser.id)
        .order('call_date', { ascending: false })
        .order('call_time', { ascending: false });

      if (error) throw error;
      setCallLogs((data || []) as CallLog[]);
    } catch (error: any) {
      console.error('Error fetching call logs:', error);
      toast.error('Failed to load call logs');
    } finally {
      setLoading(false);
    }
  }, [portalUser]);

  useEffect(() => {
    if (portalUser) {
      fetchCallLogs();
    }
  }, [portalUser, fetchCallLogs]);

  const resetForm = () => {
    setFormData({
      contact_type: 'company',
      company_name: '',
      contact_name: '',
      phone_number: '',
      email: '',
      call_date: format(new Date(), 'yyyy-MM-dd'),
      call_time: format(new Date(), 'HH:mm'),
      call_duration_minutes: '',
      call_purpose: 'cold_call',
      call_outcome: 'interested',
      notes: '',
    });
    setSelectedLog(null);
  };

  const handleSubmit = async () => {
    if (!portalUser) return;

    // Validation
    if (!formData.contact_name.trim()) {
      toast.error('Contact name is required');
      return;
    }
    if (!formData.phone_number.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (formData.contact_type === 'company' && !formData.company_name.trim()) {
      toast.error('Company name is required for company contacts');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        portal_user_id: portalUser.id,
        contact_type: formData.contact_type,
        company_name: formData.contact_type === 'company' ? formData.company_name : null,
        contact_name: formData.contact_name.trim(),
        phone_number: formData.phone_number.trim(),
        email: formData.email.trim() || null,
        call_date: formData.call_date,
        call_time: formData.call_time,
        call_duration_minutes: formData.call_duration_minutes ? parseInt(formData.call_duration_minutes) : null,
        call_purpose: formData.call_purpose,
        call_outcome: formData.call_outcome,
        notes: formData.notes.trim() || null,
      };

      if (selectedLog) {
        // Update existing
        const { error } = await supabase
          .from('contractor_call_logs')
          .update(payload)
          .eq('id', selectedLog.id);
        if (error) throw error;
        toast.success('Call log updated');
      } else {
        // Create new
        const { error } = await supabase
          .from('contractor_call_logs')
          .insert(payload);
        if (error) throw error;
        toast.success('Call logged successfully');
      }

      setShowNewCallDialog(false);
      resetForm();
      fetchCallLogs();
    } catch (error: any) {
      console.error('Error saving call log:', error);
      toast.error(selectedLog ? 'Failed to update call log' : 'Failed to log call');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLog) return;

    try {
      const { error } = await supabase
        .from('contractor_call_logs')
        .delete()
        .eq('id', selectedLog.id);

      if (error) throw error;
      toast.success('Call log deleted');
      setShowDeleteConfirm(false);
      setSelectedLog(null);
      fetchCallLogs();
    } catch (error: any) {
      console.error('Error deleting call log:', error);
      toast.error('Failed to delete call log');
    }
  };

  const handleEdit = (log: CallLog) => {
    setSelectedLog(log);
    setFormData({
      contact_type: log.contact_type,
      company_name: log.company_name || '',
      contact_name: log.contact_name,
      phone_number: log.phone_number,
      email: log.email || '',
      call_date: log.call_date,
      call_time: log.call_time,
      call_duration_minutes: log.call_duration_minutes?.toString() || '',
      call_purpose: log.call_purpose,
      call_outcome: log.call_outcome,
      notes: log.notes || '',
    });
    setShowNewCallDialog(true);
  };

  const getVerificationBadge = (status: string) => {
    const styles: Record<string, { className: string; icon: React.ReactNode }> = {
      pending: { className: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3 w-3" /> },
      verified: { className: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle className="h-3 w-3" /> },
      disputed: { className: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" /> },
      failed: { className: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
    };
    const style = styles[status] || styles.pending;
    return (
      <Badge className={cn('flex items-center gap-1', style.className)}>
        {style.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getOutcomeBadge = (outcome: string) => {
    const config = CALL_OUTCOMES.find(o => o.value === outcome);
    return <Badge className={config?.color || 'bg-slate-100 text-slate-800'}>{config?.label || outcome}</Badge>;
  };

  const getPurposeIcon = (purpose: string) => {
    const config = CALL_PURPOSES.find(p => p.value === purpose);
    const Icon = config?.icon || Phone;
    return <Icon className="h-4 w-4 text-muted-foreground" />;
  };

  // Filters
  const filteredLogs = callLogs.filter(log => {
    const matchesSearch = 
      log.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.phone_number.includes(searchTerm) ||
      (log.company_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || log.verification_status === statusFilter;
    const matchesPurpose = purposeFilter === 'all' || log.call_purpose === purposeFilter;

    return matchesSearch && matchesStatus && matchesPurpose;
  });

  // Stats
  const todayLogs = callLogs.filter(l => l.call_date === format(new Date(), 'yyyy-MM-dd'));
  const weekStart = startOfWeek(new Date());
  const weekLogs = callLogs.filter(l => new Date(l.call_date) >= weekStart);
  const verifiedCount = callLogs.filter(l => l.verification_status === 'verified').length;
  const pendingCount = callLogs.filter(l => l.verification_status === 'pending').length;

  if (portalLoading || (loading && callLogs.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Call Log | Wellington EcoBuild Portal</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <Link to="/portal/dashboard" className="text-slate-500 hover:text-slate-700">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-slate-900">Call Log</h1>
                  <p className="text-xs text-slate-500">Track your outreach calls</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => {
                    resetForm();
                    setShowNewCallDialog(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Log Call
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Warning Banner */}
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <Shield className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Verification Notice</AlertTitle>
            <AlertDescription className="text-amber-700">
              <strong>Important:</strong> All call logs are subject to random verification. Administration may contact the businesses or individuals you report calling to verify the accuracy of your submissions. Falsifying call records is a serious violation and may result in termination.
            </AlertDescription>
          </Alert>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today</p>
                    <p className="text-2xl font-bold">{todayLogs.length}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Week</p>
                    <p className="text-2xl font-bold">{weekLogs.length}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Verified</p>
                    <p className="text-2xl font-bold text-emerald-600">{verifiedCount}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, company, phone, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Verification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={purposeFilter} onValueChange={setPurposeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Purposes</SelectItem>
                    {CALL_PURPOSES.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchCallLogs} disabled={loading}>
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Call Logs Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-200 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-800">Call History</CardTitle>
                  <CardDescription className="text-slate-600">
                    {filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''} found
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-white">
                  <Clock className="h-3 w-3 mr-1" />
                  Last updated: {format(new Date(), 'HH:mm')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-800 mb-1">No Records Found</h3>
                  <p className="text-slate-500 mb-6">Start logging your calls to build your activity record</p>
                  <Button 
                    onClick={() => {
                      resetForm();
                      setShowNewCallDialog(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Log Your First Call
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="font-semibold text-slate-700 py-4 w-[100px]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Date
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 py-4 w-[80px]">Time</TableHead>
                        <TableHead className="font-semibold text-slate-700 py-4 min-w-[180px]">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            Contact Details
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 py-4 w-[130px]">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            Phone
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 py-4 w-[120px]">Purpose</TableHead>
                        <TableHead className="font-semibold text-slate-700 py-4 w-[130px]">Outcome</TableHead>
                        <TableHead className="font-semibold text-slate-700 py-4 w-[110px]">Status</TableHead>
                        <TableHead className="font-semibold text-slate-700 py-4 text-center w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log, index) => (
                        <TableRow 
                          key={log.id} 
                          className={cn(
                            "hover:bg-slate-50 transition-colors",
                            index % 2 === 0 ? "bg-white" : "bg-slate-25"
                          )}
                        >
                          <TableCell className="py-3">
                            <span className="font-medium text-slate-800">
                              {format(new Date(log.call_date), 'dd MMM yyyy')}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="text-slate-600 font-mono text-sm">
                              {log.call_time.slice(0, 5)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-start gap-2.5">
                              <div className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                log.contact_type === 'company' 
                                  ? "bg-blue-100 text-blue-600" 
                                  : "bg-purple-100 text-purple-600"
                              )}>
                                {log.contact_type === 'company' ? (
                                  <Building className="h-4 w-4" />
                                ) : (
                                  <User className="h-4 w-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-800 truncate">{log.contact_name}</p>
                                {log.company_name && (
                                  <p className="text-sm text-slate-500 truncate">{log.company_name}</p>
                                )}
                                {log.email && (
                                  <p className="text-xs text-slate-400 truncate">{log.email}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="font-mono text-sm text-slate-700">{log.phone_number}</span>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1.5">
                              {getPurposeIcon(log.call_purpose)}
                              <span className="text-sm text-slate-600 capitalize">
                                {log.call_purpose.replace('_', ' ')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">{getOutcomeBadge(log.call_outcome)}</TableCell>
                          <TableCell className="py-3">{getVerificationBadge(log.verification_status)}</TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center justify-center gap-0.5">
                              {log.verification_status === 'pending' && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                    onClick={() => handleEdit(log)}
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      setSelectedLog(log);
                                      setShowDeleteConfirm(true);
                                    }}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {log.notes && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                  onClick={() => toast.info(log.notes || 'No notes')}
                                  title="View Notes"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              )}
                              {log.verification_status !== 'pending' && !log.notes && (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        {/* New/Edit Call Dialog */}
        <Dialog open={showNewCallDialog} onOpenChange={(open) => {
          setShowNewCallDialog(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-emerald-600" />
                {selectedLog ? 'Edit Call Log' : 'Log New Call'}
              </DialogTitle>
              <DialogDescription>
                Record details of your outreach call. All information may be verified.
              </DialogDescription>
            </DialogHeader>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 text-sm">
                By submitting this form, you confirm that you made this call. Administration may contact the person or business to verify.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 mt-4">
              {/* Contact Type */}
              <div className="space-y-2">
                <Label>Contact Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.contact_type === 'company' ? 'default' : 'outline'}
                    className={formData.contact_type === 'company' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                    onClick={() => setFormData(d => ({ ...d, contact_type: 'company' }))}
                  >
                    <Building className="h-4 w-4 mr-2" />
                    Company
                  </Button>
                  <Button
                    type="button"
                    variant={formData.contact_type === 'individual' ? 'default' : 'outline'}
                    className={formData.contact_type === 'individual' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                    onClick={() => setFormData(d => ({ ...d, contact_type: 'individual' }))}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Individual
                  </Button>
                </div>
              </div>

              {/* Company Name (if company) */}
              {formData.contact_type === 'company' && (
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData(d => ({ ...d, company_name: e.target.value }))}
                    placeholder="e.g., ABC Builders Ltd"
                  />
                </div>
              )}

              {/* Contact Name */}
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Person Name *</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData(d => ({ ...d, contact_name: e.target.value }))}
                  placeholder="Full name of person you spoke with"
                />
              </div>

              {/* Phone and Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => setFormData(d => ({ ...d, phone_number: e.target.value }))}
                    placeholder="+64 XX XXX XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(d => ({ ...d, email: e.target.value }))}
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              {/* Date, Time, Duration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="call_date">Call Date *</Label>
                  <Input
                    id="call_date"
                    type="date"
                    value={formData.call_date}
                    onChange={(e) => setFormData(d => ({ ...d, call_date: e.target.value }))}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="call_time">Call Time *</Label>
                  <Input
                    id="call_time"
                    type="time"
                    value={formData.call_time}
                    onChange={(e) => setFormData(d => ({ ...d, call_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="call_duration">Duration (minutes)</Label>
                  <Input
                    id="call_duration"
                    type="number"
                    min="0"
                    value={formData.call_duration_minutes}
                    onChange={(e) => setFormData(d => ({ ...d, call_duration_minutes: e.target.value }))}
                    placeholder="5"
                  />
                </div>
              </div>

              {/* Purpose and Outcome */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Call Purpose *</Label>
                  <Select 
                    value={formData.call_purpose} 
                    onValueChange={(v) => setFormData(d => ({ ...d, call_purpose: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CALL_PURPOSES.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Call Outcome *</Label>
                  <Select 
                    value={formData.call_outcome} 
                    onValueChange={(v) => setFormData(d => ({ ...d, call_outcome: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CALL_OUTCOMES.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(d => ({ ...d, notes: e.target.value }))}
                  placeholder="Any additional details about the call..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setShowNewCallDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {selectedLog ? 'Update Call' : 'Log Call'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Call Log</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this call log? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
