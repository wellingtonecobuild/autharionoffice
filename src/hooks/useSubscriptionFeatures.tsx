import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized subscription features from database
 * All feature/visibility/permission decisions read from this hook
 * Changes in subscription_plans table automatically apply to ALL listings
 */

export interface FeatureToggles {
  // Contact visibility
  show_phone: boolean;
  show_email: boolean;
  show_website: boolean;
  show_reviews: boolean;
  show_verified_badge: boolean;
  
  // Job postings (-1 = unlimited)
  job_postings: number;
  
  // Visibility & placement
  priority_placement: boolean;
  spotlight_jobs: boolean;
  featured_badge: boolean;
  top_tier_placement: boolean;
  
  // Analytics & support
  analytics: boolean;
  priority_support: boolean;
}

export interface PlanData {
  id: string;
  plan_key: string;
  name: string;
  price_monthly: number;
  feature_toggles: FeatureToggles;
  features: Array<{ text: string; included: boolean }>;
  visibility_rules: Record<string, any>;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  is_popular: boolean;
  cta_text: string;
  description: string | null;
}

// Default feature toggles (used as fallback when database is unavailable)
const DEFAULT_FEATURE_TOGGLES: Record<string, FeatureToggles> = {
  free: {
    show_phone: false,
    show_email: false,
    show_website: false,
    show_reviews: false,
    show_verified_badge: false,
    job_postings: 0,
    priority_placement: false,
    spotlight_jobs: false,
    featured_badge: false,
    top_tier_placement: false,
    analytics: false,
    priority_support: false,
  },
  premium: {
    show_phone: true,
    show_email: true,
    show_website: true,
    show_reviews: true,
    show_verified_badge: true,
    job_postings: 2,
    priority_placement: true,
    spotlight_jobs: false,
    featured_badge: false,
    top_tier_placement: false,
    analytics: false,
    priority_support: false,
  },
  elite: {
    show_phone: true,
    show_email: true,
    show_website: true,
    show_reviews: true,
    show_verified_badge: true,
    job_postings: -1, // Unlimited
    priority_placement: true,
    spotlight_jobs: true,
    featured_badge: true,
    top_tier_placement: true,
    analytics: true,
    priority_support: true,
  },
};

// Parse feature toggles from database JSON
function parseFeatureToggles(dbToggles: Record<string, any> | null, planKey: string): FeatureToggles {
  const defaults = DEFAULT_FEATURE_TOGGLES[planKey] || DEFAULT_FEATURE_TOGGLES.free;
  
  if (!dbToggles) return defaults;
  
  return {
    show_phone: dbToggles.show_phone ?? defaults.show_phone,
    show_email: dbToggles.show_email ?? defaults.show_email,
    show_website: dbToggles.show_website ?? defaults.show_website,
    show_reviews: dbToggles.show_reviews ?? defaults.show_reviews,
    show_verified_badge: dbToggles.show_verified_badge ?? defaults.show_verified_badge,
    job_postings: dbToggles.job_postings ?? defaults.job_postings,
    priority_placement: dbToggles.priority_placement ?? defaults.priority_placement,
    spotlight_jobs: dbToggles.spotlight_jobs ?? defaults.spotlight_jobs,
    featured_badge: dbToggles.featured_badge ?? defaults.featured_badge,
    top_tier_placement: dbToggles.top_tier_placement ?? defaults.top_tier_placement,
    analytics: dbToggles.analytics ?? defaults.analytics,
    priority_support: dbToggles.priority_support ?? defaults.priority_support,
  };
}

/**
 * Hook to fetch all subscription plans with their features from database
 * This is the SINGLE SOURCE OF TRUTH for all plan features
 */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async (): Promise<Record<string, PlanData>> => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      if (!data || data.length === 0) {
        // Return defaults if no data
        return {
          free: createDefaultPlan("free", "Free", 0),
          premium: createDefaultPlan("premium", "Premium", 149),
          elite: createDefaultPlan("elite", "Elite", 349),
        };
      }

      const plans: Record<string, PlanData> = {};
      for (const row of data) {
        plans[row.plan_key] = {
          id: row.id,
          plan_key: row.plan_key,
          name: row.name,
          price_monthly: row.price_monthly,
          feature_toggles: parseFeatureToggles(row.feature_toggles as Record<string, any>, row.plan_key),
          features: (row.features as Array<{ text: string; included: boolean }>) || [],
          visibility_rules: (row.visibility_rules as Record<string, any>) || {},
          stripe_price_id: row.stripe_price_id,
          stripe_product_id: row.stripe_product_id,
          is_popular: row.is_popular,
          cta_text: row.cta_text,
          description: row.description,
        };
      }

      return plans;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10,
  });
}

