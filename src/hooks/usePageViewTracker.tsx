import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Generate or retrieve a persistent session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('page_view_session_id');
  if (!sessionId) {
    sessionId = `pv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('page_view_session_id', sessionId);
  }
  return sessionId;
};

// Detect device type
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

// Categorize referrer
const categorizeReferrer = (referrer: string | null): string => {
  if (!referrer) return 'direct';
  const ref = referrer.toLowerCase();
  if (ref.includes('google.')) return 'google';
  if (ref.includes('bing.')) return 'bing';
  if (ref.includes('facebook.') || ref.includes('fb.') || ref.includes('instagram.') || 
      ref.includes('twitter.') || ref.includes('linkedin.') || ref.includes('tiktok.')) {
    return 'social';
  }
  return 'other';
};

export const usePageViewTracker = () => {
  const location = useLocation();
  const lastTrackedPath = useRef<string>('');

  useEffect(() => {
    const trackPageView = async () => {
      // Don't track the same page twice in a row
      if (lastTrackedPath.current === location.pathname) return;
      lastTrackedPath.current = location.pathname;

      // Don't track admin pages
      if (location.pathname.startsWith('/admin')) return;

      const sessionId = getSessionId();
      const deviceType = getDeviceType();
      const referrer = document.referrer || null;
      const referrerCategory = categorizeReferrer(referrer);

      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();

      try {
        await supabase.from('page_views').insert({
          page_path: location.pathname,
          session_id: sessionId,
          user_id: user?.id || null,
          referrer,
          referrer_category: referrerCategory,
          device_type: deviceType,
          user_agent: navigator.userAgent,
        });
      } catch (error) {
        // Silently fail - don't break the app for analytics
        console.error('Failed to track page view:', error);
      }
    };

    trackPageView();
  }, [location.pathname]);
};

export default usePageViewTracker;