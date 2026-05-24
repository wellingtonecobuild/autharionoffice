import { useEffect, useState, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, TrendingUp, Loader2, ExternalLink, RefreshCw, 
  MoreVertical, Pause, Play, XCircle, ArrowUpRight, CreditCard,
  History, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Business {
  id: string;
  name: string;
  subscription_plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  owner_id: string;
  status: string;
  email: string | null;
}

interface StripeStats {
  subscriptions: {
    premium: { count: number; priceNZD: number; interval: string };
    elite: { count: number; priceNZD: number; interval: string };
    spotlight: { count: number };
    total: number;
  };
  revenue: { mrr: number; thisMonth: number; thisYear: number };
  lastUpdated: string;
}

interface SubscriptionDetail {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  pause_collection: any;
  items: { data: Array<{ price: { unit_amount: number; product: any } }> };
  customer: { email: string; name: string };
  latest_invoice: { amount_paid: number; status: string } | null;
}

// Auto-refresh interval handled by useAutoRefresh hook (5 minutes)

export default function AdminSubscriptions() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [stripeStats, setStripeStats] = useState<StripeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [subscriptionDetail, setSubscriptionDetail] = useState<SubscriptionDetail | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [newPlan, setNewPlan] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);

  const fetchStripeStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-stripe-stats');
      if (error) throw error;
      setStripeStats(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching Stripe stats:', error);
    }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, subscription_plan, stripe_customer_id, stripe_subscription_id, created_at, owner_id, status, email')
        .in('subscription_plan', ['premium', 'elite'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBusinesses((data || []) as Business[]);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  }, []);

  const fetchAllData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    await Promise.all([fetchSubscriptions(), fetchStripeStats()]);
    if (showLoader) setLoading(false);
  }, [fetchSubscriptions, fetchStripeStats]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchAllData(false);
    setRefreshing(false);
    toast.success('Data refreshed from Stripe');
  };

  const fetchSubscriptionDetail = async (business: Business) => {
    if (!business.stripe_subscription_id && !business.stripe_customer_id) {
      toast.error('No Stripe subscription found for this business');
      return;
    }

    setActionLoading(business.id);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { 
          action: 'get_subscription',
          subscriptionId: business.stripe_subscription_id,
          customerId: business.stripe_customer_id,
        }
      });
      
      if (error) throw error;
      setSubscriptionDetail(data.subscription);
      setSelectedBusiness(business);
      setShowDetailDialog(true);

      // Also fetch invoices
      if (business.stripe_customer_id) {
        const { data: invoiceData } = await supabase.functions.invoke('manage-subscription', {
          body: { action: 'list_invoices', customerId: business.stripe_customer_id }
        });
        setInvoices(invoiceData?.invoices || []);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch subscription details');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseSubscription = async (business: Business) => {
    if (!business.stripe_subscription_id) return;
    
    setActionLoading(business.id);
    try {
      const { error } = await supabase.functions.invoke('manage-subscription', {
        body: { 
          action: 'pause',
          subscriptionId: business.stripe_subscription_id,
          businessId: business.id,
        }
      });
      
      if (error) throw error;
      toast.success('Subscription paused successfully');
      fetchAllData(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to pause subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeSubscription = async (business: Business) => {
    if (!business.stripe_subscription_id) return;
    
    setActionLoading(business.id);
    try {
      const { error } = await supabase.functions.invoke('manage-subscription', {
        body: { 
          action: 'resume',
          subscriptionId: business.stripe_subscription_id,
          businessId: business.id,
        }
      });
      
      if (error) throw error;
      toast.success('Subscription resumed successfully');
      fetchAllData(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to resume subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!selectedBusiness?.stripe_subscription_id) return;
    
    setActionLoading(selectedBusiness.id);
    try {
      const { error } = await supabase.functions.invoke('manage-subscription', {
        body: { 
          action: 'cancel',
          subscriptionId: selectedBusiness.stripe_subscription_id,
          businessId: selectedBusiness.id,
          reason: cancelReason,
        }
      });
      
      if (error) throw error;
      toast.success('Subscription cancelled successfully');
      setShowCancelDialog(false);
      setCancelReason('');
      fetchAllData(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedBusiness?.stripe_subscription_id || !newPlan) return;
    
    // Get price ID for new plan from subscription_plans table
    const { data: planData } = await supabase
      .from('subscription_plans')
      .select('stripe_price_id')
      .eq('plan_key', newPlan)
      .single();

    if (!planData?.stripe_price_id) {
      toast.error('Plan price not configured in Stripe');
      return;
    }

    setActionLoading(selectedBusiness.id);
    try {
      const { error } = await supabase.functions.invoke('manage-subscription', {
        body: { 
          action: 'change_plan',
          subscriptionId: selectedBusiness.stripe_subscription_id,
          businessId: selectedBusiness.id,
          newPriceId: planData.stripe_price_id,
        }
      });
      
      if (error) throw error;
      toast.success(`Plan changed to ${newPlan}`);
      setShowChangePlanDialog(false);
      setNewPlan('');
      fetchAllData(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to change plan');
    } finally {
      setActionLoading(null);
    }
  };

  // Auto-refresh every 5 seconds
  useAutoRefresh(useCallback(() => fetchAllData(false), [fetchAllData]));

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const premiumCount = stripeStats?.subscriptions.premium.count ?? businesses.filter(b => b.subscription_plan === 'premium').length;
  const eliteCount = stripeStats?.subscriptions.elite.count ?? businesses.filter(b => b.subscription_plan === 'elite').length;
  const premiumPrice = stripeStats?.subscriptions.premium.priceNZD ?? 149;
  const elitePrice = stripeStats?.subscriptions.elite.priceNZD ?? 349;
  const estimatedMRR = stripeStats?.revenue.mrr ?? (premiumCount * premiumPrice) + (eliteCount * elitePrice);

  return (
    <AdminLayout title="Subscriptions & Revenue">
      <div className="space-y-6">
        {/* Header with refresh */}
        <div className="flex items-center justify-between">
          <div>
            {lastRefresh && (
              <p className="text-sm text-muted-foreground">
                Last updated: {format(lastRefresh, 'h:mm a')} • Auto-refreshes every 5 min
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stripeStats?.subscriptions.total ?? businesses.length}</div>
              <p className="text-xs text-muted-foreground">From Stripe</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Premium Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{premiumCount}</div>
              <p className="text-sm text-muted-foreground">${premiumPrice} NZD/mo</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Elite Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eliteCount}</div>
              <p className="text-sm text-muted-foreground">${elitePrice} NZD/mo</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Monthly Recurring Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${estimatedMRR.toFixed(2)} NZD</div>
              <p className="text-sm text-muted-foreground">Live from Stripe</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue This Period */}
        {stripeStats && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Revenue This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${stripeStats.revenue.thisMonth.toFixed(2)} NZD
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Revenue This Year</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stripeStats.revenue.thisYear.toFixed(2)} NZD
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stripe Dashboard Link */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Stripe Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  View detailed payment history, invoices, and manage subscriptions in Stripe
                </p>
              </div>
              <Button asChild>
                <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                  Open Stripe
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Active Subscribers</CardTitle>
            <CardDescription>Manage subscriptions with cancel, pause, resume, and plan changes</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stripe ID</TableHead>
                  <TableHead>Since</TableHead>
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
                ) : businesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No active subscriptions
                    </TableCell>
                  </TableRow>
                ) : (
                  businesses.map((business) => (
                    <TableRow key={business.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{business.name}</div>
                          <div className="text-sm text-muted-foreground">{business.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={business.subscription_plan === 'elite' ? 'default' : 'secondary'}>
                          {business.subscription_plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={business.status === 'active' ? 'outline' : 'destructive'}>
                          {business.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {business.stripe_subscription_id ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {business.stripe_subscription_id.slice(0, 14)}...
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(business.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={actionLoading === business.id}>
                              {actionLoading === business.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreVertical className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => fetchSubscriptionDetail(business)}>
                              <CreditCard className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handlePauseSubscription(business)}>
                              <Pause className="h-4 w-4 mr-2" />
                              Pause Subscription
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResumeSubscription(business)}>
                              <Play className="h-4 w-4 mr-2" />
                              Resume Subscription
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedBusiness(business);
                              setShowChangePlanDialog(true);
                            }}>
                              <ArrowUpRight className="h-4 w-4 mr-2" />
                              Change Plan
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedBusiness(business);
                                setShowCancelDialog(true);
                              }}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel Subscription
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subscription Details - {selectedBusiness?.name}</DialogTitle>
            <DialogDescription>
              View subscription status, billing history, and payment details
            </DialogDescription>
          </DialogHeader>
          
          {subscriptionDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={subscriptionDetail.status === 'active' ? 'default' : 'destructive'}>
                      {subscriptionDetail.status}
                    </Badge>
                    {subscriptionDetail.pause_collection && (
                      <Badge variant="outline">Paused</Badge>
                    )}
                    {subscriptionDetail.cancel_at_period_end && (
                      <Badge variant="outline" className="text-destructive">Cancels at period end</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="text-lg font-medium mt-1">
                    ${(subscriptionDetail.items.data[0]?.price.unit_amount / 100).toFixed(2)} NZD/month
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Current Period</Label>
                  <p className="mt-1">
                    {format(new Date(subscriptionDetail.current_period_start * 1000), 'MMM d')} - {format(new Date(subscriptionDetail.current_period_end * 1000), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Next Billing</Label>
                  <p className="mt-1">
                    {format(new Date(subscriptionDetail.current_period_end * 1000), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {invoices.length > 0 && (
                <div>
                  <Label className="text-muted-foreground flex items-center gap-2 mb-2">
                    <History className="h-4 w-4" />
                    Recent Invoices
                  </Label>
                  <div className="border rounded-lg divide-y">
                    {invoices.slice(0, 5).map((invoice: any) => (
                      <div key={invoice.id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">${(invoice.amount_paid / 100).toFixed(2)} NZD</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(invoice.created * 1000), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Badge variant={invoice.status === 'paid' ? 'outline' : 'destructive'}>
                          {invoice.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Cancel Subscription
            </DialogTitle>
            <DialogDescription>
              This will immediately cancel the subscription for {selectedBusiness?.name}.
              The business will be downgraded to the free plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for cancellation (optional)</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={actionLoading === selectedBusiness?.id}
            >
              {actionLoading === selectedBusiness?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Change the plan for {selectedBusiness?.name}. 
              Proration will be applied automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Plan</Label>
              <p className="text-lg font-medium capitalize">{selectedBusiness?.subscription_plan}</p>
            </div>
            <div>
              <Label>New Plan</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select new plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium">Premium ($149/month)</SelectItem>
                  <SelectItem value="elite">Elite ($349/month)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePlanDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleChangePlan}
              disabled={!newPlan || actionLoading === selectedBusiness?.id}
            >
              {actionLoading === selectedBusiness?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Change Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
