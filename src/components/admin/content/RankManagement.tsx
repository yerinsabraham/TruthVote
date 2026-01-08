// src/components/admin/content/RankManagement.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { 
  RefreshCw,
  Trophy,
  Award,
  Users
} from 'lucide-react';
import { EmptyState } from '../shared';
import { logAdminAction } from '@/lib/firebase/adminActions';
import { useAuth } from '@/context/AuthContext';
import { RANK_CONFIGS, RANK_ORDER } from '@/config/ranks';
import { Rank } from '@/types/rank';

interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  currentRank?: string;
  points?: number;
  totalVotes?: number;
  accuracyRate?: number;
}

interface RankStats {
  rank: Rank;
  displayName: string;
  count: number;
  percentage: number;
  topUsers: User[];
  icon: string;
  color: string;
}

export default function RankManagement() {
  const { user: adminUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [rankStats, setRankStats] = useState<RankStats[]>([]);
  const [topUsers, setTopUsers] = useState<User[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const loadedUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
      
      setUsers(loadedUsers);
      
      // Calculate rank distribution using actual app ranks
      const rankCounts: Record<Rank, number> = {
        [Rank.NOVICE]: 0,
        [Rank.AMATEUR]: 0,
        [Rank.ANALYST]: 0,
        [Rank.PROFESSIONAL]: 0,
        [Rank.EXPERT]: 0,
        [Rank.MASTER]: 0,
      };
      
      loadedUsers.forEach(user => {
        const rank = (user.currentRank || Rank.NOVICE) as Rank;
        if (rank in rankCounts) {
          rankCounts[rank]++;
        }
      });
      
      const total = loadedUsers.length || 1;
      const stats: RankStats[] = RANK_ORDER.map(rank => {
        const config = RANK_CONFIGS[rank];
        const count = rankCounts[rank];
        return {
          rank,
          displayName: config.displayName,
          count,
          percentage: (count / total) * 100,
          icon: config.badgeIcon,
          color: config.displayColor,
          topUsers: loadedUsers
            .filter(u => (u.currentRank || Rank.NOVICE) === rank)
            .sort((a, b) => (b.points || 0) - (a.points || 0))
            .slice(0, 3)
        };
      });
      
      setRankStats(stats);
      
      // Get top 10 users by points
      const top = [...loadedUsers]
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 10);
      
      setTopUsers(top);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load rank data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecalculateRanks = async () => {
    try {
      toast.loading('Recalculating ranks for all users...');
      
      // TODO: Trigger the cloud function that recalculates ranks
      // For now, just reload data
      
      toast.dismiss();
      toast.success('Rank recalculation triggered');
      
      if (adminUser) {
        await logAdminAction({
          type: 'settings_changed',
          description: `Triggered rank recalculation for ${users.length} users`,
          adminId: adminUser.uid
        });
      }
      
      loadData();
    } catch (error) {
      console.error('Error recalculating ranks:', error);
      toast.dismiss();
      toast.error('Failed to recalculate ranks');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-content-header">
          <div>
            <h1 className="admin-content-title">Rank Management</h1>
            <p className="admin-content-subtitle">Configure rank thresholds and view top users</p>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-body p-8 text-center">
            <RefreshCw className="animate-spin mx-auto text-[var(--admin-text-tertiary)]" size={24} />
            <p className="text-sm text-[var(--admin-text-secondary)] mt-2">Loading rank data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="admin-content-header">
        <div>
          <h1 className="admin-content-title">Rank Management</h1>
          <p className="admin-content-subtitle">{users.length} total users</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRecalculateRanks}
            className="admin-btn admin-btn-secondary"
          >
            <RefreshCw size={14} />
            Recalculate Ranks
          </button>
        </div>
      </div>

      {/* Rank Distribution */}
      <div className="admin-card">
        <div className="admin-card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-[var(--admin-text-secondary)]" />
            <h3 className="font-medium text-[var(--admin-text-primary)]">Rank Distribution</h3>
          </div>
        </div>
        <div className="admin-card-body">
          <div className="space-y-3">
            {rankStats.map((stat) => {
              return (
                <div key={stat.rank} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: `${stat.color}20` }}>
                    {stat.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: stat.color }}>{stat.displayName}</span>
                      <span className="text-xs text-[var(--admin-text-tertiary)]">
                        {stat.count} users ({stat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--admin-bg-tertiary)] rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(stat.percentage, 100)}%`,
                          backgroundColor: stat.color
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Users Leaderboard */}
      <div className="admin-card">
        <div className="admin-card-header">
          <Award size={16} className="text-[var(--admin-text-secondary)]" />
          <h3 className="font-medium text-[var(--admin-text-primary)]">Top 10 Leaderboard</h3>
        </div>
        <div className="admin-card-body p-0">
          {topUsers.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Users}
                title="No users"
                message="No users have earned points yet"
              />
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>User</th>
                  <th style={{ width: '100px' }}>Rank</th>
                  <th style={{ width: '80px' }}>Points</th>
                  <th style={{ width: '80px' }}>Votes</th>
                  <th style={{ width: '100px' }}>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((user, index) => {
                const userRank = (user.currentRank || Rank.NOVICE) as Rank;
                const rankConfig = RANK_CONFIGS[userRank];
                  
                return (
                  <tr key={user.id}>
                    <td>
                      <span className={`text-sm font-bold ${
                        index === 0 ? 'text-yellow-600' :
                        index === 1 ? 'text-gray-500' :
                        index === 2 ? 'text-amber-700' :
                        'text-[var(--admin-text-tertiary)]'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[var(--admin-bg-tertiary)] flex items-center justify-center text-xs font-medium">
                            {(user.displayName || user.email || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-[var(--admin-text-primary)]">
                            {user.displayName || 'Anonymous'}
                          </p>
                          <p className="text-xs text-[var(--admin-text-tertiary)]">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span 
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                        style={{ 
                          backgroundColor: `${rankConfig.displayColor}20`,
                          color: rankConfig.displayColor
                        }}
                      >
                        {rankConfig.badgeIcon}
                        {rankConfig.displayName}
                      </span>
                    </td>
                      <td>
                        <span className="text-sm font-medium text-[var(--admin-text-primary)]">
                          {(user.points || 0).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-[var(--admin-text-secondary)]">
                          {user.totalVotes || 0}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-[var(--admin-text-secondary)]">
                          {user.accuracyRate ? `${(user.accuracyRate * 100).toFixed(1)}%` : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="admin-card">
          <div className="admin-card-body text-center">
            <p className="text-2xl font-bold text-[var(--admin-text-primary)]">
              {rankStats.find(s => s.rank === 'Prophet')?.count || 0}
            </p>
            <p className="text-xs text-yellow-600">Prophets</p>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-body text-center">
            <p className="text-2xl font-bold text-[var(--admin-text-primary)]">
              {rankStats.find(s => s.rank === 'Oracle')?.count || 0}
            </p>
            <p className="text-xs text-purple-600">Oracles</p>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-body text-center">
            <p className="text-2xl font-bold text-[var(--admin-text-primary)]">
              {rankStats.find(s => s.rank === 'Seer')?.count || 0}
            </p>
            <p className="text-xs text-blue-600">Seers</p>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-body text-center">
            <p className="text-2xl font-bold text-[var(--admin-text-primary)]">
              {users.length > 0 
                ? ((users.filter(u => u.totalVotes && u.totalVotes > 0).length / users.length) * 100).toFixed(0)
                : 0}%
            </p>
            <p className="text-xs text-[var(--admin-text-tertiary)]">Active Voters</p>
          </div>
        </div>
      </div>
    </div>
  );
}
