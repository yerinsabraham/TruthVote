// src/lib/repositories/userRankRepository.ts
// DATA ACCESS LAYER - Repository pattern for rank-related database operations
// Abstracts Firebase Firestore operations for easier AWS migration

import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  collection,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  UserStats,
  Rank,
  RankUpgradeHistoryEntry,
  LeaderboardEntry,
  LeaderboardCache,
} from '@/types/rank';
import { Rank as RankEnum } from '@/types/rank';

/**
 * REPOSITORY ERROR TYPES
 * Consistent error handling across all repository functions
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * USER RANK REPOSITORY
 * Centralized data access for all rank-related operations
 */

/**
 * Get complete user stats for rank calculations
 * Returns null if user not found
 */
export async function getUserStats(userId: string): Promise<UserStats | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const data = userDoc.data();
    
    // Map Firestore data to UserStats interface
    const userStats: UserStats = {
      userId,
      createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
      currentRank: data.currentRank || RankEnum.NOVICE,
      rankPercentage: data.rankPercentage || 0,
      lastRankUpdateAt: data.lastRankUpdateAt?.toDate?.().toISOString() || new Date().toISOString(),
      rankUpgradeHistory: data.rankUpgradeHistory || [],
      
      // Activity metrics
      totalPredictions: data.totalPredictions || 0,
      totalResolvedPredictions: data.totalResolvedPredictions || 0,
      correctPredictions: data.correctPredictions || data.correctVotes || 0,
      accuracyRate: data.accuracyRate || data.accuracy || 0,
      contrarianWinsCount: data.contrarianWinsCount || 0,
      
      // Consistency metrics
      weeklyActivityCount: data.weeklyActivityCount || 0,
      lastActiveAt: data.lastActiveAt?.toDate?.().toISOString() || data.lastActive?.toDate?.().toISOString() || new Date().toISOString(),
      inactivityStreaks: data.inactivityStreaks || 0,
      currentRankStartDate: data.currentRankStartDate?.toDate?.().toISOString() || data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
      
      // Rate limiting
      lastRecalculationAt: data.lastRecalculationAt?.toDate?.().toISOString(),
    };
    
    return userStats;
  } catch (error: any) {
    console.error('Error getting user stats:', error);
    throw new RepositoryError(
      'Failed to fetch user stats',
      'GET_USER_STATS_ERROR',
      error
    );
  }
}

/**
 * Update user rank and related fields
 * Logs the update operation
 */
export async function updateUserRank(
  userId: string,
  updates: {
    currentRank?: Rank;
    rankPercentage?: number;
    rankUpgradeHistory?: RankUpgradeHistoryEntry[];
    currentRankStartDate?: string;
    lastRankUpdateAt?: string;
  }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    
    const firestoreUpdates: any = {};
    
    if (updates.currentRank !== undefined) {
      firestoreUpdates.currentRank = updates.currentRank;
    }
    if (updates.rankPercentage !== undefined) {
      firestoreUpdates.rankPercentage = updates.rankPercentage;
    }
    if (updates.rankUpgradeHistory !== undefined) {
      firestoreUpdates.rankUpgradeHistory = updates.rankUpgradeHistory;
    }
    if (updates.currentRankStartDate !== undefined) {
      firestoreUpdates.currentRankStartDate = Timestamp.fromDate(
        new Date(updates.currentRankStartDate)
      );
    }
    if (updates.lastRankUpdateAt !== undefined) {
      firestoreUpdates.lastRankUpdateAt = Timestamp.fromDate(
        new Date(updates.lastRankUpdateAt)
      );
    }
    
    await updateDoc(userRef, firestoreUpdates);
    
    // Log the update for audit trail
    console.log(`[RANK UPDATE] User ${userId}:`, updates);
  } catch (error: any) {
    console.error('Error updating user rank:', error);
    throw new RepositoryError(
      'Failed to update user rank',
      'UPDATE_USER_RANK_ERROR',
      error
    );
  }
}

/**
 * Update user activity metrics (called after prediction resolution)
 */
export async function updateUserActivityMetrics(
  userId: string,
  updates: {
    totalPredictions?: number;
    totalResolvedPredictions?: number;
    correctPredictions?: number;
    accuracyRate?: number;
    contrarianWinsCount?: number;
    weeklyActivityCount?: number;
    lastActiveAt?: string;
  }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    
    const firestoreUpdates: any = {};
    
    if (updates.totalPredictions !== undefined) {
      firestoreUpdates.totalPredictions = updates.totalPredictions;
    }
    if (updates.totalResolvedPredictions !== undefined) {
      firestoreUpdates.totalResolvedPredictions = updates.totalResolvedPredictions;
    }
    if (updates.correctPredictions !== undefined) {
      firestoreUpdates.correctPredictions = updates.correctPredictions;
    }
    if (updates.accuracyRate !== undefined) {
      firestoreUpdates.accuracyRate = updates.accuracyRate;
    }
    if (updates.contrarianWinsCount !== undefined) {
      firestoreUpdates.contrarianWinsCount = updates.contrarianWinsCount;
    }
    if (updates.weeklyActivityCount !== undefined) {
      firestoreUpdates.weeklyActivityCount = updates.weeklyActivityCount;
    }
    if (updates.lastActiveAt !== undefined) {
      firestoreUpdates.lastActiveAt = Timestamp.fromDate(
        new Date(updates.lastActiveAt)
      );
    }
    
    await updateDoc(userRef, firestoreUpdates);
  } catch (error: any) {
    console.error('Error updating user activity metrics:', error);
    throw new RepositoryError(
      'Failed to update activity metrics',
      'UPDATE_ACTIVITY_METRICS_ERROR',
      error
    );
  }
}

