import { useEffect, useState, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, Mail, Phone, Check, Copy, ExternalLink, MessageSquare, Building2, Trash2, Download, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  is_read: boolean;
  status: string;
  created_at: string;
  business_id: string;
  businesses?: {
    name: string;
    category: string;
  };
}

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const queryClient = useQueryClient();

  const unreadCount = leads.filter(l => l.status === 'new').length;

  // Auto-refresh every 5 seconds
  useAutoRefresh(useCallback(() => fetchLeads(), []));

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          businesses (name, category)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      await supabase.from('leads').update({ is_read: true, status: 'replied' }).eq('id', id);
      setLeads(leads.map(l => l.id === id ? { ...l, is_read: true, status: 'replied' } : l));
      queryClient.invalidateQueries({ queryKey: ['admin-unread-leads'] });
    } catch (error) {
      console.error('Error marking lead as read:', error);
    }
  }

  async function updateLeadStatus(id: string, status: string) {
    try {
      await supabase.from('leads').update({ status, is_read: status !== 'new' }).eq('id', id);
      setLeads(leads.map(l => l.id === id ? { ...l, status, is_read: status !== 'new' } : l));
      queryClient.invalidateQueries({ queryKey: ['admin-unread-leads'] });
      toast.success(`Lead marked as ${status}`);
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Failed to update status');
    }
  }

  async function deleteLead(id: string) {
    try {
      await supabase.from('leads').delete().eq('id', id);
      setLeads(leads.filter(l => l.id !== id));
      queryClient.invalidateQueries({ queryKey: ['admin-unread-leads'] });
      toast.success('Lead deleted');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
    }
  }

  async function markAllAsRead() {
    const unreadIds = leads.filter(l => l.status === 'new').map(l => l.id);
    if (unreadIds.length === 0) return;
    
    try {
      await supabase.from('leads').update({ is_read: true, status: 'replied' }).in('id', unreadIds);
      setLeads(leads.map(l => unreadIds.includes(l.id) ? { ...l, is_read: true, status: 'replied' } : l));
      queryClient.invalidateQueries({ queryKey: ['admin-unread-leads'] });
      toast.success('All leads marked as read');
    } catch (error) {
      console.error('Error marking leads as read:', error);
    }
  }

  const exportLeads = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Business', 'Category', 'Message', 'Status', 'Date'].join(','),
      ...filteredLeads.map(lead => [
        `"${lead.name}"`,
        lead.email,
        lead.phone || '',
        `"${lead.businesses?.name || ''}"`,
        lead.businesses?.category || '',
        `"${lead.message.replace(/"/g, '""')}"`,
        lead.status,
        format(new Date(lead.created_at), 'yyyy-MM-dd HH:mm')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Leads exported successfully');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const openEmailClient = (email: string, businessName?: string) => {
    const subject = businessName ? `Re: Inquiry about ${businessName}` : '';
    const mailtoUrl = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    if (!lead.is_read) {
      markAsRead(lead.id);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      lead.businesses?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group leads by business for stats
  const leadsByBusiness = leads.reduce((acc, lead) => {
    const bizName = lead.businesses?.name || 'Unknown';
    acc[bizName] = (acc[bizName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topBusinesses = Object.entries(leadsByBusiness)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <AdminLayout title="Leads Management">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leads.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Unread Leads</CardTitle>
              {unreadCount > 0 && (
                <Button size="sm" variant="outline" onClick={markAllAsRead}>
                  <Check className="w-4 h-4 mr-1" />
                  Mark All Read
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">
                {topBusinesses[0]?.[0] || 'N/A'}
              </div>
              <p className="text-sm text-muted-foreground">
                {topBusinesses[0]?.[1] || 0} leads
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads by name, email, or business..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="replied">Replied</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportLeads}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Message Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No leads found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow 
                      key={lead.id}
                      className={!lead.is_read ? "bg-accent/30" : ""}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{lead.name}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lead.businesses?.name}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {lead.businesses?.category.replace(/-/g, ' ')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate text-sm text-muted-foreground">{lead.message}</p>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.status}
                          onValueChange={(value) => updateLeadStatus(lead.id, value)}
                        >
                          <SelectTrigger className="w-[110px]">
                            <Badge 
                              variant={lead.status === 'new' ? 'default' : lead.status === 'replied' ? 'secondary' : 'outline'}
                              className="mr-1"
                            >
                              {lead.status === 'new' ? 'New' : lead.status === 'replied' ? 'Replied' : 'Archived'}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="replied">Replied</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(lead.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(lead.email, "Email")}
                            title="Copy email"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEmailClient(lead.email, lead.businesses?.name)}
                            title="Reply in email client"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewLead(lead)}
                          >
                            View
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this lead from {lead.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteLead(lead.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Lead from {selectedLead?.name}
            </DialogTitle>
            <DialogDescription>
              Received on {selectedLead && format(new Date(selectedLead.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">From</label>
                  <p className="font-medium">{selectedLead.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{selectedLead.email}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(selectedLead.email, "Email")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {selectedLead.phone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{selectedLead.phone}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(selectedLead.phone!, "Phone")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Regarding Business
                </label>
                <p className="font-medium">{selectedLead.businesses?.name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {selectedLead.businesses?.category.replace(/-/g, ' ')}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Message</label>
                <div className="mt-1 p-4 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedLead.message}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => openEmailClient(selectedLead.email, selectedLead.businesses?.name)}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Reply in Email Client
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(selectedLead.email, "Email")}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Email
                </Button>
                {selectedLead.phone && (
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(selectedLead.phone!, "Phone")}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Copy Phone
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}