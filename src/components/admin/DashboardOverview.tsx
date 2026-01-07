// src/components/admin/DashboardOverview.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';
import { toast } from 'sonner';

// Rank colors mapping - Lighter colors for backgrounds
const RANK_COLORS: Record<string, string> = {
  novice: '#EF4444',      // Light Red
  amateur: '#3B82F6',     // Light Blue
  analyst: '#A855F7',     // Light Purple
  professional: '#F59E0B', // Light Amber/Orange
  expert: '#EC4899',      // Light Pink
  master: '#22C55E',      // Light Green
};

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  predictions: {
    active: number;
    resolved: number;
    closed: number;
  };
  rankDistribution: {
    [key: string]: number;
  };
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Active Users (7d)',
      value: stats.activeUsers,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Active Predictions',
      value: stats.predictions.active,
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Resolved Predictions',
      value: stats.predictions.resolved,
      icon: CheckCircle,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
  ];

  const totalVotes = stats.rankDistribution
    ? Object.values(stats.rankDistribution).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold">Dashboard</h2>
        <button
          onClick={loadStats}
          className="px-3 sm:px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border dark:border-gray-700 rounded-lg w-full sm:w-auto"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-1.5 sm:p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={stat.color} size={16} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pending Resolutions Alert */}
      {stats.predictions.closed > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-yellow-600" size={24} />
              <div>
                <h3 className="font-semibold text-yellow-900">
                  {stats.predictions.closed} prediction{stats.predictions.closed !== 1 ? 's' : ''} awaiting resolution
                </h3>
                <p className="text-sm text-yellow-700">
                  These predictions have ended and need to be resolved
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rank Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Rank Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {stats.rankDistribution && Object.entries(stats.rankDistribution).map(([rank, count]) => {
              const percentage = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : '0';
              const rankColor = RANK_COLORS[rank.toLowerCase()] || RANK_COLORS.novice;
              return (
                <div key={rank}>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="font-medium capitalize" style={{ color: rankColor }}>{rank}</span>
                    <span className="text-gray-600">{count} users ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%`, backgroundColor: rankColor }}
                    />
                  </div>
                </div>
              );
            })}
            {(!stats.rankDistribution || Object.values(stats.rankDistribution).every(v => v === 0)) && (
              <p className="text-sm text-gray-500 text-center py-4">
                No ranked users yet. Users need the 'rank' field in their profile.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
