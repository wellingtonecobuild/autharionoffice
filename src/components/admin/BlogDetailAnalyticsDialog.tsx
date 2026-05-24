import { useBlogDetailAnalytics, useBlogViewers } from '@/hooks/useBlogAnalytics';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Eye, Users, Clock, Monitor, Smartphone, Tablet, Globe, Share2, Link, HelpCircle, User } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface BlogDetailAnalyticsDialogProps {
  articleId: string | null;
  onClose: () => void;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const BlogDetailAnalyticsDialog = ({ articleId, onClose }: BlogDetailAnalyticsDialogProps) => {
  const { data, isLoading } = useBlogDetailAnalytics(articleId || undefined);
  const { data: viewers } = useBlogViewers(articleId || undefined);
  
  // Get article info
  const { data: article } = useQuery({
    queryKey: ['article-info', articleId],
    queryFn: async () => {
      if (!articleId) return null;
      const { data } = await supabase
        .from('articles')
        .select('title, slug, status, published_at')
        .eq('id', articleId)
        .single();
      return data;
    },
    enabled: !!articleId
  });

  if (!articleId) return null;

  const analytics = data?.analytics;
  const dailyStats = data?.dailyStats || [];

  const deviceData = analytics ? [
    { name: 'Desktop', value: analytics.desktopViews, icon: Monitor },
    { name: 'Mobile', value: analytics.mobileViews, icon: Smartphone },
    { name: 'Tablet', value: analytics.tabletViews, icon: Tablet },
  ] : [];

  const referrerData = analytics ? [
    { name: 'Google', value: analytics.googleReferrals },
    { name: 'Social', value: analytics.socialReferrals },
    { name: 'Direct', value: analytics.directReferrals },
    { name: 'Other', value: analytics.otherReferrals },
  ] : [];

  const userTypeData = analytics ? [
    { name: 'Logged In', value: analytics.loggedInViews },
    { name: 'Anonymous', value: analytics.anonymousViews },
  ] : [];

  return (
    <Dialog open={!!articleId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Blog Analytics
          </DialogTitle>
          {article && (
            <p className="text-sm text-muted-foreground truncate">{article.title}</p>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
              <TabsTrigger value="viewers">Viewers</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Summary Cards */}
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Total Views
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.totalViews.toLocaleString() || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Unique Viewers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.uniqueViewers.toLocaleString() || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Avg. Duration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics?.avgDuration ? `${Math.floor(analytics.avgDuration / 60)}m ${analytics.avgDuration % 60}s` : '0s'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.viewsToday.toLocaleString() || 0}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Daily Views Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Views Over Time (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{ views: { label: 'Views', color: 'hsl(var(--primary))' } }} className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyStats}>
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => format(new Date(value), 'MMM d')}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="views" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Device Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {deviceData.map((device) => (
                      <div key={device.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <device.icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{device.name}</p>
                          <p className="text-xl font-bold">{device.value.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="traffic" className="space-y-4">
              {/* Traffic Sources */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Traffic Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={{}} className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={referrerData} layout="vertical">
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={60} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>User Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={{}} className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={userTypeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {userTypeData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Source Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-500" />
                        <span>Google Search</span>
                      </div>
                      <span className="font-bold">{analytics?.googleReferrals.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Share2 className="h-4 w-4 text-pink-500" />
                        <span>Social Media</span>
                      </div>
                      <span className="font-bold">{analytics?.socialReferrals.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Link className="h-4 w-4 text-green-500" />
                        <span>Direct</span>
                      </div>
                      <span className="font-bold">{analytics?.directReferrals.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-gray-500" />
                        <span>Other</span>
                      </div>
                      <span className="font-bold">{analytics?.otherReferrals.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="viewers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Recent Viewers (Last 100)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewers?.map((viewer) => (
                        <TableRow key={viewer.id}>
                          <TableCell>
                            {viewer.user_id ? (
                              <div>
                                <p className="font-medium">{viewer.user_name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{viewer.user_email}</p>
                              </div>
                            ) : (
                              <Badge variant="secondary">Anonymous</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {viewer.device_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {viewer.referrer_category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {viewer.duration_seconds > 60 
                              ? `${Math.floor(viewer.duration_seconds / 60)}m ${viewer.duration_seconds % 60}s`
                              : `${viewer.duration_seconds}s`
                            }
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDistanceToNow(new Date(viewer.created_at), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!viewers || viewers.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No viewers recorded yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};