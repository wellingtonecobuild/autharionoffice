import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { format } from "date-fns";
import { CheckCircle, XCircle, RefreshCw, DollarSign, Clock, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface HeldPayment {
  id: string;
  name: string;
  email: string;
  subscription_plan: string;
  payment_amount: number;
  payment_date: string;
  payment_status: string;
  payment_intent_id: string;
  stripe_customer_id: string;
  status: string;
  created_at: string;
}

const AdminHeldPayments = () => {
  const queryClient = useQueryClient();
  const [selectedBusiness, setSelectedBusiness] = useState<HeldPayment | null>(null);
  const [actionType, setActionType] = useState<"approve" | "decline" | "resubmit" | null>(null);
  const [notes, setNotes] = useState("");

  const { data: heldPayments, isLoading, refetch } = useQuery({
    queryKey: ["held-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, email, subscription_plan, payment_amount, payment_date, payment_status, payment_intent_id, stripe_customer_id, status, created_at")
        .in("payment_status", ["held", "pending"])
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data as HeldPayment[];
    },
  });

  // Auto-refresh every 5 seconds
  useAutoRefresh(useCallback(async () => { await refetch(); }, [refetch]));

  const actionMutation = useMutation({
    mutationFn: async ({ businessId, action, notes }: { businessId: string; action: string; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-held-payment", {
        body: { businessId, action, notes },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Action completed successfully");
      queryClient.invalidateQueries({ queryKey: ["held-payments"] });
      setSelectedBusiness(null);
      setActionType(null);
      setNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Action failed");
    },
  });

  const handleAction = (business: HeldPayment, action: "approve" | "decline" | "resubmit") => {
    setSelectedBusiness(business);
    setActionType(action);
    setNotes("");
  };

  const confirmAction = () => {
    if (!selectedBusiness || !actionType) return;
    actionMutation.mutate({
      businessId: selectedBusiness.id,
      action: actionType,
      notes: notes || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "held":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Held</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="Held Payments">
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">${heldPayments?.reduce((sum, p) => sum + (p.payment_amount || 0), 0).toFixed(2) || "0.00"}</p>
                  <p className="text-sm text-muted-foreground">Total Held</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{heldPayments?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Awaiting Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments List */}
        <Card>
          <CardHeader>
            <CardTitle>Payments Pending Verification</CardTitle>
            <CardDescription>Review each application and take action</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : heldPayments?.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No payments pending review</p>
              </div>
            ) : (
              <div className="space-y-4">
                {heldPayments?.map((payment) => (
                  <div key={payment.id} className="border rounded-lg p-4 hover:bg-accent/5 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{payment.name}</h3>
                          {getStatusBadge(payment.payment_status)}
                          <Badge variant="outline" className="capitalize">{payment.subscription_plan}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{payment.email}</p>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm">
                          <span><strong>Amount:</strong> ${payment.payment_amount?.toFixed(2) || "0.00"}</span>
                          <span><strong>Paid:</strong> {payment.payment_date ? format(new Date(payment.payment_date), "MMM d, yyyy") : "N/A"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" onClick={() => handleAction(payment, "approve")} className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-1" />Approve & Collect
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleAction(payment, "decline")}>
                          <XCircle className="w-4 h-4 mr-1" />Decline & Refund
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleAction(payment, "resubmit")}>
                          <RefreshCw className="w-4 h-4 mr-1" />Resubmit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => { setActionType(null); setSelectedBusiness(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Approve & Collect Payment"}
              {actionType === "decline" && "Decline & Refund Payment"}
              {actionType === "resubmit" && "Request Resubmission"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" && "This will activate the business listing and collect the payment."}
              {actionType === "decline" && "This will issue a full refund and decline the application."}
              {actionType === "resubmit" && "Payment will remain held while requesting additional documents."}
            </DialogDescription>
          </DialogHeader>
          {(actionType === "decline" || actionType === "resubmit") && (
            <div className="space-y-2">
              <Label>Notes for the business</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={actionType === "decline" ? "Reason for declining..." : "What documents are needed..."} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>Cancel</Button>
            <Button onClick={confirmAction} disabled={actionMutation.isPending} className={actionType === "decline" ? "bg-red-600" : actionType === "approve" ? "bg-green-600" : ""}>
              {actionMutation.isPending ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminHeldPayments;
