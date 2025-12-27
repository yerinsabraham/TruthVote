// src/app/profile/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { getBadgeInfo } from '@/lib/badges';
import { useFollow } from '@/hooks/useFollow';
import { Button } from '@/components/ui/button';
import { ActivityFeed } from '@/components/ActivityFeed';
import { usePredictions } from '@/hooks/usePredictions';
import { PollCard } from '@/components/PollCard';
import { useVote } from '@/hooks/useVote';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  points: number;
  totalVotes: number;
  correctVotes: number;
  accuracyRate: number;
  level: number;
  badges: string[];
  streak: number;
  followersCount?: number;
  followingCount?: number;
}

interface Vote {
  id: string;
  predictionQuestion: string;
  option: 'A' | 'B';
  votedAt: any;
  isCorrect?: boolean;
  pointsEarned?: number;
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('id');
  const { user: currentUser } = useAuth();
  const { isFollowing, loading: followLoading, toggleFollow } = useFollow(userId || '');
  const { predictions } = usePredictions();
  const { submitVote } = useVote();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [bookmarkedPredictions, setBookmarkedPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'votes' | 'bookmarks'>('votes');

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        // Load user profile
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        }

        // Load user votes
        const votesQuery = query(
          collection(db, 'votes'),
          where('userId', '==', userId),
          orderBy('votedAt', 'desc')
        );
        const votesSnapshot = await getDocs(votesQuery);
        const votesData = votesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Vote[];
        setVotes(votesData);

        // Load bookmarked predictions
        const bookmarksQuery = query(
          collection(db, 'bookmarks'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const bookmarksSnapshot = await getDocs(bookmarksQuery);
        const bookmarkIds = bookmarksSnapshot.docs.map(doc => doc.data().predictionId);
        
        // Get prediction details for bookmarks
        const bookmarkedPreds = predictions.filter(pred => bookmarkIds.includes(pred.id));
        setBookmarkedPredictions(bookmarkedPreds);

        setLoading(false);
      } catch (error) {
        console.error('Error loading profile:', error);
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId, predictions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">No user ID provided</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">User not found</div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.uid === userId;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-3xl font-bold text-white">
                {profile.displayName?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-1">{profile.displayName}</h1>
                <div className="flex gap-4 mt-2 text-sm">
                  <span><strong>{profile.followersCount || 0}</strong> followers</span>
                  <span><strong>{profile.followingCount || 0}</strong> following</span>
                </div>
                {isOwnProfile ? (
                  <p className="text-sm text-primary mt-2">This is your profile</p>
                ) : (
                  <Button
                    onClick={toggleFollow}
                    disabled={followLoading}
                    className="mt-3"
                    variant={isFollowing ? 'outline' : 'default'}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </Button>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl sm:text-4xl font-bold text-primary">{profile.points}</div>
                <div className="text-sm text-muted-foreground">Points</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Votes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{profile.totalVotes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Correct Votes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{profile.correctVotes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {profile.accuracyRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{profile.level}</div>
            </CardContent>
          </Card>
        </div>

        {/* Badges */}
        {profile.badges.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Badges ({profile.badges.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {profile.badges.map(badgeId => {
                  const badge = getBadgeInfo(badgeId);
                  return badge ? (
                    <div
                      key={badgeId}
                      className="p-4 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                    >
                      <div className="text-3xl mb-2">{badge.icon}</div>
                      <div className="font-semibold text-sm">{badge.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{badge.description}</div>
                    </div>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vote History and Activity Feed */}
        <div className="grid grid-cols-1 gap-6">
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab('votes')}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                activeTab === 'votes'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Vote History ({votes.length})
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                activeTab === 'bookmarks'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Bookmarks ({bookmarkedPredictions.length})
            </button>
          </div>

          {/* Votes Tab */}
          {activeTab === 'votes' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vote History ({votes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {votes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No votes yet
                      </div>
                    ) : (
                      votes.slice(0, 10).map(vote => (
                        <div
                          key={vote.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium mb-1">{vote.predictionQuestion}</div>
                            <div className="text-sm text-muted-foreground">
                              Voted: Option {vote.option}
                              {vote.isCorrect !== undefined && (
                                <span className={vote.isCorrect ? 'text-success ml-2' : 'text-danger ml-2'}>
                                  {vote.isCorrect ? '✓ Correct' : '✗ Wrong'}
                                </span>
                              )}
                            </div>
                          </div>
                          {vote.pointsEarned !== undefined && (
                            <div className="text-lg font-bold text-success">
                              +{vote.pointsEarned}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Activity Feed */}
              <ActivityFeed userId={userId || undefined} limit={10} />
            </div>
          )}

          {/* Bookmarks Tab */}
          {activeTab === 'bookmarks' && (
            <div>
              {bookmarkedPredictions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No bookmarked predictions yet
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bookmarkedPredictions.map(pred => (
                    <PollCard
                      key={pred.id}
                      poll={{
                        ...pred,
                        endDate: pred.endDate.toDate(),
                      }}
                      onVote={async (pollId, option) => {
                        const poll = predictions.find(p => p.id === pollId);
                        if (!poll) return false;
                        return await submitVote(pollId, option, poll.question, poll.category);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
