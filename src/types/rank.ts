// src/types/rank.ts
// Backend-agnostic type definitions for TruthRank system

export enum Rank {
  NOVICE = 'novice',
  AMATEUR = 'amateur',
  ANALYST = 'analyst',
  PROFESSIONAL = 'professional',
  EXPERT = 'expert',
  MASTER = 'master'
}

export interface RankConfig {
  id: Rank;
  displayName: string;
  displayColor: string;
  badgeIcon: string;
  minTimeGateDays: number; // Minimum days on platform
  criteria: RankCriteria;
}

export interface RankCriteria {
  minPredictions: number;
  minAccuracy: number; // Percentage (0-100)
  minResolvedPredictions: number; // Before accuracy counts
  minActiveWeeks: number;
  accuracyWeight: number; // Weight in percentage calculation
  consistencyWeight: number;
  volumeWeight: number;
  timeWeight: number;
}

export interface UserStats {
  userId: string;
  createdAt: string; // ISO 8601 UTC
  currentRank: Rank;
  rankPercentage: number; // 0-100
  lastRankUpdateAt: string; // ISO 8601 UTC
  rankUpgradeHistory: RankUpgradeHistoryEntry[];
  
  // Activity metrics
  totalPredictions: number;
  totalResolvedPredictions: number;
  correctPredictions: number;
  accuracyRate: number; // Calculated field (0-100)
  contrarianWinsCount: number; // Predictions where user was minority and correct
  
  // Consistency metrics
  weeklyActivityCount: number; // Rolling count of active weeks
  lastActiveAt: string; // ISO 8601 UTC
  inactivityStreaks: number; // Count of 30+ day gaps
  currentRankStartDate: string; // ISO 8601 UTC
  
  // Rate limiting
  lastRecalculationAt?: string; // ISO 8601 UTC
}

export interface RankUpgradeHistoryEntry {
  rank: Rank;
  upgradeDate: string; // ISO 8601 UTC
  percentageAtUpgrade: number;
  daysInPreviousRank: number;
}

export interface RankUpgradeResult {
  upgraded: boolean;
  previousRank: Rank;
  newRank: Rank;
  achievedAt: string; // ISO 8601 UTC
  message: string;
}

export interface RankCalculationResult {
  percentage: number; // 0-100
  breakdown: {
    timeScore: number;
    accuracyScore: number;
    consistencyScore: number;
    volumeScore: number;
  };
  eligibleForUpgrade: boolean;
  nextRank: Rank | null;
  blockers: string[]; // Reasons why upgrade is blocked
}

export interface PredictionResolutionData {
  predictionId: string;
  resolvedAt: string; // ISO 8601 UTC
  outcome: string; // The correct answer
  userVote: string | null; // What this user voted (null if didn't vote)
  totalVotes: number;
  majorityVote: string;
  difficultyWeight: number; // 0-1, calculated from vote distribution
  userWasCorrect: boolean;
  userWasContrarian: boolean; // Voted against majority
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  currentRank: Rank;
  rankPercentage: number;
  accuracyRate: number;
  totalPredictions: number;
  position: number;
}

export interface LeaderboardCache {
  rank: Rank;
  topUsers: LeaderboardEntry[];
  lastUpdatedAt: string; // ISO 8601 UTC
  ttl: number; // Seconds
}

// Background job result types
export interface RankRecalculationJobResult {
  startedAt: string;
  completedAt: string;
  usersProcessed: number;
  upgradesTriggered: number;
  errors: number;
  errorDetails: { userId: string; error: string }[];
}

export interface InactivityDetectionJobResult {
  startedAt: string;
  completedAt: string;
  inactiveUsersFound: number;
  penaltiesApplied: number;
  notificationsSent: number;
}

// Rate limiting
export interface RateLimitCheck {
  allowed: boolean;
  nextAllowedAt: string; // ISO 8601 UTC
  reason?: string;
}
