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
  predictionImage?: string;
  option: 'A' | 'B';
  optionLabel?: string;
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

        // Load recent votes with prediction details
        try {
          const votesQuery = query(
            collection(db, 'votes'),
            where('userId', '==', userId),
            orderBy('votedAt', 'desc'),
            limit(10)
          );
          const votesSnapshot = await getDocs(votesQuery);
          
          // Fetch prediction details for each vote
          const votesWithDetails = await Promise.all(
            votesSnapshot.docs.map(async (voteDoc) => {
              const voteData = voteDoc.data();
              let predictionQuestion = voteData.predictionQuestion;
              let predictionImage = null;
              let optionLabel = '';
              
              // Fetch prediction details if we have predictionId
              if (voteData.predictionId) {
                try {
                  const predDoc = await getDoc(doc(db, 'predictions', voteData.predictionId));
                  if (predDoc.exists()) {
                    const predData = predDoc.data();
                    predictionQuestion = predData.question || predictionQuestion;
                    predictionImage = predData.imageUrl || null;
                    
                    // Get option label from options array or legacy fields
                    if (predData.options && Array.isArray(predData.options)) {
                      const selectedOption = predData.options.find((opt: any) => opt.id === voteData.option);
                      optionLabel = selectedOption?.label || '';
                    } else if (voteData.option === 'A' && predData.optionA) {
                      optionLabel = predData.optionA;
                    } else if (voteData.option === 'B' && predData.optionB) {
                      optionLabel = predData.optionB;
                    }
                  }
                } catch (err) {
                  console.log('Error fetching prediction:', err);
                }
              }
              
              return {
                id: voteDoc.id,
                predictionId: voteData.predictionId,
                predictionQuestion,
                predictionImage,
                option: voteData.option,
                optionLabel,
                votedAt: voteData.votedAt,
                isCorrect: voteData.isCorrect,
              } as Vote;
            })
          );
          
          setVotes(votesWithDetails);
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
              
              {/* Own Profile Indicator & Settings */}
              {isOwnProfile && (
                <div className="sm:absolute sm:top-4 sm:right-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Your Profile
                  </span>
                  <a 
                    href="/settings"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Settings"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </a>
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
            <div>
              <h3 className="text-lg font-semibold">Rank Progress</h3>
              {profile?.rankPercentage !== undefined && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {profile.rankPercentage}% to next rank
                </p>
              )}
            </div>
            
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
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
            <h3 className="text-lg font-semibold">Recent Predictions</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isOwnProfile ? 'Your voting history' : 'Voting history'}
            </p>
          </div>
          
          {votes.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">No predictions yet</h4>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {isOwnProfile 
                  ? "Start voting on predictions to build your track record!" 
                  : "This user hasn't voted on any predictions yet."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {votes.map(vote => (
                <a
                  key={vote.id}
                  href={`/prediction?id=${vote.predictionId}`}
                  className="flex gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                >
                  {/* Prediction Image */}
                  <div className="flex-shrink-0">
                    {vote.predictionImage ? (
                      <img 
                        src={vote.predictionImage}
                        alt=""
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-border/50"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-border/50 flex items-center justify-center">
                        <svg className="w-8 h-8 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 py-1">
                    <h4 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2">
                      {vote.predictionQuestion || 'Prediction'}
                    </h4>
                    
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {/* Vote Choice */}
                      <span 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-white"
                        style={{ backgroundColor: vote.option === 'A' ? '#3B82F6' : '#8B5CF6' }}
                      >
                        Voted: {vote.optionLabel || `Option ${vote.option}`}
                      </span>
                      
                      {/* Result Badge */}
                      {vote.isCorrect !== undefined && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          vote.isCorrect 
                            ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                            : 'bg-red-500/10 text-red-600 border border-red-500/20'
                        }`}>
                          {vote.isCorrect ? (
                            <>
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Correct
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              Incorrect
                            </>
                          )}
                        </span>
                      )}
                      
                      {/* Date */}
                      <span className="text-muted-foreground text-xs ml-auto">
                        {vote.votedAt?.toDate?.()?.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: vote.votedAt?.toDate?.()?.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        }) || ''}
                      </span>
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </a>
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
