// src/types/vote.ts
import { Timestamp } from 'firebase/firestore';

export interface Vote {
  id: string;
  userId: string;
  pollId: string;
  option: 'A' | 'B';
  timestamp: Timestamp;
  confidence?: number; // 1-5 (future feature)
}

export interface VoteSubmission {
  pollId: string;
  option: 'A' | 'B';
}

export interface UserVoteHistory {
  pollId: string;
  pollQuestion: string;
  option: 'A' | 'B';
  timestamp: Date;
  result: 'won' | 'lost' | 'pending';
  points: number;
}
