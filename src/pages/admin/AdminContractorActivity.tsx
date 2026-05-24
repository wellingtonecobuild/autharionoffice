import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Search,
  Mail,
  User,
  Clock,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Send,
  FileText,
  MessageSquare,
  Activity,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  Building2,
  Users
} from 'lucide-react';
import { format, formatDistanceToNow, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmailLog {
  id: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  email_type: string;
  status: string;
  sent_by: string | null;
  metadata: any;
  created_at: string;
}

interface PortalUser {
  id: string;
  email: string;
  legal_full_name: string | null;
  user_id: string;
}

interface ActivitySummary {
  totalEmails: number;
  todayEmails: number;
  weekEmails: number;
  uniqueRecipients: number;
}

export default function AdminContractorActivity() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [contractorFilter, setContractorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [summary, setSummary] = useState<ActivitySummary>({
    totalEmails: 0,
    todayEmails: 0,
    weekEmails: 0,
    uniqueRecipients: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch portal users first
      const { data: users, error: usersError } = await supabase
        .from('portal_users')
        .select('id, email, legal_full_name, user_id')
        .order('legal_full_name');

      if (usersError) throw usersError;
      setPortalUsers(users || []);

      // Build email query
      let query = supabase
        .from('email_logs')
        .select('*')
        .eq('email_type', 'portal_direct')
        .order('created_at', { ascending: false })
        .limit(500);

      // Apply date filter
      if (dateFilter === 'today') {
        query = query.gte('created_at', startOfDay(new Date()).toISOString());
      } else if (dateFilter === 'week') {
        query = query.gte('created_at', subDays(new Date(), 7).toISOString());
      } else if (dateFilter === 'month') {
        query = query.gte('created_at', subDays(new Date(), 30).toISOString());
      }

      const { data: emailData, error: emailError } = await query;

      if (emailError) throw emailError;
      
      let filteredEmails = emailData || [];
      
      // Apply contractor filter
      if (contractorFilter !== 'all') {
        const contractor = users?.find(u => u.id === contractorFilter);
        if (contractor) {
          filteredEmails = filteredEmails.filter(e => e.sent_by === contractor.user_id);
        }
      }

      setEmails(filteredEmails);

      // Calculate summary
      const today = startOfDay(new Date());
      const weekAgo = subDays(new Date(), 7);
      const uniqueRecipientSet = new Set(filteredEmails.map(e => e.to_email));
      
      setSummary({
        totalEmails: filteredEmails.length,
        todayEmails: filteredEmails.filter(e => new Date(e.created_at) >= today).length,
        weekEmails: filteredEmails.filter(e => new Date(e.created_at) >= weekAgo).length,
        uniqueRecipients: uniqueRecipientSet.size
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load contractor activity');
    } finally {
      setLoading(false);
    }
  }, [contractorFilter, dateFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getContractorName = (sentBy: string | null) => {
    if (!sentBy) return 'Unknown';
    const user = portalUsers.find(u => u.user_id === sentBy);
    return user?.legal_full_name || user?.email || 'Unknown Contractor';
  };

  const filteredEmails = emails.filter(email => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const contractorName = getContractorName(email.sent_by).toLowerCase();
    return (
      email.to_email.toLowerCase().includes(search) ||
      email.to_name?.toLowerCase().includes(search) ||
      email.subject.toLowerCase().includes(search) ||
      contractorName.includes(search)
    );
  });

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Contractor', 'To Email', 'To Name', 'Subject', 'Status'];
    const rows = filteredEmails.map(email => [
      format(new Date(email.created_at), 'yyyy-MM-dd'),
      format(new Date(email.created_at), 'HH:mm:ss'),
      getContractorName(email.sent_by),
      email.to_email,
      email.to_name || '',
      email.subject,
      email.status
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contractor-emails-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getEmailTypeLabel = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      portal_direct: { label: 'Direct Email', color: 'bg-blue-100 text-blue-800' },
      invoice_notification: { label: 'Invoice', color: 'bg-emerald-100 text-emerald-800' },
      system: { label: 'System', color: 'bg-slate-100 text-slate-800' }
    };
    return types[type] || { label: type, color: 'bg-slate-100 text-slate-800' };
  };

  return (
    <AdminLayout title="Contractor Email Activity">
      <div className="space-y-6">
        <AdminPageHeader
          title="Contractor Email Activity"
          subtitle="Track all emails sent by contractors - who they contacted, when, and what for"
          icon={Activity}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Emails</p>
                  <p className="text-2xl font-bold">{summary.totalEmails}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold">{summary.todayEmails}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold">{summary.weekEmails}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unique Recipients</p>
                  <p className="text-2xl font-bold">{summary.uniqueRecipients}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by contractor, recipient, or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={contractorFilter} onValueChange={setContractorFilter}>
                <SelectTrigger className="w-[200px]">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Contractors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contractors</SelectItem>
                  {portalUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.legal_full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[150px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Email List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Contractor Sent Emails
            </CardTitle>
            <CardDescription>
              {filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No emails found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEmails.map((email) => {
                  const typeInfo = getEmailTypeLabel(email.email_type);
                  return (
                    <div
                      key={email.id}
                      className="p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedEmail(email)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Contractor Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">
                              {getContractorName(email.sent_by)}
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground truncate">
                              {email.to_name || email.to_email}
                            </span>
                          </div>
                          <p className="text-sm font-medium truncate mb-1">
                            {email.subject || '(No subject)'}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {email.body_text?.substring(0, 100)}...
                          </p>
                        </div>

                        {/* Meta */}
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-muted-foreground mb-1">
                            {format(new Date(email.created_at), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">
                            {format(new Date(email.created_at), 'h:mm a')}
                          </p>
                          <Badge className={cn("text-xs", typeInfo.color)}>
                            {typeInfo.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Detail Dialog */}
        <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedEmail && (
              <div className="space-y-4">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Sent By</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{getContractorName(selectedEmail.sent_by)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Date & Time</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(selectedEmail.created_at), 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(selectedEmail.created_at), 'h:mm:ss a')}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Recipient */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">To:</span>
                    <span className="text-sm">
                      {selectedEmail.to_name && `${selectedEmail.to_name} <`}
                      {selectedEmail.to_email}
                      {selectedEmail.to_name && `>`}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Subject */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Subject</p>
                  <p className="font-semibold">{selectedEmail.subject || '(No subject)'}</p>
                </div>

                <Separator />

                {/* Body */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Message</p>
                  <div className="p-4 bg-white border rounded-lg">
                    {selectedEmail.body_html ? (
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">{selectedEmail.body_text}</p>
                    )}
                  </div>
                </div>

                {/* Attachments */}
                {selectedEmail.metadata?.attachments && selectedEmail.metadata.attachments.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Attachments</p>
                      <div className="space-y-2">
                        {selectedEmail.metadata.attachments.map((url: string, idx: number) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 rounded border hover:bg-muted/50 transition-colors"
                          >
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate flex-1">Attachment {idx + 1}</span>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Status */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Badge className={cn("text-xs", getEmailTypeLabel(selectedEmail.email_type).color)}>
                    {getEmailTypeLabel(selectedEmail.email_type).label}
                  </Badge>
                  <Badge variant={selectedEmail.status === 'sent' ? 'default' : 'destructive'}>
                    {selectedEmail.status}
                  </Badge>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
