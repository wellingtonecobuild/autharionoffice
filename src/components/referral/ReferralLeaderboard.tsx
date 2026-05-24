import { useEffect, useState } from "react";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardEntry {
  anonymizedName: string;
  totalReferrals: number;
  totalEarnings: number;
  paidReferrals: number;
}

// Anonymize name: "John Smith" -> "J*** S***"
function anonymizeName(name: string): string {
  const parts = name.trim().split(" ");
  return parts
    .map(part => {
      if (part.length <= 1) return part[0] + "***";
      return part[0] + "***";
    })
    .join(" ");
}

export function ReferralLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPaidOut, setTotalPaidOut] = useState(0);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        // Fetch all paid referrals grouped by referrer
        const { data, error } = await supabase
          .from("partner_referrals")
          .select("referrer_name, reward_amount, status")
          .in("status", ["approved", "paid"]);

        if (error) throw error;

        // Group by referrer name and calculate totals
        const referrerMap = new Map<string, { total: number; paid: number; earnings: number }>();
        
        (data || []).forEach(referral => {
          const existing = referrerMap.get(referral.referrer_name) || { total: 0, paid: 0, earnings: 0 };
          existing.total += 1;
          if (referral.status === "paid") {
            existing.paid += 1;
            existing.earnings += Number(referral.reward_amount);
          }
          referrerMap.set(referral.referrer_name, existing);
        });

        // Convert to array and sort by earnings
        const leaderboardData: LeaderboardEntry[] = Array.from(referrerMap.entries())
          .map(([name, stats]) => ({
            anonymizedName: anonymizeName(name),
            totalReferrals: stats.total,
            totalEarnings: stats.earnings,
            paidReferrals: stats.paid,
          }))
          .filter(entry => entry.paidReferrals > 0)
          .sort((a, b) => b.totalEarnings - a.totalEarnings)
          .slice(0, 10); // Top 10

        setLeaderboard(leaderboardData);
        setTotalPaidOut(leaderboardData.reduce((sum, entry) => sum + entry.totalEarnings, 0));
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{index + 1}</span>;
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" />
            Top Referrers
          </CardTitle>
          <CardDescription>Be the first to join our leaderboard!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No paid referrals yet. Start referring to claim the top spot!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Top Referrers
            </CardTitle>
            <CardDescription>Our most successful referral partners</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Paid Out</p>
            <p className="text-2xl font-bold text-accent">${totalPaidOut}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                index === 0
                  ? "bg-yellow-500/5 border-yellow-500/20"
                  : index === 1
                  ? "bg-gray-500/5 border-gray-500/20"
                  : index === 2
                  ? "bg-amber-500/5 border-amber-500/20"
                  : "bg-card border-border"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 flex justify-center">
                  {getRankIcon(index)}
                </div>
                <div>
                  <p className="font-medium text-foreground">{entry.anonymizedName}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.paidReferrals} successful referral{entry.paidReferrals !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-accent">${entry.totalEarnings}</p>
                <p className="text-xs text-muted-foreground">earned</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
