// src/services/api/users.api.ts
// Backend-agnostic interface for user operations

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  role: 'user' | 'admin';
  totalPoints: number;
  totalVotes: number;
  correctVotes?: number;
  accuracy: number;
  badges?: Badge[];
  createdAt: string;
  lastActive: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  awardedAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  totalPoints: number;
  accuracy: number;
  totalVotes: number;
  rank: number;
}

export interface UsersService {
  /**
   * Get user profile by ID
   */
  getUserProfile(userId: string): Promise<UserProfile | null>;

  /**
   * Update user profile
   */
  updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void>;

  /**
   * Get leaderboard
   */
  getLeaderboard(limit?: number): Promise<LeaderboardEntry[]>;

  /**
   * Follow a user
   */
  followUser(followerId: string, followingId: string): Promise<void>;

  /**
   * Unfollow a user
   */
  unfollowUser(followerId: string, followingId: string): Promise<void>;

  /**
   * Check if user is following another user
   */
  isFollowing(followerId: string, followingId: string): Promise<boolean>;

  /**
   * Bookmark a prediction
   */
  bookmarkPrediction(userId: string, predictionId: string): Promise<void>;

  /**
   * Remove bookmark
   */
  removeBookmark(userId: string, predictionId: string): Promise<void>;

  /**
   * Check if prediction is bookmarked
   */
  isBookmarked(userId: string, predictionId: string): Promise<boolean>;

  /**
   * Get user's bookmarked predictions
   */
  getUserBookmarks(userId: string): Promise<string[]>;
}
