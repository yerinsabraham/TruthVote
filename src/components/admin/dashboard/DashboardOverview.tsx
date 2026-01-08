// src/components/admin/dashboard/DashboardOverview.tsx
'use client';

import { useEffect, useState } from 'react';
import { Users, FileText, CheckCircle, TrendingUp } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { StatCard, AlertBanner, LoadingSkeleton } from '../shared';
import ActivityFeed from './ActivityFeed';
import QuickActions from './QuickActions';
import RankDistribution from './RankDistribution';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  predictions: {
    active: number;
    resolved: number;
    closed: number;
    total: number;
  };
  rankDistribution: {
    [key: string]: number;
  };
  todayVotes?: number;
}

interface DashboardOverviewProps {
  onNavigate: (section: string, item: string) => void;
}

export default function DashboardOverview({ onNavigate }: DashboardOverviewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const getAdminStats = httpsCallable(functions, 'getAdminStats');
      const result = await getAdminStats({});
      const data = result.data as { stats: DashboardStats };
      setStats(data.stats);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-content-header">
          <div>
            <h1 className="admin-content-title">Dashboard</h1>
            <p className="admin-content-subtitle">Overview of your platform</p>
          </div>
        </div>
        <LoadingSkeleton type="stat" count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <LoadingSkeleton type="row" count={5} />
          </div>
          <div>
            <LoadingSkeleton type="card" count={1} />
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      onClick: () => onNavigate('users', 'table'),
    },
    {
      label: 'Active (7d)',
      value: stats?.activeUsers || 0,
      icon: TrendingUp,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
      onClick: () => onNavigate('users', 'table'),
    },
    {
      label: 'Active Polls',
      value: stats?.predictions.active || 0,
      icon: FileText,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      onClick: () => onNavigate('predictions', 'all'),
    },
    {
      label: 'Resolved',
      value: stats?.predictions.resolved || 0,
      icon: CheckCircle,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
      onClick: () => onNavigate('resolution', 'history'),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="admin-content-header">
        <div>
          <h1 className="admin-content-title">Dashboard</h1>
          <p className="admin-content-subtitle">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button 
          onClick={loadStats}
          className="admin-btn admin-btn-sm admin-btn-secondary"
        >
          Refresh
        </button>
      </div>

      {/* Pending Resolutions Alert */}
      {stats && stats.predictions.closed > 0 && (
        <AlertBanner
          type="warning"
          title={`${stats.predictions.closed} prediction${stats.predictions.closed !== 1 ? 's' : ''} awaiting resolution`}
          message="These predictions have ended and need to be resolved"
          action={{
            label: 'Resolve Now',
            onClick: () => onNavigate('resolution', 'pending')
          }}
        />
      )}

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        {statCards.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            iconColor={stat.iconColor}
            iconBg={stat.iconBg}
            onClick={stat.onClick}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Actions */}
          <QuickActions onNavigate={onNavigate} />
          
          {/* Activity Feed */}
          <ActivityFeed />
        </div>

        {/* Right Column - Rank Distribution */}
        <div className="space-y-4">
          <RankDistribution distribution={stats?.rankDistribution || {}} />
        </div>
      </div>
    </div>
  );
}
