import { useEffect, useRef } from "react";
import { useAdsenseSettings } from "@/hooks/useAdsenseSettings";

interface AdSlotProps {
  adSlot?: string;
  adFormat?: "auto" | "rectangle" | "horizontal" | "vertical";
  className?: string;
  style?: React.CSSProperties;
  position?: "after_first_paragraph" | "mid_article" | "end_of_article" | "sidebar";
  articleAdsEnabled?: boolean;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

/**
 * Google AdSense Ad Slot Component
 * 
 * Displays ads only on blog posts and articles based on admin settings.
 * Respects user cookie consent and article-level overrides.
 */
const AdSlot = ({ 
  adSlot = "auto", 
  adFormat = "auto", 
  className = "",
  style,
  position,
  articleAdsEnabled = true,
}: AdSlotProps) => {
  const adRef = useRef<HTMLModElement>(null);
  const isAdLoaded = useRef(false);
  const { settings, loading, shouldShowAds, shouldShowAdAtPosition } = useAdsenseSettings();

  useEffect(() => {
    // Only load ad once and when settings are loaded
    if (isAdLoaded.current || loading) return;
    
    // Check if ads should be shown
    if (!shouldShowAds(articleAdsEnabled)) return;
    
    // Check position-specific settings
    if (position && !shouldShowAdAtPosition(position)) return;
    
    try {
      // Check if adsbygoogle is available
      if (typeof window !== "undefined" && window.adsbygoogle) {
        window.adsbygoogle.push({});
        isAdLoaded.current = true;
      }
    } catch (error) {
      console.error("AdSense error:", error);
    }
  }, [loading, shouldShowAds, shouldShowAdAtPosition, articleAdsEnabled, position]);

  // Check if user has consented to marketing cookies
  const hasMarketingConsent = () => {
    try {
      const preferences = localStorage.getItem("cookie_preferences");
      if (preferences) {
        const parsed = JSON.parse(preferences);
        return parsed.marketing === true;
      }
    } catch {
      return false;
    }
    return false;
  };

  // Don't render during loading
  if (loading) {
    return null;
  }

  // Don't show ads if master switch is off
  if (!settings.adsense_enabled) {
    return null;
  }

  // Don't show ads if no publisher ID is configured
  if (!settings.adsense_publisher_id) {
    return null;
  }

  // Don't show if article-level ads are disabled
  if (!articleAdsEnabled) {
    return null;
  }

  // Check position-specific settings
  if (position && !shouldShowAdAtPosition(position)) {
    return null;
  }

  // Don't show ads if user hasn't consented to marketing cookies
  if (!hasMarketingConsent()) {
    return null;
  }

  return (
    <div className={`ad-container ${className}`} style={style}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", minHeight: "100px", ...style }}
        data-ad-client={settings.adsense_publisher_id}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
      <p className="text-xs text-muted-foreground text-center mt-1">Advertisement</p>
    </div>
  );
};

export default AdSlot;
