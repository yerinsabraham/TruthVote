// src/app/leaderboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { LeaderboardSkeleton } from '@/components/LoadingSkeleton';

// This tells Next.js to use client-side rendering for this page
export const dynamic = 'force-dynamic';

interface LeaderboardUser {
  uid: string;
  displayName: string;
  photoURL?: string;
  points: number;
  totalVotes: number;
  accuracyRate: number;
  level: number;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const usersQuery = query(
          collection(db, 'users'),
          orderBy('points', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(usersQuery);
        const data = snapshot.docs.map(doc => doc.data() as LeaderboardUser);
        setUsers(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading leaderboard:', error);
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  return (
    <div className="min-h-screen py-4 sm:py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center">🏆 Leaderboard</h1>

        <Card>
          <CardHeader>
            <CardTitle>Top Predictors</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LeaderboardSkeleton />
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users yet. Be the first to vote!
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user, index) => (
                  <Link
                    key={user.uid}
                    href={`/profile?id=${user.uid}`}
                    className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted transition-colors"
                  >
                    {/* Rank */}
                    <div className="w-12 text-center">
                      {index < 3 ? (
                        <span className="text-2xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="text-lg font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-lg font-bold text-white">
                      {user.displayName?.[0]?.toUpperCase() || '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{user.displayName}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">
                        {user.totalVotes} votes • {user.accuracyRate.toFixed(1)}% accuracy
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-base sm:text-lg font-bold text-primary">
                        {user.points}
                      </div>
                      <div className="text-xs text-muted-foreground hidden sm:block">points</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
