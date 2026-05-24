// AI Matching Service for Wellington EcoBuild
// Matches clients with builders based on location, specialty, and project type

import { supabase } from "@/integrations/supabase/client";

interface MatchCriteria {
  projectType?: string;
  location?: string;
  budgetRange?: string;
  timeline?: string;
  requirements?: string;
}

interface Business {
  id: string;
  name: string;
  category: string;
  city: string;
  rating: number | null;
  review_count: number | null;
  is_verified: boolean;
  subscription_plan: string;
  certifications: string[] | null;
  materials: string[] | null;
  description: string | null;
}

interface MatchedBusiness extends Business {
  match_score: number;
  match_reasons: string[];
}

// Category mappings for project types to business categories
const PROJECT_TO_CATEGORY: Record<string, string[]> = {
  new_build: ['eco-builders', 'architects', 'project-managers'],
  renovation: ['eco-builders', 'renovation-specialists', 'interior-designers'],
  extension: ['eco-builders', 'architects'],
  bathroom: ['eco-builders', 'renovation-specialists', 'plumbers'],
  kitchen: ['eco-builders', 'renovation-specialists', 'kitchen-specialists'],
  sustainable: ['eco-builders', 'solar-installers', 'insulation-specialists', 'sustainability-consultants'],
};

// Wellington region suburbs grouped by area
const REGION_GROUPS: Record<string, string[]> = {
  'Wellington Central': ['Wellington', 'Wellington Central', 'Te Aro', 'Thorndon', 'Lambton'],
  'Lower Hutt': ['Lower Hutt', 'Petone', 'Eastbourne', 'Wainuiomata'],
  'Upper Hutt': ['Upper Hutt', 'Silverstream', 'Trentham'],
  'Porirua': ['Porirua', 'Titahi Bay', 'Plimmerton', 'Paremata'],
  'Kapiti Coast': ['Kapiti', 'Paraparaumu', 'Waikanae', 'Paekakariki', 'Raumati'],
  'Western Suburbs': ['Karori', 'Northland', 'Wilton', 'Wadestown'],
  'Eastern Suburbs': ['Miramar', 'Kilbirnie', 'Lyall Bay', 'Seatoun'],
  'Northern Suburbs': ['Johnsonville', 'Newlands', 'Churton Park', 'Tawa', 'Khandallah'],
};

/**
 * Calculate match score between a business and project criteria
 */
function calculateMatchScore(business: Business, criteria: MatchCriteria): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Category Match (up to 30 points)
  if (criteria.projectType) {
    const relevantCategories = PROJECT_TO_CATEGORY[criteria.projectType] || [];
    if (relevantCategories.includes(business.category)) {
      score += 30;
      reasons.push(`Specializes in ${criteria.projectType.replace('_', ' ')} projects`);
    }
  }

  // 2. Location Match (up to 25 points)
  if (criteria.location) {
    const businessCity = business.city.toLowerCase();
    const targetLocation = criteria.location.toLowerCase();
    
    // Exact city match
    if (businessCity.includes(targetLocation) || targetLocation.includes(businessCity)) {
      score += 25;
      reasons.push(`Located in ${business.city}`);
    } else {
      // Check if in same region
      for (const [region, suburbs] of Object.entries(REGION_GROUPS)) {
        const inSameRegion = suburbs.some(s => 
          s.toLowerCase().includes(targetLocation) || 
          s.toLowerCase().includes(businessCity)
        );
        if (inSameRegion) {
          score += 15;
          reasons.push(`Serves the ${region} area`);
          break;
        }
      }
    }
  }

  // 3. Verification Status (up to 20 points)
  if (business.is_verified) {
    score += 20;
    reasons.push('Verified credentials');
  }

  // 4. Ratings & Reviews (up to 15 points)
  if (business.rating && business.rating >= 4.5) {
    score += 15;
    reasons.push(`Highly rated (${business.rating.toFixed(1)} stars)`);
  } else if (business.rating && business.rating >= 4.0) {
    score += 10;
    reasons.push(`Well rated (${business.rating.toFixed(1)} stars)`);
  }

  // 5. Subscription tier bonus (up to 10 points)
  if (business.subscription_plan === 'elite') {
    score += 10;
    reasons.push('Elite partner');
  } else if (business.subscription_plan === 'premium') {
    score += 5;
    reasons.push('Premium partner');
  }

  // 6. Sustainability certifications for sustainable projects
  if (criteria.projectType === 'sustainable' && business.certifications?.length) {
    const sustainableCerts = ['Homestar', 'Passive House', 'Green Building', 'EnergyStar'];
    const hasSustainableCert = business.certifications.some(c => 
      sustainableCerts.some(sc => c.toLowerCase().includes(sc.toLowerCase()))
    );
    if (hasSustainableCert) {
      score += 10;
      reasons.push('Sustainability certified');
    }
  }

  return { score, reasons };
}

