// Analytics utility for tracking conversion events
// Google Analytics / Search Console integration

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

// Initialize Google Analytics (call this in main.tsx or App.tsx)
export const initGA = (measurementId: string) => {
  if (typeof window === 'undefined') return;
  
  // Add gtag script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.async = true;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer?.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId);
};

// Track page views
export const trackPageView = (url: string) => {
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: url,
    });
  }
};

// CONVERSION EVENTS - These are tracked for business proof

export const trackContactBusiness = (businessId: string, businessName: string, category: string) => {
  if (window.gtag) {
    window.gtag('event', 'contact_business', {
      event_category: 'Lead Generation',
      event_label: businessName,
      business_id: businessId,
      business_category: category,
    });
  }
  console.log('[Analytics] Contact Business:', { businessId, businessName, category });
};

export const trackListBusinessStart = () => {
  if (window.gtag) {
    window.gtag('event', 'list_business_start', {
      event_category: 'Business Acquisition',
      event_label: 'Started listing form',
    });
  }
  console.log('[Analytics] List Business Started');
};

export const trackListBusinessComplete = (businessId: string, category: string) => {
  if (window.gtag) {
    window.gtag('event', 'list_business_complete', {
      event_category: 'Business Acquisition',
      event_label: 'Completed listing submission',
      business_id: businessId,
      business_category: category,
    });
  }
  console.log('[Analytics] List Business Completed:', { businessId, category });
};

export const trackUpgradeClick = (plan: string) => {
  if (window.gtag) {
    window.gtag('event', 'upgrade_click', {
      event_category: 'Subscription',
      event_label: plan,
    });
  }
  console.log('[Analytics] Upgrade Click:', plan);
};

export const trackSignup = () => {
  if (window.gtag) {
    window.gtag('event', 'sign_up', {
      event_category: 'User Acquisition',
    });
  }
  console.log('[Analytics] User Signup');
};

export const trackSearch = (query: string, category?: string) => {
  if (window.gtag) {
    window.gtag('event', 'search', {
      search_term: query,
      search_category: category,
    });
  }
};
