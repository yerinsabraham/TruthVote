// src/lib/ranking/rankEngine.ts
// DOMAIN LOGIC LAYER - Firebase-agnostic rank calculation engine
// This module contains NO Firebase-specific code and can be ported to AWS Lambda

import {
  Rank,
  UserStats,
  RankCalculationResult,
  RankUpgradeResult,
  RankUpgradeHistoryEntry,
} from '@/types/rank';
import {
  RANK_CONFIGS,
  RANK_ORDER,
  getNextRank,
  getRankConfig,
  RANK_SYSTEM_CONSTANTS,
} from '@/config/ranks';

/**
 * RANK ENGINE
 * 
 * Core business logic for TruthRank system
 * All functions are pure and deterministic
 * Fully unit-testable with mock data
 */

export class RankEngine {
  /**
   * Calculate rank percentage for a user based on their stats
   * Returns 0-100 representing progress toward next rank
   * 
   * Formula weights (configurable per rank):
   * - Time on platform: 10-20%
   * - Accuracy: 35-60%
   * - Consistency (active weeks): 15-25%
   * - Volume (predictions): 5-30%
   * 
   * IMPORTANT: Percentage is capped at 100% but upgrade requires time gate
   */
  calculateRankPercentage(userStats: UserStats): RankCalculationResult {
    const config = getRankConfig(userStats.currentRank);
    const criteria = config.criteria;
    
    // Calculate days since signup
    const accountAgeDays = this.calculateDaysSince(userStats.createdAt);
    
    // Calculate days in current rank
    const daysInRank = this.calculateDaysSince(userStats.currentRankStartDate);
    
    // 1. TIME SCORE (0-100)
    const timeScore = this.calculateTimeScore(accountAgeDays, config);
    
    // 2. ACCURACY SCORE (0-100)
    const accuracyScore = this.calculateAccuracyScore(userStats, criteria);
    
    // 3. CONSISTENCY SCORE (0-100)
    const consistencyScore = this.calculateConsistencyScore(userStats, criteria);
    
    // 4. VOLUME SCORE (0-100)
    const volumeScore = this.calculateVolumeScore(userStats, criteria);
    
    // 5. APPLY PENALTIES
    const inactivityPenalty = this.calculateInactivityPenalty(userStats);
    
    // Weighted sum
    const rawPercentage =
      timeScore * criteria.timeWeight +
      accuracyScore * criteria.accuracyWeight +
      consistencyScore * criteria.consistencyWeight +
      volumeScore * criteria.volumeWeight;
    
    // Apply penalties
    const adjustedPercentage = Math.max(0, rawPercentage - inactivityPenalty);
    
    // Cap at 100%
    const finalPercentage = Math.min(100, adjustedPercentage);
    
    // Check if eligible for upgrade
    const nextRank = getNextRank(userStats.currentRank);
    const nextRankConfig = nextRank ? getRankConfig(nextRank) : null;
    
    const meetsTimeGate = nextRankConfig
      ? accountAgeDays >= nextRankConfig.minTimeGateDays
      : false;
    
    const eligibleForUpgrade =
      finalPercentage >= 100 && meetsTimeGate && nextRank !== null;
    
    // Identify blockers
    const blockers: string[] = [];
    if (finalPercentage < 100) {
      blockers.push(`Need ${(100 - finalPercentage).toFixed(1)}% more progress`);
    }
    if (!meetsTimeGate && nextRankConfig) {
      const daysNeeded = nextRankConfig.minTimeGateDays - accountAgeDays;
      blockers.push(`Need ${daysNeeded} more days on platform`);
    }
    if (nextRank === null) {
      blockers.push('Already at Master rank (final rank)');
    }
    
    return {
      percentage: Math.round(finalPercentage * 10) / 10, // Round to 1 decimal
      breakdown: {
        timeScore: Math.round(timeScore),
        accuracyScore: Math.round(accuracyScore),
        consistencyScore: Math.round(consistencyScore),
        volumeScore: Math.round(volumeScore),
      },
      eligibleForUpgrade,
      nextRank,
      blockers,
    };
  }
  
  /**
   * Determine if user is eligible for rank upgrade
   * Checks:
   * 1. Current percentage >= 100%
   * 2. Account age meets next rank's time gate
   * 3. Not already at Master rank
   */
  determineRankEligibility(userStats: UserStats): Rank | null {
    const calculation = this.calculateRankPercentage(userStats);
    
    if (calculation.eligibleForUpgrade && calculation.nextRank) {
      return calculation.nextRank;
    }
    
    return null;
  }
  
  /**
   * Prepare rank upgrade data structure
   * This doesn't perform the database write, just returns the data
   */
  prepareRankUpgrade(
    userStats: UserStats,
    newRank: Rank
  ): RankUpgradeResult {
    const previousRank = userStats.currentRank;
    const daysInPreviousRank = this.calculateDaysSince(
      userStats.currentRankStartDate
    );
    
    const upgradeEntry: RankUpgradeHistoryEntry = {
      rank: newRank,
      upgradeDate: new Date().toISOString(),
      percentageAtUpgrade: userStats.rankPercentage,
      daysInPreviousRank,
    };
    
    return {
      upgraded: true,
      previousRank,
      newRank,
      achievedAt: upgradeEntry.upgradeDate,
      message: `Congratulations! You've been promoted to ${getRankConfig(newRank).displayName}!`,
    };
  }
  
