import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format, formatDistanceToNow, startOfWeek, startOfMonth, subDays } from 'date-fns';
import {
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  User,
  Building,
  Calendar,
  Shield,
  Download,
  Eye,
  PhoneCall,
  MessageSquare,
  Filter,
  Mail,
  ExternalLink,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallLog {
  id: string;
  portal_user_id: string;
  contact_type: string;
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
  verification_status: string;
  verified_at: string | null;
  verified_by: string | null;
  verification_notes: string | null;
  verification_method: string | null;
  created_at: string;
  updated_at: string;
}

interface PortalUser {
  id: string;
  email: string;
  legal_full_name: string | null;
}

interface ContractorStats {
  id: string;
  name: string;
  email: string;
  total_calls: number;
  verified: number;
  pending: number;
  disputed: number;
  failed: number;
}

const VERIFICATION_METHODS = [
  { value: 'phone_callback', label: 'Phone Callback' },
  { value: 'email_confirmation', label: 'Email Confirmation' },
  { value: 'spot_check', label: 'Random Spot Check' },
  { value: 'supervisor_review', label: 'Supervisor Review' },
  { value: 'other', label: 'Other' },
];

export default function AdminCallVerification() {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contractorFilter, setContractorFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [verificationAction, setVerificationAction] = useState<'verified' | 'disputed' | 'failed'>('verified');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verificationMethod, setVerificationMethod] = useState('phone_callback');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('logs');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, usersRes] = await Promise.all([
        supabase
          .from('contractor_call_logs')
          .select('*')
          .order('call_date', { ascending: false })
          .order('call_time', { ascending: false }),
        supabase
          .from('portal_users')
          .select('id, email, legal_full_name')
          .eq('status', 'active')
      ]);

      if (logsRes.error) throw logsRes.error;
      if (usersRes.error) throw usersRes.error;

      setCallLogs((logsRes.data || []) as CallLog[]);
      setPortalUsers((usersRes.data || []) as PortalUser[]);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load call logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getContractorName = (portalUserId: string) => {
    const user = portalUsers.find(u => u.id === portalUserId);
    return user?.legal_full_name || user?.email || 'Unknown';
  };

  const handleVerification = async () => {
    if (!selectedLog) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('contractor_call_logs')
        .update({
          verification_status: verificationAction,
          verified_at: new Date().toISOString(),
          verification_notes: verificationNotes.trim() || null,
          verification_method: verificationMethod,
        })
        .eq('id', selectedLog.id);

      if (error) throw error;

      toast.success(`Call log marked as ${verificationAction}`);
      setShowVerifyDialog(false);
      setSelectedLog(null);
      setVerificationNotes('');
      fetchData();
    } catch (error: any) {
      console.error('Error updating verification:', error);
      toast.error('Failed to update verification');
    } finally {
      setSubmitting(false);
    }
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

  const getOutcomeLabel = (outcome: string) => {
    const labels: Record<string, string> = {
      interested: 'Interested',
      not_interested: 'Not Interested',
      callback_requested: 'Callback Requested',
      no_answer: 'No Answer',
      left_voicemail: 'Left Voicemail',
      wrong_number: 'Wrong Number',
      other: 'Other',
    };
    return labels[outcome] || outcome;
  };

  const getPurposeLabel = (purpose: string) => {
    const labels: Record<string, string> = {
      cold_call: 'Cold Call',
      follow_up: 'Follow Up',
      listing_inquiry: 'Listing Inquiry',
      partnership: 'Partnership',
      other: 'Other',
    };
    return labels[purpose] || purpose;
  };

  // Date filtering
  const filterByDate = (log: CallLog) => {
    if (dateFilter === 'all') return true;
    const logDate = new Date(log.call_date);
    const today = new Date();
    
    switch (dateFilter) {
      case 'today':
        return log.call_date === format(today, 'yyyy-MM-dd');
      case 'week':
        return logDate >= startOfWeek(today);
      case 'month':
        return logDate >= startOfMonth(today);
      case '7days':
        return logDate >= subDays(today, 7);
      case '30days':
        return logDate >= subDays(today, 30);
      default:
        return true;
    }
  };

  // Apply all filters
  const filteredLogs = callLogs.filter(log => {
    const matchesSearch = 
      log.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.phone_number.includes(searchTerm) ||
      (log.company_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      getContractorName(log.portal_user_id).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.verification_status === statusFilter;
    const matchesContractor = contractorFilter === 'all' || log.portal_user_id === contractorFilter;
    const matchesDate = filterByDate(log);

    return matchesSearch && matchesStatus && matchesContractor && matchesDate;
  });

  // Calculate contractor stats
  const contractorStats: ContractorStats[] = portalUsers.map(user => {
    const userLogs = callLogs.filter(l => l.portal_user_id === user.id);
    return {
      id: user.id,
      name: user.legal_full_name || user.email,
      email: user.email,
      total_calls: userLogs.length,
      verified: userLogs.filter(l => l.verification_status === 'verified').length,
      pending: userLogs.filter(l => l.verification_status === 'pending').length,
      disputed: userLogs.filter(l => l.verification_status === 'disputed').length,
      failed: userLogs.filter(l => l.verification_status === 'failed').length,
    };
  }).filter(s => s.total_calls > 0).sort((a, b) => b.total_calls - a.total_calls);

  // Summary stats
  const totalCalls = callLogs.length;
  const pendingVerification = callLogs.filter(l => l.verification_status === 'pending').length;
  const verifiedCalls = callLogs.filter(l => l.verification_status === 'verified').length;
  const disputedCalls = callLogs.filter(l => l.verification_status === 'disputed').length;

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Contractor', 'Contact', 'Company', 'Phone', 'Email', 'Purpose', 'Outcome', 'Status', 'Notes'];
    const rows = filteredLogs.map(log => [
      log.call_date,
      log.call_time,
      getContractorName(log.portal_user_id),
      log.contact_name,
      log.company_name || '',
      log.phone_number,
      log.email || '',
      getPurposeLabel(log.call_purpose),
      getOutcomeLabel(log.call_outcome),
      log.verification_status,
      log.notes || ''
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <AdminLayout title="Call Verification">
      <div className="space-y-6">
        <AdminPageHeader
          title="Call Verification"
          subtitle="Review and verify contractor call logs"
          icon={Shield}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Calls</p>
                  <p className="text-2xl font-bold">{totalCalls}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700">Pending Verification</p>
                  <p className="text-2xl font-bold text-amber-800">{pendingVerification}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-200 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-700">Verified</p>
                  <p className="text-2xl font-bold text-emerald-800">{verifiedCalls}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-200 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700">Disputed/Failed</p>
                  <p className="text-2xl font-bold text-red-800">{disputedCalls}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-200 flex items-center justify-center">
                  <ShieldX className="h-5 w-5 text-red-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Logs
            </TabsTrigger>
            <TabsTrigger value="contractors" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              By Contractor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contacts, contractors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="disputed">Disputed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={contractorFilter} onValueChange={setContractorFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Contractor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Contractors</SelectItem>
                      {portalUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.legal_full_name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="7days">Last 7 Days</SelectItem>
                      <SelectItem value="30days">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Call Logs Table */}
            <Card>
              <CardHeader>
                <CardTitle>Call Logs</CardTitle>
                <CardDescription>{filteredLogs.length} records found</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Phone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No call logs found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date/Time</TableHead>
                          <TableHead>Contractor</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Outcome</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.map((log) => (
                          <TableRow key={log.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div>
                                <p className="font-medium">{format(new Date(log.call_date), 'dd MMM yyyy')}</p>
                                <p className="text-sm text-muted-foreground">{log.call_time.slice(0, 5)}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-sm">{getContractorName(log.portal_user_id)}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {log.contact_type === 'company' ? (
                                  <Building className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <User className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div>
                                  <p className="font-medium text-sm">{log.contact_name}</p>
                                  {log.company_name && (
                                    <p className="text-xs text-muted-foreground">{log.company_name}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <a href={`tel:${log.phone_number}`} className="font-mono text-sm hover:text-emerald-600">
                                  {log.phone_number}
                                </a>
                                {log.email && (
                                  <a href={`mailto:${log.email}`} className="block text-xs text-muted-foreground hover:text-emerald-600">
                                    {log.email}
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{getPurposeLabel(log.call_purpose)}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{getOutcomeLabel(log.call_outcome)}</span>
                            </TableCell>
                            <TableCell>{getVerificationBadge(log.verification_status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedLog(log);
                                    setShowDetailsDialog(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {log.verification_status === 'pending' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-emerald-600 hover:text-emerald-700"
                                      onClick={() => {
                                        setSelectedLog(log);
                                        setVerificationAction('verified');
                                        setShowVerifyDialog(true);
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-600"
                                      onClick={() => {
                                        setSelectedLog(log);
                                        setVerificationAction('failed');
                                        setShowVerifyDialog(true);
                                      }}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
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
          </TabsContent>

          <TabsContent value="contractors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contractor Performance</CardTitle>
                <CardDescription>Call statistics by contractor</CardDescription>
              </CardHeader>
              <CardContent>
                {contractorStats.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No contractor data available</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contractor</TableHead>
                          <TableHead className="text-center">Total Calls</TableHead>
                          <TableHead className="text-center">Verified</TableHead>
                          <TableHead className="text-center">Pending</TableHead>
                          <TableHead className="text-center">Disputed</TableHead>
                          <TableHead className="text-center">Failed</TableHead>
                          <TableHead className="text-center">Verification Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contractorStats.map((stat) => {
                          const rate = stat.total_calls > 0 
                            ? Math.round((stat.verified / stat.total_calls) * 100)
                            : 0;
                          return (
                            <TableRow key={stat.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{stat.name}</p>
                                  <p className="text-sm text-muted-foreground">{stat.email}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-semibold">{stat.total_calls}</TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-emerald-100 text-emerald-800">{stat.verified}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-amber-100 text-amber-800">{stat.pending}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-orange-100 text-orange-800">{stat.disputed}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-red-100 text-red-800">{stat.failed}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-emerald-500 rounded-full"
                                      style={{ width: `${rate}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium">{rate}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Verification Dialog */}
        <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {verificationAction === 'verified' ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                ) : (
                  <ShieldX className="h-5 w-5 text-red-600" />
                )}
                {verificationAction === 'verified' ? 'Verify Call' : 'Mark as Failed/Disputed'}
              </DialogTitle>
              <DialogDescription>
                {selectedLog && (
                  <>
                    Call to <strong>{selectedLog.contact_name}</strong> 
                    {selectedLog.company_name && <> at {selectedLog.company_name}</>}
                    {' '}by {getContractorName(selectedLog.portal_user_id)}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Verification Status</Label>
                <Select value={verificationAction} onValueChange={(v: any) => setVerificationAction(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">✓ Verified</SelectItem>
                    <SelectItem value="disputed">⚠ Disputed</SelectItem>
                    <SelectItem value="failed">✕ Failed Verification</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Verification Method</Label>
                <Select value={verificationMethod} onValueChange={setVerificationMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VERIFICATION_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Add verification notes..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleVerification}
                disabled={submitting}
                className={verificationAction === 'verified' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {submitting ? 'Saving...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Call Details</DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Date & Time</Label>
                    <p className="font-medium">
                      {format(new Date(selectedLog.call_date), 'PPP')} at {selectedLog.call_time.slice(0, 5)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Duration</Label>
                    <p className="font-medium">{selectedLog.call_duration_minutes || '-'} minutes</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Contractor</Label>
                  <p className="font-medium">{getContractorName(selectedLog.portal_user_id)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Contact</Label>
                    <p className="font-medium">{selectedLog.contact_name}</p>
                    {selectedLog.company_name && (
                      <p className="text-sm text-muted-foreground">{selectedLog.company_name}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Contact Info</Label>
                    <a href={`tel:${selectedLog.phone_number}`} className="block font-medium text-emerald-600 hover:underline">
                      {selectedLog.phone_number}
                    </a>
                    {selectedLog.email && (
                      <a href={`mailto:${selectedLog.email}`} className="block text-sm text-emerald-600 hover:underline">
                        {selectedLog.email}
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Purpose</Label>
                    <p className="font-medium">{getPurposeLabel(selectedLog.call_purpose)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Outcome</Label>
                    <p className="font-medium">{getOutcomeLabel(selectedLog.call_outcome)}</p>
                  </div>
                </div>

                {selectedLog.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm">{selectedLog.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-muted-foreground">Verification Status</Label>
                      <div className="mt-1">{getVerificationBadge(selectedLog.verification_status)}</div>
                    </div>
                    {selectedLog.verification_status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => {
                            setShowDetailsDialog(false);
                            setVerificationAction('verified');
                            setShowVerifyDialog(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setShowDetailsDialog(false);
                            setVerificationAction('failed');
                            setShowVerifyDialog(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Fail
                        </Button>
                      </div>
                    )}
                  </div>
                  {selectedLog.verified_at && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Verified on {format(new Date(selectedLog.verified_at), 'PPp')}
                      {selectedLog.verification_method && ` via ${selectedLog.verification_method.replace('_', ' ')}`}
                    </p>
                  )}
                  {selectedLog.verification_notes && (
                    <p className="text-sm mt-1">{selectedLog.verification_notes}</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
