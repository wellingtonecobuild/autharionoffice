import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, CreditCard, Calendar, ExternalLink, Download, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

interface Invoice {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  created: string;
  paid_at: string | null;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  description: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  description: string;
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  plan_amount: number;
  plan_interval: string;
  plan_name: string;
}

interface BillingData {
  invoices: Invoice[];
  payments: Payment[];
  subscriptions: Subscription[];
}

const BillingHistory = () => {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBillingHistory = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      
      const { data, error } = await supabase.functions.invoke('get-billing-history');
      
      if (error) throw error;
      
      setBillingData(data);
      if (showToast) toast.success("Billing history refreshed");
    } catch (error: any) {
      console.error("Error fetching billing history:", error);
      if (showToast) toast.error("Failed to refresh billing history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBillingHistory();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'succeeded':
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'open':
      case 'pending':
      case 'requires_payment_method':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pending</Badge>;
      case 'canceled':
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'void':
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasData = billingData && (
    billingData.invoices.length > 0 || 
    billingData.payments.length > 0 || 
    billingData.subscriptions.length > 0
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Billing History
            </CardTitle>
            <CardDescription>View all your invoices, payments, and subscription details</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchBillingHistory(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No billing history available yet.</p>
            <p className="text-sm mt-1">Your invoices and payments will appear here once you have an active subscription.</p>
          </div>
        ) : (
          <Tabs defaultValue="invoices" className="space-y-4">
            <TabsList>
              <TabsTrigger value="invoices" className="gap-1.5">
                <Receipt className="w-4 h-4" />
                Invoices ({billingData?.invoices.length || 0})
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1.5">
                <CreditCard className="w-4 h-4" />
                Payments ({billingData?.payments.length || 0})
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="gap-1.5">
                <Calendar className="w-4 h-4" />
                Subscriptions ({billingData?.subscriptions.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invoices">
              {billingData?.invoices.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No invoices found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingData?.invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.number || invoice.id.slice(-8)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.created), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {invoice.description}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(invoice.status || 'unknown')}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${invoice.amount.toFixed(2)} {invoice.currency}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {invoice.hosted_invoice_url && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                            {invoice.invoice_pdf && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => window.open(invoice.invoice_pdf!, '_blank')}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="payments">
              {billingData?.payments.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No payments found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingData?.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium font-mono text-xs">
                          {payment.id.slice(-12)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(payment.created), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.description}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${payment.amount.toFixed(2)} {payment.currency}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="subscriptions">
              {billingData?.subscriptions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No subscriptions found.</p>
              ) : (
                <div className="space-y-4">
                  {billingData?.subscriptions.map((sub) => (
                    <div 
                      key={sub.id} 
                      className="p-4 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{sub.plan_name}</h4>
                            {getStatusBadge(sub.status)}
                            {sub.cancel_at_period_end && (
                              <Badge variant="outline" className="text-amber-600">
                                Cancels at period end
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            ${sub.plan_amount.toFixed(2)} / {sub.plan_interval}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">Current period:</p>
                          <p>
                            {format(new Date(sub.current_period_start), 'MMM d')} - {format(new Date(sub.current_period_end), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      {sub.canceled_at && (
                        <p className="text-sm text-red-600 mt-2">
                          Cancelled on {format(new Date(sub.canceled_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default BillingHistory;
