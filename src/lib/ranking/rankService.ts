// src/lib/ranking/rankService.ts
// SERVICE LAYER - Orchestrates rank calculations with rate limiting and logging
// Connects domain logic (rankEngine) with data access (repository)

import { rankEngine } from './rankEngine';
import {
  getUserStats,
  updateUserRank,
  updateUserActivityMetrics,
  updateLastRecalculationTime,
} from '../repositories/userRankRepository';
import {
  UserStats,
  Rank,
  RankCalculationResult,
  RankUpgradeResult,
  RateLimitCheck,
} from '@/types/rank';
import { RANK_SYSTEM_CONSTANTS, getNextRank, getRankConfig } from '@/config/ranks';

/**
 * RANK SERVICE
 * High-level service that coordinates rank operations
 * Handles rate limiting, logging, and error recovery
 */

export class RankService {
  /**
   * Recalculate user's rank percentage
   * Includes rate limiting to prevent abuse
   * 
   * @param userId - User ID to recalculate
   * @param force - Bypass rate limiting (for admin/background jobs)
   * @returns Updated calculation result
   */
  async recalculateUserRank(
    userId: string,
    force: boolean = false
  ): Promise<RankCalculationResult> {
    try {
      // 1. Get user stats
      const userStats = await getUserStats(userId);
      if (!userStats) {
        throw new Error(`User ${userId} not found`);
      }
      
      // 2. Check rate limiting (unless forced)
      if (!force) {
        const rateLimitCheck = this.checkRateLimit(userStats);
        if (!rateLimitCheck.allowed) {
          console.log(`[RANK SERVICE] Rate limit hit for user ${userId}`);
          throw new Error(rateLimitCheck.reason || 'Rate limit exceeded');
        }
      }
      
      // 3. Calculate new percentage using rank engine
      const calculation = rankEngine.calculateRankPercentage(userStats);
      
      // 4. Update user's rank percentage in database
      await updateUserRank(userId, {
        rankPercentage: calculation.percentage,
        lastRankUpdateAt: new Date().toISOString(),
      });
      
      // 5. Update rate limit timestamp
      await updateLastRecalculationTime(userId);
      
      // 6. Log calculation for monitoring
      console.log(`[RANK CALC] User ${userId}: ${calculation.percentage}%`, {
        breakdown: calculation.breakdown,
        eligible: calculation.eligibleForUpgrade,
      });
      
      // 7. Check if upgrade is possible
      if (calculation.eligibleForUpgrade && calculation.nextRank) {
        await this.performRankUpgrade(userId, userStats, calculation.nextRank);
      }
      
      return calculation;
    } catch (error: any) {
      console.error(`[RANK SERVICE] Error recalculating rank for ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Perform rank upgrade for a user
   * Updates rank, resets percentage, logs history
   * Triggers notifications
   */
  private async performRankUpgrade(
    userId: string,
    userStats: UserStats,
    newRank: Rank
  ): Promise<RankUpgradeResult> {
    try {
      // Prepare upgrade data
      const upgradeResult = rankEngine.prepareRankUpgrade(userStats, newRank);
      
      // Create history entry
      const newHistory = [
        ...userStats.rankUpgradeHistory,
        {
          rank: newRank,
          upgradeDate: upgradeResult.achievedAt,
          percentageAtUpgrade: userStats.rankPercentage,
          daysInPreviousRank: rankEngine['calculateDaysSince'](
            userStats.currentRankStartDate
          ),
        },
      ];
      
      // Update database
      await updateUserRank(userId, {
        currentRank: newRank,
        rankPercentage: 0, // Reset to 0 for new rank
        currentRankStartDate: upgradeResult.achievedAt,
        rankUpgradeHistory: newHistory,
        lastRankUpdateAt: upgradeResult.achievedAt,
      });
      
      // Log upgrade for audit trail
      console.log(
        `[RANK UPGRADE] User ${userId}: ${upgradeResult.previousRank} → ${newRank}`
      );
      
      // TODO: Trigger notifications
      // - In-app notification
      // - Email digest
      // - Analytics event
      if (RANK_SYSTEM_CONSTANTS.RANK_UPGRADE_NOTIFICATION_ENABLED) {
        await this.sendRankUpgradeNotification(userId, upgradeResult);
      }
      
      return upgradeResult;
    } catch (error: any) {
      console.error(`[RANK SERVICE] Error performing upgrade for ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Check rate limiting for recalculation
   * Max 1 recalculation per hour per user (from activity events)
   */
  private checkRateLimit(userStats: UserStats): RateLimitCheck {
    if (!userStats.lastRecalculationAt) {
      return { allowed: true, nextAllowedAt: new Date().toISOString() };
    }
    
    const lastCalc = new Date(userStats.lastRecalculationAt);
    const now = new Date();
    const hoursSince = (now.getTime() - lastCalc.getTime()) / (1000 * 60 * 60);
    
    const minInterval = RANK_SYSTEM_CONSTANTS.MIN_RECALCULATION_INTERVAL_HOURS;
    
    if (hoursSince < minInterval) {
      const nextAllowed = new Date(
        lastCalc.getTime() + minInterval * 60 * 60 * 1000
      );
      return {
        allowed: false,
        nextAllowedAt: nextAllowed.toISOString(),
        reason: `Recalculation available in ${Math.ceil(minInterval - hoursSince)} hours`,
      };
    }
    
    return { allowed: true, nextAllowedAt: now.toISOString() };
  }
  
  /**
   * Trigger recalculation when prediction resolves
   * Called by resolvePrediction Cloud Function
   */
  async onPredictionResolved(
    userId: string,
    wasCorrect: boolean,
    wasContrarian: boolean
  ): Promise<void> {
    try {
      // Get current stats
      const userStats = await getUserStats(userId);
      if (!userStats) return;
      
      // Update activity metrics
      const newTotalResolved = userStats.totalResolvedPredictions + 1;
      const newCorrect = wasCorrect
        ? userStats.correctPredictions + 1
        : userStats.correctPredictions;
      const newContrarian = wasContrarian && wasCorrect
        ? userStats.contrarianWinsCount + 1
        : userStats.contrarianWinsCount;
      const newAccuracy = (newCorrect / newTotalResolved) * 100;
      
      await updateUserActivityMetrics(userId, {
        totalResolvedPredictions: newTotalResolved,
        correctPredictions: newCorrect,
        contrarianWinsCount: newContrarian,
        accuracyRate: newAccuracy,
        lastActiveAt: new Date().toISOString(),
      });
      
      // Trigger recalculation (rate limited)
      await this.recalculateUserRank(userId, false);
    } catch (error: any) {
      console.error(`[RANK SERVICE] Error handling prediction resolution:`, error);
      // Don't throw - prediction resolution should succeed even if rank calc fails
    }
  }
  
  /**
   * Apply inactivity penalty to user
   * Called by inactivityDetection background job
   */
  async applyInactivityPenalty(userId: string): Promise<void> {
    try {
      const userStats = await getUserStats(userId);
      if (!userStats) return;
      
      // Increment inactivity streak count
      const newStreaks = userStats.inactivityStreaks + 1;
      
      await updateUserActivityMetrics(userId, {
        lastActiveAt: userStats.lastActiveAt, // Keep same
      });
      
      // Force recalculation to apply penalty
      await this.recalculateUserRank(userId, true);
      
      console.log(
        `[INACTIVITY] Applied penalty to user ${userId} (${newStreaks} streaks)`
      );
    } catch (error: any) {
      console.error(`[RANK SERVICE] Error applying inactivity penalty:`, error);
    }
  }
  
  /**
   * Send rank upgrade notification
   * Placeholder for notification system integration
   */
  private async sendRankUpgradeNotification(
    userId: string,
    upgradeResult: RankUpgradeResult
  ): Promise<void> {
    // TODO: Integrate with notification system
    // For now, just log
    console.log(`[NOTIFICATION] Rank upgrade for ${userId}:`, upgradeResult.message);
    
    // Future: Send in-app notification, email, etc.
  }
  
  /**
   * Get user's current rank status (for frontend)
   */
  async getUserRankStatus(userId: string): Promise<{
    userStats: UserStats;
    calculation: RankCalculationResult;
    nextRankConfig: any;
    estimatedDaysToNextRank: number | null;
  } | null> {
    try {
      const userStats = await getUserStats(userId);
      if (!userStats) return null;
      
      const calculation = rankEngine.calculateRankPercentage(userStats);
      const nextRank = getNextRank(userStats.currentRank);
      const nextRankConfig = nextRank ? getRankConfig(nextRank) : null;
      
      // Calculate estimated time to next rank
      // Based on current progress rate (very rough estimate)
      const daysInRank = rankEngine['calculateDaysSince'](
        userStats.currentRankStartDate
      );
      const progressRate = daysInRank > 0 ? userStats.rankPercentage / daysInRank : 0;
      const remainingPercentage = 100 - userStats.rankPercentage;
      const estimatedDays =
        progressRate > 0 ? Math.ceil(remainingPercentage / progressRate) : null;
      
      return {
        userStats,
        calculation,
        nextRankConfig,
        estimatedDaysToNextRank: estimatedDays,
      };
    } catch (error: any) {
      console.error(`[RANK SERVICE] Error getting rank status:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const rankService = new RankService();

/**
 * Convenience functions
 */
export async function recalculateUserRank(
  userId: string,
  force?: boolean
): Promise<RankCalculationResult> {
  return rankService.recalculateUserRank(userId, force);
}

export async function onPredictionResolved(
  userId: string,
  wasCorrect: boolean,
  wasContrarian: boolean
): Promise<void> {
  return rankService.onPredictionResolved(userId, wasCorrect, wasContrarian);
}

export async function getUserRankStatus(userId: string) {
  return rankService.getUserRankStatus(userId);
}
