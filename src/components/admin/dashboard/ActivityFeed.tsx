// src/components/admin/dashboard/ActivityFeed.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Vote, UserPlus, CheckCircle, FileText, TrendingUp } from 'lucide-react';
import { EmptyState } from '../shared';

interface ActivityItem {
  id: string;
  type: 'vote' | 'signup' | 'resolved' | 'created' | 'rank_change';
  message: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    try {
      setLoading(true);
      const recentActivities: ActivityItem[] = [];
      
      // Get recent votes (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const votesQuery = query(
        collection(db, 'votes'),
        orderBy('votedAt', 'desc'),
        limit(10)
      );
      
      const votesSnapshot = await getDocs(votesQuery);
      votesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        recentActivities.push({
          id: doc.id,
          type: 'vote',
          message: `Vote on "${data.predictionQuestion?.substring(0, 40) || 'a prediction'}..."`,
          timestamp: data.votedAt?.toDate() || new Date(),
        });
      });

      // Get recent users
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      usersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.createdAt) {
          recentActivities.push({
            id: doc.id,
            type: 'signup',
            message: `New user: ${data.displayName || data.email || 'Anonymous'}`,
            timestamp: data.createdAt?.toDate() || new Date(),
          });
        }
      });

      // Get recent predictions
      const predictionsQuery = query(
        collection(db, 'predictions'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      const predictionsSnapshot = await getDocs(predictionsQuery);
      predictionsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'resolved') {
          recentActivities.push({
            id: doc.id,
            type: 'resolved',
            message: `Resolved: "${data.question?.substring(0, 40) || 'Prediction'}..."`,
            timestamp: data.resolutionTime?.toDate() || data.createdAt?.toDate() || new Date(),
          });
        } else {
          recentActivities.push({
            id: doc.id,
            type: 'created',
            message: `Created: "${data.question?.substring(0, 40) || 'Prediction'}..."`,
            timestamp: data.createdAt?.toDate() || new Date(),
          });
        }
      });

      // Sort by timestamp
      recentActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      // Take top 10
      setActivities(recentActivities.slice(0, 10));
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'vote':
        return { icon: Vote, bg: 'bg-blue-50', color: 'text-blue-600' };
      case 'signup':
        return { icon: UserPlus, bg: 'bg-green-50', color: 'text-green-600' };
      case 'resolved':
        return { icon: CheckCircle, bg: 'bg-purple-50', color: 'text-purple-600' };
      case 'created':
        return { icon: FileText, bg: 'bg-orange-50', color: 'text-orange-600' };
      case 'rank_change':
        return { icon: TrendingUp, bg: 'bg-pink-50', color: 'text-pink-600' };
      default:
        return { icon: FileText, bg: 'bg-gray-50', color: 'text-gray-600' };
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Recent Activity</h3>
        </div>
        <div className="admin-card-body">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 bg-[var(--admin-bg-tertiary)] rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-[var(--admin-bg-tertiary)] rounded w-3/4" />
                  <div className="h-2 bg-[var(--admin-bg-tertiary)] rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Recent Activity</h3>
        <button 
          onClick={loadActivity}
          className="admin-btn admin-btn-sm admin-btn-ghost"
        >
          Refresh
        </button>
      </div>
      <div className="admin-card-body p-0">
        {activities.length === 0 ? (
          <div className="p-4">
            <EmptyState 
              title="No recent activity" 
              message="Activity will appear here as users interact with your platform"
            />
          </div>
        ) : (
          <div className="admin-activity-list px-4">
            {activities.map((activity) => {
              const { icon: Icon, bg, color } = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className="admin-activity-item">
                  <div className={`admin-activity-icon ${bg}`}>
                    <Icon size={14} className={color} />
                  </div>
                  <div className="admin-activity-content">
                    <p className="admin-activity-text">{activity.message}</p>
                    <span className="admin-activity-time">{formatTime(activity.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
