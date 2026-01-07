// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from '@/lib/firebase/config';

interface AuthContextType {
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  isAdmin: boolean;
  refreshRank: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAdmin: false,
  refreshRank: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Function to refresh user's rank
  const refreshRank = async () => {
    if (!user) return;
    
    try {
      const functions = getFunctions();
      const recalculateMyRank = httpsCallable(functions, 'recalculateMyRank');
      const result = await recalculateMyRank({});
      const data = result.data as any;
      
      if (data.success) {
        // Reload user profile to get updated rank
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const profileData = userDoc.data();
          setUserProfile({ id: userDoc.id, ...profileData });
        }
        console.log('Rank auto-refreshed:', data.rankPercentage, '%');
      }
    } catch (error) {
      console.error('Error auto-refreshing rank:', error);
    }
  };

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
          
          // Auto-refresh rank in background (don't await to avoid blocking)
          setTimeout(async () => {
            try {
              const functions = getFunctions();
              const recalculateMyRank = httpsCallable(functions, 'recalculateMyRank');
              const result = await recalculateMyRank({});
              const data = result.data as any;
              
              if (data.success) {
                // Reload user profile to get updated rank
                const updatedUserDoc = await getDoc(doc(db, 'users', user.uid));
                if (updatedUserDoc.exists()) {
                  const updatedProfileData = updatedUserDoc.data();
                  setUserProfile({ id: updatedUserDoc.id, ...updatedProfileData });
                }
                console.log('Rank auto-refreshed:', data.rankPercentage, '%');
              }
            } catch (error) {
              console.error('Error auto-refreshing rank:', error);
            }
          }, 1000); // Delay 1 second to not block initial load
          
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
    <AuthContext.Provider value={{ user, userProfile, loading, isAdmin, refreshRank }}>
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
