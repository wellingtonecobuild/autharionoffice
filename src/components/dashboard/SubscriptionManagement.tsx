import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Crown, ArrowUpRight, ArrowDownRight, Check, X, Loader2, 
  Calendar, CreditCard, AlertCircle, Sparkles, Shield, 
  TrendingUp, Briefcase, Phone, Mail, Globe, BadgeCheck,
  BarChart3, Star, Zap
} from "lucide-react";
import { toast } from "sonner";
import { 
  getPlanFeatures, 
  isUpgrade, 
  isDowngrade, 
  getFeaturesGained, 
  getFeaturesLost,
  FEATURE_LABELS,
  PLAN_INFO,
  type PlanKey 
} from "@/lib/planFeatures";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";

interface SubscriptionManagementProps {
  businessId: string;
  currentPlan: string;
  businessName: string;
  onPlanChange?: () => void;
}

interface SubscriptionStatus {
  currentPlan: string;
  subscription: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string;
    cancelAt: string | null;
  } | null;
  upcomingInvoice: {
    amountDue: number;
    currency: string;
  } | null;
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  showPhone: <Phone className="w-4 h-4" />,
  showEmail: <Mail className="w-4 h-4" />,
  showWebsite: <Globe className="w-4 h-4" />,
  canPostJobs: <Briefcase className="w-4 h-4" />,
  jobLimit: <Briefcase className="w-4 h-4" />,
  priorityPlacement: <TrendingUp className="w-4 h-4" />,
  spotlightEligible: <Star className="w-4 h-4" />,
  featuredRotation: <Sparkles className="w-4 h-4" />,
  verifiedBadge: <BadgeCheck className="w-4 h-4" />,
  featuredEmployerBadge: <Shield className="w-4 h-4" />,
  analyticsAccess: <BarChart3 className="w-4 h-4" />,
  prioritySupport: <Zap className="w-4 h-4" />,
  leadAccess: <Mail className="w-4 h-4" />,
};

type BillingCycle = 'monthly' | 'annual';

