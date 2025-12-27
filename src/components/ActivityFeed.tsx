// src/components/ActivityFeed.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface Activity {
  id: string;
  type: 'vote' | 'follow' | 'badge' | 'comment';
  userId: string;
  userDisplayName: string;
  description: string;
  createdAt: any;
  metadata?: any;
}

interface ActivityFeedProps {
  userId?: string; // If provided, show only this user's activity
  limit?: number;
}

export function ActivityFeed({ userId, limit: maxResults = 20 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, [userId]);

  const loadActivity = async () => {
    try {
      setLoading(true);
      
      // Load votes (most recent activity)
      let votesQuery = query(
        collection(db, 'votes'),
        orderBy('votedAt', 'desc'),
        limit(maxResults)
      );
      
      if (userId) {
        votesQuery = query(
          collection(db, 'votes'),
          where('userId', '==', userId),
          orderBy('votedAt', 'desc'),
          limit(maxResults)
        );
      }

      const votesSnapshot = await getDocs(votesQuery);
      const voteActivities: Activity[] = votesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'vote' as const,
          userId: data.userId,
          userDisplayName: data.userDisplayName || 'User',
          description: `voted on "${data.predictionQuestion}"`,
          createdAt: data.votedAt,
          metadata: { option: data.option }
        };
      });

      // Load comments
      let commentsQuery = query(
        collection(db, 'comments'),
        orderBy('createdAt', 'desc'),
        limit(maxResults)
      );

      if (userId) {
        commentsQuery = query(
          collection(db, 'comments'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(maxResults)
        );
      }

      const commentsSnapshot = await getDocs(commentsQuery);
      const commentActivities: Activity[] = commentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'comment' as const,
          userId: data.userId,
          userDisplayName: data.userDisplayName || 'User',
          description: `commented on a prediction`,
          createdAt: data.createdAt,
          metadata: { text: data.text }
        };
      });

      // Combine and sort
      const allActivities = [...voteActivities, ...commentActivities]
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        })
        .slice(0, maxResults);

      setActivities(allActivities);
      setLoading(false);
    } catch (error) {
      console.error('Error loading activity:', error);
      setLoading(false);
    }
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'vote': return '🗳️';
      case 'follow': return '👥';
      case 'badge': return '🏆';
      case 'comment': return '💬';
      default: return '📌';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <Link
                      href={`/profile?id=${activity.userId}`}
                      className="font-semibold hover:text-primary transition-colors"
                    >
                      {activity.userDisplayName}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      {activity.description}
                    </span>
                  </div>
                  {activity.metadata?.text && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      "{activity.metadata.text}"
                    </p>
                  )}
                  {activity.metadata?.option && (
                    <span className="text-xs text-primary">
                      Option {activity.metadata.option}
                    </span>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {activity.createdAt && formatDistanceToNow(activity.createdAt.toDate(), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
