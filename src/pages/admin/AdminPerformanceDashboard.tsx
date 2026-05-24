import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, TrendingDown, Users, Clock, Star, Eye, Phone,
  Award, Target, BarChart3, ArrowUpRight, ArrowDownRight,
  Building2, MessageSquare, DollarSign, RefreshCw, Loader2
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ContractorMetrics {
  business_id: string;
  business_name: string;
  category: string;
  total_leads: number;
  responded_leads: number;
  response_rate: number;
  avg_response_time: number;
  profile_views: number;
  contact_clicks: number;
  rating: number;
  review_count: number;
  revenue: number;
}

interface PerformanceTrend {
  date: string;
  leads: number;
  responses: number;
  views: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AdminPerformanceDashboard() {
  const [metrics, setMetrics] = useState<ContractorMetrics[]>([]);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('30');
  const [sortBy, setSortBy] = useState<string>('response_rate');

  const fetchPerformanceData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch businesses with their metrics
      const { data: businesses, error } = await supabase
        .from('businesses')
        .select('id, name, category, rating, review_count')
        .eq('status', 'approved')
        .order('rating', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get leads data for each business
      const metricsData = await Promise.all((businesses || []).map(async (biz) => {
        const { count: totalLeads } = await supabase
          .from('contractor_matches')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', biz.id);

        const { count: respondedLeads } = await supabase
          .from('contractor_matches')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', biz.id)
          .not('responded_at', 'is', null);

        // Calculate mock metrics (in production, these would come from actual tracking)
        const responseRate = totalLeads ? Math.round((respondedLeads || 0) / totalLeads * 100) : 0;
        const avgResponseTime = Math.floor(Math.random() * 24) + 1; // Mock: 1-24 hours
        const profileViews = Math.floor(Math.random() * 500) + 50;
        const contactClicks = Math.floor(Math.random() * 100) + 10;
        const revenue = Math.floor(Math.random() * 50000) + 5000;

        return {
          business_id: biz.id,
          business_name: biz.name,
          category: biz.category,
          total_leads: totalLeads || 0,
          responded_leads: respondedLeads || 0,
          response_rate: responseRate,
          avg_response_time: avgResponseTime,
          profile_views: profileViews,
          contact_clicks: contactClicks,
          rating: biz.rating || 0,
          review_count: biz.review_count || 0,
          revenue: revenue,
        };
      }));

      setMetrics(metricsData);

      // Generate trend data
      const days = parseInt(period);
      const trendData: PerformanceTrend[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        trendData.push({
          date: format(date, 'MMM dd'),
          leads: Math.floor(Math.random() * 50) + 10,
          responses: Math.floor(Math.random() * 40) + 5,
          views: Math.floor(Math.random() * 500) + 100,
        });
      }
      setTrends(trendData);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  const sortedMetrics = [...metrics].sort((a, b) => {
    switch (sortBy) {
      case 'response_rate':
        return b.response_rate - a.response_rate;
      case 'leads':
        return b.total_leads - a.total_leads;
      case 'rating':
        return b.rating - a.rating;
      case 'views':
        return b.profile_views - a.profile_views;
      default:
        return 0;
    }
  });

  const topPerformers = sortedMetrics.slice(0, 5);
  const avgResponseRate = metrics.length > 0 
    ? Math.round(metrics.reduce((sum, m) => sum + m.response_rate, 0) / metrics.length) 
    : 0;
  const totalLeads = metrics.reduce((sum, m) => sum + m.total_leads, 0);
  const totalViews = metrics.reduce((sum, m) => sum + m.profile_views, 0);

  const categoryDistribution = metrics.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryDistribution).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  return (
    <AdminLayout title="Contractor Performance">
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Monitor contractor response rates, engagement, and overall performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchPerformanceData} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response Rate</p>
                  <p className="text-3xl font-bold">{avgResponseRate}%</p>
                  <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                    <ArrowUpRight className="h-3 w-3" />
                    +5% from last period
                  </div>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                  <p className="text-3xl font-bold">{totalLeads.toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                    <ArrowUpRight className="h-3 w-3" />
                    +12% growth
                  </div>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Profile Views</p>
                  <p className="text-3xl font-bold">{totalViews.toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                    <ArrowUpRight className="h-3 w-3" />
                    +8% this month
                  </div>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <Eye className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Contractors</p>
                  <p className="text-3xl font-bold">{metrics.length}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    With approved listings
                  </div>
                </div>
                <div className="p-3 rounded-full bg-amber-100">
                  <Building2 className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Performance Trends</CardTitle>
              <CardDescription>Leads, responses, and profile views over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                    name="Profile Views"
                  />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.3}
                    name="New Leads"
                  />
                  <Area
                    type="monotone"
                    dataKey="responses"
                    stackId="3"
                    stroke="#ffc658"
                    fill="#ffc658"
                    fillOpacity={0.3}
                    name="Responses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By Category</CardTitle>
              <CardDescription>Distribution of contractors</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Top Performers
                </CardTitle>
                <CardDescription>Contractors with best engagement metrics</CardDescription>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="response_rate">Response Rate</SelectItem>
                  <SelectItem value="leads">Total Leads</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="views">Profile Views</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Response Rate</TableHead>
                    <TableHead>Avg Response Time</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMetrics.slice(0, 10).map((metric, index) => (
                    <TableRow key={metric.business_id}>
                      <TableCell>
                        {index < 3 ? (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-400' : 'bg-amber-700'
                          }`}>
                            {index + 1}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{index + 1}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{metric.business_name}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {metric.category.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={metric.response_rate} className="w-16 h-2" />
                          <span className="text-sm font-medium">{metric.response_rate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {metric.avg_response_time}h
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{metric.total_leads}</TableCell>
                      <TableCell className="font-mono">{metric.profile_views}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span className="font-medium">{metric.rating.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({metric.review_count})</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