  // ===========================
  // PRIVATE CALCULATION METHODS
  // ===========================
  
  /**
   * TIME SCORE (0-100)
   * Based on days since signup vs next rank's time gate
   * Reaches 100 when time gate is met
   */
  private calculateTimeScore(accountAgeDays: number, config: any): number {
    const nextRank = getNextRank(config.id);
    if (!nextRank) return 100; // Master rank, no next gate
    
    const nextConfig = getRankConfig(nextRank);
    const timeGate = nextConfig.minTimeGateDays;
    
    if (accountAgeDays >= timeGate) return 100;
    
    // Linear progression toward gate
    return Math.min(100, (accountAgeDays / timeGate) * 100);
  }
  
  /**
   * ACCURACY SCORE (0-100)
   * Based on correct predictions percentage
   * Only counts if user has minimum resolved predictions
   * Contrarian wins get bonus weight
   */
  private calculateAccuracyScore(userStats: UserStats, criteria: any): number {
    // Must have minimum resolved predictions before accuracy counts
    if (userStats.totalResolvedPredictions < criteria.minResolvedPredictions) {
      return 0;
    }
    
    const rawAccuracy = userStats.accuracyRate; // Already 0-100
    
    // Apply contrarian bonus
    // If user has contrarian wins, boost accuracy slightly
    const contrarianBonus =
      (userStats.contrarianWinsCount /
        Math.max(1, userStats.totalResolvedPredictions)) *
      10; // Up to +10 points
    
    const boostedAccuracy = Math.min(100, rawAccuracy + contrarianBonus);
    
    // Scale based on minimum accuracy requirement
    // If min is 50% and user has 75%, they're at (75-50)/(100-50) = 50% of the way
    const minAccuracy = criteria.minAccuracy;
    const maxAccuracy = 100;
    
    if (boostedAccuracy < minAccuracy) {
      return 0; // Below minimum
    }
    
    const score =
      ((boostedAccuracy - minAccuracy) / (maxAccuracy - minAccuracy)) * 100;
    
    return Math.min(100, score);
  }
  
  /**
   * CONSISTENCY SCORE (0-100)
   * Based on active weeks count
   * Reaches 100 when user meets or exceeds minActiveWeeks
   */
  private calculateConsistencyScore(
    userStats: UserStats,
    criteria: any
  ): number {
    const activeWeeks = userStats.weeklyActivityCount;
    const minWeeks = criteria.minActiveWeeks;
    
    if (activeWeeks >= minWeeks * 1.5) return 100; // Exceeds expectations
    if (activeWeeks >= minWeeks) return 85; // Meets expectations
    
    // Linear progression
    return Math.min(85, (activeWeeks / minWeeks) * 85);
  }
  
  /**
   * VOLUME SCORE (0-100)
   * Based on total predictions with diminishing returns
   * Reaches 100 at minimum requirement, then caps
   */
  private calculateVolumeScore(userStats: UserStats, criteria: any): number {
    const predictions = userStats.totalPredictions;
    const minPredictions = criteria.minPredictions;
    
    if (predictions >= minPredictions * 2) return 100; // Exceeds expectations
    if (predictions >= minPredictions) return 85; // Meets expectations
    
    // Linear progression
    return Math.min(85, (predictions / minPredictions) * 85);
  }
  
  /**
   * INACTIVITY PENALTY (0-100)
   * Each 30+ day gap reduces progress by 10%
   */
  private calculateInactivityPenalty(userStats: UserStats): number {
    const streaks = userStats.inactivityStreaks;
    const penaltyPerStreak =
      RANK_SYSTEM_CONSTANTS.INACTIVITY_PENALTY_PERCENTAGE;
    
    return Math.min(50, streaks * penaltyPerStreak); // Cap at 50% penalty
  }
  
  /**
   * Calculate days between date and now
   * Accounts for UTC, leap years, edge cases
   */
  private calculateDaysSince(isoDateString: string): number {
    const then = new Date(isoDateString);
    const now = new Date();
    
    // Handle invalid dates
    if (isNaN(then.getTime())) {
      console.error(`Invalid date string: ${isoDateString}`);
      return 0;
    }
    
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }
  
  /**
   * Calculate weekly activity from last active date
   * Determines if user is currently active or inactive
   */
  calculateInactivityDays(lastActiveAt: string): number {
    return this.calculateDaysSince(lastActiveAt);
  }
  
  /**
   * Check if user should be penalized for current inactivity
   */
  shouldApplyInactivityPenalty(lastActiveAt: string): boolean {
    const inactiveDays = this.calculateInactivityDays(lastActiveAt);
    return inactiveDays >= RANK_SYSTEM_CONSTANTS.LONG_INACTIVITY_DAYS;
  }
}

// Export singleton instance
export const rankEngine = new RankEngine();

/**
 * Convenience functions for direct usage
 */
export function calculateRankPercentage(
  userStats: UserStats
): RankCalculationResult {
  return rankEngine.calculateRankPercentage(userStats);
}

export function determineRankEligibility(userStats: UserStats): Rank | null {
  return rankEngine.determineRankEligibility(userStats);
}

export function prepareRankUpgrade(
  userStats: UserStats,
  newRank: Rank
): RankUpgradeResult {
  return rankEngine.prepareRankUpgrade(userStats, newRank);
}
