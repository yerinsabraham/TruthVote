// src/types/user.ts
import { Timestamp } from 'firebase/firestore';

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
}

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  avatarUrl: string;
  totalPoints: number;
  accuracy: number;
  totalVotes: number;
  rank: number;
}
