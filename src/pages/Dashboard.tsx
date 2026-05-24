import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PaymentSuccessDialog from "@/components/PaymentSuccessDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Building2, Mail, Eye, Star, Plus, Settings, Loader2, TrendingUp, MapPin, 
  Calendar, Briefcase, Users, Crown, CreditCard, AlertCircle, Clock, CheckCircle2, 
  Phone, Globe, Lock, Sparkles, BadgeCheck, RefreshCw, Target, DollarSign, ShieldCheck,
  Shield, Activity, Wallet
} from "lucide-react";
import { toast } from "sonner";
import { BusinessJobsSection } from "@/components/jobs/BusinessJobsSection";
import { EmployerJobAnalytics } from "@/components/jobs/EmployerJobAnalytics";
import LeadAnalytics from "@/components/dashboard/LeadAnalytics";
import PaymentHistory from "@/components/dashboard/PaymentHistory";
import BillingHistory from "@/components/dashboard/BillingHistory";
import { SubscriptionManagement } from "@/components/dashboard/SubscriptionManagement";
import { SubscriptionHistory } from "@/components/dashboard/SubscriptionHistory";
import { MarketInsightsDashboard } from "@/components/dashboard/MarketInsightsDashboard";
import { BusinessProjectDashboard } from "@/components/project-tracking";
import { ClipboardList } from "lucide-react";

interface Business {
  id: string;
  name: string;
  category: string;
  city: string;
  status: string;
  subscription_plan: string;
  is_verified: boolean;
  rating: number;
  review_count: number;
  created_at: string;
  rejection_reason: string | null;
  approved_at: string | null;
  payment_status: string | null;
  payment_amount: number | null;
  payment_date: string | null;
  payment_captured_at: string | null;
  payment_refunded_at: string | null;
  resubmission_notes: string | null;
  // Trial fields
  trial_status: string | null;
  trial_start_at: string | null;
  trial_end_at: string | null;
  has_used_trial: boolean | null;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  is_read: boolean;
  is_converted: boolean;
  converted_at: string | null;
  conversion_notes: string | null;
  created_at: string;
  business_id: string;
}

