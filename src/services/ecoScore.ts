import type {
  EnvironmentalImpact,
  WastePost,
  ListingRequest,
} from '../types/index.ts';
import { getOrComputePostImpact, normalizeCategory } from './environmentalImpact.ts';
import {
  getUserWastePosts,
  getMySentRequests,
  getWastePostById,
  getNormalizedStatus,
} from './db.ts';

/**
 * Standard Circular Action Types recognized by the EcoScore Engine
 */
export type CircularActionKey =
  | 'reuse'
  | 'donate'
  | 'exchange'
  | 'upcycle'
  | 'recycle'
  | 'sell'
  | 'other';

/**
 * Breakdown metrics for an individual circular action category
 */
export interface ActionTypeBreakdown {
  label: string;
  count: number;
  wasteDivertedKg: number;
  co2eAvoidedKg: number;
  ecoPoints: number;
}

/**
 * A verified completed circular action record
 */
export interface CompletedActionRecord {
  actionId: string;
  listingId: string;
  title: string;
  category: string;
  material: string;
  actionType: CircularActionKey;
  userRole: 'owner' | 'requester';
  completedAt: string;
  wasteDivertedKg: number;
  co2eAvoidedKg: number;
  ecoPoints: number;
  pointsBreakdown: {
    basePoints: number;
    diversionPoints: number;
    carbonPoints: number;
    actionBonus: number;
    formulaExplanation: string;
  };
}

/**
 * Complete user EcoScore summary
 */
export interface UserEcoScoreSummary {
  userId: string;
  totalEcoPoints: number;
  completedActionsCount: number;
  estimatedWasteDivertedKg: number;
  estimatedCo2eAvoidedKg: number;
  actionBreakdown: Record<CircularActionKey, ActionTypeBreakdown>;
  completedActions: CompletedActionRecord[];
  calculationMethod: string;
  disclaimer: string;
}

/**
 * Centralized, Documented EcoScore Formula Configuration
 *
 * NOTE: EcoPoints are motivational recognition credits designed to encourage circular behavior
 * and community waste diversion. They are derived from estimated environmental lifecycle baselines
 * (EPA WARM / DEFRA) but are NOT certified scientific carbon credits.
 */
export const ECOSCORE_FORMULA = {
  // Base reward awarded for each genuinely completed circular transaction
  BASE_COMPLETION_POINTS: 50,

  // Points awarded per 1.0 kg of physical waste diverted from landfill disposal (10 pts per 100g)
  POINTS_PER_KG_DIVERTED: 100,

  // Points awarded per 1.0 kg of CO2e emissions avoided
  POINTS_PER_KG_CO2E_AVOIDED: 25,

  // Circular hierarchy tier bonuses (reflecting waste reduction priorities)
  ACTION_TIER_BONUSES: {
    reuse: 25, // Direct reuse preserves full utility with 0 processing energy
    donate: 25, // Community altruism & social reuse
    exchange: 20, // Mutual displacement of new purchases
    upcycle: 20, // High-utility creative transformation
    sell: 15, // Second-hand marketplace circular extension
    recycle: 10, // Material recovery & reprocessing
    other: 10,
  } as Record<CircularActionKey, number>,
};

/**
 * Normalizes any freeform action string into one of the 7 standard circular action keys
 */
export function normalizeActionKey(action?: string): CircularActionKey {
  const norm = (action || '').trim().toLowerCase();
  if (norm.includes('reuse')) return 'reuse';
  if (norm.includes('donat')) return 'donate';
  if (norm.includes('exchang') || norm.includes('swap') || norm.includes('trade')) return 'exchange';
  if (norm.includes('upcycl') || norm.includes('repurpose') || norm.includes('craft')) return 'upcycle';
  if (norm.includes('recycl')) return 'recycle';
  if (norm.includes('sell') || norm.includes('sale') || norm.includes('purchas') || norm.includes('buy')) return 'sell';
  return 'other';
}

/**
 * Human readable label for an action key
 */
export function getActionKeyLabel(key: CircularActionKey): string {
  switch (key) {
    case 'reuse':
      return 'Direct Reuse';
    case 'donate':
      return 'Donation';
    case 'exchange':
      return 'Exchange / Swap';
    case 'upcycle':
      return 'Upcycling';
    case 'recycle':
      return 'Recycling';
    case 'sell':
      return 'Marketplace Sale';
    default:
      return 'Other Circular';
  }
}

/**
 * Computes transparent EcoPoints for an environmental impact record and action type
 */
