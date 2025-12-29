// src/services/api/predictions.api.ts
// Backend-agnostic interface for prediction operations

export interface PredictionOption {
  id: string;
  label: string;
  votes: number;
}

export interface PredictionFilters {
  status?: 'draft' | 'active' | 'closed' | 'resolved';
  category?: string;
  isApproved?: boolean;
  createdBy?: string;
}

export interface Prediction {
  id: string;
  question: string;
  description?: string;
  options: PredictionOption[];
  category: string;
  subcategory?: string;
  imageUrl?: string;
  sourceLink?: string;
  createdBy: string;
  creatorName?: string;
  status: 'draft' | 'active' | 'closed' | 'resolved';
  published: boolean;
  isApproved: boolean;
  isFeatured?: boolean;
  startTime?: string;
  endTime: string;
  resolutionTime?: string;
  resolved: boolean;
  winningOption?: string;
  totalVotes: number;
  viewCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePredictionData {
  question: string;
  description?: string;
  options: { label: string }[];
  category: string;
  subcategory?: string;
  imageUrl?: string;
  sourceLink?: string;
  startTime?: string;
  endTime: string;
  resolutionTime?: string;
}

export interface UpdatePredictionData {
  question?: string;
  description?: string;
  options?: PredictionOption[];
  category?: string;
  status?: 'draft' | 'active' | 'closed' | 'resolved';
  published?: boolean;
  endTime?: string;
  resolutionTime?: string;
}

export interface PredictionsService {
  /**
   * Get a single prediction by ID
   */
  getPrediction(id: string): Promise<Prediction | null>;

  /**
   * List predictions with optional filters
   */
  listPredictions(filters?: PredictionFilters): Promise<Prediction[]>;

  /**
   * Subscribe to prediction updates (real-time)
   * @returns Unsubscribe function
   */
  subscribeToPredictions(
    filters: PredictionFilters,
    onUpdate: (predictions: Prediction[]) => void,
    onError?: (error: Error) => void
  ): () => void;

  /**
   * Create a new prediction (admin only)
   */
  createPrediction(data: CreatePredictionData, userId: string): Promise<Prediction>;

  /**
   * Update a prediction (admin only)
   */
  updatePrediction(id: string, data: UpdatePredictionData): Promise<void>;

  /**
   * Delete a prediction (admin only)
   */
  deletePrediction(id: string): Promise<void>;

  /**
   * Resolve a prediction and declare winner (admin only)
   */
  resolvePrediction(id: string, winningOption: string, userId: string): Promise<void>;

  /**
   * Increment view count
   */
  incrementViewCount(id: string): Promise<void>;
}