interface LeadWithBusiness extends Lead {
  business_name: string;
  business_category: string;
  business_city: string;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [leads, setLeads] = useState<LeadWithBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [openJobFormForBusiness, setOpenJobFormForBusiness] = useState<string | null>(null);
  
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "businesses");
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("tab");
    newParams.delete("businessId");
    setSearchParams(newParams);
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    const businessId = searchParams.get("businessId");
    const payment = searchParams.get("payment");
    const type = searchParams.get("type");
    
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
    
    if (tab === "jobs" && businessId && businesses.length > 0) {
      const targetBusiness = businesses.find(b => b.id === businessId);
      if (targetBusiness) {
        setOpenJobFormForBusiness(businessId);
        const newParams = new URLSearchParams();
        setSearchParams(newParams);
      }
    }
    
    if (payment === "success" && type === "pay_per_listing") {
      toast.success("Payment successful! A draft job posting has been created. You can now edit it with full details.", {
        duration: 6000,
      });
    } else if (payment === "cancelled") {
      toast.info("Payment was cancelled.");
      setSearchParams({});
    }
  }, [searchParams, businesses, activeTab, setSearchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
      
      const businessChannel = supabase
        .channel('dashboard-businesses')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'businesses',
            filter: `owner_id=eq.${user.id}`
          },
          () => {
            fetchData();
          }
        )
        .subscribe();
      
      const leadsChannel = supabase
        .channel('dashboard-leads')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'leads'
          },
          (payload) => {
            if (businesses.some(b => b.id === (payload.new as any).business_id)) {
              fetchData();
              toast.success("New lead received!", {
                description: "Check your leads tab for details."
              });
            }
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(businessChannel);
        supabase.removeChannel(leadsChannel);
      };
    }
  }, [user]);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const type = searchParams.get("type");
    const businessId = searchParams.get("businessId");
    
    if (payment === "success" && type === "pay_per_listing" && businesses.length > 0) {
      const targetBusiness = businessId 
        ? businesses.find(b => b.id === businessId)
        : businesses.find(b => b.status === "approved" || b.status === "active");
        
      if (targetBusiness) {
        setActiveTab("jobs");
        setOpenJobFormForBusiness(targetBusiness.id);
        setSearchParams({});
      }
    }
  }, [businesses, searchParams, setSearchParams]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: businessData } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user?.id);
      
      setBusinesses(businessData || []);

      if (businessData && businessData.length > 0) {
        const businessIds = businessData.map(b => b.id);
        const { data: leadData } = await supabase
          .from("leads")
          .select("*")
          .in("business_id", businessIds)
          .order("created_at", { ascending: false });
        
        const leadsWithBusiness: LeadWithBusiness[] = (leadData || []).map(lead => {
          const business = businessData.find(b => b.id === lead.business_id);
          return {
            ...lead,
            business_name: business?.name || 'Unknown',
            business_category: business?.category || 'Unknown',
            business_city: business?.city || 'Unknown',
          };
        });
        
        setLeads(leadsWithBusiness);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (leadId: string) => {
    await supabase.from("leads").update({ is_read: true }).eq("id", leadId);
    setLeads(leads.map(l => l.id === leadId ? { ...l, is_read: true } : l));
  };

  const markAsConverted = async (leadId: string) => {
    const { error } = await supabase
      .from("leads")
      .update({ 
        is_converted: true, 
        converted_at: new Date().toISOString(),
        is_read: true 
      })
      .eq("id", leadId);
    
    if (error) {
      toast.error("Failed to mark lead as converted");
      return;
    }
    
    setLeads(leads.map(l => l.id === leadId ? { 
      ...l, 
      is_converted: true, 
      converted_at: new Date().toISOString(),
      is_read: true 
    } : l));
    toast.success("Lead marked as converted!");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-admin-teal mx-auto mb-3" />
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const totalLeads = leads.length;
  const unreadLeads = leads.filter(l => !l.is_read).length;
  const thisMonthLeads = leads.filter(l => {
    const leadDate = new Date(l.created_at);
    const now = new Date();
    return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <>
      <Helmet>
        <title>Dashboard | Wellington EcoBuild</title>
        <meta name="description" content="Manage your Wellington EcoBuild business listings" />
      </Helmet>

      <PaymentSuccessDialog />
      <Header />

      <main className="pt-28 lg:pt-32 min-h-screen bg-muted">
        {/* Government-style Header Banner */}
        <div className="bg-admin-navy border-b border-admin-navy-light">
          <div className="container mx-auto px-4 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-admin-navy-light rounded-lg">
                  <Shield className="h-5 w-5 text-admin-teal" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold text-white tracking-tight">
                      Business Dashboard
                    </h1>
                    <div className="flex items-center gap-1.5 text-xs text-admin-success">
                      <Activity className="h-3 w-3 animate-pulse" />
                      <span>LIVE</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Manage your listings, leads, and subscriptions
                  </p>
                </div>
              </div>
              <Button asChild className="bg-admin-teal hover:bg-admin-teal/90 text-white">
                <Link to="/list-business">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Business
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {businesses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="p-4 bg-muted rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">
                  No businesses yet
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  List your sustainable construction business to start receiving leads and grow your presence.
                </p>
                <Button asChild className="bg-admin-teal hover:bg-admin-teal/90">
                  <Link to="/list-business">List Your Business</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 mt-6">
                <Card className="bg-admin-navy border-admin-navy-light">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Total Leads
                        </p>
                        <p className="text-2xl font-bold text-white tabular-nums mt-1">
                          {totalLeads}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">All time</p>
                      </div>
                      <div className="p-2 rounded-lg bg-admin-teal/20">
                        <Mail className="w-4 h-4 text-admin-teal" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-admin-error/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Unread Leads
                        </p>
                        <p className="text-2xl font-bold text-admin-error tabular-nums mt-1">
                          {unreadLeads}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
                      </div>
                      <div className="p-2 rounded-lg bg-admin-error/10">
                        <AlertCircle className="w-4 h-4 text-admin-error" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-admin-success/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          This Month
                        </p>
                        <p className="text-2xl font-bold text-admin-success tabular-nums mt-1">
                          {thisMonthLeads}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">New leads</p>
                      </div>
                      <div className="p-2 rounded-lg bg-admin-success/10">
                        <TrendingUp className="w-4 h-4 text-admin-success" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Active Listings
                        </p>
                        <p className="text-2xl font-bold text-foreground tabular-nums mt-1">
                          {businesses.length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Businesses</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <div className="bg-card rounded-lg border border-border p-1">
                  <TabsList className="w-full flex-wrap h-auto gap-1 bg-transparent p-0">
                    <TabsTrigger value="businesses" className="data-[state=active]:bg-admin-teal data-[state=active]:text-white">
                      My Businesses
                    </TabsTrigger>
                    <TabsTrigger value="jobs" className="gap-1.5 data-[state=active]:bg-admin-teal data-[state=active]:text-white">
                      <Briefcase className="w-4 h-4" />
                      Jobs
                    </TabsTrigger>
                    <TabsTrigger value="leads" className="data-[state=active]:bg-admin-teal data-[state=active]:text-white">
                      Leads
                      {unreadLeads > 0 && (
                        <Badge className="ml-2 bg-admin-error text-white text-xs">
                          {unreadLeads}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="lead-log" className="data-[state=active]:bg-admin-teal data-[state=active]:text-white">
                      Lead Log
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="gap-1.5 data-[state=active]:bg-admin-teal data-[state=active]:text-white">
                      <Wallet className="w-4 h-4" />
                      Payments
                    </TabsTrigger>
                    <TabsTrigger value="subscription" className="gap-1.5 data-[state=active]:bg-admin-teal data-[state=active]:text-white">
                      <Crown className="w-4 h-4" />
                      Subscription
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="gap-1.5 data-[state=active]:bg-admin-teal data-[state=active]:text-white">
                      <TrendingUp className="w-4 h-4" />
                      Analytics
                    </TabsTrigger>
                    <TabsTrigger value="market-insights" className="gap-1.5 data-[state=active]:bg-admin-teal data-[state=active]:text-white">
                      <Target className="w-4 h-4" />
                      Market Insights
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="gap-1.5 data-[state=active]:bg-admin-teal data-[state=active]:text-white">
                      <ClipboardList className="w-4 h-4" />
                      Projects
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="businesses" className="space-y-4">
                  {businesses.map((business) => {
                    const isPendingPayment = business.status === "pending_payment";
                    const isAwaitingPayment = business.status === "awaiting_payment";
                    const isPendingVerification = business.status === "pending_verification" || business.status === "payment_received";
                    const isPending = business.status === "pending";
                    const isActive = business.status === "active" || business.status === "approved";
                    const isRejected = business.status === "rejected" || business.status === "declined";
                    const isResubmission = business.status === "resubmission_required";
                    const isSubmitted = business.status === "submitted";
                    
                    const paymentHeld = business.payment_status === "held";
                    const paymentCaptured = business.payment_status === "captured";
                    const paymentRefunded = business.payment_status === "refunded";
                    const paymentAwaiting = business.payment_status === "awaiting" || business.payment_status === "pending";

                    const handleCompletePayment = async () => {
                      toast.info("Redirecting to payment...");
                      
                      const { data, error } = await supabase.functions.invoke(
                        "create-business-checkout",
                        {
                          body: {
                            businessId: business.id,
                            plan: business.subscription_plan,
                            billingCycle: (business as any).billing_cycle || "monthly",
                          },
                        }
                      );

                      if (error) {
                        toast.error("Failed to create checkout session");
                        return;
                      }

                      if (data?.url) {
                        window.location.href = data.url;
                      }
                    };

                    return (
                      <Card key={business.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex flex-col lg:flex-row">
                            {/* Status indicator bar */}
                            <div className={`w-full lg:w-1.5 h-1.5 lg:h-auto ${
                              isActive ? 'bg-admin-success' :
                              isRejected ? 'bg-admin-error' :
                              isPendingVerification || paymentHeld ? 'bg-admin-warning' :
                              'bg-muted'
                            }`} />
                            
                            <div className="flex-1 p-4 lg:p-5">
                              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                {/* Business info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <h3 className="font-semibold text-foreground text-lg">
                                      {business.name}
                                    </h3>
                                    {business.is_verified && (
                                      <Badge className="bg-admin-teal/10 text-admin-teal border-admin-teal/30 gap-1">
                                        <BadgeCheck className="w-3 h-3" />
                                        Verified
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <p className="text-sm text-muted-foreground mb-3">
                                    {business.category.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                                  </p>
                                  
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5" />
                                      {business.city}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <Star className="w-3.5 h-3.5 fill-admin-warning text-admin-warning" />
                                      {business.rating || 0} ({business.review_count || 0})
                                    </span>
                                  </div>

                                  {/* Status messages */}
                                  {isRejected && business.rejection_reason && (
                                    <div className="mt-3 p-3 bg-admin-error/5 border border-admin-error/20 rounded-lg">
                                      <p className="text-sm text-admin-error font-medium">Rejection reason:</p>
                                      <p className="text-sm text-muted-foreground mt-1">{business.rejection_reason}</p>
                                    </div>
                                  )}

                                  {isResubmission && business.resubmission_notes && (
                                    <div className="mt-3 p-3 bg-admin-warning/5 border border-admin-warning/20 rounded-lg">
                                      <p className="text-sm text-admin-warning font-medium">Resubmission required:</p>
                                      <p className="text-sm text-muted-foreground mt-1">{business.resubmission_notes}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Actions column */}
                                <div className="flex flex-col items-end gap-3">
                                  {/* Status badge */}
                                  <Badge variant={
                                    isActive ? "outline" :
                                    isRejected ? "destructive" :
                                    "secondary"
                                  } className={
                                    isActive ? "border-admin-success text-admin-success" :
                                    isPendingVerification || paymentHeld ? "border-admin-warning text-admin-warning" :
                                    ""
                                  }>
                                    {isActive && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                    {isPendingVerification && <Clock className="w-3 h-3 mr-1" />}
                                    {business.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                                  </Badge>

                                  {/* Plan badge */}
                                  <Badge variant={
                                    business.subscription_plan === "elite" ? "default" :
                                    business.subscription_plan === "premium" ? "secondary" :
                                    "outline"
                                  } className={
                                    business.subscription_plan === "elite" ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" :
                                    business.subscription_plan === "premium" ? "bg-admin-teal text-white border-0" :
                                    ""
                                  }>
                                    {business.subscription_plan.toUpperCase()}
                                  </Badge>

                                  {/* Actions */}
                                  <div className="flex gap-2">
                                    {isAwaitingPayment && (
                                      <Button 
                                        size="sm" 
                                        onClick={handleCompletePayment}
                                        className="bg-admin-teal hover:bg-admin-teal/90"
                                      >
                                        <CreditCard className="w-4 h-4 mr-1.5" />
                                        Complete Payment
                                      </Button>
                                    )}
                                    <Button variant="outline" size="sm" asChild>
                                      <Link to={`/business/${business.id}`}>
                                        <Eye className="w-4 h-4 mr-1.5" />
                                        View
                                      </Link>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>

                <TabsContent value="jobs" className="space-y-6">
                  {businesses
                    .filter(b => b.status === "approved" || b.status === "active")
                    .map(business => (
                      <div key={business.id} className="space-y-4">
                        <EmployerJobAnalytics businessId={business.id} businessName={business.name} />
                        <BusinessJobsSection 
                          businessId={business.id} 
                          businessName={business.name}
                          subscriptionPlan={business.subscription_plan}
                          isVerified={business.is_verified}
                          autoOpenForm={openJobFormForBusiness === business.id}
                          onFormOpened={() => setOpenJobFormForBusiness(null)}
                        />
                      </div>
                    ))}
                  {businesses.filter(b => b.status === "approved" || b.status === "active").length === 0 && (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold text-lg mb-2">No approved businesses</h3>
                        <p className="text-muted-foreground">
                          You need an approved business listing to post jobs.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="leads" className="space-y-4">
                  <Card>
                    <CardHeader className="border-b border-border bg-muted/30">
                      <CardTitle className="text-base">Recent Leads</CardTitle>
                      <CardDescription>View and manage your incoming leads</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      {leads.length === 0 ? (
                        <div className="py-12 text-center">
                          <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="font-semibold text-lg mb-2">No leads yet</h3>
                          <p className="text-muted-foreground">
                            Leads will appear here when customers contact your businesses.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {leads.slice(0, 10).map((lead) => (
                            <div 
                              key={lead.id} 
                              className={`p-4 hover:bg-muted/30 transition-colors ${!lead.is_read ? 'bg-admin-teal/5' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-foreground">{lead.name}</span>
                                    {!lead.is_read && (
                                      <Badge className="bg-admin-teal text-white text-xs">New</Badge>
                                    )}
                                    {lead.is_converted && (
                                      <Badge className="bg-admin-success/10 text-admin-success border-admin-success/30 text-xs">
                                        Converted
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    For: {lead.business_name}
                                  </p>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {lead.message}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span>{lead.email}</span>
                                    {lead.phone && <span>{lead.phone}</span>}
                                    <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {!lead.is_read && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => markAsRead(lead.id)}
                                    >
                                      Mark Read
                                    </Button>
                                  )}
                                  {!lead.is_converted && (
                                    <Button 
                                      size="sm"
                                      onClick={() => markAsConverted(lead.id)}
                                      className="bg-admin-success hover:bg-admin-success/90"
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-1" />
                                      Convert
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="lead-log">
                  <Card>
                    <CardHeader className="border-b border-border bg-muted/30">
                      <CardTitle className="text-base">Lead History</CardTitle>
                      <CardDescription>Complete log of all leads received</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs font-semibold uppercase">Date</TableHead>
                            <TableHead className="text-xs font-semibold uppercase">Name</TableHead>
                            <TableHead className="text-xs font-semibold uppercase">Business</TableHead>
                            <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
                            <TableHead className="text-xs font-semibold uppercase">Contact</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leads.map((lead) => (
                            <TableRow key={lead.id}>
                              <TableCell className="text-sm">
                                {new Date(lead.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="font-medium">{lead.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {lead.business_name}
                              </TableCell>
                              <TableCell>
                                {lead.is_converted ? (
                                  <Badge className="bg-admin-success/10 text-admin-success border-admin-success/30">
                                    Converted
                                  </Badge>
                                ) : lead.is_read ? (
                                  <Badge variant="outline">Read</Badge>
                                ) : (
                                  <Badge className="bg-admin-teal text-white">New</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {lead.email}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payments" className="space-y-6">
                  {businesses.map((business) => (
                    <PaymentHistory key={business.id} business={business} />
                  ))}
                  <BillingHistory />
                </TabsContent>

                <TabsContent value="subscription" className="space-y-6">
                  {businesses.map((business) => (
                    <div key={business.id} className="space-y-6">
                      <SubscriptionManagement 
                        businessId={business.id} 
                        currentPlan={business.subscription_plan}
                        businessName={business.name}
                      />
                      <SubscriptionHistory businessId={business.id} />
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="analytics">
                  <LeadAnalytics leads={leads} />
                </TabsContent>

                <TabsContent value="market-insights">
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="lg:col-span-2">
                      <Card className="mb-6">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-primary" />
                            Wellington Market Intelligence
                          </CardTitle>
                          <CardDescription>
                            Real-time insights into project demand and hot suburbs. Premium & Elite members get AI-matched leads automatically.
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </div>
                    <MarketInsightsDashboard businessCategory={businesses[0]?.category} />
                  </div>
                </TabsContent>

                <TabsContent value="projects">
                  {businesses.length > 0 ? (
                    <BusinessProjectDashboard businessId={businesses[0].id} />
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold text-lg mb-2">No Business Listed</h3>
                        <p className="text-muted-foreground mb-4">
                          List your business to start receiving booking requests and manage projects.
                        </p>
                        <Button asChild>
                          <Link to="/list-business">List Your Business</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Dashboard;
