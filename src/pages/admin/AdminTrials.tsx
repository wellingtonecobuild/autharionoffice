import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Crown, Search, Loader2, 
  CheckCircle2, XCircle, Clock, RefreshCw, Eye, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SubscriptionBusiness {
  id: string;
  name: string;
  email: string | null;
  category: string;
  city: string;
  subscription_plan: string;
  payment_status: string | null;
  stripe_subscription_id: string | null;
  billing_cycle: string | null;
  created_at: string;
  owner_id: string;
}

interface SubscriptionStats {
  free: number;
  premium: number;
  elite: number;
  total: number;
}

// Renamed from AdminTrials to AdminSubscriptions - trials removed
const AdminTrials = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [selectedBusiness, setSelectedBusiness] = useState<SubscriptionBusiness | null>(null);
  const [stats, setStats] = useState<SubscriptionStats>({ free: 0, premium: 0, elite: 0, total: 0 });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .neq("subscription_plan", "free")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const subData = data || [];
      setSubscriptions(subData);

      // Calculate stats
      const statsCalc: SubscriptionStats = {
        free: 0,
        premium: subData.filter(s => s.subscription_plan === 'premium').length,
        elite: subData.filter(s => s.subscription_plan === 'elite').length,
        total: subData.length,
      };
      setStats(statsCalc);
    } catch (error: any) {
      console.error("Error fetching subscriptions:", error);
      toast.error("Failed to fetch subscription data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'elite':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
            <Crown className="w-3 h-3 mr-1" />
            Elite
          </Badge>
        );
      case 'premium':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Premium
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Free
          </Badge>
        );
    }
  };

  const getPaymentBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'past_due':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Past Due
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status || 'None'}
          </Badge>
        );
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlan = planFilter === 'all' || sub.subscription_plan === planFilter;
    
    return matchesSearch && matchesPlan;
  });

  return (
    <AdminLayout title="Paid Subscriptions">
      <div className="space-y-6">
        <AdminPageHeader
          title="Paid Subscriptions"
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.premium}</p>
              <p className="text-sm text-muted-foreground">Premium ($79/mo)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.elite}</p>
              <p className="text-sm text-muted-foreground">Elite ($149/mo)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Paid</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Paid Subscribers
            </CardTitle>
            <CardDescription>
              All active paid subscriptions (Premium & Elite)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {['all', 'premium', 'elite'].map((plan) => (
                  <Button
                    key={plan}
                    variant={planFilter === plan ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPlanFilter(plan)}
                    className="capitalize"
                  >
                    {plan}
                  </Button>
                ))}
              </div>
              <Button variant="outline" size="icon" onClick={fetchSubscriptions}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSubscriptions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No paid subscriptions found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.name}</p>
                          <p className="text-sm text-muted-foreground">{sub.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {sub.category.replace('-', ' ')}
                      </TableCell>
                      <TableCell>{getPlanBadge(sub.subscription_plan)}</TableCell>
                      <TableCell className="capitalize">
                        {sub.billing_cycle || 'Monthly'}
                      </TableCell>
                      <TableCell>{getPaymentBadge(sub.payment_status)}</TableCell>
                      <TableCell>{formatDate(sub.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBusiness(sub)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Business Detail Dialog */}
        <Dialog open={!!selectedBusiness} onOpenChange={() => setSelectedBusiness(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Subscription Details</DialogTitle>
              <DialogDescription>
                {selectedBusiness?.name}
              </DialogDescription>
            </DialogHeader>

            {selectedBusiness && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedBusiness.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Category</p>
                    <p className="font-medium capitalize">{selectedBusiness.category.replace('-', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">City</p>
                    <p className="font-medium">{selectedBusiness.city}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current Plan</p>
                    {getPlanBadge(selectedBusiness.subscription_plan)}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Billing Cycle</p>
                    <p className="font-medium capitalize">{selectedBusiness.billing_cycle || 'Monthly'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment Status</p>
                    {getPaymentBadge(selectedBusiness.payment_status)}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Stripe ID</p>
                    <p className="font-medium text-xs truncate">{selectedBusiness.stripe_subscription_id || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{formatDate(selectedBusiness.created_at)}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminTrials;
