import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Shield, Users, Lock, Key, Plus, Edit, Trash2, 
  Loader2, CheckCircle, XCircle, Settings, Eye,
  UserCheck, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PermissionTemplate {
  id: string;
  name: string;
  description: string | null;
  permissions: any;
  is_system: boolean;
  created_at: string;
}

interface UserPermission {
  id: string;
  user_id: string;
  permission_template_id: string | null;
  custom_permissions: any;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
  user_email?: string;
  user_name?: string;
  template_name?: string;
}

const permissionModules = [
  { key: 'dashboard', label: 'Dashboard', description: 'View dashboard and analytics' },
  { key: 'businesses', label: 'Businesses', description: 'Manage business listings' },
  { key: 'users', label: 'Users', description: 'Manage user accounts' },
  { key: 'content', label: 'Content', description: 'Blog posts and pages' },
  { key: 'finance', label: 'Finance', description: 'Revenue and payments' },
  { key: 'reports', label: 'Reports', description: 'Generate and view reports' },
  { key: 'communications', label: 'Communications', description: 'Emails and messages' },
  { key: 'settings', label: 'Settings', description: 'System configuration' },
];

export default function AdminPermissions() {
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, boolean>,
  });

  const [assignForm, setAssignForm] = useState({
    user_id: '',
    template_id: '',
  });

  const fetchData = useCallback(async () => {
    try {
      // Fetch permission templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('permission_templates')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name');

      if (templatesError) throw templatesError;
      setTemplates((templatesData || []) as PermissionTemplate[]);

      // Fetch user permissions with profile data
      const { data: permData, error: permError } = await supabase
        .from('user_permissions')
        .select(`
          *,
          profiles:user_id (email, full_name),
          permission_templates:permission_template_id (name)
        `)
        .order('granted_at', { ascending: false });

      if (permError) throw permError;
      
      const formattedPerms = (permData || []).map((p: any) => ({
        ...p,
        user_email: p.profiles?.email,
        user_name: p.profiles?.full_name,
        template_name: p.permission_templates?.name,
      }));
      setUserPermissions(formattedPerms);

      // Fetch users for assignment
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email');
      
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTemplate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('permission_templates')
        .insert({
          name: templateForm.name,
          description: templateForm.description || null,
          permissions: templateForm.permissions,
          is_system: false,
        });

      if (error) throw error;
      
      toast.success('Permission template created');
      setIsTemplateDialogOpen(false);
      setTemplateForm({ name: '', description: '', permissions: {} });
      fetchData();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignPermission = async () => {
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: assignForm.user_id,
          permission_template_id: assignForm.template_id,
          granted_by: user.user?.id,
          is_active: true,
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;
      
      toast.success('Permission assigned');
      setIsAssignDialogOpen(false);
      setAssignForm({ user_id: '', template_id: '' });
      fetchData();
    } catch (error) {
      console.error('Error assigning permission:', error);
      toast.error('Failed to assign permission');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserPermission = async (permissionId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('user_permissions')
        .update({ is_active: !isActive })
        .eq('id', permissionId);

      if (error) throw error;
      toast.success(isActive ? 'Permission deactivated' : 'Permission activated');
      fetchData();
    } catch (error) {
      console.error('Error toggling permission:', error);
      toast.error('Failed to update permission');
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('permission_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      toast.success('Template deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const togglePermission = (key: string) => {
    setTemplateForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  return (
    <AdminLayout title="Permissions">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Manage role-based access control and user permissions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(true)} className="gap-2">
              <UserCheck className="h-4 w-4" />
              Assign Permission
            </Button>
            <Button onClick={() => setIsTemplateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{templates.length}</p>
                  <p className="text-xs text-muted-foreground">Permission Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userPermissions.length}</p>
                  <p className="text-xs text-muted-foreground">Users with Permissions</p>
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
                    {userPermissions.filter(p => p.is_active).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Permissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Lock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {templates.filter(t => t.is_system).length}
                  </p>
                  <p className="text-xs text-muted-foreground">System Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates">Permission Templates</TabsTrigger>
            <TabsTrigger value="users">User Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : templates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        No permission templates found
                      </TableCell>
                    </TableRow>
                  ) : (
                    templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded bg-muted">
                              <Key className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{template.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {template.description || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(template.permissions || {})
                              .filter(([_, v]) => v)
                              .slice(0, 3)
                              .map(([key]) => (
                                <Badge key={key} variant="secondary" className="text-[10px]">
                                  {key}
                                </Badge>
                              ))}
                            {Object.entries(template.permissions || {}).filter(([_, v]) => v).length > 3 && (
                              <Badge variant="secondary" className="text-[10px]">
                                +{Object.entries(template.permissions || {}).filter(([_, v]) => v).length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {template.is_system ? (
                            <Badge className="bg-blue-100 text-blue-700">
                              <Lock className="h-3 w-3 mr-1" />
                              System
                            </Badge>
                          ) : (
                            <Badge variant="outline">Custom</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!template.is_system && (
                              <>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => deleteTemplate(template.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Permission Template</TableHead>
                    <TableHead>Granted</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userPermissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        No user permissions assigned
                      </TableCell>
                    </TableRow>
                  ) : (
                    userPermissions.map((perm) => (
                      <TableRow key={perm.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{perm.user_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{perm.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Shield className="h-3 w-3 mr-1" />
                            {perm.template_name || 'Custom'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(perm.granted_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {perm.expires_at 
                            ? format(new Date(perm.expires_at), 'dd MMM yyyy')
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell>
                          {perm.is_active ? (
                            <Badge className="bg-green-100 text-green-700">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={perm.is_active}
                              onCheckedChange={() => toggleUserPermission(perm.id, perm.is_active)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Template Dialog */}
        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Permission Template</DialogTitle>
              <DialogDescription>
                Define a reusable permission set for users
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="Content Manager"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder="Access to content management..."
                  />
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Permissions</Label>
                <div className="grid grid-cols-2 gap-3">
                  {permissionModules.map((module) => (
                    <div
                      key={module.key}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        templateForm.permissions[module.key]
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => togglePermission(module.key)}
                    >
                      <div>
                        <p className="font-medium text-sm">{module.label}</p>
                        <p className="text-xs text-muted-foreground">{module.description}</p>
                      </div>
                      <Switch checked={!!templateForm.permissions[module.key]} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate} disabled={!templateForm.name || saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Permission Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Permission</DialogTitle>
              <DialogDescription>
                Assign a permission template to a user
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>User</Label>
                <Select
                  value={assignForm.user_id}
                  onValueChange={(value) => setAssignForm({ ...assignForm, user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Permission Template</Label>
                <Select
                  value={assignForm.template_id}
                  onValueChange={(value) => setAssignForm({ ...assignForm, template_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignPermission} 
                disabled={!assignForm.user_id || !assignForm.template_id || saving}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Assign Permission
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
