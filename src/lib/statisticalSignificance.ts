/**
 * Statistical significance calculations for A/B testing
 * Uses two-proportion z-test for comparing conversion rates
 */

export interface ABTestStats {
  aImpressions: number;
  aClicks: number;
  bImpressions: number;
  bClicks: number;
}

export interface SignificanceResult {
  isSignificant: boolean;
  confidence: number;
  pValue: number;
  winner: 'A' | 'B' | null;
  lift: number;
  sampleSizeReached: boolean;
  minSampleSize: number;
}

/**
 * Calculate the z-score for two proportions
 */
function calculateZScore(p1: number, p2: number, n1: number, n2: number): number {
  // Pooled proportion
  const pPool = (p1 * n1 + p2 * n2) / (n1 + n2);
  
  // Standard error
  const se = Math.sqrt(pPool * (1 - pPool) * (1/n1 + 1/n2));
  
  if (se === 0) return 0;
  
  // Z-score
  return (p1 - p2) / se;
}

/**
 * Calculate p-value from z-score (two-tailed test)
 */
function zScoreToPValue(z: number): number {
  // Approximation of the cumulative distribution function
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  const cdf = 0.5 * (1.0 + sign * y);
  
  // Two-tailed p-value
  return 2 * (1 - cdf);
}

/**
 * Calculate minimum sample size needed for significance
 * Based on 80% power and 5% significance level
 */
function calculateMinSampleSize(baselineRate: number, minimumDetectableEffect: number): number {
  // For 80% power and 5% significance
  const zAlpha = 1.96; // 95% confidence
  const zBeta = 0.84;  // 80% power
  
  const p1 = baselineRate;
  const p2 = baselineRate + minimumDetectableEffect;
  const pAvg = (p1 + p2) / 2;
  
  const n = (2 * Math.pow(zAlpha + zBeta, 2) * pAvg * (1 - pAvg)) / 
            Math.pow(p1 - p2, 2);
  
  return Math.ceil(n);
}

/**
 * Calculate statistical significance for an A/B test
 */
export function calculateSignificance(stats: ABTestStats, confidenceLevel: number = 0.95): SignificanceResult {
  const { aImpressions, aClicks, bImpressions, bClicks } = stats;
  
  // Calculate conversion rates
  const aRate = aImpressions > 0 ? aClicks / aImpressions : 0;
  const bRate = bImpressions > 0 ? bClicks / bImpressions : 0;
  
  // Minimum sample size per variant (at least 100 impressions each)
  const baselineRate = Math.max(aRate, bRate, 0.02); // Assume at least 2% baseline
  const minDetectableEffect = baselineRate * 0.2; // 20% relative lift
  const minSampleSize = Math.max(100, calculateMinSampleSize(baselineRate, minDetectableEffect));
  
  const sampleSizeReached = aImpressions >= minSampleSize && bImpressions >= minSampleSize;
  
  // Need minimum data
  if (!sampleSizeReached || aClicks < 5 || bClicks < 5) {
    return {
      isSignificant: false,
      confidence: 0,
      pValue: 1,
      winner: null,
      lift: 0,
      sampleSizeReached,
      minSampleSize,
    };
  }
  
  // Calculate z-score
  const zScore = calculateZScore(aRate, bRate, aImpressions, bImpressions);
  
  // Calculate p-value
  const pValue = zScoreToPValue(zScore);
  
  // Determine significance
  const significanceThreshold = 1 - confidenceLevel;
  const isSignificant = pValue < significanceThreshold;
  
  // Calculate lift
  const baserate = Math.min(aRate, bRate);
  const lift = baserate > 0 ? ((Math.max(aRate, bRate) - baserate) / baserate) * 100 : 0;
  
  // Determine winner
  let winner: 'A' | 'B' | null = null;
  if (isSignificant) {
    winner = aRate > bRate ? 'A' : 'B';
  }
  
  return {
    isSignificant,
    confidence: Math.round((1 - pValue) * 10000) / 100,
    pValue: Math.round(pValue * 10000) / 10000,
    winner,
    lift: Math.round(lift * 100) / 100,
    sampleSizeReached,
    minSampleSize,
  };
}

/**
 * Format confidence level for display
 */
export function formatConfidence(confidence: number): string {
  if (confidence >= 99) return '99%+';
  if (confidence >= 95) return `${confidence.toFixed(1)}%`;
  if (confidence >= 90) return `${confidence.toFixed(1)}%`;
  return `${confidence.toFixed(0)}%`;
}
