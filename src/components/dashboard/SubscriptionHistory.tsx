import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown, X, Play, Pause, Plus, History, User } from "lucide-react";
import { format } from "date-fns";

interface SubscriptionChange {
  id: string;
  action: string;
  created_at: string;
  old_data: {
    plan?: string;
    subscription_plan?: string;
  } | null;
  new_data: {
    plan?: string;
    subscription_plan?: string;
    reason?: string;
  } | null;
  metadata: {
    reason?: string;
    admin_email?: string;
    immediate?: boolean;
    proration_amount?: number;
  } | null;
}

interface SubscriptionHistoryProps {
  businessId: string;
}

const getChangeIcon = (action: string, oldPlan?: string, newPlan?: string) => {
  const planOrder = { free: 0, premium: 1, elite: 2 };
  
  if (action.includes('cancel')) return <X className="w-4 h-4" />;
  if (action.includes('pause')) return <Pause className="w-4 h-4" />;
  if (action.includes('resume')) return <Play className="w-4 h-4" />;
  if (action.includes('create')) return <Plus className="w-4 h-4" />;
  
  if (oldPlan && newPlan) {
    const oldOrder = planOrder[oldPlan as keyof typeof planOrder] ?? 0;
    const newOrder = planOrder[newPlan as keyof typeof planOrder] ?? 0;
    if (newOrder > oldOrder) return <ArrowUp className="w-4 h-4" />;
    if (newOrder < oldOrder) return <ArrowDown className="w-4 h-4" />;
  }
  
  return <History className="w-4 h-4" />;
};

const getChangeColor = (action: string, oldPlan?: string, newPlan?: string) => {
  const planOrder = { free: 0, premium: 1, elite: 2 };
  
  if (action.includes('cancel')) return "bg-destructive/10 text-destructive";
  if (action.includes('pause')) return "bg-amber-500/10 text-amber-600";
  if (action.includes('resume') || action.includes('create')) return "bg-green-500/10 text-green-600";
  
  if (oldPlan && newPlan) {
    const oldOrder = planOrder[oldPlan as keyof typeof planOrder] ?? 0;
    const newOrder = planOrder[newPlan as keyof typeof planOrder] ?? 0;
    if (newOrder > oldOrder) return "bg-green-500/10 text-green-600";
    if (newOrder < oldOrder) return "bg-amber-500/10 text-amber-600";
  }
  
  return "bg-muted text-muted-foreground";
};

const formatAction = (action: string): string => {
  const actionMap: Record<string, string> = {
    'subscription_upgraded': 'Upgraded',
    'subscription_downgraded': 'Downgraded',
    'subscription_cancelled': 'Cancelled',
    'subscription_paused': 'Paused',
    'subscription_resumed': 'Resumed',
    'subscription_created': 'Created',
    'plan_changed': 'Plan Changed',
    'manual_plan_assign': 'Manual Assignment',
    'admin_upgrade': 'Admin Upgrade',
    'admin_downgrade': 'Admin Downgrade',
  };
  
  return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatPlan = (plan?: string): string => {
  if (!plan) return 'Unknown';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
};

export function SubscriptionHistory({ businessId }: SubscriptionHistoryProps) {
  const [changes, setChanges] = useState<SubscriptionChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .select("*")
          .eq("entity_type", "subscription")
          .eq("entity_id", businessId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        
        setChanges((data || []) as SubscriptionChange[]);
      } catch (error) {
        console.error("Error fetching subscription history:", error);
      } finally {
        setLoading(false);
      }
    };

    if (businessId) {
      fetchHistory();
    }
  }, [businessId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Subscription History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Subscription History
        </CardTitle>
        <CardDescription>
          All plan changes and subscription events
        </CardDescription>
      </CardHeader>
      <CardContent>
        {changes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No subscription changes yet</p>
            <p className="text-sm mt-1">Changes to your plan will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
              
              <div className="space-y-6">
                {changes.map((change, index) => {
                  const oldPlan = change.old_data?.plan || change.old_data?.subscription_plan;
                  const newPlan = change.new_data?.plan || change.new_data?.subscription_plan;
                  const reason = change.new_data?.reason || change.metadata?.reason;
                  const adminEmail = change.metadata?.admin_email;
                  const wasImmediate = change.metadata?.immediate;
                  const prorationAmount = change.metadata?.proration_amount;

                  return (
                    <div key={change.id} className="relative flex gap-4">
                      {/* Timeline dot */}
                      <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full ${getChangeColor(change.action, oldPlan, newPlan)}`}>
                        {getChangeIcon(change.action, oldPlan, newPlan)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">
                            {formatAction(change.action)}
                          </span>
                          {oldPlan && newPlan && oldPlan !== newPlan && (
                            <span className="text-sm text-muted-foreground">
                              {formatPlan(oldPlan)} → {formatPlan(newPlan)}
                            </span>
                          )}
                          {!oldPlan && newPlan && (
                            <Badge variant="outline" className="text-xs">
                              {formatPlan(newPlan)}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(change.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                        
                        {/* Additional details */}
                        <div className="mt-2 space-y-1">
                          {reason && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Reason:</span> {reason}
                            </p>
                          )}
                          
                          {adminEmail && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Changed by: {adminEmail}
                            </p>
                          )}
                          
                          {wasImmediate !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              {wasImmediate ? 'Applied immediately' : 'Applied at next billing'}
                            </Badge>
                          )}
                          
                          {prorationAmount !== undefined && prorationAmount !== 0 && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Proration:</span> ${(prorationAmount / 100).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
