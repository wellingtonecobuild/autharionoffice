import { useEffect, useState, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  UserPlus, 
  Shield, 
  User, 
  Crown, 
  KeyRound, 
  Search,
  Users,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: string[];
}

const ROLE_DEFINITIONS = {
  admin: { label: 'Administrator', level: 1, description: 'Full system access' },
  editor: { label: 'Editor', level: 2, description: 'Content review & approval' },
  writer: { label: 'Writer', level: 3, description: 'Content creation' },
  journalist: { label: 'Journalist', level: 3, description: 'News & reporting' },
  business_owner: { label: 'Business Owner', level: 4, description: 'Listing management' },
  user: { label: 'Standard User', level: 5, description: 'Basic access' },
};

export default function AdminUsers() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('user');
  const [actionLoading, setActionLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useAutoRefresh(useCallback(() => fetchUsers(), []));

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles = (profilesData || []).map(profile => ({
        ...profile,
        roles: (rolesData || [])
          .filter(r => r.user_id === profile.id)
          .map(r => r.role),
      }));

      setProfiles(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error', description: 'Failed to fetch users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function assignRole() {
    if (!selectedUser || !selectedRole) return;
    setActionLoading(true);

    try {
      const { data: existing } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', selectedUser.id)
        .eq('role', selectedRole as any)
        .maybeSingle();

      if (existing) {
        toast({ title: 'Info', description: 'User already has this role' });
        setRoleDialogOpen(false);
        return;
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: selectedUser.id, role: selectedRole } as any);

      if (error) throw error;
      toast({ title: 'Success', description: 'Role assigned successfully' });
      setRoleDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({ title: 'Error', description: 'Failed to assign role', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  }

  async function removeRole(userId: string, role: string) {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any);

      if (error) throw error;
      toast({ title: 'Success', description: 'Role removed successfully' });
      fetchUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast({ title: 'Error', description: 'Failed to remove role', variant: 'destructive' });
    }
  }

  async function triggerPasswordReset() {
    if (!selectedUser) return;
    setResetLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('admin-password-reset', {
        body: {
          targetEmail: selectedUser.email,
          redirectUrl: `${window.location.origin}/reset-password`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send password reset');
      }

      toast({ 
        title: 'Success', 
        description: `Password reset email sent to ${selectedUser.email}` 
      });
      setResetDialogOpen(false);
    } catch (error: any) {
      console.error('Error triggering password reset:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to send password reset email', 
        variant: 'destructive' 
      });
    } finally {
      setResetLoading(false);
    }
  }

  const getRoleLevel = (roles: string[]) => {
    if (roles.length === 0) return 5;
    return Math.min(...roles.map(r => ROLE_DEFINITIONS[r as keyof typeof ROLE_DEFINITIONS]?.level || 5));
  };

  const getHighestRole = (roles: string[]) => {
    if (roles.length === 0) return 'user';
    const sorted = [...roles].sort((a, b) => {
      const levelA = ROLE_DEFINITIONS[a as keyof typeof ROLE_DEFINITIONS]?.level || 5;
      const levelB = ROLE_DEFINITIONS[b as keyof typeof ROLE_DEFINITIONS]?.level || 5;
      return levelA - levelB;
    });
    return sorted[0];
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = searchQuery === '' || 
      profile.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || 
      (roleFilter === 'no_role' && profile.roles.length === 0) ||
      profile.roles.includes(roleFilter);
    
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: profiles.length,
    admins: profiles.filter(p => p.roles.includes('admin')).length,
    editors: profiles.filter(p => p.roles.includes('editor')).length,
    writers: profiles.filter(p => p.roles.includes('writer')).length,
    journalists: profiles.filter(p => p.roles.includes('journalist')).length,
    businessOwners: profiles.filter(p => p.roles.includes('business_owner')).length,
    noRole: profiles.filter(p => p.roles.length === 0).length,
  };

  return (
    <AdminLayout title="Users & Roles">
      <div className="space-y-6">
        {/* Header */}
        <AdminPageHeader
          title="Users & Roles"
          subtitle="Personnel Management • Role Assignment • Access Control"
          icon={Users}
          onRefresh={fetchUsers}
          refreshing={loading}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="border-admin-border">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Personnel</div>
              <div className="text-2xl font-mono font-bold text-foreground mt-1">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-admin-error/30 bg-admin-error/5">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Administrators</div>
              <div className="text-2xl font-mono font-bold text-admin-error mt-1">{stats.admins}</div>
            </CardContent>
          </Card>
          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Editors</div>
              <div className="text-2xl font-mono font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.editors}</div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Writers</div>
              <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.writers}</div>
            </CardContent>
          </Card>
          <Card className="border-admin-success/30 bg-admin-success/5">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Journalists</div>
              <div className="text-2xl font-mono font-bold text-admin-success mt-1">{stats.journalists}</div>
            </CardContent>
          </Card>
          <Card className="border-admin-warning/30 bg-admin-warning/5">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Business Owners</div>
              <div className="text-2xl font-mono font-bold text-admin-warning mt-1">{stats.businessOwners}</div>
            </CardContent>
          </Card>
          <Card className="border-admin-border">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Unassigned</div>
              <div className="text-2xl font-mono font-bold text-muted-foreground mt-1">{stats.noRole}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-admin-border">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Filter by role:</span>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="writer">Writer</SelectItem>
                    <SelectItem value="journalist">Journalist</SelectItem>
                    <SelectItem value="business_owner">Business Owner</SelectItem>
                    <SelectItem value="no_role">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground">
                {filteredProfiles.length} of {profiles.length} records
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Table */}
        <Card className="border-admin-border">
          <div className="border-b border-admin-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-admin-slate" />
              <span className="text-sm font-medium">Personnel Records</span>
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="border-admin-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wide font-medium">Employee ID</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wide font-medium">Name</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wide font-medium">Email</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wide font-medium">Access Level</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wide font-medium">Assigned Roles</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wide font-medium">Registered</TableHead>
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wide font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                    <span className="text-xs text-slate-500 mt-2 block">Loading personnel records...</span>
                  </TableCell>
                </TableRow>
              ) : filteredProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500 text-sm">
                    No personnel records match the current filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredProfiles.map((profile) => {
                  const level = getRoleLevel(profile.roles);
                  const highestRole = getHighestRole(profile.roles);
                  
                  return (
                    <TableRow key={profile.id} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell className="font-mono text-xs text-slate-400">
                        {profile.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-white text-sm">
                          {profile.full_name || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-300">
                        {profile.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`
                            px-2 py-0.5 text-xs font-mono rounded
                            ${level === 1 ? 'bg-red-900/30 text-red-400 border border-red-800' : ''}
                            ${level === 2 ? 'bg-purple-900/30 text-purple-400 border border-purple-800' : ''}
                            ${level === 3 ? 'bg-blue-900/30 text-blue-400 border border-blue-800' : ''}
                            ${level === 4 ? 'bg-amber-900/30 text-amber-400 border border-amber-800' : ''}
                            ${level === 5 ? 'bg-slate-700 text-slate-400 border border-slate-600' : ''}
                          `}>
                            L{level}
                          </span>
                          <span className="text-xs text-slate-400">
                            {ROLE_DEFINITIONS[highestRole as keyof typeof ROLE_DEFINITIONS]?.label || 'User'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {profile.roles.length === 0 ? (
                            <span className="text-xs text-slate-500 italic">No roles assigned</span>
                          ) : (
                            profile.roles.map((role) => (
                              <button
                                key={role}
                                onClick={() => removeRole(profile.id, role)}
                                className={`
                                  inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded
                                  hover:opacity-80 transition-opacity cursor-pointer group
                                  ${role === 'admin' ? 'bg-red-900/30 text-red-400 border border-red-800' : ''}
                                  ${role === 'editor' ? 'bg-purple-900/30 text-purple-400 border border-purple-800' : ''}
                                  ${role === 'writer' ? 'bg-blue-900/30 text-blue-400 border border-blue-800' : ''}
                                  ${role === 'journalist' ? 'bg-green-900/30 text-green-400 border border-green-800' : ''}
                                  ${role === 'business_owner' ? 'bg-amber-900/30 text-amber-400 border border-amber-800' : ''}
                                `}
                                title="Click to remove role"
                              >
                                {role}
                                <X className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                              </button>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 font-mono">
                        {format(new Date(profile.created_at), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(profile);
                              setResetDialogOpen(true);
                            }}
                            className="h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-700"
                            title="Reset Password"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(profile);
                              setRoleDialogOpen(true);
                            }}
                            className="h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-700"
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Assign</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Role Legend */}
        <Card className="border-admin-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Role Hierarchy Reference</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {Object.entries(ROLE_DEFINITIONS).map(([key, def]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-muted-foreground">L{def.level}</span>
                  <span className="text-foreground">{def.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assign Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role to Personnel</DialogTitle>
            <DialogDescription>
              Assign access level to: {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Select Role</div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_DEFINITIONS).map(([key, def]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">L{def.level}</span>
                      <span>{def.label}</span>
                      <span className="text-xs text-slate-500">— {def.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedRole === 'admin' && (
              <div className="flex items-start gap-2 p-2 bg-red-900/20 border border-red-800 rounded text-xs text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Administrator role grants full system access. Assign with caution.</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRoleDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={assignRole} 
              disabled={actionLoading}
              className="bg-slate-600 hover:bg-slate-500"
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Password Reset Request</DialogTitle>
            <DialogDescription className="text-slate-400">
              Send credential reset to personnel
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-3 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-slate-400">Target Email:</div>
              <div className="text-white font-mono">{selectedUser?.email}</div>
              <div className="text-slate-400">Personnel Name:</div>
              <div className="text-white">{selectedUser?.full_name || '—'}</div>
            </div>
            <div className="text-xs text-slate-500 mt-3">
              A secure password reset link will be sent to the personnel's registered email address.
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setResetDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={triggerPasswordReset} 
              disabled={resetLoading}
              className="bg-slate-600 hover:bg-slate-500"
            >
              {resetLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <KeyRound className="h-4 w-4 mr-2" />
              Send Reset Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
