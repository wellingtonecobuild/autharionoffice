import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WebsiteAnalytics {
  totalViews: number;
  uniqueVisitors: number;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  viewsThisYear: number;
  uniqueToday: number;
  uniqueThisWeek: number;
  uniqueThisMonth: number;
  uniqueThisYear: number;
  topPages: { path: string; views: number }[];
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  referrerBreakdown: { direct: number; google: number; social: number; bing: number; other: number };
}

interface DailyStats {
  date: string;
  views: number;
  uniqueVisitors: number;
}

export const useWebsiteAnalytics = () => {
  return useQuery({
    queryKey: ['website-analytics'],
    queryFn: async (): Promise<{ analytics: WebsiteAnalytics; dailyStats: DailyStats[] }> => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

      // Get all views
      const { data: allViews, error } = await supabase
        .from('page_views')
        .select('id, page_path, session_id, device_type, referrer_category, created_at');

      if (error) throw error;

      const views = allViews || [];

      // Calculate metrics
      const totalViews = views.length;
      const uniqueVisitors = new Set(views.map(v => v.session_id)).size;

      // Today
      const todayViews = views.filter(v => v.created_at >= todayStart);
      const viewsToday = todayViews.length;
      const uniqueToday = new Set(todayViews.map(v => v.session_id)).size;

      // This week
      const weekViews = views.filter(v => v.created_at >= weekStart);
      const viewsThisWeek = weekViews.length;
      const uniqueThisWeek = new Set(weekViews.map(v => v.session_id)).size;

      // This month
      const monthViews = views.filter(v => v.created_at >= monthStart);
      const viewsThisMonth = monthViews.length;
      const uniqueThisMonth = new Set(monthViews.map(v => v.session_id)).size;

      // This year
      const yearViews = views.filter(v => v.created_at >= yearStart);
      const viewsThisYear = yearViews.length;
      const uniqueThisYear = new Set(yearViews.map(v => v.session_id)).size;

      // Top pages
      const pageCounts: Record<string, number> = {};
      views.forEach(v => {
        pageCounts[v.page_path] = (pageCounts[v.page_path] || 0) + 1;
      });
      const topPages = Object.entries(pageCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([path, viewCount]) => ({ path, views: viewCount }));

      // Device breakdown
      const deviceBreakdown = {
        desktop: views.filter(v => v.device_type === 'desktop').length,
        mobile: views.filter(v => v.device_type === 'mobile').length,
        tablet: views.filter(v => v.device_type === 'tablet').length,
      };

      // Referrer breakdown
      const referrerBreakdown = {
        direct: views.filter(v => v.referrer_category === 'direct').length,
        google: views.filter(v => v.referrer_category === 'google').length,
        social: views.filter(v => v.referrer_category === 'social').length,
        bing: views.filter(v => v.referrer_category === 'bing').length,
        other: views.filter(v => v.referrer_category === 'other').length,
      };

      // Daily stats for last 30 days
      const dailyStats: DailyStats[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayViews = views.filter(v => v.created_at.startsWith(dateStr));
        dailyStats.push({
          date: dateStr,
          views: dayViews.length,
          uniqueVisitors: new Set(dayViews.map(v => v.session_id)).size,
        });
      }

      return {
        analytics: {
          totalViews,
          uniqueVisitors,
          viewsToday,
          viewsThisWeek,
          viewsThisMonth,
          viewsThisYear,
          uniqueToday,
          uniqueThisWeek,
          uniqueThisMonth,
          uniqueThisYear,
          topPages,
          deviceBreakdown,
          referrerBreakdown,
        },
        dailyStats,
      };
    },
    refetchInterval: 5000, // Refresh every 5 seconds for live updates
    staleTime: 2000,
  });
};

export default useWebsiteAnalytics;