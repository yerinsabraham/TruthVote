// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';

interface AuthContextType {
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Set a maximum loading time of 10 seconds
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout - proceeding without auth');
        setLoading(false);
      }
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(loadingTimeout);
      setUser(user);
      
      if (user) {
        try {
          // Check admin status via custom claims (more secure)
          const tokenResult = await user.getIdTokenResult();
          const isAdminClaim = tokenResult.claims.admin === true;
          
          // Also verify email matches admin email as fallback
          const isAdminEmail = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
          
          setIsAdmin(isAdminClaim || isAdminEmail);
          
          // Fetch user profile from Firestore with timeout
          const userDoc = await Promise.race([
            getDoc(doc(db, 'users', user.uid)),
            new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error('Firestore timeout')), 5000)
            )
          ]);
          
          if (userDoc && userDoc.exists()) {
            const profileData = userDoc.data();
            const profile = { id: userDoc.id, ...profileData };
            setUserProfile(profile);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          // Continue anyway - user is authenticated even if profile fails to load
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => {
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
