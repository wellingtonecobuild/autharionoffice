import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import {
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  MoreHorizontal,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { ReferralCommissionSettings } from "@/components/admin/ReferralCommissionSettings";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type ReferralStatus = "pending" | "approved" | "paid" | "rejected";
type ReferralPlan = "premium" | "elite";

interface Referral {
  id: string;
  referrer_name: string;
  referrer_email: string;
  referrer_phone: string | null;
  referred_company_name: string;
  referred_company_email: string;
  referral_plan: ReferralPlan;
  referral_code: string;
  status: ReferralStatus;
  reward_amount: number;
  paid_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

const AdminReferrals = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: referrals, isLoading, refetch } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_referrals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Referral[];
    },
  });

  // Auto-refresh every 5 seconds
  useAutoRefresh(useCallback(async () => { await refetch(); }, [refetch]));

  // Send email notification for status changes
  const sendStatusNotification = async (referral: Referral, newStatus: ReferralStatus, rejectionReason?: string) => {
    try {
      await supabase.functions.invoke('notify-referral-status', {
        body: {
          referrerEmail: referral.referrer_email,
          referrerName: referral.referrer_name,
          referredCompanyName: referral.referred_company_name,
          referralPlan: referral.referral_plan,
          rewardAmount: referral.reward_amount,
          status: newStatus,
          rejectionReason,
        },
      });
      console.log('Status notification email sent');
    } catch (error) {
      console.error('Failed to send status notification:', error);
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes, referral }: { id: string; status: ReferralStatus; notes?: string; referral?: Referral }) => {
      const updateData: Record<string, unknown> = { status };
      if (notes !== undefined) updateData.admin_notes = notes;
      if (status === "paid") updateData.paid_at = new Date().toISOString();

      const { error } = await supabase
        .from("partner_referrals")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // Send email notification for status changes (approved, paid, rejected)
      if (referral && ["approved", "paid", "rejected"].includes(status)) {
        await sendStatusNotification(referral, status, notes);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
      toast({ title: "Status updated successfully", description: "Email notification sent to referrer." });
      setDetailsOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const filteredReferrals = referrals?.filter((referral) => {
    const matchesSearch =
      referral.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referrer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referred_company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || referral.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: referrals?.length || 0,
    pending: referrals?.filter((r) => r.status === "pending").length || 0,
    approved: referrals?.filter((r) => r.status === "approved").length || 0,
    paid: referrals?.filter((r) => r.status === "paid").length || 0,
    totalEarned: referrals?.filter((r) => r.status === "paid").reduce((sum, r) => sum + Number(r.reward_amount), 0) || 0,
    pendingPayout: referrals?.filter((r) => r.status === "approved").reduce((sum, r) => sum + Number(r.reward_amount), 0) || 0,
  };

  // Top referrers leaderboard
  const topReferrers = referrals
    ? Object.entries(
        referrals
          .filter((r) => r.status === "paid")
          .reduce((acc, r) => {
            acc[r.referrer_email] = (acc[r.referrer_email] || 0) + Number(r.reward_amount);
            return acc;
          }, {} as Record<string, number>)
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  const getStatusBadge = (status: ReferralStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge className="bg-blue-500">Approved</Badge>;
      case "paid":
        return <Badge className="bg-green-500">Paid</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
    }
  };

  const getPlanBadge = (plan: ReferralPlan) => {
    return plan === "elite" ? (
      <Badge className="bg-amber-500">Elite</Badge>
    ) : (
      <Badge variant="outline">Premium</Badge>
    );
  };

  const openDetails = (referral: Referral) => {
    setSelectedReferral(referral);
    setAdminNotes(referral.admin_notes || "");
    setDetailsOpen(true);
  };

  return (
    <AdminLayout title="Partner Referrals">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Partner Referrals</h1>
          <p className="text-muted-foreground">Manage referral submissions and payouts</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Referrals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-2xl font-bold">{stats.pending}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approved</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold">{stats.approved}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Paid</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">{stats.paid}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Paid Out</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">${stats.totalEarned}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Payout</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-500" />
                <span className="text-2xl font-bold">${stats.pendingPayout}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Table */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <CardTitle>All Referrals</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-[200px]"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredReferrals?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No referrals found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Referrer</TableHead>
                          <TableHead>Referred Company</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Reward</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReferrals?.map((referral) => (
                          <TableRow key={referral.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{referral.referrer_name}</div>
                                <div className="text-sm text-muted-foreground">{referral.referrer_email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{referral.referred_company_name}</div>
                                <div className="text-sm text-muted-foreground">{referral.referred_company_email}</div>
                              </div>
                            </TableCell>
                            <TableCell>{getPlanBadge(referral.referral_plan)}</TableCell>
                            <TableCell className="font-semibold">${referral.reward_amount}</TableCell>
                            <TableCell>{getStatusBadge(referral.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(referral.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openDetails(referral)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  {referral.status === "pending" && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => updateStatusMutation.mutate({ id: referral.id, status: "approved", referral })}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                                        Approve
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => updateStatusMutation.mutate({ id: referral.id, status: "rejected", referral })}
                                      >
                                        <XCircle className="h-4 w-4 mr-2 text-red-500" />
                                        Reject
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {referral.status === "approved" && (
                                    <DropdownMenuItem
                                      onClick={() => updateStatusMutation.mutate({ id: referral.id, status: "paid", referral })}
                                    >
                                      <DollarSign className="h-4 w-4 mr-2 text-green-500" />
                                      Mark as Paid
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Commission Settings */}
            <ReferralCommissionSettings />
            
            {/* Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Top Referrers
                </CardTitle>
                <CardDescription>By total earnings</CardDescription>
              </CardHeader>
              <CardContent>
                {topReferrers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No paid referrals yet</p>
                ) : (
                  <div className="space-y-3">
                    {topReferrers.map(([email, amount], index) => (
                      <div key={email} className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0
                              ? "bg-amber-500 text-white"
                              : index === 1
                              ? "bg-gray-400 text-white"
                              : index === 2
                              ? "bg-amber-700 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{email}</p>
                        </div>
                        <span className="text-sm font-bold text-green-600">${amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Referral Details</DialogTitle>
            <DialogDescription>
              View and manage referral submission
            </DialogDescription>
          </DialogHeader>
          {selectedReferral && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Referrer</Label>
                  <p className="font-medium">{selectedReferral.referrer_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedReferral.referrer_email}</p>
                  {selectedReferral.referrer_phone && (
                    <p className="text-sm text-muted-foreground">{selectedReferral.referrer_phone}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Referred Company</Label>
                  <p className="font-medium">{selectedReferral.referred_company_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedReferral.referred_company_email}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Plan</Label>
                  <div className="mt-1">{getPlanBadge(selectedReferral.referral_plan)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reward</Label>
                  <p className="font-bold text-lg">${selectedReferral.reward_amount}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedReferral.status)}</div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Referral Code</Label>
                <p className="font-mono text-sm bg-muted px-2 py-1 rounded">{selectedReferral.referral_code}</p>
              </div>

              <div>
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this referral..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedReferral?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: selectedReferral.id,
                      status: "rejected",
                      notes: adminNotes,
                      referral: selectedReferral,
                    })
                  }
                >
                  Reject
                </Button>
                <Button
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: selectedReferral.id,
                      status: "approved",
                      notes: adminNotes,
                      referral: selectedReferral,
                    })
                  }
                >
                  Approve
                </Button>
              </>
            )}
            {selectedReferral?.status === "approved" && (
              <Button
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: selectedReferral.id,
                    status: "paid",
                    notes: adminNotes,
                    referral: selectedReferral,
                  })
                }
                className="bg-green-600 hover:bg-green-700"
              >
                Mark as Paid
              </Button>
            )}
            {selectedReferral && selectedReferral.status !== "pending" && selectedReferral.status !== "approved" && (
              <Button
                variant="outline"
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: selectedReferral.id,
                    status: selectedReferral.status,
                    notes: adminNotes,
                  })
                }
              >
                Save Notes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminReferrals;
