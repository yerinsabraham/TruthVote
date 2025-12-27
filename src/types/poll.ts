// src/types/poll.ts
import { Timestamp } from 'firebase/firestore';

export interface PollOption {
  id: string; // 'A', 'B', 'C', etc.
  label: string; // The text of the option
  votes: number; // Number of votes for this option
}

export interface Poll {
  id: string;
  question: string;
  description?: string; // Optional context
  options: PollOption[]; // Dynamic array of options (min 2)
  category: string;
  subcategory?: string;
  imageUrl?: string;
  sourceLink?: string;
  createdAt: Timestamp;
  startTime?: Timestamp; // When voting begins
  endTime: Timestamp; // When voting closes
  resolutionTime?: Timestamp; // When prediction resolves
  resolved: boolean;
  winningOption: string | null; // Option ID ('A', 'B', 'C', etc.)
  totalVotes: number;
  createdBy: string; // userId (admin only)
  status: 'draft' | 'active' | 'closed' | 'resolved'; // Prediction lifecycle
  published: boolean; // Whether visible to users
  
  // Legacy support for existing data
  optionA?: string;
  optionB?: string;
  votesA?: number;
  votesB?: number;
}

export interface PollFormData {
  question: string;
  optionA: string;
  optionB: string;
  category: string;
  endTime: Date;
  imageUrl?: string;
  sourceLink?: string;
}

export type PollStatus = 'active' | 'expired' | 'resolved';

export interface Category {
  id: string;
  name: string;
  displayOrder: number;
  pollCount: number;
  subcategories?: string[];
}
