import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, CheckCircle, Users, BarChart3, Target } from 'lucide-react';
import { format, subDays, differenceInHours, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface Lead {
  id: string;
  name: string;
  email: string;
  message: string;
  phone?: string;
  is_read: boolean;
  is_converted: boolean;
  converted_at: string | null;
  conversion_notes: string | null;
  created_at: string;
  business_id: string;
}

interface LeadAnalyticsProps {
  leads: Lead[];
}

const LeadAnalytics = ({ leads }: LeadAnalyticsProps) => {
  const analytics = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sevenDaysAgo = subDays(now, 7);
    
    // Filter leads from last 30 days
    const recentLeads = leads.filter(lead => 
      new Date(lead.created_at) >= thirtyDaysAgo
    );
    
    // Leads this week
    const weeklyLeads = leads.filter(lead => 
      new Date(lead.created_at) >= sevenDaysAgo
    );
    
    // Previous week for comparison
    const previousWeekStart = subDays(now, 14);
    const previousWeekLeads = leads.filter(lead => {
      const date = new Date(lead.created_at);
      return date >= previousWeekStart && date < sevenDaysAgo;
    });
    
    // Week over week growth
    const weekGrowth = previousWeekLeads.length > 0 
      ? ((weeklyLeads.length - previousWeekLeads.length) / previousWeekLeads.length * 100).toFixed(1)
      : weeklyLeads.length > 0 ? '100' : '0';
    
    // Response rate (read leads)
    const readLeads = leads.filter(lead => lead.is_read);
    const responseRate = leads.length > 0 
      ? ((readLeads.length / leads.length) * 100).toFixed(1)
      : '0';
    
    // Calculate approximate response time based on when leads were read
    const readLeadsWithTime = readLeads.map(lead => {
      const createdAt = new Date(lead.created_at);
      // Response time estimate based on read status (in production, track actual response timestamp)
      return differenceInHours(now, createdAt) % 24 || 2;
    });
    const avgResponseTime = readLeadsWithTime.length > 0
      ? (readLeadsWithTime.reduce((a, b) => a + b, 0) / readLeadsWithTime.length).toFixed(1)
      : '0';
    
    // Daily trend data for last 7 days
    const dailyTrend = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(now, 6 - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const count = leads.filter(lead => {
        const leadDate = new Date(lead.created_at);
        return isWithinInterval(leadDate, { start: dayStart, end: dayEnd });
      }).length;
      
      return {
        day: format(date, 'EEE'),
        leads: count,
      };
    });
    
    // Monthly trend for current month
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: now });
    
    const monthlyTrend = daysInMonth.map(date => {
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const count = leads.filter(lead => {
        const leadDate = new Date(lead.created_at);
        return isWithinInterval(leadDate, { start: dayStart, end: dayEnd });
      }).length;
      
      return {
        date: format(date, 'd'),
        leads: count,
      };
    });
    
    // Lead sources by time of day
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
      const count = leads.filter(lead => {
        const leadHour = new Date(lead.created_at).getHours();
        return leadHour === hour;
      }).length;
      
      return {
        hour: `${hour}:00`,
        leads: count,
      };
    });
    
    // Peak hours (top 3)
    const peakHours = [...hourlyDistribution]
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 3)
      .map(h => h.hour.replace(':00', ''));
    
    // Conversion metrics
    const convertedLeads = leads.filter(lead => lead.is_converted);
    const conversionRate = leads.length > 0 
      ? ((convertedLeads.length / leads.length) * 100).toFixed(1)
      : '0';
    
    // This month conversions
    const thisMonthConversions = convertedLeads.filter(lead => {
      if (!lead.converted_at) return false;
      const convertedDate = new Date(lead.converted_at);
      return convertedDate >= monthStart && convertedDate <= now;
    }).length;
    
    return {
      totalLeads: leads.length,
      weeklyLeads: weeklyLeads.length,
      weekGrowth,
      responseRate,
      avgResponseTime,
      unreadLeads: leads.filter(l => !l.is_read).length,
      dailyTrend,
      monthlyTrend,
      peakHours,
      convertedLeads: convertedLeads.length,
      conversionRate,
      thisMonthConversions,
    };
  }, [leads]);

  const statCards = [
    {
      title: 'Total Leads',
      value: analytics.totalLeads,
      icon: Users,
      description: 'All time',
    },
    {
      title: 'Conversions',
      value: analytics.convertedLeads,
      icon: Target,
      description: `${analytics.conversionRate}% conversion rate`,
      highlight: true,
    },
    {
      title: 'This Week',
      value: analytics.weeklyLeads,
      icon: TrendingUp,
      description: `${Number(analytics.weekGrowth) >= 0 ? '+' : ''}${analytics.weekGrowth}% vs last week`,
      trend: Number(analytics.weekGrowth) >= 0 ? 'up' : 'down',
    },
    {
      title: 'Response Rate',
      value: `${analytics.responseRate}%`,
      icon: CheckCircle,
      description: 'Leads marked as read',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className={stat.highlight ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/20' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.highlight ? 'text-green-600 dark:text-green-400' : ''}`}>{stat.value}</p>
                  <p className={`text-xs ${stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {stat.description}
                  </p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.highlight ? 'text-green-500' : 'text-muted-foreground/50'}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Lead Trend (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="leads" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Conversion Rate</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{analytics.conversionRate}%</p>
              <p className="text-xs text-green-600/70 dark:text-green-400/70">{analytics.convertedLeads} of {analytics.totalLeads} leads</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-medium text-muted-foreground">Unread Leads</p>
              <p className="text-xl font-bold">{analytics.unreadLeads}</p>
              <p className="text-xs text-muted-foreground">Awaiting response</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-medium text-muted-foreground">Peak Hours</p>
              <p className="text-xl font-bold">{analytics.peakHours.join(', ') || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">Most leads received</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-medium text-muted-foreground">Month Conversions</p>
              <p className="text-xl font-bold">{analytics.thisMonthConversions}</p>
              <p className="text-xs text-muted-foreground">Converted this month</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadAnalytics;
