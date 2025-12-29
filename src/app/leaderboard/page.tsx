// src/app/leaderboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit as firestoreLimit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { RANK_CONFIGS } from '@/config/ranks';
import { Rank } from '@/types/rank';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

interface LeaderboardUser {
  uid: string;
  displayName: string;
  photoURL?: string;
  rank: string;
  rankPercentage: number;
  position?: number;
}

interface RankTab {
  id: Rank;
  name: string;
  color: string;
}

const RANK_TABS: RankTab[] = [
  { id: Rank.NOVICE, name: 'Novice', color: '#EF4444' },
  { id: Rank.AMATEUR, name: 'Amateur', color: '#3B82F6' },
  { id: Rank.ANALYST, name: 'Analyst', color: '#A855F7' },
  { id: Rank.PROFESSIONAL, name: 'Professional', color: '#F59E0B' },
  { id: Rank.EXPERT, name: 'Expert', color: '#EC4899' },
  { id: Rank.MASTER, name: 'Master', color: '#22C55E' },
];

export default function LeaderboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { user, userProfile } = useAuth();
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);
  const [userPosition, setUserPosition] = useState<number>(0);

  const currentRank = (userProfile?.rank as Rank) || Rank.NOVICE;
  const viewingRank = selectedRank || currentRank;
  const rankConfig = RANK_CONFIGS[viewingRank];
  const nextRankIndex = Object.values(Rank).indexOf(viewingRank) + 1;
  const nextRank = nextRankIndex < Object.values(Rank).length ? Object.values(Rank)[nextRankIndex] : null;
  const currentRankIndex = RANK_TABS.findIndex(r => r.id === currentRank);

  useEffect(() => {
    if (!userProfile) return;
    setSelectedRank(currentRank);
    
    // Trigger rank recalculation if percentage is 0 and user has been active
    if (user && userProfile.rankPercentage === 0) {
      console.log('Rank percentage is 0, may need recalculation');
      // The backend should handle this automatically, but log for debugging
    }
  }, [userProfile, currentRank, user]);

  useEffect(() => {
    loadLeaderboard();
  }, [viewingRank, user]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);

      // Load top 9 users in the selected rank
      const topUsersQuery = query(
        collection(db, 'users'),
        where('rank', '==', viewingRank),
        orderBy('rankPercentage', 'desc'),
        firestoreLimit(9)
      );
      
      const topSnapshot = await getDocs(topUsersQuery);
      const topData = topSnapshot.docs.map((doc, index) => ({
        uid: doc.id,
        displayName: doc.data().displayName || 'User',
        photoURL: doc.data().photoURL,
        rank: doc.data().rank,
        rankPercentage: doc.data().rankPercentage || 0,
        position: index + 1,
      }));

      setTopUsers(topData);

      // If viewing own rank and logged in, find user position
      if (user && viewingRank === currentRank) {
        // Check if user is already in top 9
        const userInTop = topData.find(u => u.uid === user.uid);
        
        if (userInTop) {
          setCurrentUser(userInTop);
          setUserPosition(userInTop.position!);
        } else {
          // User not in top 9, calculate their position
          const userRankPercentage = userProfile?.rankPercentage || 0;
          
          // Count how many users have higher percentage
          const higherUsersQuery = query(
            collection(db, 'users'),
            where('rank', '==', currentRank),
            where('rankPercentage', '>', userRankPercentage)
          );
          
          const higherSnapshot = await getDocs(higherUsersQuery);
          const position = higherSnapshot.size + 1;
          
          setUserPosition(position);
          setCurrentUser({
            uid: user.uid,
            displayName: userProfile?.displayName || user.displayName || 'You',
            photoURL: userProfile?.photoURL || user.photoURL,
            rank: currentRank,
            rankPercentage: userRankPercentage,
            position,
          });
        }
      }

      console.log('Leaderboard loaded:', { 
        topUsers: topData.length, 
        currentUser: currentUser?.displayName,
        userRankPercentage: userProfile?.rankPercentage,
        userPhotoURL: user?.photoURL 
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLoading(false);
    }
  };

  const getProgressBarWidth = (percentage: number) => {
    return Math.min(Math.max(percentage, 0), 100);
  };

  const getRankColor = (rank: Rank) => {
    return RANK_CONFIGS[rank]?.displayColor || '#9CA3AF';
  };

  // Render loading skeleton
  if (loading) {
    const loadingSkeleton = (
      <div className="min-h-screen py-4 sm:py-8 pb-24 md:pb-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header Skeleton */}
          <div className="text-center mb-8 animate-pulse">
            <div className="h-10 bg-muted rounded w-64 mx-auto mb-2"></div>
            <div className="h-4 bg-muted rounded w-48 mx-auto"></div>
          </div>

          {/* Progress Card Skeleton */}
          <Card className="mb-6 animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-6 bg-muted rounded w-32 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </div>
              </div>
              <div className="h-3 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded w-40"></div>
            </CardContent>
          </Card>

          {/* Tabs Skeleton */}
          <div className="flex gap-2 overflow-x-auto mb-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-10 bg-muted rounded-lg w-24 animate-pulse"></div>
            ))}
          </div>

          {/* Leaderboard Skeleton */}
          <Card className="animate-pulse">
            <CardContent className="p-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                <div key={i} className="flex items-center gap-4 p-3 mb-2">
                  <div className="w-10 bg-muted rounded h-10"></div>
                  <div className="w-11 h-11 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                    <div className="h-2.5 bg-muted rounded"></div>
                  </div>
                  <div className="h-4 bg-muted rounded w-12"></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
    
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="flex-1">
          {loadingSkeleton}
        </main>
        <Footer />
      </div>
    );
  }

  const pageContent = (
    <div className="min-h-screen py-4 sm:py-8 pb-24 md:pb-8 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            {rankConfig.displayName} Leaderboard
          </h1>
          <p className="text-muted-foreground text-sm">
            {viewingRank === currentRank ? 'Track your progress to the next rank' : 'View top performers in this rank'}
          </p>
        </div>

        {/* Your Progress Card (only for current rank) */}
        {viewingRank === currentRank && userProfile && (
          <Card className="mb-6 overflow-hidden border-l-4" style={{ borderLeftColor: getRankColor(currentRank) }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <img
                  src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName || 'User')}&background=${getRankColor(currentRank).slice(1)}&color=fff&size=128`}
                  alt={userProfile.displayName || 'You'}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-offset-2"
                  style={{ ringColor: getRankColor(currentRank) }}
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="px-3 py-1 rounded-md text-white text-xs font-semibold uppercase tracking-wide"
                      style={{ backgroundColor: getRankColor(currentRank) }}
                    >
                      {rankConfig.displayName}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold">{userProfile.displayName}</h2>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">
                    Progress to {nextRank ? RANK_CONFIGS[nextRank].displayName : 'Max Rank'}
                  </span>
                  <span className="text-2xl font-bold" style={{ color: getRankColor(currentRank) }}>
                    {(userProfile.rankPercentage || 0).toFixed(0)}%
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 ease-out"
                    style={{
                      width: `${getProgressBarWidth(userProfile.rankPercentage || 0)}%`,
                      backgroundColor: getRankColor(currentRank),
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rank Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {RANK_TABS.map((rank) => {
            const isActive = viewingRank === rank.id;
            const isUserRank = currentRank === rank.id;
            
            return (
              <button
                key={rank.id}
                onClick={() => setSelectedRank(rank.id)}
                className={`px-5 py-2.5 rounded-lg font-semibold text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'text-foreground hover:shadow-sm'
                }`}
                style={
                  isActive 
                    ? { backgroundColor: rank.color } 
                    : { backgroundColor: `${rank.color}20` }
                }
              >
                {rank.name}
                {isUserRank && (
                  <span className="ml-2 text-xs font-normal opacity-70">Current</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Progress Standings */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-xl font-bold mb-6">
              Top Performers
            </h3>

            {topUsers.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${getRankColor(viewingRank)}20` }}>
                  <div className="w-12 h-12 rounded-full" style={{ backgroundColor: getRankColor(viewingRank) }} />
                </div>
                <h4 className="text-lg font-semibold mb-2">Be the first {rankConfig.displayName}</h4>
                <p className="text-muted-foreground text-sm">
                  No one has achieved this rank yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Top 9 Users */}
                {topUsers.map((userData, index) => {
                  const isCurrentUser = user && userData.uid === user.uid;
                  
                  return (
                    <div
                      key={userData.uid}
                      className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg transition-all ${
                        isCurrentUser 
                          ? 'border-2' 
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                      style={isCurrentUser ? { 
                        backgroundColor: `${getRankColor(currentRank)}10`, 
                        borderColor: `${getRankColor(currentRank)}40` 
                      } : undefined}
                    >
                      {/* Position */}
                      <div className="w-12 text-center flex-shrink-0">
                        {index < 3 ? (
                          <span className="text-3xl">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-muted text-foreground">
                            {index + 1}
                          </div>
                        )}
                      </div>

                      {/* Avatar */}
                      <img
                        src={(isCurrentUser && user?.photoURL) ? user.photoURL : (userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName)}&background=3b82f6&color=fff&size=128`)}
                        alt={userData.displayName}
                        className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />

                      {/* Name & Progress */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold truncate text-sm">
                            {isCurrentUser ? (userProfile?.displayName || user?.displayName || 'You') : userData.displayName}
                          </span>
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide text-white" style={{ backgroundColor: getRankColor(currentRank) }}>
                              You
                            </span>
                          )}
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="relative h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: `${getRankColor(viewingRank)}20` }}>
                          <div
                            className="absolute inset-0 transition-all duration-500"
                            style={{
                              width: `${getProgressBarWidth(userData.rankPercentage)}%`,
                              backgroundColor: getRankColor(viewingRank),
                            }}
                          />
                        </div>
                      </div>

                      {/* Percentage */}
                      <div className="text-right flex-shrink-0">
                        <span className="text-base font-bold text-foreground">
                          {userData.rankPercentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* User's Position (if not in top 9 and viewing own rank) */}
                {viewingRank === currentRank && currentUser && !topUsers.find(u => u.uid === currentUser.uid) && (
                  <>
                    {/* Separator */}
                    <div className="flex items-center gap-2 my-4">
                      <div className="flex-1 h-px bg-border"></div>
                      <div className="flex-1 h-px bg-border"></div>
                    </div>

                    {/* Current User Row */}
                    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2" style={{ backgroundColor: `${getRankColor(currentRank)}10`, borderColor: `${getRankColor(currentRank)}40` }}>
                      {/* Position */}
                      <div className="w-12 text-center flex-shrink-0">
                        {userPosition <= 3 ? (
                          <span className="text-3xl">
                            {userPosition === 1 ? '🥇' : userPosition === 2 ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-muted text-foreground">
                            {userPosition}
                          </div>
                        )}
                      </div>

                      {/* Avatar */}
                      <img
                        src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=3b82f6&color=fff&size=128`}
                        alt={currentUser.displayName}
                        className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />

                      {/* Name & Progress */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold truncate text-sm">
                            {userProfile?.displayName || user?.displayName || 'You'}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide text-white" style={{ backgroundColor: getRankColor(currentRank) }}>
                            You
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="relative h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: `${getRankColor(currentRank)}20` }}>
                          <div
                            className="absolute inset-0 transition-all duration-500"
                            style={{
                              width: `${getProgressBarWidth(currentUser.rankPercentage)}%`,
                              backgroundColor: getRankColor(currentRank),
                            }}
                          />
                        </div>
                      </div>

                      {/* Percentage */}
                      <div className="text-right flex-shrink-0">
                        <span className="text-base font-bold text-foreground">
                          {currentUser.rankPercentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rank Ladder Overview */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-6">
              Rank Progression
            </h3>

            <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto pb-2 px-1 pt-2">
              {RANK_TABS.map((rank, index) => {
                const isPast = index < currentRankIndex;
                const isCurrent = index === currentRankIndex;
                
                return (
                  <div key={rank.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all text-white"
                        style={{ 
                          backgroundColor: isCurrent || isPast ? rank.color : `${rank.color}40`,
                          ...(isCurrent && { boxShadow: `0 0 0 2px ${rank.color}`, transform: 'scale(1.05)' })
                        }}
                      >
                        {index + 1}
                      </div>
                      <span className={`text-[9px] sm:text-[10px] font-medium mt-2 text-center ${
                        isCurrent ? 'text-foreground font-semibold' : 'text-muted-foreground'
                      }`}>
                        {rank.name}
                      </span>
                    </div>
                    
                    {index < RANK_TABS.length - 1 && (
                      <div 
                        className="w-full h-0.5 mx-1 flex-1"
                        style={{ 
                          backgroundColor: isPast ? rank.color : '#e5e7eb' 
                        }}
                      ></div>
                    )}
                  </div>
                );
              })}
            </div>

            {currentRankIndex < RANK_TABS.length - 1 && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                Next: {RANK_TABS[currentRankIndex + 1].name}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <main className="flex-1">
        {pageContent}
      </main>
      <Footer />
    </div>
  );
}
