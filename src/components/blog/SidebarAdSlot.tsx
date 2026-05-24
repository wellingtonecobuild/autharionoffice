import { useAdsenseSettings } from "@/hooks/useAdsenseSettings";
import { Megaphone } from "lucide-react";

interface SidebarAdSlotProps {
  articleAdsEnabled?: boolean;
}

/**
 * Sticky sidebar ad for desktop blog posts.
 * Only renders when sidebar ads are enabled in admin settings.
 */
const SidebarAdSlot = ({ articleAdsEnabled = true }: SidebarAdSlotProps) => {
  const { settings, loading, shouldShowAds, shouldShowAdAtPosition } = useAdsenseSettings();

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
  if (loading) return null;

  // Check all conditions
  if (!shouldShowAds(articleAdsEnabled)) return null;
  if (!shouldShowAdAtPosition('sidebar')) return null;

  // Don't show ads if user hasn't consented to marketing cookies
  if (!hasMarketingConsent()) {
    return null;
  }

  return (
    <aside className="hidden lg:block w-[300px] flex-shrink-0">
      <div className="sticky top-24 space-y-4">
        {/* Primary sidebar ad */}
        <div className="ad-container">
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "300px", minHeight: "250px" }}
            data-ad-client={settings.adsense_publisher_id}
            data-ad-slot="sidebar-1"
            data-ad-format="rectangle"
          />
          <p className="text-xs text-muted-foreground text-center mt-1">Advertisement</p>
        </div>
        
        {/* Secondary sidebar ad (optional, for longer content) */}
        <div className="ad-container mt-6">
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "300px", minHeight: "250px" }}
            data-ad-client={settings.adsense_publisher_id}
            data-ad-slot="sidebar-2"
            data-ad-format="rectangle"
          />
          <p className="text-xs text-muted-foreground text-center mt-1">Advertisement</p>
        </div>
      </div>
    </aside>
  );
};

export default SidebarAdSlot;
