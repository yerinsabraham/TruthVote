'use client';

import React, { useState, useEffect } from 'react';
import { Rank } from '@/types/rank';
import { LeaderboardEntry } from '@/types/user';
import { RANK_CONFIGS } from '@/config/ranks';
import { RankBadge } from '@/components/RankBadge';
import { Trophy, TrendingUp, Medal, Award, User as UserIcon } from 'lucide-react';

interface RankLeaderboardProps {
  rank: Rank;
  currentUserId?: string;
  limit?: number;
  showUserPosition?: boolean;
}

/**
 * RankLeaderboard Component
 * Displays top users for a specific rank tier with caching
 * 
 * Features:
 * - Rank-specific leaderboards (separate for each tier)
 * - Top 9 users + current user position (if outside top 9)
 * - Real-time data with 1-hour cache
 * - Pagination support
 * - Medal icons for top 3 positions
 */
export const RankLeaderboard: React.FC<RankLeaderboardProps> = ({
  rank,
  currentUserId,
  limit = 10,
  showUserPosition = true,
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userPosition, setUserPosition] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const rankConfig = RANK_CONFIGS[rank];

  useEffect(() => {
    fetchLeaderboard();
  }, [rank, limit]);

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch directly from Firestore (client-side)
      const { collection, query, where, orderBy, limit: firestoreLimit, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/config');

      // Check cache first
      const cacheKey = `${rank}_TOP${limit}`;
      const cacheRef = collection(db, 'leaderboards');
      const cacheQuery = query(cacheRef, where('__name__', '==', cacheKey));
      const cacheSnapshot = await getDocs(cacheQuery);

      if (!cacheSnapshot.empty) {
        const cacheData = cacheSnapshot.docs[0].data();
        const cacheAge = Date.now() - cacheData.generatedAt.toMillis();

        if (cacheAge < 3600000) { // 1 hour
          setLeaderboard(cacheData.data || []);
          setLastUpdated(cacheData.generatedAt.toDate());
          setIsLoading(false);
          return;
        }
      }

      // Fetch fresh data
      const usersRef = collection(db, 'users');
      const leaderboardQuery = query(
        usersRef,
        where('currentRank', '==', rank),
        orderBy('rankPercentage', 'desc'),
        firestoreLimit(limit)
      );

      const snapshot = await getDocs(leaderboardQuery);
      const entries = snapshot.docs.map((doc, index) => {
        const data = doc.data();
        return {
          id: doc.id,
          displayName: data.displayName || 'Anonymous',
          avatarUrl: data.avatarUrl || null,
          totalPoints: data.totalPoints || 0,
          accuracy: data.accuracy || 0,
          totalVotes: data.totalVotes || 0,
          rank: index + 1,
          currentRank: data.currentRank,
          rankPercentage: data.rankPercentage || 0,
        };
      });

      setLeaderboard(entries);
      setLastUpdated(new Date());

      // Fetch current user's position if outside top N
      if (showUserPosition && currentUserId) {
        const userInTop = entries.find(entry => entry.id === currentUserId);
        
        if (!userInTop) {
          // Get user's position by counting higher-ranked users
          const userDocRef = collection(db, 'users');
          const userQuery = query(userDocRef, where('__name__', '==', currentUserId));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            
            const higherRankedQuery = query(
              usersRef,
              where('currentRank', '==', rank),
              where('rankPercentage', '>', userData.rankPercentage || 0)
            );
            const higherRankedSnapshot = await getDocs(higherRankedQuery);
            
            setUserPosition({
              id: currentUserId,
              displayName: userData.displayName || 'Anonymous',
              avatarUrl: userData.avatarUrl || null,
              totalPoints: userData.totalPoints || 0,
              accuracy: userData.accuracy || 0,
              totalVotes: userData.totalVotes || 0,
              rank: higherRankedSnapshot.size + 1,
              currentRank: userData.currentRank,
              rankPercentage: userData.rankPercentage || 0,
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-700" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-gray-500 font-semibold">{position}</span>;
    }
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-red-600">
          <p className="font-semibold">Error loading leaderboard</p>
          <p className="text-sm mt-2">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div 
        className="px-6 py-4 border-b"
        style={{ 
          background: `linear-gradient(135deg, ${rankConfig.displayColor}20, ${rankConfig.displayColor}40)`,
          borderColor: rankConfig.displayColor
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{rankConfig.badgeIcon}</div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: rankConfig.displayColor }}>
                {rankConfig.displayName} Leaderboard
              </h2>
              <p className="text-sm text-gray-600">
                Top performers in this rank
              </p>
            </div>
          </div>
          {lastUpdated && (
            <div className="text-xs text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard Entries */}
      <div className="divide-y">
        {leaderboard.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-semibold">No users in this rank yet</p>
            <p className="text-sm mt-2">Be the first to reach {rankConfig.displayName}!</p>
          </div>
        ) : (
          leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                entry.id === currentUserId ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Left: Rank & User Info */}
                <div className="flex items-center gap-4 flex-1">
                  {/* Position */}
                  <div className="w-8 flex justify-center">
                    {getRankIcon(index + 1)}
                  </div>

                  {/* Avatar */}
                  <img
                    src={entry.avatarUrl || '/default-avatar.png'}
                    alt={entry.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />

                  {/* User Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {entry.displayName}
                      </p>
                      {entry.id === currentUserId && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>{entry.totalPoints} points</span>
                      <span>•</span>
                      <span>{entry.accuracy}% accuracy</span>
                      <span>•</span>
                      <span>{entry.totalVotes} votes</span>
                    </div>
                  </div>
                </div>

                {/* Right: Progress */}
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="font-semibold" style={{ color: rankConfig.displayColor }}>
                      {formatPercentage(entry.rankPercentage)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    rank progress
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Current User Position (if outside top 9) */}
        {showUserPosition && userPosition && (
          <>
            <div className="px-6 py-2 bg-gray-100 text-center">
              <p className="text-xs text-gray-600">Your Position</p>
            </div>
            <div className="px-6 py-4 bg-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-8 flex justify-center">
                    <span className="text-sm font-semibold text-gray-700">
                      #{userPosition.rank}
                    </span>
                  </div>

                  <img
                    src={userPosition.avatarUrl || '/default-avatar.png'}
                    alt={userPosition.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {userPosition.displayName}
                      </p>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                        You
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>{userPosition.totalPoints} points</span>
                      <span>•</span>
                      <span>{userPosition.accuracy}% accuracy</span>
                      <span>•</span>
                      <span>{userPosition.totalVotes} votes</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="font-semibold" style={{ color: rankConfig.displayColor }}>
                      {formatPercentage(userPosition.rankPercentage)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    rank progress
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t text-center">
        <button
          onClick={fetchLeaderboard}
          className="text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          Refresh Leaderboard
        </button>
      </div>
    </div>
  );
};

export default RankLeaderboard;
