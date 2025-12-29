// src/app/profile/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { ProfileCardSkeleton } from '@/components/LoadingSkeleton';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

// Rank colors mapping
const RANK_COLORS: Record<string, string> = {
  novice: '#EF4444',
  amateur: '#3B82F6',
  analyst: '#A855F7',
  professional: '#F59E0B',
  expert: '#EC4899',
  master: '#22C55E',
};

const formatRankName = (rank: string): string => {
  if (!rank) return 'Novice';
  return rank.charAt(0).toUpperCase() + rank.slice(1).toLowerCase();
};

const getRankColor = (rank: string): string => {
  return RANK_COLORS[rank?.toLowerCase()] || RANK_COLORS.novice;
};

interface Vote {
  id: string;
  predictionId: string;
  predictionQuestion?: string;
  option: 'A' | 'B';
  votedAt: any;
  isCorrect?: boolean;
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const urlUserId = searchParams.get('id');
  const { user: currentUser, userProfile: authProfile, loading: authLoading } = useAuth();
  
  // If no userId in URL, use current user's ID
  const userId = urlUserId || currentUser?.uid;
  const isOwnProfile = currentUser?.uid === userId;
  
  const [profile, setProfile] = useState<any>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberSince, setMemberSince] = useState<string>('');
  const [refreshingRank, setRefreshingRank] = useState(false);

  useEffect(() => {
    // Wait for auth to load before checking userId
    if (authLoading) {
      return;
    }
    
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        // If viewing own profile, use authProfile from context first
        if (isOwnProfile && authProfile) {
          setProfile({
            ...authProfile,
            // Also include data from Firebase Auth user
            displayName: authProfile.displayName || currentUser?.displayName || 'User',
            email: authProfile.email || currentUser?.email || '',
            photoURL: authProfile.photoURL || currentUser?.photoURL || null,
          });
          
          // Format member since date
          if (authProfile.createdAt) {
            const date = authProfile.createdAt.toDate ? authProfile.createdAt.toDate() : new Date(authProfile.createdAt);
            setMemberSince(date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
          }
        } else {
          // Load profile from Firestore for other users
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfile(data);
            
            if (data.createdAt) {
              const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
              setMemberSince(date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
            }
          }
        }

        // Load recent votes
        try {
          const votesQuery = query(
            collection(db, 'votes'),
            where('userId', '==', userId),
            orderBy('votedAt', 'desc'),
            limit(10)
          );
          const votesSnapshot = await getDocs(votesQuery);
          const votesData = votesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Vote[];
          setVotes(votesData);
        } catch (err) {
          console.log('Votes query error (index may still be building):', err);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading profile:', error);
        
        // Fallback: If we're on own profile and there's an error, still show data from Auth
        if (isOwnProfile && currentUser) {
          setProfile({
            displayName: currentUser.displayName || 'User',
            email: currentUser.email || '',
            photoURL: currentUser.photoURL || null,
            rank: 'novice',
            totalVotes: 0,
            correctVotes: 0,
            accuracyRate: 0,
          });
        }
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId, isOwnProfile, authProfile, currentUser, authLoading]);

  const handleRefreshRank = async () => {
    if (!isOwnProfile || !currentUser) {
      toast.error('You can only refresh your own rank');
      return;
    }

    setRefreshingRank(true);
    try {
      const functions = getFunctions();
      const recalculateMyRank = httpsCallable(functions, 'recalculateMyRank');
      const result = await recalculateMyRank({});
      
      const data = result.data as any;
      
      if (data.success) {
        toast.success(`Rank updated to ${data.rankPercentage}%!`);
        
        // Reload profile to get updated percentage
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfile({
            ...profile,
            rankPercentage: userData.rankPercentage || 0,
            rankBreakdown: userData.rankBreakdown,
          });
        }
      } else {
        toast.info(data.message || 'Rank update not available yet');
      }
    } catch (error: any) {
      console.error('Error refreshing rank:', error);
      toast.error(error.message || 'Failed to refresh rank');
    } finally {
      setRefreshingRank(false);
    }
  };

  // Show loading while auth is initializing OR while profile data is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <ProfileCardSkeleton />
          
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="text-center p-4 animate-pulse">
                <div className="h-9 bg-muted rounded w-16 mx-auto mb-2"></div>
                <div className="h-4 bg-muted rounded w-20 mx-auto"></div>
              </Card>
            ))}
          </div>
          
          {/* Rank Progress Skeleton */}
          <Card className="mb-6 p-6 animate-pulse">
            <div className="h-6 bg-muted rounded w-40 mb-4"></div>
            <div className="flex items-center gap-3 flex-wrap">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-8 bg-muted rounded-full w-20"></div>
              ))}
            </div>
          </Card>
          
          {/* Recent Activity Skeleton */}
          <Card className="p-6 animate-pulse">
            <div className="h-6 bg-muted rounded w-32 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center max-w-md">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-xl font-bold mb-2">No Profile Found</h2>
          <p className="text-muted-foreground">Please sign in to view your profile.</p>
        </Card>
      </div>
    );
  }

  // If profile still null but we're on own profile, use Auth data
  const displayProfile = profile || (isOwnProfile && currentUser ? {
    displayName: currentUser.displayName || 'User',
    email: currentUser.email || '',
    photoURL: currentUser.photoURL || null,
    rank: 'novice',
    totalVotes: 0,
    correctVotes: 0,
    accuracyRate: 0,
  } : null);

  if (!displayProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold mb-2">User Not Found</h2>
          <p className="text-muted-foreground">This user profile doesn't exist.</p>
        </Card>
      </div>
    );
  }

  const rank = displayProfile.rank || 'novice';
  const rankColor = getRankColor(rank);
  const accuracyRate = displayProfile.accuracyRate ?? 0;
  const totalVotes = displayProfile.totalVotes ?? 0;
  const correctVotes = displayProfile.correctVotes ?? 0;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Profile Header Card */}
        <Card className="mb-6 overflow-hidden">
          {/* Banner Background */}
          <div 
            className="h-32 w-full"
            style={{ 
              background: `linear-gradient(135deg, ${rankColor}40 0%, ${rankColor}20 100%)`,
            }}
          />
          
          <CardContent className="relative pt-0 pb-6">
            {/* Profile Picture - Overlapping banner */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16 sm:-mt-12">
              <div className="relative">
                {displayProfile.photoURL ? (
                  <img 
                    src={displayProfile.photoURL} 
                    alt={displayProfile.displayName || 'User'}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-background shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div 
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-background shadow-lg flex items-center justify-center text-4xl font-bold text-white"
                    style={{ backgroundColor: rankColor }}
                  >
                    {displayProfile.displayName?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                
                {/* Rank Badge on Avatar */}
                <div 
                  className="absolute -bottom-1 -right-1 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg"
                  style={{ backgroundColor: rankColor }}
                >
                  {formatRankName(rank)}
                </div>
              </div>
              
              {/* User Info */}
              <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0 sm:pb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {displayProfile.displayName || 'User'}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {displayProfile.email}
                </p>
                {memberSince && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Member since {memberSince}
                  </p>
                )}
              </div>
              
              {/* Own Profile Indicator */}
              {isOwnProfile && (
                <div className="sm:absolute sm:top-4 sm:right-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Your Profile
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="text-center p-4">
            <div className="text-3xl font-bold text-foreground">{totalVotes}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Votes</div>
          </Card>
          
          <Card className="text-center p-4">
            <div className="text-3xl font-bold text-green-500">{correctVotes}</div>
            <div className="text-sm text-muted-foreground mt-1">Correct</div>
          </Card>
          
          <Card className="text-center p-4">
            <div className="text-3xl font-bold" style={{ color: rankColor }}>
              {accuracyRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">Accuracy</div>
          </Card>
        </div>

        {/* Rank Progress Card */}
        <Card className="mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-2xl">📈</span>
              Rank Progress
              {profile?.rankPercentage !== undefined && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({profile.rankPercentage}%)
                </span>
              )}
            </h3>
            
            {isOwnProfile && (
              <Button 
                onClick={handleRefreshRank}
                disabled={refreshingRank}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                {refreshingRank ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-primary"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Rank
                  </>
                )}
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {['novice', 'amateur', 'analyst', 'professional', 'expert', 'master'].map((r, index) => {
              const isCurrentRank = r === rank.toLowerCase();
              const isPastRank = ['novice', 'amateur', 'analyst', 'professional', 'expert', 'master'].indexOf(r) < 
                                 ['novice', 'amateur', 'analyst', 'professional', 'expert', 'master'].indexOf(rank.toLowerCase());
              const isFutureRank = !isCurrentRank && !isPastRank;
              
              return (
                <div key={r} className="flex items-center gap-2">
                  <div 
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                      isCurrentRank 
                        ? 'text-white shadow-lg scale-110' 
                        : isPastRank 
                          ? 'text-white opacity-60' 
                          : 'text-primary/70'
                    }`}
                    style={{ 
                      backgroundColor: isCurrentRank || isPastRank 
                        ? getRankColor(r) 
                        : 'hsl(var(--primary) / 0.15)'
                    }}
                  >
                    {formatRankName(r)}
                  </div>
                  {index < 5 && (
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🗳️</span>
            Recent Votes
          </h3>
          
          {votes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📊</div>
              <h4 className="text-lg font-medium text-foreground mb-2">No votes yet</h4>
              <p className="text-muted-foreground">
                {isOwnProfile 
                  ? "Start voting on predictions to build your track record!" 
                  : "This user hasn't voted on any predictions yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {votes.map(vote => (
                <div
                  key={vote.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: vote.option === 'A' ? '#3B82F6' : '#8B5CF6' }}
                  >
                    {vote.option}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {vote.predictionQuestion || `Prediction ${vote.predictionId?.slice(0, 8) || 'Unknown'}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Voted Option {vote.option}
                      {vote.isCorrect !== undefined && (
                        <span className={`ml-2 font-medium ${vote.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                          {vote.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {vote.votedAt?.toDate?.()?.toLocaleDateString() || ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <main className="flex-1">
        <Suspense fallback={
          <div className="min-h-screen bg-background py-8">
            <div className="container mx-auto px-4 max-w-4xl">
              <ProfileCardSkeleton />
            </div>
          </div>
        }>
          <ProfileContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
