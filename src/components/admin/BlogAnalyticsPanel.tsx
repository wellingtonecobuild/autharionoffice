import { useState, useEffect } from 'react';
import { useBlogAnalyticsList, useTrendingBlogs, useBlogAggregateStats } from '@/hooks/useBlogAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, TrendingUp, TrendingDown, Calendar, ExternalLink, BarChart3, RefreshCw, Wifi, Clock, Users, Activity, CalendarDays } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { BlogDetailAnalyticsDialog } from './BlogDetailAnalyticsDialog';

export const BlogAnalyticsPanel = () => {
  const { data: blogs, isLoading, refetch, isRefetching, dataUpdatedAt } = useBlogAnalyticsList();
  const { data: aggregateStats, refetch: refetchAggregate, dataUpdatedAt: aggregateUpdatedAt } = useBlogAggregateStats();
  const { data: trendingWeek, refetch: refetchTrending } = useTrendingBlogs('week');
  const { data: lowestPerforming } = useTrendingBlogs('all');
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Update last update time when data changes
  useEffect(() => {
    const latestUpdate = Math.max(dataUpdatedAt || 0, aggregateUpdatedAt || 0);
    if (latestUpdate) {
      setLastUpdate(new Date(latestUpdate));
    }
  }, [dataUpdatedAt, aggregateUpdatedAt]);

  // Force re-render every 1s to update "time ago" display
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    refetch();
    refetchAggregate();
    refetchTrending();
  };

  const sortedByViews = [...(blogs || [])].sort((a, b) => b.analytics.totalViews - a.analytics.totalViews);
  const lowest = [...(blogs || [])].sort((a, b) => a.analytics.totalViews - b.analytics.totalViews).slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Government-Level Live Stats Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/30">
              <Activity className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Blog Analytics Centre</h2>
              <p className="text-sm text-slate-400">Real-time publication performance monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <Wifi className="h-3.5 w-3.5 text-green-400" />
              <span className="text-xs text-green-400 font-medium uppercase tracking-wider">Live</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefetching}
              className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Time Period Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Today */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Today</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {aggregateStats?.viewsToday?.toLocaleString() || 0}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Users className="h-3 w-3" />
              <span>{aggregateStats?.uniqueToday?.toLocaleString() || 0} unique</span>
            </div>
          </div>

          {/* This Week */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">This Week</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {aggregateStats?.viewsThisWeek?.toLocaleString() || 0}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Users className="h-3 w-3" />
              <span>{aggregateStats?.uniqueThisWeek?.toLocaleString() || 0} unique</span>
            </div>
          </div>

          {/* This Month */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">This Month</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {aggregateStats?.viewsThisMonth?.toLocaleString() || 0}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Users className="h-3 w-3" />
              <span>{aggregateStats?.uniqueThisMonth?.toLocaleString() || 0} unique</span>
            </div>
          </div>

          {/* This Year */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">This Year</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {aggregateStats?.viewsThisYear?.toLocaleString() || 0}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Users className="h-3 w-3" />
              <span>{aggregateStats?.uniqueThisYear?.toLocaleString() || 0} unique</span>
            </div>
          </div>

          {/* Total Views */}
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-lg p-4 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-blue-300 uppercase tracking-wider font-medium">All Time</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {aggregateStats?.totalViews?.toLocaleString() || 0}
            </div>
            <div className="flex items-center gap-1 text-xs text-blue-300/70">
              <span>Total views</span>
            </div>
          </div>

          {/* Total Unique */}
          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-lg p-4 border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-green-400" />
              <span className="text-xs text-green-300 uppercase tracking-wider font-medium">Unique</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {aggregateStats?.uniqueViewers?.toLocaleString() || 0}
            </div>
            <div className="flex items-center gap-1 text-xs text-green-300/70">
              <span>All time visitors</span>
            </div>
          </div>
        </div>

        {/* Last Updated Footer */}
        <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Last synchronized: {format(lastUpdate, 'HH:mm:ss')} ({formatDistanceToNow(lastUpdate, { addSuffix: true })})
          </div>
          <div className="text-xs text-slate-500">
            Auto-refresh interval: <span className="text-green-400 font-medium">5 seconds</span>
          </div>
        </div>
      </div>

      {/* Article Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blogs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Published & drafts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {blogs?.filter(b => b.status === 'published').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Live articles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Views/Article</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {blogs?.length 
                ? Math.round((aggregateStats?.totalViews || 0) / blogs.length).toLocaleString() 
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Average performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top Article Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sortedByViews[0]?.analytics.viewsToday || 0}
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
              {sortedByViews[0]?.title?.slice(0, 30) || 'N/A'}...
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Articles</TabsTrigger>
          <TabsTrigger value="trending">Trending (7 days)</TabsTrigger>
          <TabsTrigger value="lowest">Lowest Performing</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blog Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Views</TableHead>
                    <TableHead className="text-right">Unique</TableHead>
                    <TableHead className="text-right">Today</TableHead>
                    <TableHead className="text-right">Week</TableHead>
                    <TableHead className="text-right">Month</TableHead>
                    <TableHead className="text-right">Year</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedByViews.map((blog) => (
                    <TableRow key={blog.id}>
                      <TableCell className="max-w-[250px]">
                        <span className="font-medium truncate block">{blog.title}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={blog.status === 'published' ? 'default' : 'secondary'}>
                          {blog.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {blog.analytics.totalViews.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {blog.analytics.uniqueViewers.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {blog.analytics.viewsToday.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {blog.analytics.viewsThisWeek.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {blog.analytics.viewsThisMonth.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {blog.analytics.viewsThisYear.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {blog.published_at 
                          ? format(new Date(blog.published_at), 'MMM d, yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBlogId(blog.id)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Most Viewed (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trendingWeek?.map((blog, index) => (
                  <div key={blog.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <span className="text-2xl font-bold text-muted-foreground w-8">
                      #{index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{blog.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Published {blog.published_at 
                          ? format(new Date(blog.published_at), 'MMM d, yyyy')
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{blog.viewCount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">views this week</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBlogId(blog.id)}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(!trendingWeek || trendingWeek.length === 0) && (
                  <p className="text-muted-foreground text-center py-8">
                    No views recorded in the last 7 days
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lowest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Lowest Performing Articles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowest.map((blog) => (
                  <div key={blog.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{blog.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Status: {blog.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-500">
                        {blog.analytics.totalViews.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">total views</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBlogId(blog.id)}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <BlogDetailAnalyticsDialog
        articleId={selectedBlogId}
        onClose={() => setSelectedBlogId(null)}
      />
    </div>
  );
};