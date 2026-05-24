import { useWebsiteAnalytics } from '@/hooks/useWebsiteAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Eye, Users, Calendar, TrendingUp, RefreshCw, Wifi, 
  Globe, Smartphone, Tablet, Monitor, Search, Share2, Link2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', '#10b981', '#f59e0b'];

export const WebsiteAnalyticsPanel = () => {
  const { data, isLoading, refetch, isRefetching, dataUpdatedAt } = useWebsiteAnalytics();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdate(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  // Force re-render every 5s to update "time ago" display
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading website analytics...</span>
      </div>
    );
  }

  const analytics = data?.analytics;
  const dailyStats = data?.dailyStats || [];

  const deviceData = analytics ? [
    { name: 'Desktop', value: analytics.deviceBreakdown.desktop, icon: Monitor },
    { name: 'Mobile', value: analytics.deviceBreakdown.mobile, icon: Smartphone },
    { name: 'Tablet', value: analytics.deviceBreakdown.tablet, icon: Tablet },
  ] : [];

  const referrerData = analytics ? [
    { name: 'Direct', value: analytics.referrerBreakdown.direct },
    { name: 'Google', value: analytics.referrerBreakdown.google },
    { name: 'Social', value: analytics.referrerBreakdown.social },
    { name: 'Bing', value: analytics.referrerBreakdown.bing },
    { name: 'Other', value: analytics.referrerBreakdown.other },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      {/* Live Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <Wifi className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs text-green-600 font-medium">Live Tracking</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
          </span>
          <Badge variant="outline" className="text-xs">
            Refreshes every 5s
          </Badge>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh Now
        </Button>
      </div>

      {/* Summary Cards - Time Period Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {analytics?.viewsToday.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.uniqueToday.toLocaleString() || 0} unique visitors
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {analytics?.viewsThisWeek.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.uniqueThisWeek.toLocaleString() || 0} unique visitors
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Eye className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {analytics?.viewsThisMonth.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.uniqueThisMonth.toLocaleString() || 0} unique visitors
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Year</CardTitle>
            <Globe className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {analytics?.viewsThisYear.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.uniqueThisYear.toLocaleString() || 0} unique visitors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* All Time Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Page Views (All Time)</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {analytics?.totalViews.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors (All Time)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {analytics?.uniqueVisitors.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart">Traffic Chart</TabsTrigger>
          <TabsTrigger value="pages">Top Pages</TabsTrigger>
          <TabsTrigger value="sources">Traffic Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Daily Traffic (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' })}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString('en-NZ', { weekday: 'long', month: 'long', day: 'numeric' })}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="views" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                      name="Page Views"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="uniqueVisitors" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      dot={false}
                      name="Unique Visitors"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.topPages.map((page, index) => (
                    <TableRow key={page.path}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-sm">#{index + 1}</span>
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">
                            {page.path}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {page.views.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {analytics?.totalViews 
                          ? ((page.views / analytics.totalViews) * 100).toFixed(1)
                          : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!analytics?.topPages || analytics.topPages.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No page views recorded yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Device Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Device Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deviceData.map((device) => {
                    const Icon = device.icon;
                    const percentage = analytics?.totalViews 
                      ? ((device.value / analytics.totalViews) * 100).toFixed(1)
                      : 0;
                    return (
                      <div key={device.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span>{device.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{device.value.toLocaleString()}</span>
                          <Badge variant="outline">{percentage}%</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Referrer Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Traffic Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {referrerData.map((source) => {
                    const percentage = analytics?.totalViews 
                      ? ((source.value / analytics.totalViews) * 100).toFixed(1)
                      : 0;
                    const icons: Record<string, typeof Search> = {
                      Direct: Link2,
                      Google: Search,
                      Social: Share2,
                      Bing: Search,
                      Other: Globe,
                    };
                    const Icon = icons[source.name] || Globe;
                    return (
                      <div key={source.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span>{source.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{source.value.toLocaleString()}</span>
                          <Badge variant="outline">{percentage}%</Badge>
                        </div>
                      </div>
                    );
                  })}
                  {referrerData.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No traffic data yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};