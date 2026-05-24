/**
 * CENTRALIZED PLAN FEATURES - DATABASE-DRIVEN
 * 
 * All plan features are now read from the subscription_plans table in the database.
 * This file provides backwards-compatible functions that work with the new system.
 * 
 * IMPORTANT: For React components, use the hooks from useSubscriptionFeatures.tsx
 * This file provides synchronous utilities for non-React contexts.
 */

import { 
  getPlanFeaturesSync, 
  hasFeatureSync, 
  getJobLimitSync, 
  canPostMoreJobsSync,
  type FeatureToggles 
} from "@/hooks/useSubscriptionFeatures";

// Re-export types for backwards compatibility
export type { FeatureToggles };

// Interface for backwards compatibility
export interface PlanFeatures {
  showPhone: boolean;
  showEmail: boolean;
  showWebsite: boolean;
  canPostJobs: boolean;
  jobLimit: number;
  priorityPlacement: boolean;
  spotlightEligible: boolean;
  featuredRotation: boolean;
  verifiedBadge: boolean;
  featuredEmployerBadge: boolean;
  analyticsAccess: boolean;
  prioritySupport: boolean;
  leadAccess: boolean;
}

// Convert database feature toggles to legacy format
function toLegacyFeatures(toggles: FeatureToggles): PlanFeatures {
  return {
    showPhone: toggles.show_phone,
    showEmail: toggles.show_email,
    showWebsite: toggles.show_website,
    canPostJobs: toggles.job_postings !== 0,
    jobLimit: toggles.job_postings === -1 ? 999 : toggles.job_postings,
    priorityPlacement: toggles.priority_placement,
    spotlightEligible: toggles.spotlight_jobs,
    featuredRotation: toggles.priority_placement, // Map to priority placement
    verifiedBadge: toggles.show_verified_badge,
    featuredEmployerBadge: toggles.featured_badge,
    analyticsAccess: toggles.analytics,
    prioritySupport: toggles.priority_support,
    leadAccess: toggles.show_email || toggles.show_phone, // Lead access if contact info visible
  };
}

export type PlanKey = 'free' | 'premium' | 'elite';

/**
 * Get features for a specific plan
 * NOW READS FROM DATABASE (via cached sync function)
 */
export function getPlanFeatures(plan: string): PlanFeatures {
  const dbFeatures = getPlanFeaturesSync(plan);
  return toLegacyFeatures(dbFeatures);
}

/**
 * Check if a feature is available for a plan
 * NOW READS FROM DATABASE
 */
export function hasFeature(plan: string, feature: keyof PlanFeatures): boolean {
  const features = getPlanFeatures(plan);
  return Boolean(features[feature]);
}

/**
 * Get job posting limit for a plan
 * NOW READS FROM DATABASE
 */
export function getJobLimit(plan: string): number {
  const limit = getJobLimitSync(plan);
  return limit === -1 ? 999 : limit;
}

/**
 * Check if user can post more jobs
 * NOW READS FROM DATABASE
 */
export function canPostMoreJobs(plan: string, currentJobCount: number): boolean {
  return canPostMoreJobsSync(plan, currentJobCount);
}

// Compare two plans (returns positive if newPlan is higher, negative if lower)
export function comparePlans(oldPlan: string, newPlan: string): number {
  const planOrder: Record<string, number> = { free: 0, premium: 1, elite: 2 };
  return (planOrder[newPlan] ?? 0) - (planOrder[oldPlan] ?? 0);
}

// Check if changing plan is an upgrade
export function isUpgrade(oldPlan: string, newPlan: string): boolean {
  return comparePlans(oldPlan, newPlan) > 0;
}

// Check if changing plan is a downgrade
export function isDowngrade(oldPlan: string, newPlan: string): boolean {
  return comparePlans(oldPlan, newPlan) < 0;
}

// Get features gained when upgrading
export function getFeaturesGained(oldPlan: string, newPlan: string): (keyof PlanFeatures)[] {
  const oldFeatures = getPlanFeatures(oldPlan);
  const newFeatures = getPlanFeatures(newPlan);
  const gained: (keyof PlanFeatures)[] = [];
  
  for (const key of Object.keys(newFeatures) as (keyof PlanFeatures)[]) {
    if (newFeatures[key] && !oldFeatures[key]) {
      gained.push(key);
    }
  }
  
  return gained;
}

// Get features lost when downgrading
export function getFeaturesLost(oldPlan: string, newPlan: string): (keyof PlanFeatures)[] {
  const oldFeatures = getPlanFeatures(oldPlan);
  const newFeatures = getPlanFeatures(newPlan);
  const lost: (keyof PlanFeatures)[] = [];
  
  for (const key of Object.keys(oldFeatures) as (keyof PlanFeatures)[]) {
    if (oldFeatures[key] && !newFeatures[key]) {
      lost.push(key);
    }
  }
  
  return lost;
}

// Human-readable feature names
export const FEATURE_LABELS: Record<keyof PlanFeatures, string> = {
  showPhone: 'Phone number visible',
  showEmail: 'Email address visible',
  showWebsite: 'Website link visible',
  canPostJobs: 'Job posting ability',
  jobLimit: 'Job posting limit',
  priorityPlacement: 'Priority placement',
  spotlightEligible: 'Spotlight rotation',
  featuredRotation: 'Featured rotation',
  verifiedBadge: 'Verified badge',
  featuredEmployerBadge: 'Featured employer badge',
  analyticsAccess: 'Analytics dashboard',
  prioritySupport: 'Priority support',
  leadAccess: 'Lead access',
};

// Plan display info - these are also now in the database but kept for quick reference
export const PLAN_INFO = {
  free: {
    name: 'Free',
    price: 0,
    description: 'Basic presence listing',
    color: 'secondary',
  },
  premium: {
    name: 'Premium',
    price: 135,
    description: 'Lead access + credibility',
    color: 'primary',
  },
  elite: {
    name: 'Elite',
    price: 349,
    description: 'Category dominance',
    color: 'accent',
  },
} as const;

// DEPRECATED: Use useSubscriptionPlans hook for React components
// This constant is kept for backwards compatibility but reads from cache
export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  get free() { return getPlanFeatures('free'); },
  get premium() { return getPlanFeatures('premium'); },
  get elite() { return getPlanFeatures('elite'); },
};
