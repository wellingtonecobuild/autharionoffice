import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BlogAnalytics {
  totalViews: number;
  uniqueViewers: number;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  viewsThisYear: number;
  uniqueToday: number;
  uniqueThisWeek: number;
  uniqueThisMonth: number;
  uniqueThisYear: number;
  loggedInViews: number;
  anonymousViews: number;
  desktopViews: number;
  mobileViews: number;
  tabletViews: number;
  googleReferrals: number;
  socialReferrals: number;
  directReferrals: number;
  otherReferrals: number;
  avgDuration: number;
}

// Aggregated stats for entire blog section
export interface BlogAggregateStats {
  totalViews: number;
  uniqueViewers: number;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  viewsThisYear: number;
  uniqueToday: number;
  uniqueThisWeek: number;
  uniqueThisMonth: number;
  uniqueThisYear: number;
}

interface BlogWithAnalytics {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string;
  views: number;
  analytics: BlogAnalytics;
}

interface ViewerInfo {
  id: string;
  user_id: string | null;
  session_id: string;
  device_type: string;
  referrer_category: string;
  duration_seconds: number;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

// Get analytics for all blogs (admin dashboard)
export const useBlogAnalyticsList = () => {
  return useQuery({
    queryKey: ['blog-analytics-list'],
    queryFn: async () => {
      // Get all articles
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('id, title, slug, status, published_at, created_at, views')
        .order('created_at', { ascending: false });

      if (articlesError) throw articlesError;

      // Get view counts for each article
      const analyticsPromises = articles.map(async (article) => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

        // Total views
        const { count: totalViews } = await supabase
          .from('blog_views')
          .select('*', { count: 'exact', head: true })
          .eq('article_id', article.id)
          .eq('is_counted', true);

        // Unique viewers
        const { data: uniqueData } = await supabase
          .from('blog_views')
          .select('session_id')
          .eq('article_id', article.id)
          .eq('is_counted', true);
        
        const uniqueViewers = new Set(uniqueData?.map(v => v.session_id)).size;

        // Views today
        const { count: viewsToday } = await supabase
          .from('blog_views')
          .select('*', { count: 'exact', head: true })
          .eq('article_id', article.id)
          .eq('is_counted', true)
          .gte('created_at', todayStart);

        // Views this week
        const { count: viewsThisWeek } = await supabase
          .from('blog_views')
          .select('*', { count: 'exact', head: true })
          .eq('article_id', article.id)
          .eq('is_counted', true)
          .gte('created_at', weekStart);

        // Views this month
        const { count: viewsThisMonth } = await supabase
          .from('blog_views')
          .select('*', { count: 'exact', head: true })
          .eq('article_id', article.id)
          .eq('is_counted', true)
          .gte('created_at', monthStart);

        // Views this year
        const { count: viewsThisYear } = await supabase
          .from('blog_views')
          .select('*', { count: 'exact', head: true })
          .eq('article_id', article.id)
          .eq('is_counted', true)
          .gte('created_at', yearStart);

        return {
          ...article,
          analytics: {
            totalViews: totalViews || 0,
            uniqueViewers,
            viewsToday: viewsToday || 0,
            viewsThisWeek: viewsThisWeek || 0,
            viewsThisMonth: viewsThisMonth || 0,
            viewsThisYear: viewsThisYear || 0,
            uniqueToday: 0,
            uniqueThisWeek: 0,
            uniqueThisMonth: 0,
            uniqueThisYear: 0,
            loggedInViews: 0,
            anonymousViews: 0,
            desktopViews: 0,
            mobileViews: 0,
            tabletViews: 0,
            googleReferrals: 0,
            socialReferrals: 0,
            directReferrals: 0,
            otherReferrals: 0,
            avgDuration: 0
          }
        } as BlogWithAnalytics;
      });

      return Promise.all(analyticsPromises);
    },
    refetchInterval: 5000, // Refresh every 5 seconds for live admin dashboard
  });
};