export function SubscriptionManagement({ 
  businessId, 
  currentPlan, 
  businessName,
  onPlanChange 
}: SubscriptionManagementProps) {
  const { plans } = useSubscriptionPlans();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  useEffect(() => {
    fetchStatus();
  }, [businessId]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('upgrade-subscription', {
        body: { action: 'get_status', businessId }
      });
      
      if (error) throw error;
      setStatus(data);
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (targetPlan: PlanKey) => {
    // Find the price ID from subscription plans based on billing cycle
    const planData = plans.find(p => p.plan_key === targetPlan);
    const priceId = billingCycle === 'annual' 
      ? planData?.stripe_price_id_annual 
      : planData?.stripe_price_id;
    
    if (!priceId) {
      toast.error(`${billingCycle === 'annual' ? 'Annual' : 'Monthly'} pricing not available. Please contact support.`);
      return;
    }

    setProcessingAction(true);
    try {
      if (status?.subscription) {
        // Existing subscription - change plan
        const { data, error } = await supabase.functions.invoke('upgrade-subscription', {
          body: { 
            action: 'change_plan', 
            businessId,
            newPlan: targetPlan,
            priceId,
            billingCycle,
          }
        });

        if (error) throw error;
        
        toast.success(`Successfully upgraded to ${PLAN_INFO[targetPlan].name}!`);
        setShowUpgradeDialog(false);
        onPlanChange?.();
        fetchStatus();
      } else {
        // No subscription - create checkout
        const { data, error } = await supabase.functions.invoke('upgrade-subscription', {
          body: { 
            action: 'create_upgrade_checkout', 
            businessId,
            newPlan: targetPlan,
            priceId,
            billingCycle,
          }
        });

        if (error) throw error;
        
        if (data?.url) {
          window.open(data.url, '_blank');
        }
      }
    } catch (error: any) {
      console.error('Upgrade error:', error);
      toast.error(error.message || 'Failed to process upgrade');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDowngradeToFree = async () => {
    setProcessingAction(true);
    try {
      const { data, error } = await supabase.functions.invoke('upgrade-subscription', {
        body: { action: 'downgrade_to_free', businessId }
      });

      if (error) throw error;

      toast.success(data.message || 'Downgrade scheduled successfully');
      setShowDowngradeDialog(false);
      onPlanChange?.();
      fetchStatus();
    } catch (error: any) {
      console.error('Downgrade error:', error);
      toast.error(error.message || 'Failed to process downgrade');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCancelDowngrade = async () => {
    setProcessingAction(true);
    try {
      const { data, error } = await supabase.functions.invoke('upgrade-subscription', {
        body: { action: 'cancel_downgrade', businessId }
      });

      if (error) throw error;

      toast.success(data.message || 'Downgrade cancelled');
      fetchStatus();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel downgrade');
    } finally {
      setProcessingAction(false);
    }
  };

  const openUpgradePreview = async (targetPlan: PlanKey) => {
    setSelectedPlan(targetPlan);
    setBillingCycle('monthly'); // Reset to monthly when opening dialog
    
    if (status?.subscription) {
      // Get proration preview
      const planData = plans.find(p => p.plan_key === targetPlan);
      const priceId = planData?.stripe_price_id;
      if (priceId) {
        try {
          const { data } = await supabase.functions.invoke('upgrade-subscription', {
            body: { 
              action: 'preview_change', 
              businessId,
              priceId,
            }
          });
          setPreviewData(data?.preview);
        } catch (e) {
          console.error('Preview error:', e);
        }
      }
    }
    
    setShowUpgradeDialog(true);
  };

  const currentPlanKey = currentPlan as PlanKey;
  const currentFeatures = getPlanFeatures(currentPlan);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-accent" />
                Subscription Management
              </CardTitle>
              <CardDescription>
                Manage your {businessName} subscription
              </CardDescription>
            </div>
            <Badge 
              variant={
                currentPlan === 'elite' ? 'elite' : 
                currentPlan === 'premium' ? 'premium' : 
                'secondary'
              }
              className="text-sm"
            >
              {PLAN_INFO[currentPlanKey]?.name || 'Free'} Plan
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Plan Status */}
          {status?.subscription && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={status.subscription.status === 'active' ? 'default' : 'secondary'}>
                  {status.subscription.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Next billing date</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
              {status.subscription.cancelAtPeriodEnd && (
                <Alert className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your subscription will be cancelled on{' '}
                    {new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}.
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto ml-1"
                      onClick={handleCancelDowngrade}
                      disabled={processingAction}
                    >
                      Keep subscription
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Plan Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['free', 'premium', 'elite'] as PlanKey[]).map((plan) => {
              const isCurrentPlan = plan === currentPlanKey;
              const isPlanUpgrade = isUpgrade(currentPlanKey, plan);
              const isPlanDowngrade = isDowngrade(currentPlanKey, plan);
              const planInfo = PLAN_INFO[plan];
              const features = getPlanFeatures(plan);

              return (
                <div 
                  key={plan}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    isCurrentPlan 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  {isCurrentPlan && (
                    <Badge className="absolute -top-2 left-4 bg-primary text-primary-foreground">
                      Current Plan
                    </Badge>
                  )}
                  
                  <div className="mt-2">
                    <h4 className="font-semibold text-lg">{planInfo.name}</h4>
                    <p className="text-2xl font-bold mt-1">
                      ${planInfo.price}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{planInfo.description}</p>
                  </div>

                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      {features.showPhone ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-muted-foreground" />}
                      <span className={!features.showPhone ? 'text-muted-foreground' : ''}>Contact details visible</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {features.canPostJobs ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-muted-foreground" />}
                      <span className={!features.canPostJobs ? 'text-muted-foreground' : ''}>
                        {features.jobLimit === 999 ? 'Unlimited' : features.jobLimit} job postings
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {features.leadAccess ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-muted-foreground" />}
                      <span className={!features.leadAccess ? 'text-muted-foreground' : ''}>Lead access</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {features.analyticsAccess ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-muted-foreground" />}
                      <span className={!features.analyticsAccess ? 'text-muted-foreground' : ''}>Analytics dashboard</span>
                    </li>
                  </ul>

                  <div className="mt-4">
                    {isCurrentPlan ? (
                      <Button variant="outline" disabled className="w-full">
                        <Check className="w-4 h-4 mr-2" />
                        Your Plan
                      </Button>
                    ) : isPlanUpgrade ? (
                      <Button 
                        className="w-full" 
                        onClick={() => openUpgradePreview(plan)}
                        disabled={processingAction}
                      >
                        <ArrowUpRight className="w-4 h-4 mr-2" />
                        Upgrade
                      </Button>
                    ) : isPlanDowngrade && plan === 'free' ? (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setShowDowngradeDialog(true)}
                        disabled={processingAction || status?.subscription?.cancelAtPeriodEnd}
                      >
                        <ArrowDownRight className="w-4 h-4 mr-2" />
                        Downgrade
                      </Button>
                    ) : isPlanDowngrade ? (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => openUpgradePreview(plan)}
                        disabled={processingAction}
                      >
                        <ArrowDownRight className="w-4 h-4 mr-2" />
                        Change Plan
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Manage via Stripe Portal */}
          {status?.subscription && (
            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={async () => {
                  toast.info("Opening billing portal...");
                  const { data, error } = await supabase.functions.invoke("customer-portal");
                  if (error || !data?.url) {
                    toast.error("Failed to open billing portal");
                    return;
                  }
                  window.open(data.url, "_blank");
                }}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Billing & Payment Method
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan && isUpgrade(currentPlanKey, selectedPlan) 
                ? `Upgrade to ${PLAN_INFO[selectedPlan]?.name}` 
                : `Change to ${selectedPlan ? PLAN_INFO[selectedPlan]?.name : ''}`}
            </DialogTitle>
            <DialogDescription>
              {selectedPlan && isUpgrade(currentPlanKey, selectedPlan)
                ? "You'll get access to all new features immediately."
                : "Your plan will be changed with prorated billing."}
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4">
              {/* Billing Cycle Toggle */}
              {selectedPlan !== 'free' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Billing Cycle</label>
                  <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg w-full">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        billingCycle === 'monthly'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('annual')}
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        billingCycle === 'annual'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Annual
                      <span className="ml-1 text-xs text-accent">(Save)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Features gained */}
              {isUpgrade(currentPlanKey, selectedPlan) && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-green-700">Features you'll gain:</h4>
                  <ul className="space-y-1">
                    {getFeaturesGained(currentPlanKey, selectedPlan).map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-600" />
                        {FEATURE_LABELS[feature]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Features lost */}
              {isDowngrade(currentPlanKey, selectedPlan) && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-amber-700">Features you'll lose:</h4>
                  <ul className="space-y-1">
                    {getFeaturesLost(currentPlanKey, selectedPlan).map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <X className="w-4 h-4 text-amber-600" />
                        {FEATURE_LABELS[feature]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Proration preview */}
              {previewData && billingCycle === 'monthly' && (
                <Alert>
                  <CreditCard className="h-4 w-4" />
                  <AlertDescription>
                    You'll be charged{' '}
                    <strong>
                      {(previewData.amountDue / 100).toLocaleString('en-NZ', { 
                        style: 'currency', 
                        currency: previewData.currency?.toUpperCase() || 'NZD' 
                      })}
                    </strong>{' '}
                    today (prorated).
                  </AlertDescription>
                </Alert>
              )}

              {/* New price display */}
              {(() => {
                const planData = plans.find(p => p.plan_key === selectedPlan);
                const price = billingCycle === 'annual' ? planData?.price_annual : planData?.price_monthly;
                const interval = billingCycle === 'annual' ? 'year' : 'month';
                return (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {billingCycle === 'annual' ? 'Annual price' : 'Monthly price'}
                      </span>
                      <span className="font-semibold">
                        ${price?.toLocaleString() ?? PLAN_INFO[selectedPlan].price}/{interval === 'year' ? 'yr' : 'mo'}
                      </span>
                    </div>
                    {billingCycle === 'annual' && planData?.price_monthly && planData?.price_annual && (
                      <p className="text-xs text-accent mt-1">
                        Save ${((planData.price_monthly * 12) - planData.price_annual).toLocaleString()} per year
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedPlan && handleUpgrade(selectedPlan)}
              disabled={processingAction}
            >
              {processingAction && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {status?.subscription ? 'Confirm Change' : 'Continue to Checkout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Downgrade Dialog */}
      <Dialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Downgrade to Free Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to downgrade? You'll lose access to premium features.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You'll lose access to these features:
              </AlertDescription>
            </Alert>

            <ul className="space-y-2">
              {getFeaturesLost(currentPlanKey, 'free').map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  {FEATURE_ICONS[feature]}
                  <span>{FEATURE_LABELS[feature]}</span>
                </li>
              ))}
            </ul>

            <p className="text-sm text-muted-foreground">
              You'll keep your current features until the end of your billing period. 
              After that, your plan will automatically change to Free.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDowngradeDialog(false)}>
              Keep My Plan
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDowngradeToFree}
              disabled={processingAction}
            >
              {processingAction && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Downgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
