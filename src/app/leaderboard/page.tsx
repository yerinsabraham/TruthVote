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
  const { user, userProfile, loading: authLoading } = useAuth();
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);
  const [userPosition, setUserPosition] = useState<number>(0);

  const currentRank = (userProfile?.rank as Rank) || Rank.NOVICE;
  const viewingRank = selectedRank || currentRank;
  const rankConfig = RANK_CONFIGS[viewingRank];
  const currentRankIndex = RANK_TABS.findIndex(r => r.id === currentRank);
  const nextRank = currentRankIndex < RANK_TABS.length - 1 ? RANK_TABS[currentRankIndex + 1].id : null;

  useEffect(() => {
    if (!userProfile) return;
    setSelectedRank(currentRank);
  }, [userProfile, currentRank]);

  useEffect(() => {
    // Wait for auth to finish loading before querying leaderboard
    if (authLoading) return;
    loadLeaderboard();
  }, [viewingRank, user, userProfile, authLoading]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);

      // Fetch top 9 users for the selected rank
      const leaderboardQuery = query(
        collection(db, 'users'),
        where('rank', '==', viewingRank),
        orderBy('rankPercentage', 'desc'),
        firestoreLimit(9)
      );

      const snapshot = await getDocs(leaderboardQuery);
      const topData: LeaderboardUser[] = snapshot.docs.map((doc, index) => {
        const data = doc.data();
        
        return {
          uid: doc.id,
          // Use Firestore data - it should be synced from OAuth on login
          displayName: data.displayName || data.name || data.email?.split('@')[0] || 'User',
          photoURL: data.photoURL || data.avatarURL || null,
          rank: data.rank || Rank.NOVICE,
          rankPercentage: data.rankPercentage || 0,
          position: index + 1,
        };
      });

      setTopUsers(topData);

      // If viewing own rank and logged in, find user's position
      if (user && viewingRank === currentRank) {
        const userInTop = topData.find(u => u.uid === user.uid);
        
        if (userInTop) {
          setCurrentUser(userInTop);
          setUserPosition(userInTop.position!);
        } else {
          const userRankPercentage = userProfile?.rankPercentage || 0;
          
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
            photoURL: userProfile?.photoURL || user.photoURL || undefined,
            rank: currentRank,
            rankPercentage: userRankPercentage,
            position,
          });
        }
      }

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
    return RANK_CONFIGS[rank]?.displayColor || '#6B7280';
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
        <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="flex-1">
          <div className="py-6 sm:py-10 pb-24 md:pb-10">
            <div className="container mx-auto px-4 max-w-5xl">
              {/* Header Skeleton */}
              <div className="text-center mb-10 animate-pulse">
                <div className="h-6 bg-muted/50 rounded-full w-32 mx-auto mb-4"></div>
                <div className="h-8 bg-muted/40 rounded-lg w-56 mx-auto"></div>
              </div>

              {/* Hero Card Skeleton */}
              <div className="mb-8 animate-pulse">
                <div className="h-44 bg-muted/30 rounded-2xl"></div>
              </div>

              {/* Tabs Skeleton */}
              <div className="flex gap-2 overflow-x-auto mb-8 pb-2">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-12 bg-muted/40 rounded-xl w-28 flex-shrink-0 animate-pulse"></div>
                ))}
              </div>

              {/* List Skeleton */}
              <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-border/50 animate-pulse">
                  <div className="h-5 bg-muted/40 rounded w-32"></div>
                </div>
                <div className="divide-y divide-border/30">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                      <div className="w-10 h-10 bg-muted/40 rounded-xl"></div>
                      <div className="w-12 h-12 bg-muted/40 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted/40 rounded w-32 mb-2"></div>
                        <div className="h-1.5 bg-muted/30 rounded-full w-48"></div>
                      </div>
                      <div className="h-6 bg-muted/40 rounded w-12"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/10">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <main className="flex-1">
        <div className="py-6 sm:py-10 pb-24 md:pb-10">
          <div className="container mx-auto px-4 max-w-5xl">
            
            {/* Page Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {rankConfig.displayName} Rankings
              </h1>
              <p className="text-sm text-muted-foreground mt-2">Top performers in this rank</p>
            </div>

            {/* Your Position Hero Card - Only show when viewing own rank */}
            {viewingRank === currentRank && userProfile && (
              <div 
                className="relative mb-8 rounded-2xl overflow-hidden border border-border/50"
                style={{ 
                  background: `linear-gradient(135deg, ${getRankColor(currentRank)}12 0%, ${getRankColor(currentRank)}05 100%)`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent"></div>
                <div className="relative p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* User Avatar & Rank */}
                    <div className="relative">
                      <div 
                        className="absolute -inset-1.5 rounded-full opacity-30 blur-md"
                        style={{ backgroundColor: getRankColor(currentRank) }}
                      ></div>
                      <img
                        src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName || 'User')}&background=${getRankColor(currentRank).slice(1)}&color=fff&size=128`}
                        alt={userProfile.displayName || 'You'}
                        className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-background shadow-lg"
                        referrerPolicy="no-referrer"
                      />
                      <div 
                        className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold border-3 border-background shadow-md"
                        style={{ backgroundColor: getRankColor(currentRank) }}
                      >
                        #{userPosition}
                      </div>
                    </div>

                    {/* User Info & Progress */}
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-2">
                        <h2 className="text-xl font-bold">{userProfile.displayName}</h2>
                        <span 
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white shadow-sm"
                          style={{ backgroundColor: getRankColor(currentRank) }}
                        >
                          {rankConfig.displayName}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">
                        {nextRank 
                          ? `Progress to ${RANK_CONFIGS[nextRank].displayName}`
                          : 'Maximum rank achieved!'
                        }
                      </p>

                      {/* Progress Bar */}
                      <div className="max-w-md mx-auto sm:mx-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground font-medium">Current Progress</span>
                          <span 
                            className="text-xl font-bold"
                            style={{ color: getRankColor(currentRank) }}
                          >
                            {(userProfile.rankPercentage || 0).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-3 bg-muted/50 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                            style={{
                              width: `${getProgressBarWidth(userProfile.rankPercentage || 0)}%`,
                              backgroundColor: getRankColor(currentRank),
                              boxShadow: `0 0 8px ${getRankColor(currentRank)}60`
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Position Display - Desktop Only */}
                    <div className="hidden sm:flex flex-col items-center px-8 py-5 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/30">
                      <span className="text-4xl font-bold tracking-tight" style={{ color: getRankColor(currentRank) }}>
                        #{userPosition}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1 font-medium">Your Rank</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rank Navigation Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide -mx-4 px-4">
              {RANK_TABS.map((rank) => {
                const isActive = viewingRank === rank.id;
                const isUserRank = currentRank === rank.id;
                
                return (
                  <button
                    key={rank.id}
                    onClick={() => setSelectedRank(rank.id)}
                    className={`relative flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all flex-shrink-0 border ${
                      isActive
                        ? 'text-white shadow-lg border-transparent'
                        : 'bg-card hover:bg-muted/50 border-border/50 hover:border-border text-foreground'
                    }`}
                    style={isActive ? { 
                      backgroundColor: rank.color,
                      boxShadow: `0 4px 14px ${rank.color}40`
                    } : undefined}
                  >
                    <span>{rank.name}</span>
                    {isUserRank && !isActive && (
                      <span 
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: rank.color }}
                      ></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Leaderboard List */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
                <h3 className="font-semibold text-base">
                  Top Performers
                </h3>
                <span className="text-xs text-muted-foreground bg-background px-3 py-1.5 rounded-full border border-border/50">
                  {topUsers.length} {topUsers.length === 1 ? 'user' : 'users'}
                </span>
              </div>

              {topUsers.length === 0 ? (
                <div className="text-center py-20 px-6">
                  <div 
                    className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: `${getRankColor(viewingRank)}20` }}
                  >
                    <div className="w-8 h-8 rounded-full" style={{ backgroundColor: getRankColor(viewingRank) }}></div>
                  </div>
                  <h4 className="text-lg font-semibold mb-2">No {rankConfig.displayName}s Yet</h4>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Be the first to achieve this rank and claim the top spot!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {topUsers.map((userData, index) => {
                    const isCurrentUser = user && userData.uid === user.uid;
                    const position = index + 1;
                    
                    return (
                      <div
                        key={userData.uid}
                        className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                          isCurrentUser 
                            ? 'bg-primary/5' 
                            : 'hover:bg-muted/20'
                        }`}
                      >
                        {/* Position Badge */}
                        <div className="w-8 flex-shrink-0">
                          {position === 1 ? (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-sm">
                              <span className="text-sm font-bold text-white">1</span>
                            </div>
                          ) : position === 2 ? (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-sm">
                              <span className="text-sm font-bold text-white">2</span>
                            </div>
                          ) : position === 3 ? (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-sm">
                              <span className="text-sm font-bold text-white">3</span>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center border border-border/50">
                              <span className="font-semibold text-sm text-muted-foreground">{position}</span>
                            </div>
                          )}
                        </div>

                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={(isCurrentUser && user?.photoURL) ? user.photoURL : (userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName)}&background=6366f1&color=fff&size=80`)}
                            alt={userData.displayName}
                            className="w-10 h-10 rounded-full object-cover border border-border/50"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Name & Progress */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-semibold text-sm truncate">
                              {isCurrentUser ? (userProfile?.displayName || user?.displayName || 'You') : userData.displayName}
                            </span>
                            {isCurrentUser && (
                              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-primary/10 text-primary border border-primary/20">
                                You
                              </span>
                            )}
                          </div>
                          
                          {/* Slim Progress Bar */}
                          <div className="h-1.5 bg-muted/80 rounded-full overflow-hidden max-w-xs">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${getProgressBarWidth(userData.rankPercentage)}%`,
                                backgroundColor: getRankColor(viewingRank),
                              }}
                            />
                          </div>
                        </div>

                        {/* Percentage */}
                        <div className="flex-shrink-0 text-right">
                          <span 
                            className="text-lg font-bold tabular-nums"
                            style={{ color: getRankColor(viewingRank) }}
                          >
                            {userData.rankPercentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* User's Position if not in top 9 */}
                  {viewingRank === currentRank && currentUser && !topUsers.find(u => u.uid === currentUser.uid) && (
                    <>
                      <div className="flex items-center gap-3 px-6 py-3 bg-muted/30">
                        <div className="flex-1 flex items-center gap-3">
                          <div className="flex-1 border-t border-dashed border-border/80"></div>
                          <span className="text-xs text-muted-foreground font-medium">Your position</span>
                          <div className="flex-1 border-t border-dashed border-border/80"></div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 px-6 py-4 bg-primary/5">
                        {/* Position */}
                        <div className="w-8 flex-shrink-0">
                          <div className="w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center border border-border/50">
                            <span className="font-semibold text-sm text-muted-foreground">{userPosition}</span>
                          </div>
                        </div>

                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=6366f1&color=fff&size=80`}
                            alt={currentUser.displayName}
                            className="w-10 h-10 rounded-full object-cover border border-border/50"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Name & Progress */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-semibold text-sm truncate">
                              {userProfile?.displayName || user?.displayName || 'You'}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-primary/10 text-primary border border-primary/20">
                              You
                            </span>
                          </div>
                          
                          <div className="h-1.5 bg-muted/80 rounded-full overflow-hidden max-w-xs">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${getProgressBarWidth(currentUser.rankPercentage)}%`,
                                backgroundColor: getRankColor(currentRank),
                              }}
                            />
                          </div>
                        </div>

                        {/* Percentage */}
                        <div className="flex-shrink-0 text-right">
                          <span 
                            className="text-lg font-bold tabular-nums"
                            style={{ color: getRankColor(currentRank) }}
                          >
                            {currentUser.rankPercentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Rank Journey - Refined Horizontal Stepper */}
            <div className="mt-8 p-6 sm:p-8 rounded-2xl bg-card border border-border/50 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-semibold text-base">Your Journey</h3>
                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                  Level {currentRankIndex + 1} of {RANK_TABS.length}
                </span>
              </div>

              <div className="relative">
                {/* Background Progress Line */}
                <div className="absolute top-5 left-7 right-7 h-1 bg-border/80 rounded-full"></div>
                {/* Active Progress Line */}
                <div 
                  className="absolute top-5 left-7 h-1 rounded-full transition-all duration-700"
                  style={{ 
                    width: currentRankIndex === 0 ? '0%' : `calc(${(currentRankIndex / (RANK_TABS.length - 1)) * 100}% - ${currentRankIndex === RANK_TABS.length - 1 ? 28 : 14}px)`,
                    backgroundColor: getRankColor(currentRank),
                    boxShadow: `0 0 8px ${getRankColor(currentRank)}40`
                  }}
                ></div>

                {/* Rank Steps */}
                <div className="relative flex items-start justify-between">
                  {RANK_TABS.map((rank, index) => {
                    const isPast = index < currentRankIndex;
                    const isCurrent = index === currentRankIndex;
                    
                    return (
                      <div key={rank.id} className="flex flex-col items-center z-10" style={{ width: `${100 / RANK_TABS.length}%` }}>
                        <div 
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all border-2 ${
                            isCurrent 
                              ? 'border-transparent shadow-lg scale-110' 
                              : isPast 
                                ? 'border-transparent' 
                                : 'border-border/50 bg-background'
                          }`}
                          style={
                            isCurrent || isPast 
                              ? { 
                                  backgroundColor: rank.color,
                                  boxShadow: isCurrent ? `0 4px 16px ${rank.color}50` : undefined
                                } 
                              : undefined
                          }
                        >
                          {isPast || isCurrent ? (
                            <span className="text-white">{index + 1}</span>
                          ) : (
                            <span className="text-muted-foreground/50">{index + 1}</span>
                          )}
                        </div>
                        <span className={`text-[10px] sm:text-xs mt-3 text-center font-medium transition-colors ${
                          isCurrent 
                            ? 'text-foreground font-semibold' 
                            : isPast 
                              ? 'text-muted-foreground' 
                              : 'text-muted-foreground/50'
                        }`}>
                          {rank.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {nextRank && (
                <div className="text-center mt-8 pt-6 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Next milestone: <span className="font-semibold text-foreground">{RANK_CONFIGS[nextRank].displayName}</span>
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
