import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Clock, CheckCircle, XCircle, DollarSign, TrendingUp, Users, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Referral {
  id: string;
  referred_company_name: string;
  referred_company_email: string;
  referral_plan: "premium" | "elite";
  status: "pending" | "approved" | "paid" | "rejected";
  reward_amount: number;
  created_at: string;
  paid_at: string | null;
  referral_code: string;
}

interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  approvedReferrals: number;
  paidReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    variant: "secondary" as const,
    color: "text-muted-foreground",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    variant: "default" as const,
    color: "text-accent",
  },
  paid: {
    label: "Paid",
    icon: DollarSign,
    variant: "default" as const,
    color: "text-green-600",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    variant: "destructive" as const,
    color: "text-destructive",
  },
};

export function ReferralDashboard() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchReferrals = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("partner_referrals")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const referralData = (data || []) as Referral[];
        setReferrals(referralData);

        // Calculate stats
        const totalReferrals = referralData.length;
        const pendingReferrals = referralData.filter(r => r.status === "pending").length;
        const approvedReferrals = referralData.filter(r => r.status === "approved").length;
        const paidReferrals = referralData.filter(r => r.status === "paid").length;
        const totalEarnings = referralData
          .filter(r => r.status === "paid")
          .reduce((sum, r) => sum + Number(r.reward_amount), 0);
        const pendingEarnings = referralData
          .filter(r => r.status === "approved")
          .reduce((sum, r) => sum + Number(r.reward_amount), 0);

        setStats({
          totalReferrals,
          pendingReferrals,
          approvedReferrals,
          paidReferrals,
          totalEarnings,
          pendingEarnings,
        });
      } catch (error) {
        console.error("Error fetching referrals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReferrals();
  }, [user]);

  if (!user) {
    return (
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Please sign in to view your referral dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (referrals.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Referrals Yet</h3>
            <p className="text-muted-foreground">
              Start referring businesses to earn rewards. Your referrals will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold text-foreground">{stats?.totalReferrals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground">{stats?.pendingReferrals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold text-foreground">${stats?.totalEarnings || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Earnings</p>
                <p className="text-2xl font-bold text-foreground">${stats?.pendingEarnings || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referrals List */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
          <CardDescription>Track the status of all your submitted referrals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {referrals.map((referral) => {
              const config = statusConfig[referral.status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={referral.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground">
                        {referral.referred_company_name}
                      </h4>
                      <Badge variant={config.variant} className="text-xs">
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {referral.referred_company_email}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">
                        {referral.referral_plan} Plan
                      </span>
                      <span>•</span>
                      <span>
                        Submitted {format(new Date(referral.created_at), "MMM d, yyyy")}
                      </span>
                      {referral.paid_at && (
                        <>
                          <span>•</span>
                          <span className="text-green-600">
                            Paid {format(new Date(referral.paid_at), "MMM d, yyyy")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${config.color}`}>
                      ${Number(referral.reward_amount).toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Reward</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