/**
 * Find matching builders for a project estimate
 */
export async function findMatchingBuilders(
  criteria: MatchCriteria,
  limit: number = 5
): Promise<MatchedBusiness[]> {
  try {
    // Fetch active, approved businesses
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, name, category, city, rating, review_count, is_verified, subscription_plan, certifications, materials, description')
      .eq('status', 'active')
      .order('is_verified', { ascending: false })
      .order('rating', { ascending: false, nullsFirst: false });

    if (error) throw error;
    if (!businesses || businesses.length === 0) return [];

    // Calculate match scores
    const matchedBusinesses: MatchedBusiness[] = businesses.map((business) => {
      const { score, reasons } = calculateMatchScore(business as Business, criteria);
      return {
        ...(business as Business),
        match_score: score,
        match_reasons: reasons,
      };
    });

    // Sort by match score and return top matches
    return matchedBusinesses
      .filter(b => b.match_score > 20) // Only return reasonably good matches
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, limit);
  } catch (error) {
    console.error('Error finding matching builders:', error);
    return [];
  }
}

/**
 * Create contractor matches in the database
 */
export async function createContractorMatches(
  estimateId: string,
  matchedBusinesses: MatchedBusiness[],
  clientInfo?: { name?: string; email?: string; phone?: string; userId?: string }
): Promise<void> {
  try {
    const matchRecords = matchedBusinesses.map((business) => ({
      estimate_id: estimateId,
      business_id: business.id,
      user_id: clientInfo?.userId || null,
      user_name: clientInfo?.name || null,
      user_email: clientInfo?.email || null,
      user_phone: clientInfo?.phone || null,
      status: 'pending',
      message: `Matched based on: ${business.match_reasons.join(', ')}`,
    }));

    const { error } = await supabase
      .from('contractor_matches')
      .insert(matchRecords);

    if (error) throw error;

    // Log activity
    await supabase.from('site_activity').insert({
      activity_type: 'ai_match',
      description: `AI matched ${matchedBusinesses.length} contractors for estimate`,
      metadata: { estimate_id: estimateId, match_count: matchedBusinesses.length },
    });
  } catch (error) {
    console.error('Error creating contractor matches:', error);
  }
}

/**
 * Suggest builders to clients based on their saved searches or profile
 */
export async function suggestBuildersForClient(userId: string, limit: number = 3): Promise<MatchedBusiness[]> {
  try {
    // Get user's recent saved searches or estimates
    const { data: estimates } = await supabase
      .from('project_estimates')
      .select('project_type, location, budget_range')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!estimates || estimates.length === 0) {
      // Return top-rated verified builders as default
      const { data: topBuilders } = await supabase
        .from('businesses')
        .select('id, name, category, city, rating, review_count, is_verified, subscription_plan, certifications, materials, description')
        .eq('status', 'active')
        .eq('is_verified', true)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(limit);

      return (topBuilders || []).map(b => ({
        ...(b as Business),
        match_score: 50,
        match_reasons: ['Top rated in Wellington'],
      }));
    }

    // Aggregate criteria from recent estimates
    const criteria: MatchCriteria = {
      projectType: estimates[0].project_type,
      location: estimates[0].location,
      budgetRange: estimates[0].budget_range,
    };

    return findMatchingBuilders(criteria, limit);
  } catch (error) {
    console.error('Error suggesting builders:', error);
    return [];
  }
}

/**
 * Auto-generate leads for Premium/Elite builders based on matching
 */
export async function generateAutoLeads(estimateId: string): Promise<number> {
  try {
    // Get the estimate details
    const { data: estimate, error: estimateError } = await supabase
      .from('project_estimates')
      .select('*')
      .eq('id', estimateId)
      .single();

    if (estimateError || !estimate) return 0;

    const criteria: MatchCriteria = {
      projectType: estimate.project_type,
      location: estimate.location,
      budgetRange: estimate.budget_range,
      timeline: estimate.timeline,
    };

    // Find matching Premium/Elite builders
    const matches = await findMatchingBuilders(criteria, 5);
    const premiumMatches = matches.filter(m => 
      m.subscription_plan === 'premium' || m.subscription_plan === 'elite'
    );

    if (premiumMatches.length === 0) return 0;

    // Create matches
    await createContractorMatches(estimateId, premiumMatches, {
      userId: estimate.user_id,
    });

    return premiumMatches.length;
  } catch (error) {
    console.error('Error generating auto leads:', error);
    return 0;
  }
}
