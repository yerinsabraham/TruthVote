// src/services/api/auth.api.ts
// Backend-agnostic interface for authentication

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
}

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthService {
  /**
   * Get currently authenticated user
   */
  getCurrentUser(): Promise<AuthUser | null>;

  /**
   * Sign up with email and password
   */
  signUp(data: SignUpData): Promise<AuthUser>;

  /**
   * Sign in with email and password
   */
  signIn(data: SignInData): Promise<AuthUser>;

  /**
   * Sign in with Google
   */
  signInWithGoogle(): Promise<AuthUser>;

  /**
   * Sign out
   */
  signOut(): Promise<void>;

  /**
   * Send password reset email
   */
  resetPassword(email: string): Promise<void>;

  /**
   * Subscribe to auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
}