// Get detailed analytics for a single blog
export const useBlogDetailAnalytics = (articleId: string | undefined) => {
  return useQuery({
    queryKey: ['blog-detail-analytics', articleId],
    queryFn: async () => {
      if (!articleId) return null;

      // Get all views for this article
      const { data: views, error } = await supabase
        .from('blog_views')
        .select('*')
        .eq('article_id', articleId)
        .eq('is_counted', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      const viewsFilteredToday = views?.filter(v => new Date(v.created_at) >= todayStart) || [];
      const viewsFilteredWeek = views?.filter(v => new Date(v.created_at) >= weekStart) || [];
      const viewsFilteredMonth = views?.filter(v => new Date(v.created_at) >= monthStart) || [];
      const viewsFilteredYear = views?.filter(v => new Date(v.created_at) >= yearStart) || [];

      // Calculate analytics
      const analytics: BlogAnalytics = {
        totalViews: views?.length || 0,
        uniqueViewers: new Set(views?.map(v => v.session_id)).size,
        viewsToday: viewsFilteredToday.length,
        viewsThisWeek: viewsFilteredWeek.length,
        viewsThisMonth: viewsFilteredMonth.length,
        viewsThisYear: viewsFilteredYear.length,
        uniqueToday: new Set(viewsFilteredToday.map(v => v.session_id)).size,
        uniqueThisWeek: new Set(viewsFilteredWeek.map(v => v.session_id)).size,
        uniqueThisMonth: new Set(viewsFilteredMonth.map(v => v.session_id)).size,
        uniqueThisYear: new Set(viewsFilteredYear.map(v => v.session_id)).size,
        loggedInViews: views?.filter(v => v.user_id).length || 0,
        anonymousViews: views?.filter(v => !v.user_id).length || 0,
        desktopViews: views?.filter(v => v.device_type === 'desktop').length || 0,
        mobileViews: views?.filter(v => v.device_type === 'mobile').length || 0,
        tabletViews: views?.filter(v => v.device_type === 'tablet').length || 0,
        googleReferrals: views?.filter(v => v.referrer_category === 'google').length || 0,
        socialReferrals: views?.filter(v => v.referrer_category === 'social').length || 0,
        directReferrals: views?.filter(v => v.referrer_category === 'direct').length || 0,
        otherReferrals: views?.filter(v => v.referrer_category === 'other').length || 0,
        avgDuration: views?.length 
          ? Math.round(views.reduce((sum, v) => sum + (v.duration_seconds || 0), 0) / views.length)
          : 0
      };

      // Daily breakdown for chart (last 30 days)
      const dailyStats: { date: string; views: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayViews = views?.filter(v => v.created_at.startsWith(dateStr)).length || 0;
        dailyStats.push({ date: dateStr, views: dayViews });
      }

      return { analytics, dailyStats, views };
    },
    enabled: !!articleId,
    refetchInterval: 30000,
  });
};

// Get viewers for a blog (admin only)
export const useBlogViewers = (articleId: string | undefined) => {
  return useQuery({
    queryKey: ['blog-viewers', articleId],
    queryFn: async () => {
      if (!articleId) return [];

      const { data: views, error } = await supabase
        .from('blog_views')
        .select('id, user_id, session_id, device_type, referrer_category, duration_seconds, created_at')
        .eq('article_id', articleId)
        .eq('is_counted', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get user info for logged-in viewers
      const userIds = views?.filter(v => v.user_id).map(v => v.user_id) || [];
      
      let userProfiles: Record<string, { email: string; full_name: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        
        profiles?.forEach(p => {
          userProfiles[p.id] = { email: p.email || '', full_name: p.full_name || '' };
        });
      }

      return views?.map(v => ({
        ...v,
        user_email: v.user_id ? userProfiles[v.user_id]?.email : null,
        user_name: v.user_id ? userProfiles[v.user_id]?.full_name : null
      })) as ViewerInfo[];
    },
    enabled: !!articleId,
  });
};

// Get trending/most viewed blogs
export const useTrendingBlogs = (period: 'today' | 'week' | 'month' | 'all' = 'week') => {
  return useQuery({
    queryKey: ['trending-blogs', period],
    queryFn: async () => {
      const now = new Date();
      let startDate: string;
      
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        default:
          startDate = '2020-01-01T00:00:00.000Z';
      }

      // Get view counts grouped by article
      const { data: views, error } = await supabase
        .from('blog_views')
        .select('article_id')
        .eq('is_counted', true)
        .gte('created_at', startDate);

      if (error) throw error;

      // Count views per article
      const viewCounts: Record<string, number> = {};
      views?.forEach(v => {
        viewCounts[v.article_id] = (viewCounts[v.article_id] || 0) + 1;
      });

      // Get article details
      const articleIds = Object.keys(viewCounts);
      if (articleIds.length === 0) return [];

      const { data: articles } = await supabase
        .from('articles')
        .select('id, title, slug, featured_image, published_at')
        .in('id', articleIds)
        .eq('status', 'published');

      // Combine and sort
      const result = articles?.map(article => ({
        ...article,
        viewCount: viewCounts[article.id] || 0
      })).sort((a, b) => b.viewCount - a.viewCount).slice(0, 10);

      return result || [];
    },
    refetchInterval: 60000,
  });
};

// Get aggregate blog stats (all blogs combined) with 5-second refresh
export const useBlogAggregateStats = () => {
  return useQuery({
    queryKey: ['blog-aggregate-stats'],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

      // Get all blog views
      const { data: allViews, error } = await supabase
        .from('blog_views')
        .select('session_id, created_at')
        .eq('is_counted', true);

      if (error) throw error;

      const views = allViews || [];
      
      // Filter by time periods
      const viewsToday = views.filter(v => v.created_at >= todayStart);
      const viewsThisWeek = views.filter(v => v.created_at >= weekStart);
      const viewsThisMonth = views.filter(v => v.created_at >= monthStart);
      const viewsThisYear = views.filter(v => v.created_at >= yearStart);

      return {
        totalViews: views.length,
        uniqueViewers: new Set(views.map(v => v.session_id)).size,
        viewsToday: viewsToday.length,
        viewsThisWeek: viewsThisWeek.length,
        viewsThisMonth: viewsThisMonth.length,
        viewsThisYear: viewsThisYear.length,
        uniqueToday: new Set(viewsToday.map(v => v.session_id)).size,
        uniqueThisWeek: new Set(viewsThisWeek.map(v => v.session_id)).size,
        uniqueThisMonth: new Set(viewsThisMonth.map(v => v.session_id)).size,
        uniqueThisYear: new Set(viewsThisYear.map(v => v.session_id)).size,
      } as BlogAggregateStats;
    },
    refetchInterval: 5000, // Refresh every 5 seconds for live dashboard
  });
};