// src/services/api/categories.api.ts
// Backend-agnostic interface for category operations

export interface Category {
  id: string;
  name: string;
  displayOrder: number;
  pollCount: number;
  subcategories?: string[];
  createdAt: string;
}

export interface CategoriesService {
  /**
   * Get all categories
   */
  listCategories(): Promise<Category[]>;

  /**
   * Subscribe to category updates (real-time)
   * @returns Unsubscribe function
   */
  subscribeToCategories(
    onUpdate: (categories: Category[]) => void,
    onError?: (error: Error) => void
  ): () => void;

  /**
   * Create a new category (admin only)
   */
  createCategory(name: string, displayOrder: number): Promise<Category>;

  /**
   * Update a category (admin only)
   */
  updateCategory(id: string, data: Partial<Category>): Promise<void>;

  /**
   * Delete a category (admin only)
   */
  deleteCategory(id: string): Promise<void>;
}
