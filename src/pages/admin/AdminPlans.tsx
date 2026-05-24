import { useState, useCallback, useEffect } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Pause,
  Play,
  Archive,
  DollarSign,
  Sparkles,
  Crown,
  Zap,
  Loader2,
  Save,
  RefreshCw,
  History,
  Settings2,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useAdminSubscriptionPlans, SubscriptionPlan, PlanFeature, FeatureToggle } from '@/hooks/useSubscriptionPlans';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const iconOptions = [
  { value: 'zap', label: 'Zap', icon: Zap },
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { value: 'crown', label: 'Crown', icon: Crown },
];

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500 border-green-500/20',
  hidden: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  paused: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  archived: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'sparkles': return Sparkles;
    case 'crown': return Crown;
    default: return Zap;
  }
};

export default function AdminPlans() {
  const { plans, changeLogs, loading, saving, refetch, fetchChangeLogs, createPlan, updatePlan, updatePlanStatus, deletePlan, syncPriceToStripe, clearAllChangeLogs, deleteChangeLog } = useAdminSubscriptionPlans();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('plans');

  // Auto-refresh every 5 seconds
  useAutoRefresh(useCallback(() => { refetch(); }, [refetch]));
  
  // Form state for create/edit
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
    plan_key: '',
    name: '',
    description: '',
    price_monthly: 0,
    gst_included: true,
    features: [],
    feature_toggles: {
      show_phone: false,
      show_email: false,
      show_website: false,
      show_verified_badge: false,
      show_reviews: false,
      priority_placement: false,
      job_postings: 0,
    },
    status: 'active',
    sort_order: 0,
    is_popular: false,
    cta_text: 'Get Started',
    icon: 'zap',
  });
  const [featureInput, setFeatureInput] = useState('');

  const resetForm = () => {
    setFormData({
      plan_key: '',
      name: '',
      description: '',
      price_monthly: 0,
      gst_included: true,
      features: [],
      feature_toggles: {
        show_phone: false,
        show_email: false,
        show_website: false,
        show_verified_badge: false,
        show_reviews: false,
        priority_placement: false,
        job_postings: 0,
      },
      status: 'active',
      sort_order: 0,
      is_popular: false,
      cta_text: 'Get Started',
      icon: 'zap',
    });
    setFeatureInput('');
  };

  const openEditDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      ...plan,
      features: plan.features || [],
      feature_toggles: plan.feature_toggles || {
        show_phone: false,
        show_email: false,
        show_website: false,
        show_verified_badge: false,
        show_reviews: false,
        priority_placement: false,
        job_postings: 0,
      },
    });
    setIsCreateDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.plan_key || !formData.name) {
      toast.error('Plan key and name are required');
      return;
    }

    if (editingPlan) {
      const result = await updatePlan(editingPlan.id, formData);
      if (result.success) {
        toast.success('Plan updated successfully');
        setIsCreateDialogOpen(false);
        setEditingPlan(null);
        resetForm();
      } else {
        toast.error(result.error || 'Failed to update plan');
      }
    } else {
      const result = await createPlan(formData);
      if (result.success) {
        toast.success('Plan created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
      } else {
        toast.error(result.error || 'Failed to create plan');
      }
    }
  };

  const handleStatusChange = async (plan: SubscriptionPlan, newStatus: SubscriptionPlan['status']) => {
    const result = await updatePlanStatus(plan.id, newStatus);
    if (result.success) {
      toast.success(`Plan ${newStatus}`);
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleArchive = async (plan: SubscriptionPlan) => {
    const result = await deletePlan(plan.id);
    if (result.success) {
      toast.success('Plan archived successfully');
    } else {
      toast.error(result.error || 'Failed to archive plan');
    }
  };

  const addFeature = (included: boolean) => {
    if (!featureInput.trim()) return;
    setFormData(prev => ({
      ...prev,
      features: [...(prev.features || []), { text: featureInput.trim(), included }],
    }));
    setFeatureInput('');
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: (prev.features || []).filter((_, i) => i !== index),
    }));
  };

  const updateFeatureToggle = (key: keyof FeatureToggle, value: boolean | number) => {
    setFormData(prev => ({
      ...prev,
      feature_toggles: {
        ...(prev.feature_toggles || {}),
        [key]: value,
      } as FeatureToggle,
    }));
  };

  const handleSyncPrice = async (plan: SubscriptionPlan) => {
    const result = await syncPriceToStripe(plan.id, plan.price_monthly);
    if (result.success) {
      toast.success('Price synced to Stripe');
    } else {
      toast.error(result.error || 'Failed to sync price');
    }
  };

  return (
    <AdminLayout title="Plans & Subscriptions">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Full control over subscription plans, pricing, and features.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                setEditingPlan(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
                  <DialogDescription>
                    {editingPlan ? 'Update plan details and features' : 'Configure a new subscription plan'}
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="basic" className="mt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                    <TabsTrigger value="toggles">Access Controls</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Plan Key (unique)</Label>
                        <Input
                          value={formData.plan_key || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, plan_key: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                          placeholder="e.g., premium"
                          disabled={!!editingPlan}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input
                          value={formData.name || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Premium"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Short description of the plan"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Price (NZD/month)</Label>
                        <Input
                          type="number"
                          value={formData.price_monthly || 0}
                          onChange={(e) => setFormData(prev => ({ ...prev, price_monthly: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sort Order</Label>
                        <Input
                          type="number"
                          value={formData.sort_order || 0}
                          onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Icon</Label>
                        <Select value={formData.icon || 'zap'} onValueChange={(v) => setFormData(prev => ({ ...prev, icon: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {iconOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  <opt.icon className="h-4 w-4" />
                                  {opt.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>CTA Button Text</Label>
                        <Input
                          value={formData.cta_text || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, cta_text: e.target.value }))}
                          placeholder="e.g., Get Started"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={formData.status || 'active'} onValueChange={(v: any) => setFormData(prev => ({ ...prev, status: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="hidden">Hidden</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.gst_included || false}
                          onCheckedChange={(v) => setFormData(prev => ({ ...prev, gst_included: v }))}
                        />
                        <Label>GST Included</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.is_popular || false}
                          onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_popular: v }))}
                        />
                        <Label>Mark as Popular</Label>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Scarcity Label (optional)</Label>
                        <Input
                          value={formData.scarcity_label || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, scarcity_label: e.target.value }))}
                          placeholder="e.g., Only 12 spots left"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Subscribers (optional)</Label>
                        <Input
                          type="number"
                          value={formData.max_subscribers || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, max_subscribers: parseInt(e.target.value) || null }))}
                          placeholder="Leave empty for unlimited"
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="features" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Add Feature</Label>
                      <div className="flex gap-2">
                        <Input
                          value={featureInput}
                          onChange={(e) => setFeatureInput(e.target.value)}
                          placeholder="Feature description"
                          onKeyDown={(e) => e.key === 'Enter' && addFeature(true)}
                        />
                        <Button variant="outline" onClick={() => addFeature(true)} size="sm">
                          <Check className="h-4 w-4 mr-1" /> Included
                        </Button>
                        <Button variant="outline" onClick={() => addFeature(false)} size="sm">
                          <X className="h-4 w-4 mr-1" /> Not Included
                        </Button>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[300px] border rounded-lg p-4">
                      {(formData.features || []).length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No features added yet</p>
                      ) : (
                        <div className="space-y-2">
                          {(formData.features || []).map((feature, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div className="flex items-center gap-2">
                                {feature.included ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <X className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className={feature.included ? '' : 'text-muted-foreground'}>{feature.text}</span>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => removeFeature(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="toggles" className="space-y-4 mt-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      These toggles control what features are enabled for businesses on this plan.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <Label>Show Phone Number</Label>
                        <Switch
                          checked={formData.feature_toggles?.show_phone || false}
                          onCheckedChange={(v) => updateFeatureToggle('show_phone', v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <Label>Show Email</Label>
                        <Switch
                          checked={formData.feature_toggles?.show_email || false}
                          onCheckedChange={(v) => updateFeatureToggle('show_email', v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <Label>Show Website</Label>
                        <Switch
                          checked={formData.feature_toggles?.show_website || false}
                          onCheckedChange={(v) => updateFeatureToggle('show_website', v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <Label>Verified Badge</Label>
                        <Switch
                          checked={formData.feature_toggles?.show_verified_badge || false}
                          onCheckedChange={(v) => updateFeatureToggle('show_verified_badge', v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <Label>Reviews & Ratings</Label>
                        <Switch
                          checked={formData.feature_toggles?.show_reviews || false}
                          onCheckedChange={(v) => updateFeatureToggle('show_reviews', v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <Label>Priority Placement</Label>
                        <Switch
                          checked={formData.feature_toggles?.priority_placement || false}
                          onCheckedChange={(v) => updateFeatureToggle('priority_placement', v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <Label>Spotlight Jobs</Label>
                        <Switch
                          checked={formData.feature_toggles?.spotlight_jobs || false}
                          onCheckedChange={(v) => updateFeatureToggle('spotlight_jobs', v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <Label>Analytics Dashboard</Label>
                        <Switch
                          checked={formData.feature_toggles?.analytics || false}
                          onCheckedChange={(v) => updateFeatureToggle('analytics', v)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Job Postings Limit (-1 for unlimited)</Label>
                      <Input
                        type="number"
                        value={formData.feature_toggles?.job_postings ?? 0}
                        onChange={(e) => updateFeatureToggle('job_postings', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                
                <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingPlan ? 'Update Plan' : 'Create Plan'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Plans
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Change History
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="plans" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            ) : (
              <div className="grid gap-4">
                {plans.map((plan) => {
                  const IconComponent = getIconComponent(plan.icon);
                  return (
                    <Card key={plan.id} className={plan.status !== 'active' ? 'opacity-60' : ''}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${plan.is_popular ? 'bg-accent' : 'bg-muted'}`}>
                              <IconComponent className={`h-5 w-5 ${plan.is_popular ? 'text-accent-foreground' : ''}`} />
                            </div>
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                {plan.name}
                                {plan.is_popular && (
                                  <Badge className="bg-accent text-accent-foreground">Popular</Badge>
                                )}
                                <Badge variant="outline" className={statusColors[plan.status]}>
                                  {plan.status}
                                </Badge>
                              </CardTitle>
                              <CardDescription>{plan.description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-2xl font-bold">${plan.price_monthly}</div>
                              <div className="text-sm text-muted-foreground">
                                NZD/month {plan.gst_included && '(inc GST)'}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(plan)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              {plan.status === 'active' && (
                                <Button variant="ghost" size="sm" onClick={() => handleStatusChange(plan, 'paused')}>
                                  <Pause className="h-4 w-4" />
                                </Button>
                              )}
                              {plan.status === 'paused' && (
                                <Button variant="ghost" size="sm" onClick={() => handleStatusChange(plan, 'active')}>
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              {plan.status === 'active' && (
                                <Button variant="ghost" size="sm" onClick={() => handleStatusChange(plan, 'hidden')}>
                                  <EyeOff className="h-4 w-4" />
                                </Button>
                              )}
                              {plan.status === 'hidden' && (
                                <Button variant="ghost" size="sm" onClick={() => handleStatusChange(plan, 'active')}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                    <Archive className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2">
                                      <AlertTriangle className="h-5 w-5 text-destructive" />
                                      Archive Plan?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will archive "{plan.name}". Existing subscribers will keep their subscription, but no new signups will be allowed. This action is reversible.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleArchive(plan)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Archive
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-4 mt-2">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Features ({plan.features?.length || 0})</h4>
                            <div className="flex flex-wrap gap-1">
                              {(plan.features || []).slice(0, 5).map((feature, i) => (
                                <Badge key={i} variant={feature.included ? 'default' : 'secondary'} className="text-xs">
                                  {feature.included ? '✓' : '✗'} {feature.text}
                                </Badge>
                              ))}
                              {(plan.features || []).length > 5 && (
                                <Badge variant="outline" className="text-xs">+{(plan.features || []).length - 5} more</Badge>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-2">Access Controls</h4>
                            <div className="flex flex-wrap gap-1">
                              {plan.feature_toggles?.show_phone && <Badge variant="outline" className="text-xs">Phone</Badge>}
                              {plan.feature_toggles?.show_email && <Badge variant="outline" className="text-xs">Email</Badge>}
                              {plan.feature_toggles?.show_website && <Badge variant="outline" className="text-xs">Website</Badge>}
                              {plan.feature_toggles?.show_verified_badge && <Badge variant="outline" className="text-xs">Verified</Badge>}
                              {plan.feature_toggles?.show_reviews && <Badge variant="outline" className="text-xs">Reviews</Badge>}
                              {plan.feature_toggles?.job_postings !== 0 && (
                                <Badge variant="outline" className="text-xs">
                                  Jobs: {plan.feature_toggles?.job_postings === -1 ? '∞' : plan.feature_toggles?.job_postings}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {plan.stripe_price_id && (
                          <div className="mt-3 pt-3 border-t flex items-center justify-between">
                            <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              Stripe: {plan.stripe_price_id}
                            </code>
                            <Button variant="outline" size="sm" onClick={() => handleSyncPrice(plan)}>
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Sync to Stripe
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Change History</CardTitle>
                  <CardDescription>Audit log of all plan changes</CardDescription>
                </div>
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={changeLogs.length === 0}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All Logs
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Audit Logs?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all plan change history. This action cannot be undone. Live prices and subscriptions will NOT be affected.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={async () => {
                            const result = await clearAllChangeLogs();
                            if (result.success) toast.success('Audit logs cleared');
                            else toast.error(result.error || 'Failed to clear logs');
                          }} 
                          className="bg-destructive text-destructive-foreground"
                        >
                          Clear All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Old Value</TableHead>
                      <TableHead>New Value</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changeLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No change history yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      changeLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.action}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.field_changed || '-'}</TableCell>
                          <TableCell className="text-sm max-w-[150px] truncate">
                            {log.old_value ? String(log.old_value).slice(0, 50) : '-'}
                          </TableCell>
                          <TableCell className="text-sm max-w-[150px] truncate">
                            {log.new_value ? String(log.new_value).slice(0, 50) : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{log.notes || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}