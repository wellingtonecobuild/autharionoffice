import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Users, 
  HardHat, 
  Briefcase, 
  Mail, 
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  ArrowRightLeft,
  AlertTriangle
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface PortalUser {
  id: string;
  email: string;
  legal_full_name: string | null;
  role: 'contractor' | 'employee';
  status: 'invited' | 'active' | 'inactive' | 'suspended';
  ird_number: string | null;
  gst_registered: boolean;
  bank_account_number: string | null;
  hourly_rate: number | null;
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface PortalInvitation {
  id: string;
  email: string;
  role: 'contractor' | 'employee';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export default function AdminPortalUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [invitations, setInvitations] = useState<PortalInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Invite dialog
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'contractor' | 'employee'>('contractor');
  const [sending, setSending] = useState(false);

  // Onboarding Guide dialog
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
  const [onboardingEmail, setOnboardingEmail] = useState('');
  const [onboardingName, setOnboardingName] = useState('');
  const [sendingOnboarding, setSendingOnboarding] = useState(false);

  // Edit dialog
  const [editingUser, setEditingUser] = useState<PortalUser | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, invitesRes] = await Promise.all([
        supabase.from('portal_users').select('*').order('created_at', { ascending: false }),
        supabase.from('portal_invitations').select('*').is('accepted_at', null).order('created_at', { ascending: false })
      ]);

      if (usersRes.data) setUsers(usersRes.data as PortalUser[]);
      if (invitesRes.data) setInvitations(invitesRes.data as PortalInvitation[]);
    } catch (error) {
      console.error('Error fetching portal users:', error);
      toast.error('Failed to load portal users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sendInvitation = async () => {
    if (!inviteEmail || !user?.id) return;
    
    setSending(true);
    try {
      const response = await supabase.functions.invoke('portal-invite', {
        body: {
          email: inviteEmail,
          role: inviteRole,
          invitedBy: user.id
        }
      });

      if (response.error) throw response.error;

      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInviteDialog(false);
      setInviteEmail('');
      fetchData();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('portal_users')
        .update({ status })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User status updated to ${status}`);
      fetchData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('portal_users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast.success('User deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const changeUserRole = async (userId: string, newRole: 'contractor' | 'employee') => {
    try {
      const { error } = await supabase
        .from('portal_users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User role changed to ${newRole}`);
      fetchData();
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Failed to change user role');
    }
  };

  const resendInvitation = async (invitation: PortalInvitation) => {
    if (!user?.id) return;
    
    try {
      // Delete old invitation and send new one
      await supabase.from('portal_invitations').delete().eq('id', invitation.id);
      
      const response = await supabase.functions.invoke('portal-invite', {
        body: {
          email: invitation.email,
          role: invitation.role,
          invitedBy: user.id
        }
      });

      if (response.error) throw response.error;

      toast.success(`Invitation resent to ${invitation.email}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend invitation');
    }
  };

  // Send contractor onboarding guide
  const sendOnboardingGuide = async () => {
    if (!onboardingEmail.trim()) {
      toast.error('Please enter a recipient email');
      return;
    }
    
    setSendingOnboarding(true);
    try {
      const { error } = await supabase.functions.invoke('send-branded-email', {
        body: {
          to: onboardingEmail.trim(),
          type: 'contractor_onboarding',
          data: {
            recipientName: onboardingName.trim() || undefined
          }
        }
      });
      
      if (error) throw error;
      
      toast.success(`Onboarding guide sent to ${onboardingEmail}`);
      setShowOnboardingGuide(false);
      setOnboardingEmail("");
      setOnboardingName("");
    } catch (error) {
      console.error('Error sending onboarding guide:', error);
      toast.error('Failed to send onboarding guide');
    } finally {
      setSendingOnboarding(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.legal_full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const contractors = users.filter(u => u.role === 'contractor');
  const employees = users.filter(u => u.role === 'employee');
  const activeUsers = users.filter(u => u.status === 'active');
  const pendingInvites = invitations.filter(i => !i.accepted_at && new Date(i.expires_at) > new Date());

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      invited: 'bg-amber-100 text-amber-800 border-amber-200',
      inactive: 'bg-slate-100 text-slate-800 border-slate-200',
      suspended: 'bg-red-100 text-red-800 border-red-200'
    };
    return (
      <Badge className={`${styles[status] || styles.inactive} border font-medium`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    return role === 'contractor' ? (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200 border">
        <HardHat className="h-3 w-3 mr-1" />
        Contractor
      </Badge>
    ) : (
      <Badge className="bg-purple-100 text-purple-800 border-purple-200 border">
        <Briefcase className="h-3 w-3 mr-1" />
        Employee
      </Badge>
    );
  };

  return (
    <AdminLayout title="Internal Portal Users">
      <div className="space-y-6">
        <AdminPageHeader
          title="Internal Portal Users"
          onRefresh={fetchData}
          showLiveIndicator
          actions={
            <div className="flex items-center gap-2">
              <Button 
                variant="default"
                onClick={() => setShowOnboardingGuide(true)}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Onboarding Guide
              </Button>
              <Button onClick={() => setShowInviteDialog(true)} className="bg-admin-teal hover:bg-admin-teal/90">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <HardHat className="h-8 w-8 text-admin-teal" />
              <div>
                <p className="text-sm text-muted-foreground">Contractors</p>
                <p className="text-2xl font-bold">{contractors.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
                <p className="text-2xl font-bold">{pendingInvites.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="users">All Users ({users.length})</TabsTrigger>
            <TabsTrigger value="invitations">Pending Invitations ({pendingInvites.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {/* Filters */}
            <Card className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="contractor">Contractors</SelectItem>
                    <SelectItem value="employee">Employees</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="invited">Invited</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Users Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>GST</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((portalUser) => (
                      <TableRow key={portalUser.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{portalUser.legal_full_name || 'Not set'}</p>
                            <p className="text-sm text-muted-foreground">{portalUser.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(portalUser.role)}</TableCell>
                        <TableCell>{getStatusBadge(portalUser.status)}</TableCell>
                        <TableCell>
                          {portalUser.profile_completed ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-600" />
                          )}
                        </TableCell>
                        <TableCell>
                          {portalUser.gst_registered ? (
                            <Badge variant="outline" className="text-xs">GST Reg.</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(portalUser.created_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingUser(portalUser)}>
                                <Edit className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              
                              {/* Change Role */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                                    Change to {portalUser.role === 'contractor' ? 'Employee' : 'Contractor'}
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2">
                                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                                      Change User Role
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="space-y-3">
                                      <p>
                                        You are about to change <strong>{portalUser.legal_full_name || portalUser.email}</strong> from{' '}
                                        <strong>{portalUser.role}</strong> to{' '}
                                        <strong>{portalUser.role === 'contractor' ? 'employee' : 'contractor'}</strong>.
                                      </p>
                                      {portalUser.role === 'contractor' ? (
                                        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
                                          <p className="font-medium text-amber-800">Important NZ Tax Implications:</p>
                                          <ul className="list-disc list-inside text-amber-700 mt-1 space-y-1">
                                            <li>As an employee, PAYE tax will be deducted from their pay</li>
                                            <li>They will no longer be able to submit invoices</li>
                                            <li>They will receive payslips instead</li>
                                            <li>You become responsible for ACC levies</li>
                                          </ul>
                                        </div>
                                      ) : (
                                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
                                          <p className="font-medium text-blue-800">Important NZ Tax Implications:</p>
                                          <ul className="list-disc list-inside text-blue-700 mt-1 space-y-1">
                                            <li>As a contractor, they handle their own tax (IR3)</li>
                                            <li>They will submit invoices for payment</li>
                                            <li>They are responsible for their own ACC levies</li>
                                            <li>They must manage their own GST if registered</li>
                                          </ul>
                                        </div>
                                      )}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => changeUserRole(
                                        portalUser.id, 
                                        portalUser.role === 'contractor' ? 'employee' : 'contractor'
                                      )}
                                      className="bg-admin-teal hover:bg-admin-teal/90"
                                    >
                                      Change Role
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              {portalUser.status === 'active' && (
                                <DropdownMenuItem onClick={() => updateUserStatus(portalUser.id, 'suspended')}>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Suspend User
                                </DropdownMenuItem>
                              )}
                              {portalUser.status === 'suspended' && (
                                <DropdownMenuItem onClick={() => updateUserStatus(portalUser.id, 'active')}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Reactivate User
                                </DropdownMenuItem>
                              )}
                              {portalUser.status === 'active' && (
                                <DropdownMenuItem onClick={() => updateUserStatus(portalUser.id, 'inactive')}>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Mark Inactive
                                </DropdownMenuItem>
                              )}
                              {portalUser.status === 'inactive' && (
                                <DropdownMenuItem onClick={() => updateUserStatus(portalUser.id, 'active')}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Activate
                                </DropdownMenuItem>
                              )}
                              
                              {/* Delete User */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove User
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                      <Trash2 className="h-5 w-5" />
                                      Remove Portal User
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="space-y-3">
                                      <p>
                                        You are about to permanently remove <strong>{portalUser.legal_full_name || portalUser.email}</strong> from the portal.
                                      </p>
                                      <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm">
                                        <p className="font-medium text-red-800">This action will:</p>
                                        <ul className="list-disc list-inside text-red-700 mt-1 space-y-1">
                                          <li>Delete their portal account and login access</li>
                                          <li>Keep their invoice records for compliance</li>
                                          <li>This action cannot be undone</li>
                                        </ul>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        Note: For NZ IRD compliance, invoice and payment records will be retained for 7 years.
                                      </p>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteUser(portalUser.id)} className="bg-red-600 hover:bg-red-700">
                                      Remove User
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No pending invitations
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingInvites.map((invite) => {
                      const isExpired = new Date(invite.expires_at) < new Date();
                      return (
                        <TableRow key={invite.id}>
                          <TableCell className="font-medium">{invite.email}</TableCell>
                          <TableCell>{getRoleBadge(invite.role)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(invite.created_at), 'dd MMM yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(invite.expires_at), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>
                            {isExpired ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 border">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => resendInvitation(invite)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Resend
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Invite Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'contractor' | 'employee')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contractor">
                      <div className="flex items-center gap-2">
                        <HardHat className="h-4 w-4" />
                        Contractor
                      </div>
                    </SelectItem>
                    <SelectItem value="employee">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Employee
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {inviteRole === 'contractor' 
                    ? 'Contractors invoice the company and handle their own tax.'
                    : 'Employees receive payslips with PAYE deducted.'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={sendInvitation} disabled={!inviteEmail || sending}>
                {sending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View User Details Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4 py-4">
                {/* Role Badge with Change Option */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {editingUser.role === 'contractor' ? (
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <HardHat className="h-5 w-5 text-blue-700" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-purple-700" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium capitalize">{editingUser.role}</p>
                      <p className="text-xs text-muted-foreground">
                        {editingUser.role === 'contractor' 
                          ? 'Invoices the company, handles own tax' 
                          : 'Receives payslips with PAYE deducted'}
                      </p>
                    </div>
                  </div>
                  {getRoleBadge(editingUser.role)}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Legal Full Name</Label>
                    <p className="font-medium">{editingUser.legal_full_name || 'Not set'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Email</Label>
                    <p className="font-medium">{editingUser.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">IRD Number</Label>
                    <p className="font-medium font-mono">{editingUser.ird_number || 'Not set'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Bank Account</Label>
                    <p className="font-medium font-mono">{editingUser.bank_account_number || 'Not set'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">GST Registered</Label>
                    <p className="font-medium">{editingUser.gst_registered ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Hourly Rate</Label>
                    <p className="font-medium">{editingUser.hourly_rate ? `$${editingUser.hourly_rate}/hr` : 'Not set'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    {getStatusBadge(editingUser.status)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Profile Completed</Label>
                    <div className="flex items-center gap-2">
                      {editingUser.profile_completed ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm text-emerald-600">Complete</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 text-amber-600" />
                          <span className="text-sm text-amber-600">Pending</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Joined</Label>
                    <p className="text-sm">{format(new Date(editingUser.created_at), 'dd MMM yyyy')}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send Onboarding Guide Dialog */}
        <Dialog open={showOnboardingGuide} onOpenChange={setShowOnboardingGuide}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Send Contractor Onboarding Guide
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-primary">What's included:</p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• About Wellington EcoBuild</li>
                  <li>• Launch offer (20 free Premium listings)</li>
                  <li>• Phone and email scripts for outreach</li>
                  <li>• Key talking points and benefits</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <Label>Recipient Email *</Label>
                <Input
                  type="email"
                  placeholder="contractor@example.com"
                  value={onboardingEmail}
                  onChange={(e) => setOnboardingEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Recipient Name (optional)</Label>
                <Input
                  placeholder="John Smith"
                  value={onboardingName}
                  onChange={(e) => setOnboardingName(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowOnboardingGuide(false)}>Cancel</Button>
              <Button onClick={sendOnboardingGuide} disabled={sendingOnboarding || !onboardingEmail.trim()}>
                {sendingOnboarding ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send Guide
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