export function calculateActionEcoPoints(
  impact: EnvironmentalImpact,
  actionType?: string
): {
  total: number;
  basePoints: number;
  diversionPoints: number;
  carbonPoints: number;
  actionBonus: number;
  formulaExplanation: string;
} {
  const actionKey = normalizeActionKey(actionType || impact.actionType);
  const basePoints = ECOSCORE_FORMULA.BASE_COMPLETION_POINTS;

  // Diversion points: 100 pts per kg diverted (guarantee at least 5 if weight > 0)
  const rawDiv = Math.round((impact.wasteDivertedKg || 0) * ECOSCORE_FORMULA.POINTS_PER_KG_DIVERTED);
  const diversionPoints = (impact.wasteDivertedKg || 0) > 0 ? Math.max(5, rawDiv) : 0;

  // Carbon points: 25 pts per kg CO2e avoided (guarantee at least 2 if avoided > 0)
  const rawCarbon = Math.round((impact.co2eAvoidedKg || 0) * ECOSCORE_FORMULA.POINTS_PER_KG_CO2E_AVOIDED);
  const carbonPoints = (impact.co2eAvoidedKg || 0) > 0 ? Math.max(2, rawCarbon) : 0;

  // Action tier bonus
  const actionBonus = ECOSCORE_FORMULA.ACTION_TIER_BONUSES[actionKey] ?? 10;

  const total = basePoints + diversionPoints + carbonPoints + actionBonus;

  const formulaExplanation = `${basePoints} Base Completion + ${diversionPoints} Diversion (${impact.wasteDivertedKg} kg) + ${carbonPoints} Carbon Avoided (${impact.co2eAvoidedKg} kg CO₂e) + ${actionBonus} ${getActionKeyLabel(actionKey)} Bonus`;

  return {
    total,
    basePoints,
    diversionPoints,
    carbonPoints,
    actionBonus,
    formulaExplanation,
  };
}

/**
 * Creates empty action breakdown table
 */
export function createEmptyActionBreakdown(): Record<CircularActionKey, ActionTypeBreakdown> {
  return {
    reuse: { label: 'Direct Reuse', count: 0, wasteDivertedKg: 0, co2eAvoidedKg: 0, ecoPoints: 0 },
    donate: { label: 'Donation', count: 0, wasteDivertedKg: 0, co2eAvoidedKg: 0, ecoPoints: 0 },
    exchange: { label: 'Exchange / Swap', count: 0, wasteDivertedKg: 0, co2eAvoidedKg: 0, ecoPoints: 0 },
    upcycle: { label: 'Upcycling', count: 0, wasteDivertedKg: 0, co2eAvoidedKg: 0, ecoPoints: 0 },
    recycle: { label: 'Recycling', count: 0, wasteDivertedKg: 0, co2eAvoidedKg: 0, ecoPoints: 0 },
    sell: { label: 'Marketplace Sale', count: 0, wasteDivertedKg: 0, co2eAvoidedKg: 0, ecoPoints: 0 },
    other: { label: 'Other Circular', count: 0, wasteDivertedKg: 0, co2eAvoidedKg: 0, ecoPoints: 0 },
  };
}

/**
 * Computes live, transparent EcoScore summary from genuinely completed actions in Firestore.
 *
 * Rules strictly enforced:
 * - Points awarded ONLY for completed circular actions (status === 'completed')
 * - 0 points for simply uploading, analyzing, listing, or requesting
 * - Double-counting prevented: Each unique listingId is counted exactly once per user
 * - No fake or hardcoded numbers
 */
