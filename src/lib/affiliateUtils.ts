/**
 * Affiliate Link Utilities
 * 
 * These utilities help manage affiliate links with proper tracking and SEO attributes.
 */

// Known affiliate domains - add your affiliate program domains here
const AFFILIATE_DOMAINS = [
  "amazon.com",
  "amzn.to",
  "shareasale.com",
  "awin1.com",
  "linksynergy.com",
  "cj.com", 
  "rakutenadvertising.com",
  "partnerize.com",
  "impact.com",
  "refersion.com",
  "pepperjam.com",
  "tradedoubler.com",
  "webgains.com",
  // Add NZ-specific affiliate networks
  "affiliates.nz",
  "commission.co.nz",
];

// Sponsored content indicators
const SPONSORED_INDICATORS = [
  "ref=",
  "affiliate=",
  "partner=",
  "aff=",
  "tag=",
  "aid=",
  "utm_source=affiliate",
  "utm_medium=affiliate",
];

/**
 * Checks if a URL is an affiliate link
 */
export const isAffiliateLink = (url: string): boolean => {
  if (!url) return false;
  
  const lowerUrl = url.toLowerCase();
  
  // Check if domain is a known affiliate network
  const isAffiliateDomain = AFFILIATE_DOMAINS.some(domain => 
    lowerUrl.includes(domain)
  );
  
  // Check for affiliate tracking parameters
  const hasAffiliateParams = SPONSORED_INDICATORS.some(param => 
    lowerUrl.includes(param)
  );
  
  return isAffiliateDomain || hasAffiliateParams;
};

/**
 * Checks if a URL is a sponsored link (marked with #sponsored or similar)
 */
export const isSponsoredLink = (url: string): boolean => {
  if (!url) return false;
  return url.includes("#sponsored") || url.includes("?sponsored=true");
};

/**
 * Gets the appropriate rel attribute for external links
 * Following Google's guidelines for affiliate and sponsored content
 */
export const getLinkRelAttribute = (url: string): string => {
  const baseRel = "noopener noreferrer";
  
  if (isAffiliateLink(url)) {
    // Use rel="sponsored nofollow" for affiliate links
    return `${baseRel} sponsored nofollow`;
  }
  
  if (isSponsoredLink(url)) {
    // Use rel="sponsored" for sponsored content
    return `${baseRel} sponsored`;
  }
  
  // Regular external links
  return baseRel;
};

/**
 * Track affiliate link clicks for analytics
 */
export const trackAffiliateLinkClick = (url: string, context?: string) => {
  // Check if analytics cookies are consented
  try {
    const preferences = localStorage.getItem("cookie_preferences");
    if (preferences) {
      const parsed = JSON.parse(preferences);
      if (!parsed.analytics) return;
    } else {
      return;
    }
  } catch {
    return;
  }

  // Track the click event
  console.log("Affiliate link clicked:", { url, context, timestamp: new Date().toISOString() });
  
  // If Google Analytics is available, track as event
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "affiliate_click", {
      event_category: "affiliate",
      event_label: url,
      affiliate_context: context,
    });
  }
  
  // You can also send to your own analytics endpoint here
  // fetch('/api/analytics/affiliate-click', { method: 'POST', body: JSON.stringify({ url, context }) });
};

/**
 * Parse content and extract affiliate links for disclosure
 */
export const extractAffiliateLinks = (content: string): string[] => {
  const urlRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const affiliateUrls: string[] = [];
  let match;
  
  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[2];
    if (isAffiliateLink(url)) {
      affiliateUrls.push(url);
    }
  }
  
  return affiliateUrls;
};

/**
 * Check if content contains affiliate links (for disclosure purposes)
 */
export const contentHasAffiliateLinks = (content: string): boolean => {
  return extractAffiliateLinks(content).length > 0;
};
