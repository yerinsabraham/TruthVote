// src/services/api/votes.api.ts
// Backend-agnostic interface for vote operations

export interface VoteData {
  predictionId: string;
  userId: string;
  option: string;
  votedAt: string;
  predictionQuestion?: string;
  predictionCategory?: string;
}

export interface Vote {
  id: string;
  predictionId: string;
  userId: string;
  option: string;
  votedAt: string;
  predictionQuestion?: string;
  predictionCategory?: string;
  isCorrect?: boolean;
  pointsAwarded?: number;
}

export interface VotesService {
  /**
   * Submit a vote for a prediction
   * @throws Error if user already voted or prediction is not active
   */
  submitVote(
    predictionId: string,
    userId: string,
    option: string,
    predictionQuestion: string,
    predictionCategory: string,
    userDisplayName?: string,
    optionLabel?: string
  ): Promise<{ success: boolean; message?: string }>;

  /**
   * Check if user has voted on a prediction
   * @returns The option ID if voted, null if not voted
   */
  getUserVote(predictionId: string, userId: string): Promise<string | null>;

  /**
   * Get all votes by a user
   */
  getUserVotes(userId: string): Promise<Vote[]>;

  /**
   * Get all votes for a prediction
   */
  getPredictionVotes(predictionId: string): Promise<Vote[]>;

  /**
   * Delete a vote (admin only or for testing)
   */
  deleteVote(predictionId: string, userId: string): Promise<void>;
}
