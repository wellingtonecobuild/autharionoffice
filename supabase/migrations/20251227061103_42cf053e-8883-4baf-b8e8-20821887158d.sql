-- Create blog_views table for tracking real article views
CREATE TABLE public.blog_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  device_type TEXT DEFAULT 'desktop',
  referrer TEXT,
  referrer_category TEXT DEFAULT 'direct',
  duration_seconds INTEGER DEFAULT 0,
  is_counted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_blog_views_article_id ON public.blog_views(article_id);
CREATE INDEX idx_blog_views_user_id ON public.blog_views(user_id);
CREATE INDEX idx_blog_views_session_id ON public.blog_views(session_id);
CREATE INDEX idx_blog_views_created_at ON public.blog_views(created_at);
CREATE INDEX idx_blog_views_is_counted ON public.blog_views(is_counted);

-- Enable RLS
ALTER TABLE public.blog_views ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can insert blog views"
ON public.blog_views
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update their own session views"
ON public.blog_views
FOR UPDATE
USING (session_id = session_id);

CREATE POLICY "Admins can view all blog views"
ON public.blog_views
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create blog_analytics_daily for aggregated stats (performance optimization)
CREATE TABLE public.blog_analytics_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  logged_in_views INTEGER DEFAULT 0,
  anonymous_views INTEGER DEFAULT 0,
  desktop_views INTEGER DEFAULT 0,
  mobile_views INTEGER DEFAULT 0,
  tablet_views INTEGER DEFAULT 0,
  google_referrals INTEGER DEFAULT 0,
  social_referrals INTEGER DEFAULT 0,
  direct_referrals INTEGER DEFAULT 0,
  other_referrals INTEGER DEFAULT 0,
  avg_duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(article_id, date)
);

-- Create indexes
CREATE INDEX idx_blog_analytics_daily_article_id ON public.blog_analytics_daily(article_id);
CREATE INDEX idx_blog_analytics_daily_date ON public.blog_analytics_daily(date);

-- Enable RLS
ALTER TABLE public.blog_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Only admins can access analytics
CREATE POLICY "Admins can manage blog analytics"
ON public.blog_analytics_daily
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to aggregate daily analytics
CREATE OR REPLACE FUNCTION public.aggregate_blog_analytics()
RETURNS void AS $$
BEGIN
  INSERT INTO public.blog_analytics_daily (
    article_id,
    date,
    total_views,
    unique_viewers,
    logged_in_views,
    anonymous_views,
    desktop_views,
    mobile_views,
    tablet_views,
    google_referrals,
    social_referrals,
    direct_referrals,
    other_referrals,
    avg_duration_seconds
  )
  SELECT 
    article_id,
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE is_counted = true) as total_views,
    COUNT(DISTINCT session_id) FILTER (WHERE is_counted = true) as unique_viewers,
    COUNT(*) FILTER (WHERE is_counted = true AND user_id IS NOT NULL) as logged_in_views,
    COUNT(*) FILTER (WHERE is_counted = true AND user_id IS NULL) as anonymous_views,
    COUNT(*) FILTER (WHERE is_counted = true AND device_type = 'desktop') as desktop_views,
    COUNT(*) FILTER (WHERE is_counted = true AND device_type = 'mobile') as mobile_views,
    COUNT(*) FILTER (WHERE is_counted = true AND device_type = 'tablet') as tablet_views,
    COUNT(*) FILTER (WHERE is_counted = true AND referrer_category = 'google') as google_referrals,
    COUNT(*) FILTER (WHERE is_counted = true AND referrer_category = 'social') as social_referrals,
    COUNT(*) FILTER (WHERE is_counted = true AND referrer_category = 'direct') as direct_referrals,
    COUNT(*) FILTER (WHERE is_counted = true AND referrer_category = 'other') as other_referrals,
    COALESCE(AVG(duration_seconds) FILTER (WHERE is_counted = true), 0)::INTEGER as avg_duration_seconds
  FROM public.blog_views
  WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
  GROUP BY article_id, DATE(created_at)
  ON CONFLICT (article_id, date) 
  DO UPDATE SET
    total_views = EXCLUDED.total_views,
    unique_viewers = EXCLUDED.unique_viewers,
    logged_in_views = EXCLUDED.logged_in_views,
    anonymous_views = EXCLUDED.anonymous_views,
    desktop_views = EXCLUDED.desktop_views,
    mobile_views = EXCLUDED.mobile_views,
    tablet_views = EXCLUDED.tablet_views,
    google_referrals = EXCLUDED.google_referrals,
    social_referrals = EXCLUDED.social_referrals,
    direct_referrals = EXCLUDED.direct_referrals,
    other_referrals = EXCLUDED.other_referrals,
    avg_duration_seconds = EXCLUDED.avg_duration_seconds,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable realtime for blog_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_views;