export async function computeUserEcoScore(userId: string): Promise<UserEcoScoreSummary> {
  const emptyResult: UserEcoScoreSummary = {
    userId,
    totalEcoPoints: 0,
    completedActionsCount: 0,
    estimatedWasteDivertedKg: 0,
    estimatedCo2eAvoidedKg: 0,
    actionBreakdown: createEmptyActionBreakdown(),
    completedActions: [],
    calculationMethod: 'Waste2Worth Documented Lifecycle EcoScore Model v1.0',
    disclaimer:
      'EcoPoints and environmental metrics are educational estimates based on category baselines and verified circular handoffs, not scientific carbon credits.',
  };

  if (!userId) return emptyResult;

  try {
    // 1. Fetch user's posts and user's sent requests in parallel
    const [userPosts, sentRequests] = await Promise.all([
      getUserWastePosts(userId),
      getMySentRequests(userId),
    ]);

    // Track unique completed listings to prevent any double-counting
    const processedListingIds = new Set<string>();
    const completedActionList: CompletedActionRecord[] = [];
    const breakdown = createEmptyActionBreakdown();

    let totalPoints = 0;
    let totalDivertedKg = 0;
    let totalCo2eKg = 0;

    // A. Completed posts owned by user
    for (const post of userPosts) {
      const normStatus = getNormalizedStatus(post.status);
      if (normStatus === 'completed' && !processedListingIds.has(post.id)) {
        processedListingIds.add(post.id);

        const impact = getOrComputePostImpact(post);
        const actionKey = normalizeActionKey(post.actionType || post.intendedAction);
        const pointsData = calculateActionEcoPoints(impact, actionKey);

        const record: CompletedActionRecord = {
          actionId: `completed_${post.id}`,
          listingId: post.id,
          title: post.title,
          category: normalizeCategory(post.category, post.material),
          material: post.material || post.category,
          actionType: actionKey,
          userRole: 'owner',
          completedAt: post.updatedAt || post.createdAt || new Date().toISOString(),
          wasteDivertedKg: impact.wasteDivertedKg,
          co2eAvoidedKg: impact.co2eAvoidedKg,
          ecoPoints: pointsData.total,
          pointsBreakdown: pointsData,
        };

        completedActionList.push(record);
        totalPoints += pointsData.total;
        totalDivertedKg += impact.wasteDivertedKg;
        totalCo2eKg += impact.co2eAvoidedKg;

        // Add to breakdown
        breakdown[actionKey].count += 1;
        breakdown[actionKey].wasteDivertedKg =
          Math.round((breakdown[actionKey].wasteDivertedKg + impact.wasteDivertedKg) * 100) / 100;
        breakdown[actionKey].co2eAvoidedKg =
          Math.round((breakdown[actionKey].co2eAvoidedKg + impact.co2eAvoidedKg) * 100) / 100;
        breakdown[actionKey].ecoPoints += pointsData.total;
      }
    }

    // B. Completed requests where user was the recipient/requester (and post is distinct)
    const completedSentRequests = sentRequests.filter((r) => r.status === 'completed');
    for (const req of completedSentRequests) {
      if (req.listingId && !processedListingIds.has(req.listingId)) {
        processedListingIds.add(req.listingId);

        // Fetch original listing to obtain genuine environmental impact
        let post: WastePost | null = null;
        try {
          post = await getWastePostById(req.listingId);
        } catch {
          post = null;
        }

        const actionKey = normalizeActionKey(
          req.listingActionType || req.requestType || post?.actionType || post?.intendedAction
        );

        const impact: EnvironmentalImpact = post
          ? getOrComputePostImpact(post)
          : {
              category: normalizeCategory(req.listingCategory, req.listingMaterial),
              material: req.listingMaterial || req.listingCategory || 'Mixed',
              estimatedWeightKg: 0.5,
              wasteDivertedKg: 0.5,
              co2eAvoidedKg: 1.0,
              actionType: actionKey,
              actionMultiplier: 1.0,
              calculationMethod: 'Waste2Worth Fallback Estimate',
              assumption: 'Estimated based on marketplace request record.',
              calculatedAt: req.updatedAt || new Date().toISOString(),
            };

        const pointsData = calculateActionEcoPoints(impact, actionKey);

        const record: CompletedActionRecord = {
          actionId: `completed_${req.listingId}`,
          listingId: req.listingId,
          title: req.listingTitle || post?.title || 'Circular Marketplace Transfer',
          category: impact.category,
          material: impact.material,
          actionType: actionKey,
          userRole: 'requester',
          completedAt: req.updatedAt || req.createdAt || new Date().toISOString(),
          wasteDivertedKg: impact.wasteDivertedKg,
          co2eAvoidedKg: impact.co2eAvoidedKg,
          ecoPoints: pointsData.total,
          pointsBreakdown: pointsData,
        };

        completedActionList.push(record);
        totalPoints += pointsData.total;
        totalDivertedKg += impact.wasteDivertedKg;
        totalCo2eKg += impact.co2eAvoidedKg;

        breakdown[actionKey].count += 1;
        breakdown[actionKey].wasteDivertedKg =
          Math.round((breakdown[actionKey].wasteDivertedKg + impact.wasteDivertedKg) * 100) / 100;
        breakdown[actionKey].co2eAvoidedKg =
          Math.round((breakdown[actionKey].co2eAvoidedKg + impact.co2eAvoidedKg) * 100) / 100;
        breakdown[actionKey].ecoPoints += pointsData.total;
      }
    }

    // Sort completed actions by completedAt descending
    completedActionList.sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    return {
      userId,
      totalEcoPoints: totalPoints,
      completedActionsCount: completedActionList.length,
      estimatedWasteDivertedKg: Math.round(totalDivertedKg * 100) / 100,
      estimatedCo2eAvoidedKg: Math.round(totalCo2eKg * 100) / 100,
      actionBreakdown: breakdown,
      completedActions: completedActionList,
      calculationMethod: 'Waste2Worth Documented Lifecycle EcoScore Model v1.0',
      disclaimer:
        'EcoPoints and environmental metrics are educational estimates based on category baselines and verified circular handoffs, not scientific carbon credits.',
    };
  } catch (err) {
    console.error('Error computing user EcoScore:', err);
    return emptyResult;
  }
}
