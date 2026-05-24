/**
 * JOB POSTING CONFIGURATION - DATABASE-DRIVEN
 * 
 * Job posting limits and features are now read from the subscription_plans table.
 * This file provides utility functions that work with the centralized system.
 * 
 * Plan Structure:
 * - Free: Presence only, no job postings
 * - Premium ($135/mo): Lead access + credibility, up to 2 job postings (30 days each)
 * - Elite ($349/mo): Category dominance, unlimited jobs (60 days), spotlight, analytics
 */

import { 
  getJobLimitSync, 
  canPostJobsSync, 
  canPostMoreJobsSync,
  getPlanFeaturesSync 
} from "@/hooks/useSubscriptionFeatures";

// Job duration in days per plan (stored in platform_settings.job_settings)
// These are defaults - actual values come from database
const DEFAULT_JOB_DURATION: Record<string, number> = {
  free: 0,
  premium: 30,
  elite: 60,
};

// Spotlight pricing (from platform_settings.job_settings)
export const SPOTLIGHT_DEFAULTS = {
  pricePerWeek: 99, // $99 NZD per week - updateable via admin settings
  currency: "NZD",
  label: "Sponsored", // Legal + trust requirement under NZ Fair Trading Act
};

export type SubscriptionPlan = 'free' | 'premium' | 'elite';

interface JobPermissions {
  canPost: boolean;
  jobLimit: number;
  jobDurationDays: number;
  spotlight: boolean;
  analytics: boolean;
  priority: boolean;
  featuredEmployer: boolean;
  prioritySupport: boolean;
  featuredRotation: boolean;
  visualElevation: boolean;
}

/**
 * Get job permissions for a plan
 * NOW READS FROM DATABASE (via cached sync function)
 */
export function getJobPermissions(plan: SubscriptionPlan): JobPermissions {
  const features = getPlanFeaturesSync(plan);
  const jobLimit = features.job_postings === -1 ? 999 : features.job_postings;
  
  return {
    canPost: features.job_postings !== 0,
    jobLimit,
    jobDurationDays: DEFAULT_JOB_DURATION[plan] || 30,
    spotlight: features.spotlight_jobs,
    analytics: features.analytics,
    priority: features.priority_placement,
    featuredEmployer: features.featured_badge,
    prioritySupport: features.priority_support,
    featuredRotation: features.priority_placement,
    visualElevation: features.top_tier_placement,
  };
}

/**
 * Check if user can post a job given their plan and current job count
 * NOW READS FROM DATABASE
 */
export function canPostJob(plan: SubscriptionPlan, activeJobCount: number): boolean {
  return canPostMoreJobsSync(plan, activeJobCount);
}

/**
 * Get job posting limit for a plan
 * NOW READS FROM DATABASE
 */
export function getJobLimit(plan: SubscriptionPlan): number {
  const limit = getJobLimitSync(plan);
  return limit === -1 ? 999 : limit;
}

/**
 * Get job duration in days for a plan
 */
export function getJobDurationDays(plan: SubscriptionPlan): number {
  return DEFAULT_JOB_DURATION[plan] || 30;
}

/**
 * Check if plan is eligible for spotlight
 * NOW READS FROM DATABASE
 */
export function isEligibleForSpotlight(plan: SubscriptionPlan): boolean {
  const features = getPlanFeaturesSync(plan);
  return features.spotlight_jobs;
}

/**
 * Check if plan has employer analytics
 * NOW READS FROM DATABASE
 */
export function hasEmployerAnalytics(plan: SubscriptionPlan): boolean {
  const features = getPlanFeaturesSync(plan);
  return features.analytics;
}

/**
 * Check if plan has featured employer badge
 * NOW READS FROM DATABASE
 */
export function isFeaturedEmployer(plan: SubscriptionPlan): boolean {
  const features = getPlanFeaturesSync(plan);
  return features.featured_badge;
}

// Legacy constant for backwards compatibility
// DEPRECATED: Use getJobPermissions() instead
export const JOB_PRICING = {
  plans: {
    get free() { return getJobPermissions('free'); },
    get premium() { return getJobPermissions('premium'); },
    get elite() { return getJobPermissions('elite'); },
  },
  spotlight: SPOTLIGHT_DEFAULTS,
} as const;