/**
 * Get features for a specific plan
 * Returns immediately with cached/default data
 */
export function useGetPlanFeatures(planKey: string) {
  const { data: plans, isLoading } = useSubscriptionPlans();
  
  const features = plans?.[planKey]?.feature_toggles || 
    DEFAULT_FEATURE_TOGGLES[planKey] || 
    DEFAULT_FEATURE_TOGGLES.free;
  
  return {
    features,
    isLoading,
    plan: plans?.[planKey],
  };
}

/**
 * Check if a specific feature is enabled for a plan
 */
export function usePlanFeature(planKey: string, feature: keyof FeatureToggles) {
  const { features, isLoading } = useGetPlanFeatures(planKey);
  return {
    enabled: features[feature],
    isLoading,
  };
}

/**
 * Get job posting limit for a plan
 * Returns -1 for unlimited, 0 for none, or specific limit
 */
export function useJobLimit(planKey: string) {
  const { features, isLoading } = useGetPlanFeatures(planKey);
  return {
    limit: features.job_postings,
    canPost: features.job_postings !== 0,
    isUnlimited: features.job_postings === -1,
    isLoading,
  };
}

// Helper to create default plan data
function createDefaultPlan(key: string, name: string, price: number): PlanData {
  return {
    id: key,
    plan_key: key,
    name,
    price_monthly: price,
    feature_toggles: DEFAULT_FEATURE_TOGGLES[key] || DEFAULT_FEATURE_TOGGLES.free,
    features: [],
    visibility_rules: {},
    stripe_price_id: null,
    stripe_product_id: null,
    is_popular: key === "premium",
    cta_text: key === "free" ? "Apply Now" : "Apply Now",
    description: null,
  };
}

/**
 * Utility functions that work synchronously with cached data
 * These are used when you need immediate answers without React hooks
 */

// Global cache for synchronous access
let cachedPlans: Record<string, PlanData> | null = null;

// Initialize cache (call this early in app lifecycle)
export async function initSubscriptionCache() {
  try {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("sort_order");

    if (error) throw error;
    
    cachedPlans = {};
    for (const row of data || []) {
      cachedPlans[row.plan_key] = {
        id: row.id,
        plan_key: row.plan_key,
        name: row.name,
        price_monthly: row.price_monthly,
        feature_toggles: parseFeatureToggles(row.feature_toggles as Record<string, any>, row.plan_key),
        features: (row.features as Array<{ text: string; included: boolean }>) || [],
        visibility_rules: (row.visibility_rules as Record<string, any>) || {},
        stripe_price_id: row.stripe_price_id,
        stripe_product_id: row.stripe_product_id,
        is_popular: row.is_popular,
        cta_text: row.cta_text,
        description: row.description,
      };
    }
  } catch (err) {
    console.error("Failed to initialize subscription cache:", err);
    cachedPlans = null;
  }
}

// Get plan features synchronously (uses cache or defaults)
export function getPlanFeaturesSync(planKey: string): FeatureToggles {
  if (cachedPlans?.[planKey]) {
    return cachedPlans[planKey].feature_toggles;
  }
  return DEFAULT_FEATURE_TOGGLES[planKey] || DEFAULT_FEATURE_TOGGLES.free;
}

// Check if feature is enabled synchronously
export function hasFeatureSync(planKey: string, feature: keyof FeatureToggles): boolean {
  const features = getPlanFeaturesSync(planKey);
  const value = features[feature];
  // For job_postings, non-zero means enabled
  if (feature === "job_postings") {
    return value !== 0;
  }
  return Boolean(value);
}

// Get job limit synchronously
export function getJobLimitSync(planKey: string): number {
  const features = getPlanFeaturesSync(planKey);
  return features.job_postings;
}

// Check if user can post jobs synchronously
export function canPostJobsSync(planKey: string): boolean {
  const limit = getJobLimitSync(planKey);
  return limit !== 0;
}

// Check if user can post more jobs given current count
export function canPostMoreJobsSync(planKey: string, currentJobCount: number): boolean {
  const limit = getJobLimitSync(planKey);
  if (limit === 0) return false;
  if (limit === -1) return true; // Unlimited
  return currentJobCount < limit;
}
