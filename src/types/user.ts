// src/types/user.ts
import { Timestamp } from 'firebase/firestore';
import { Rank } from './rank';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  totalPoints: number;
  totalVotes: number;
  correctPredictions: number;
  accuracy: number;
  role: 'user' | 'admin';
  createdAt: Timestamp;
  lastActive: Timestamp;
  
  // TruthRank fields
  currentRank: Rank;
  rankPercentage: number;
  totalResolvedPredictions: number;
  contrarianWinsCount: number;
  weeklyActivityCount: number;
  inactivityStreaks: number;
  currentRankStartDate: string; // ISO 8601 UTC
  lastRankUpdateAt: string; // ISO 8601 UTC
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  totalPoints: number;
  totalVotes: number;
  correctPredictions: number;
  accuracy: number;
  
  // TruthRank fields for profile display
  currentRank: Rank;
  rankPercentage: number;
}

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  avatarUrl: string;
  totalPoints: number;
  accuracy: number;
  totalVotes: number;
  rank: number;
  
  // TruthRank fields for leaderboards
  currentRank: Rank;
  rankPercentage: number;
}
