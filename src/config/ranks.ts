// src/config/ranks.ts
// Rank configuration - Externalized for easy modification without touching business logic
// All thresholds and weights are defined here

import { Rank, RankConfig } from '@/types/rank';

/**
 * TRUTH RANK LADDER
 * 
 * 6 ranks total: Novice → Amateur → Analyst → Professional → Expert → Master
 * 
 * Time gates are MINIMUM requirements (hard gates)
 * Criteria thresholds increase with each rank
 * Weights determine how much each factor contributes to percentage
 */

export const RANK_CONFIGS: Record<Rank, RankConfig> = {
  [Rank.NOVICE]: {
    id: Rank.NOVICE,
    displayName: 'Novice',
    displayColor: '#EF4444', // Light Red
    badgeIcon: '🌱',
    minTimeGateDays: 0, // No time requirement
    criteria: {
      minPredictions: 3,
      minAccuracy: 50, // 50%
      minResolvedPredictions: 5, // Need 5 resolved before accuracy counts
      minActiveWeeks: 1,
      accuracyWeight: 0.30, // 30% of progression
      consistencyWeight: 0.15, // 15% of progression
      volumeWeight: 0.05, // 5% of progression
      timeWeight: 0.50, // 50% of progression (time on platform)
    },
  },
  
  [Rank.AMATEUR]: {
    id: Rank.AMATEUR,
    displayName: 'Amateur',
    displayColor: '#3B82F6', // Light Blue
    badgeIcon: '📊',
    minTimeGateDays: 7, // 1 week minimum (active users can reach in 1 week)
    criteria: {
      minPredictions: 10,
      minAccuracy: 55, // 55%
      minResolvedPredictions: 5,
      minActiveWeeks: 2,
      accuracyWeight: 0.30,
      consistencyWeight: 0.15,
      volumeWeight: 0.05,
      timeWeight: 0.50,
    },
  },
  
  [Rank.ANALYST]: {
    id: Rank.ANALYST,
    displayName: 'Analyst',
    displayColor: '#A855F7', // Light Purple
    badgeIcon: '🔍',
    minTimeGateDays: 60, // 2 months minimum
    criteria: {
      minPredictions: 30,
      minAccuracy: 60, // 60%
      minResolvedPredictions: 10,
      minActiveWeeks: 8,
      accuracyWeight: 0.30,
      consistencyWeight: 0.20,
      volumeWeight: 0.10,
      timeWeight: 0.40,
    },
  },
  
  [Rank.PROFESSIONAL]: {
    id: Rank.PROFESSIONAL,
    displayName: 'Professional',
    displayColor: '#F59E0B', // Light Amber/Orange
    badgeIcon: '⭐',
    minTimeGateDays: 120, // 4 months minimum
    criteria: {
      minPredictions: 60,
      minAccuracy: 65, // 65%
      minResolvedPredictions: 15,
      minActiveWeeks: 16,
      accuracyWeight: 0.30,
      consistencyWeight: 0.20,
      volumeWeight: 0.15,
      timeWeight: 0.35,
    },
  },
  
  [Rank.EXPERT]: {
    id: Rank.EXPERT,
    displayName: 'Expert',
    displayColor: '#EC4899', // Light Pink
    badgeIcon: '🎯',
    minTimeGateDays: 240, // 8 months minimum
    criteria: {
      minPredictions: 100,
      minAccuracy: 70, // 70%
      minResolvedPredictions: 20,
      minActiveWeeks: 32,
      accuracyWeight: 0.30,
      consistencyWeight: 0.25,
      volumeWeight: 0.15,
      timeWeight: 0.30,
    },
  },
  
  [Rank.MASTER]: {
    id: Rank.MASTER,
    displayName: 'Master',
    displayColor: '#22C55E', // Light Green
    badgeIcon: '👑',
    minTimeGateDays: 365, // 12 months minimum (1 year)
    criteria: {
      minPredictions: 150,
      minAccuracy: 75, // 75%
      minResolvedPredictions: 30,
      minActiveWeeks: 48,
      accuracyWeight: 0.30,
      consistencyWeight: 0.25,
      volumeWeight: 0.20,
      timeWeight: 0.25,
    },
  },
};

/**
 * Rank order for progression logic
 */
export const RANK_ORDER: Rank[] = [
  Rank.NOVICE,
  Rank.AMATEUR,
  Rank.ANALYST,
  Rank.PROFESSIONAL,
  Rank.EXPERT,
  Rank.MASTER,
];

/**
 * Get the next rank in the ladder
 */
export function getNextRank(currentRank: Rank): Rank | null {
  const currentIndex = RANK_ORDER.indexOf(currentRank);
  if (currentIndex === -1 || currentIndex === RANK_ORDER.length - 1) {
    return null; // Master is final rank
  }
  return RANK_ORDER[currentIndex + 1];
}

/**
 * Get rank configuration
 */
export function getRankConfig(rank: Rank): RankConfig {
  return RANK_CONFIGS[rank];
}

/**
 * Check if rank exists and is valid
 */
export function isValidRank(rank: string): rank is Rank {
  return Object.values(Rank).includes(rank as Rank);
}

/**
 * Constants for rate limiting and penalties
 */
export const RANK_SYSTEM_CONSTANTS = {
  // Rate limiting
  MIN_RECALCULATION_INTERVAL_HOURS: 1,
  
  // Inactivity
  LONG_INACTIVITY_DAYS: 30,
  INACTIVITY_PENALTY_PERCENTAGE: 10, // Reduce progress by 10% per 30-day gap
  
  // Leaderboard
  LEADERBOARD_TOP_COUNT: 9,
  LEADERBOARD_CACHE_TTL_HOURS: 1,
  
  // Background jobs
  DAILY_RECALCULATION_HOUR_UTC: 2, // 2 AM UTC
  BATCH_SIZE: 100, // Process users in batches
  MAX_JOB_RETRIES: 3,
  
  // Difficulty weighting
  MIN_VOTES_FOR_DIFFICULTY: 10, // Minimum votes to calculate difficulty
  CONTRARIAN_BONUS_MULTIPLIER: 1.5, // Contrarian correct votes worth 1.5x
  
  // Notifications
  INACTIVITY_NOTIFICATION_DAYS: 60, // Send "we miss you" after 60 days
  RANK_UPGRADE_NOTIFICATION_ENABLED: true,
};

/**
 * Get estimated days to next rank based on current progress rate
 * This is a rough estimate for UX purposes
 */
export function estimateDaysToNextRank(
  currentPercentage: number,
  averageDailyProgress: number
): number | null {
  if (currentPercentage >= 100 || averageDailyProgress <= 0) {
    return null;
  }
  
  const remainingPercentage = 100 - currentPercentage;
  const estimatedDays = Math.ceil(remainingPercentage / averageDailyProgress);
  
  return estimatedDays;
}
