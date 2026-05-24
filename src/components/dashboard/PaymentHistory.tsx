import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface PaymentEvent {
  id: string;
  type: 'payment' | 'capture' | 'refund' | 'hold';
  status: string;
  amount: number;
  date: string;
  description: string;
}

interface PaymentHistoryProps {
  business: {
    payment_status?: string | null;
    payment_amount?: number | null;
    payment_date?: string | null;
    payment_captured_at?: string | null;
    payment_refunded_at?: string | null;
    subscription_plan?: string;
    name: string;
  };
}

const PaymentHistory = ({ business }: PaymentHistoryProps) => {
  // Build payment events from business data
  const buildPaymentEvents = (): PaymentEvent[] => {
    const events: PaymentEvent[] = [];
    
    // Initial payment
    if (business.payment_date && business.payment_amount) {
      events.push({
        id: '1',
        type: 'payment',
        status: 'completed',
        amount: business.payment_amount,
        date: business.payment_date,
        description: `Payment received for ${business.subscription_plan || 'subscription'} plan`
      });
    }

    // Payment held
    if (business.payment_status === 'held' && business.payment_date) {
      events.push({
        id: '2',
        type: 'hold',
        status: 'pending',
        amount: business.payment_amount || 0,
        date: business.payment_date,
        description: 'Payment held pending verification approval'
      });
    }

    // Payment captured
    if (business.payment_captured_at && business.payment_amount) {
      events.push({
        id: '3',
        type: 'capture',
        status: 'completed',
        amount: business.payment_amount,
        date: business.payment_captured_at,
        description: 'Payment captured - subscription activated'
      });
    }

    // Payment refunded
    if (business.payment_refunded_at && business.payment_amount) {
      events.push({
        id: '4',
        type: 'refund',
        status: 'completed',
        amount: business.payment_amount,
        date: business.payment_refunded_at,
        description: 'Full refund processed'
      });
    }

    // Sort by date descending
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const events = buildPaymentEvents();

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case 'capture':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'refund':
        return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
      case 'hold':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string, type: string) => {
    if (type === 'refund') {
      return <Badge variant="destructive">Refunded</Badge>;
    }
    if (type === 'hold') {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Held</Badge>;
    }
    if (status === 'completed') {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>Track all your payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No payment history available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Payment History
        </CardTitle>
        <CardDescription>Track all your payment transactions, captures, and refunds</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">
                  {format(new Date(event.date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getEventIcon(event.type)}
                    <span className="capitalize">{event.type}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {event.description}
                </TableCell>
                <TableCell>
                  {getStatusBadge(event.status, event.type)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  <span className={event.type === 'refund' ? 'text-red-600' : 'text-green-600'}>
                    {event.type === 'refund' ? '-' : '+'}${event.amount.toFixed(2)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Current Payment Status Summary */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Current Status</h4>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Payment Status: </span>
              <span className="font-medium capitalize">{business.payment_status || 'N/A'}</span>
            </div>
            {business.payment_amount && (
              <div>
                <span className="text-muted-foreground">Amount: </span>
                <span className="font-medium">${business.payment_amount.toFixed(2)}/month</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentHistory;
