// Dynamic referral reward calculation based on plan pricing
// Default: 37% of first month subscription (approximately $50 for $135 premium, $129 for $349 elite)

export const REFERRAL_REWARD_PERCENTAGE = 0.37; // 37% of first month

export function calculateReferralReward(planPrice: number): number {
  const reward = Math.round(planPrice * REFERRAL_REWARD_PERCENTAGE);
  // Round to nearest $5 for cleaner amounts
  return Math.round(reward / 5) * 5;
}

export function getRewardForPlan(
  planKey: "premium" | "elite",
  premiumPrice: number,
  elitePrice: number
): number {
  if (planKey === "premium") {
    return calculateReferralReward(premiumPrice);
  }
  return calculateReferralReward(elitePrice);
}
