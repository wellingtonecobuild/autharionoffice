import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('blog_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('blog_session_id', sessionId);
  }
  return sessionId;
};

// Detect device type
const getDeviceType = (): 'desktop' | 'mobile' | 'tablet' => {
  const ua = navigator.userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

export const useBlogViewTracker = (articleId: string | undefined) => {
  const { user } = useAuth();
  const viewStartTime = useRef<number>(0);
  const hasConfirmed = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const trackView = useCallback(async (action: 'start' | 'confirm' | 'update-duration', duration?: number) => {
    if (!articleId) return;

    try {
      const response = await supabase.functions.invoke('track-blog-view', {
        body: {
          articleId,
          sessionId: getSessionId(),
          userId: user?.id || null,
          deviceType: getDeviceType(),
          referrer: document.referrer || null,
          duration: duration || 0,
          action
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  }, [articleId, user?.id]);

  useEffect(() => {
    if (!articleId) return;

    // Reset for new article
    hasConfirmed.current = false;
    viewStartTime.current = Date.now();

    // Start tracking immediately (non-blocking)
    trackView('start');

    // After 5 seconds, confirm the view as counted
    const confirmTimeout = setTimeout(() => {
      if (!hasConfirmed.current) {
        hasConfirmed.current = true;
        const duration = Math.floor((Date.now() - viewStartTime.current) / 1000);
        trackView('confirm', duration);
      }
    }, 5000);

    // Update duration every 30 seconds for analytics
    intervalRef.current = setInterval(() => {
      if (hasConfirmed.current) {
        const duration = Math.floor((Date.now() - viewStartTime.current) / 1000);
        trackView('update-duration', duration);
      }
    }, 30000);

    // Cleanup
    return () => {
      clearTimeout(confirmTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Final duration update on unmount
      if (hasConfirmed.current) {
        const duration = Math.floor((Date.now() - viewStartTime.current) / 1000);
        trackView('update-duration', duration);
      }
    };
  }, [articleId, trackView]);

  return { trackView };
};