/**
 * Get user's rank upgrade history for debugging/auditing
 */
export async function getUserRankHistory(
  userId: string
): Promise<RankUpgradeHistoryEntry[]> {
  try {
    const userStats = await getUserStats(userId);
    return userStats?.rankUpgradeHistory || [];
  } catch (error: any) {
    console.error('Error getting user rank history:', error);
    throw new RepositoryError(
      'Failed to fetch rank history',
      'GET_RANK_HISTORY_ERROR',
      error
    );
  }
}

/**
 * Get leaderboard for a specific rank
 * Returns top N users sorted by rank percentage
 */
export async function getRankLeaderboard(
  rank: Rank,
  limitCount: number = 10
): Promise<LeaderboardEntry[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('currentRank', '==', rank),
      orderBy('rankPercentage', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    
    const leaderboard: LeaderboardEntry[] = snapshot.docs.map((doc, index) => {
      const data = doc.data();
      return {
        userId: doc.id,
        displayName: data.displayName || 'Anonymous',
        avatarUrl: data.avatarUrl,
        currentRank: data.currentRank,
        rankPercentage: data.rankPercentage || 0,
        accuracyRate: data.accuracyRate || 0,
        totalPredictions: data.totalPredictions || 0,
        position: index + 1,
      };
    });
    
    return leaderboard;
  } catch (error: any) {
    console.error('Error getting rank leaderboard:', error);
    throw new RepositoryError(
      'Failed to fetch leaderboard',
      'GET_LEADERBOARD_ERROR',
      error
    );
  }
}

/**
 * Get user's position in their rank's leaderboard
 */
export async function getUserLeaderboardPosition(
  userId: string,
  rank: Rank
): Promise<number | null> {
  try {
    const userStats = await getUserStats(userId);
    if (!userStats) return null;
    
    // Count users with higher percentage in same rank
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('currentRank', '==', rank),
      where('rankPercentage', '>', userStats.rankPercentage)
    );
    
    const snapshot = await getDocs(q);
    const position = snapshot.size + 1;
    
    return position;
  } catch (error: any) {
    console.error('Error getting user leaderboard position:', error);
    return null;
  }
}

/**
 * Cache leaderboard data (for performance)
 */
export async function cacheLeaderboard(
  rank: Rank,
  leaderboard: LeaderboardEntry[],
  ttlHours: number
): Promise<void> {
  try {
    const cacheRef = doc(db, 'leaderboards', rank);
    const cacheData: LeaderboardCache = {
      rank,
      topUsers: leaderboard,
      lastUpdatedAt: new Date().toISOString(),
      ttl: ttlHours * 3600, // Convert to seconds
    };
    
    await updateDoc(cacheRef, cacheData as any);
  } catch (error: any) {
    // Don't throw on cache errors, just log
    console.error('Error caching leaderboard:', error);
  }
}

/**
 * Get cached leaderboard (if still valid)
 */
export async function getCachedLeaderboard(
  rank: Rank
): Promise<LeaderboardEntry[] | null> {
  try {
    const cacheRef = doc(db, 'leaderboards', rank);
    const cacheDoc = await getDoc(cacheRef);
    
    if (!cacheDoc.exists()) return null;
    
    const data = cacheDoc.data() as LeaderboardCache;
    const lastUpdated = new Date(data.lastUpdatedAt);
    const now = new Date();
    const ageSeconds = (now.getTime() - lastUpdated.getTime()) / 1000;
    
    // Check if cache is still valid
    if (ageSeconds < data.ttl) {
      return data.topUsers;
    }
    
    return null;
  } catch (error: any) {
    console.error('Error getting cached leaderboard:', error);
    return null;
  }
}

/**
 * Get all users who need rank recalculation
 * Used by background jobs
 */
export async function getUsersForRecalculation(
  batchSize: number = 100
): Promise<UserStats[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      orderBy('lastRankUpdateAt', 'asc'),
      limit(batchSize)
    );
    
    const snapshot = await getDocs(q);
    const users: UserStats[] = [];
    
    for (const doc of snapshot.docs) {
      const userStats = await getUserStats(doc.id);
      if (userStats) {
        users.push(userStats);
      }
    }
    
    return users;
  } catch (error: any) {
    console.error('Error getting users for recalculation:', error);
    throw new RepositoryError(
      'Failed to fetch users for recalculation',
      'GET_USERS_FOR_RECALC_ERROR',
      error
    );
  }
}

/**
 * Mark user's last recalculation time (for rate limiting)
 */
export async function updateLastRecalculationTime(
  userId: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      lastRecalculationAt: Timestamp.now(),
    });
  } catch (error: any) {
    // Don't throw on rate limit tracking errors
    console.error('Error updating last recalculation time:', error);
  }
}
