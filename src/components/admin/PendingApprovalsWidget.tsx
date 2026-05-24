import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Clock, Building2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface PendingBusiness {
  id: string;
  name: string;
  status: string;
  subscription_plan: string;
  payment_amount: number | null;
  created_at: string;
  city: string;
}

export function PendingApprovalsWidget() {
  const [pendingBusinesses, setPendingBusinesses] = useState<PendingBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPendingAmount, setTotalPendingAmount] = useState(0);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  async function fetchPendingApprovals() {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, status, subscription_plan, payment_amount, created_at, city')
        .in('status', ['submitted', 'payment_received', 'pending', 'pending_verification', 'resubmission_required'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setPendingBusinesses(data || []);
      
      // Calculate total pending payment amount
      const total = (data || []).reduce((sum, b) => sum + (b.payment_amount || 0), 0);
      setTotalPendingAmount(total);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'payment_received':
        return <Badge className="bg-green-600 text-white text-xs">Payment Received</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800 text-xs">Submitted</Badge>;
      case 'resubmission_required':
        return <Badge className="bg-orange-100 text-orange-800 text-xs">Resubmission</Badge>;
      case 'pending_verification':
        return <Badge variant="secondary" className="text-xs">Pending Verification</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'elite':
        return <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-xs">Elite</Badge>;
      case 'premium':
        return <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs">Premium</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Free</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Pending Approvals
          </CardTitle>
          <CardDescription>Businesses awaiting admin review</CardDescription>
        </div>
        <Link to="/admin/businesses?status=payment_received">
          <Button variant="outline" size="sm">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{pendingBusinesses.length} pending</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-600">
              ${totalPendingAmount.toFixed(2)} held
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : pendingBusinesses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No pending approvals
          </p>
        ) : (
          <div className="space-y-3">
            {pendingBusinesses.map((business) => (
              <Link 
                key={business.id} 
                to={`/admin/businesses?status=${business.status}`}
                className="block"
              >
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{business.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{business.city}</span>
                      {getStatusBadge(business.status)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2">
                    {getPlanBadge(business.subscription_plan)}
                    {business.payment_amount && business.payment_amount > 0 && (
                      <span className="text-xs font-medium text-green-600">
                        ${business.payment_amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
