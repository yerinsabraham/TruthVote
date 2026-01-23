'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserStats, updateUserActivityMetrics, updateUserRank } from '@/lib/repositories/userRankRepository';
import { rankEngine } from '@/lib/ranking/rankEngine';
import { RankService } from '@/lib/ranking/rankService';
import { UserStats, Rank } from '@/types/rank';
import { RankBadge } from '@/components/RankBadge';
import { RefreshCw, Play, Square, RotateCcw, Trash2 } from 'lucide-react';

interface DebugLog {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

export function DebugRank() {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [autoGrowth, setAutoGrowth] = useState(false);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (type: DebugLog['type'], message: string, data?: any) => {
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data,
    };
    setLogs(prev => [log, ...prev].slice(0, 100));
    
    const color = {
      info: '#3B82F6',
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
    }[type];
    
    console.log(`%c[DEBUG RANK ${type.toUpperCase()}] ${message}`, `color: ${color}; font-weight: bold`, data || '');
  };

  useEffect(() => {
    if (user) {
      loadUserStats();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const loadUserStats = async () => {
    if (!user) return;
    
    try {
      addLog('info', 'Loading user stats...', { userId: user.uid });
      const stats = await getUserStats(user.uid);
      
      if (stats) {
        setUserStats(stats);
        addLog('success', 'User stats loaded', stats);
        
        const calculation = rankEngine.calculateRankPercentage(stats);
        addLog('info', 'Current rank calculation', calculation);
      } else {
        addLog('error', 'User stats not found');
      }
    } catch (error: any) {
      addLog('error', 'Failed to load user stats', error.message);
    }
  };

  const simulateVote = async () => {
    if (!user || !userStats) return;
    setLoading(true);
    
    try {
      addLog('info', 'Simulating vote...');
      const newTotal = userStats.totalPredictions + 1;
      await updateUserActivityMetrics(user.uid, {
        totalPredictions: newTotal,
        lastActiveAt: new Date().toISOString(),
      });
      addLog('success', `Vote simulated. Total: ${newTotal}`);
      await loadUserStats();
    } catch (error: any) {
      addLog('error', 'Failed to simulate vote', error.message);
    } finally {
      setLoading(false);
    }
  };

  const simulateResolvedPrediction = async (wasCorrect: boolean) => {
    if (!user || !userStats) return;
    setLoading(true);
    
    try {
      addLog('info', `Simulating ${wasCorrect ? 'CORRECT' : 'INCORRECT'} prediction...`);
      
      const newTotalResolved = userStats.totalResolvedPredictions + 1;
      const newCorrect = wasCorrect ? userStats.correctPredictions + 1 : userStats.correctPredictions;
      const newAccuracy = (newCorrect / newTotalResolved) * 100;
      
      await updateUserActivityMetrics(user.uid, {
        totalResolvedPredictions: newTotalResolved,
        correctPredictions: newCorrect,
        accuracyRate: newAccuracy,
        lastActiveAt: new Date().toISOString(),
      });
      
      addLog('success', `Resolved prediction simulated. Accuracy: ${newAccuracy.toFixed(2)}%`, {
        totalResolved: newTotalResolved,
        correct: newCorrect,
      });
      
      await loadUserStats();
    } catch (error: any) {
      addLog('error', 'Failed to simulate prediction', error.message);
    } finally {
      setLoading(false);
    }
  };

  const simulateWeekOfActivity = async () => {
    if (!user || !userStats) return;
    setLoading(true);
    
    try {
      addLog('info', 'Simulating week of activity...');
      const newWeeklyCount = userStats.weeklyActivityCount + 1;
      await updateUserActivityMetrics(user.uid, {
        weeklyActivityCount: newWeeklyCount,
        lastActiveAt: new Date().toISOString(),
      });
      addLog('success', `Week simulated. Active weeks: ${newWeeklyCount}`);
      await loadUserStats();
    } catch (error: any) {
      addLog('error', 'Failed to simulate week', error.message);
    } finally {
      setLoading(false);
    }
  };

  const simulateTimePassage = async (days: number) => {
    if (!user || !userStats) return;
    setLoading(true);
    
    try {
      addLog('info', `Simulating ${days} days of time passage...`);
      
      const currentCreated = new Date(userStats.createdAt);
      const newCreated = new Date(currentCreated.getTime() - (days * 24 * 60 * 60 * 1000));
      
      const currentRankStart = new Date(userStats.currentRankStartDate);
      const newRankStart = new Date(currentRankStart.getTime() - (days * 24 * 60 * 60 * 1000));
      
      const { doc, updateDoc, Timestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/config');
      const userRef = doc(db, 'users', user.uid);
      
      await updateDoc(userRef, {
        createdAt: Timestamp.fromDate(newCreated),
        currentRankStartDate: Timestamp.fromDate(newRankStart),
      });
      
      addLog('success', `Moved account ${days} days into the past`, {
        oldCreated: currentCreated.toISOString(),
        newCreated: newCreated.toISOString(),
      });
      
      await loadUserStats();
    } catch (error: any) {
      addLog('error', 'Failed to simulate time passage', error.message);
    } finally {
      setLoading(false);
    }
  };

  const recalculateRank = async (force: boolean = false) => {
    if (!user || !userStats) return;
    setLoading(true);
    
    try {
      addLog('info', `Recalculating rank (force=${force})...`);
      
      const rankService = new RankService();
      const result = await rankService.recalculateUserRank(user.uid, force);
      
      addLog('success', 'Rank recalculated', result);
      
      if (result.eligibleForUpgrade) {
        addLog('success', `🎉 ELIGIBLE FOR UPGRADE to ${result.nextRank}!`);
      } else if (result.blockers && result.blockers.length > 0) {
        addLog('warning', 'Not eligible for upgrade. Blockers:', result.blockers);
      }
      
      await loadUserStats();
    } catch (error: any) {
      addLog('error', 'Failed to recalculate rank', error.message);
    } finally {
      setLoading(false);
    }
  };

  const startAutoGrowth = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setAutoGrowth(true);
    addLog('info', '🚀 Starting auto-growth mode');
    
    let counter = 0;
    intervalRef.current = setInterval(async () => {
      if (!user || !userStats) return;
      
      counter++;
      const action = counter % 5;
      
      try {
        switch (action) {
          case 0:
            const newTotal = userStats.totalPredictions + 1;
            await updateUserActivityMetrics(user.uid, {
              totalPredictions: newTotal,
              lastActiveAt: new Date().toISOString(),
            });
            addLog('info', `[AUTO] Vote #${newTotal}`);
            break;
            
          case 1:
          case 2:
            const newResolved = userStats.totalResolvedPredictions + 1;
            const newCorrect = userStats.correctPredictions + 1;
            const newAccuracy = (newCorrect / newResolved) * 100;
            await updateUserActivityMetrics(user.uid, {
              totalResolvedPredictions: newResolved,
              correctPredictions: newCorrect,
              accuracyRate: newAccuracy,
              lastActiveAt: new Date().toISOString(),
            });
            addLog('success', `[AUTO] Correct (${newAccuracy.toFixed(1)}%)`);
            break;
            
          case 3:
            const newWeeks = userStats.weeklyActivityCount + 1;
            await updateUserActivityMetrics(user.uid, {
              weeklyActivityCount: newWeeks,
              lastActiveAt: new Date().toISOString(),
            });
            addLog('info', `[AUTO] Week #${newWeeks}`);
            break;
            
          case 4:
            const rankService = new RankService();
            const result = await rankService.recalculateUserRank(user.uid, true);
            addLog('info', `[AUTO] Rank: ${result.percentage.toFixed(1)}%`, result.breakdown);
            
            if (result.eligibleForUpgrade) {
              addLog('success', `🎉 UPGRADE AVAILABLE to ${result.nextRank}!`);
              stopAutoGrowth();
            }
            break;
        }
        
        await loadUserStats();
        
      } catch (error: any) {
        addLog('error', '[AUTO] Error', error.message);
      }
    }, 1000);
  };

  const stopAutoGrowth = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setAutoGrowth(false);
    addLog('info', '⏸️ Auto-growth stopped');
  };

  const resetToNovice = async () => {
    if (!user) return;
    if (!confirm('Reset to Novice rank? This will clear all progress.')) return;
    
    setLoading(true);
    
    try {
      addLog('warning', 'Resetting to Novice...');
      
      await updateUserRank(user.uid, {
        currentRank: Rank.NOVICE,
        rankPercentage: 0,
        currentRankStartDate: new Date().toISOString(),
        lastRankUpdateAt: new Date().toISOString(),
        rankUpgradeHistory: [],
      });
      
      addLog('success', 'Reset complete');
      await loadUserStats();
    } catch (error: any) {
      addLog('error', 'Failed to reset', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !userStats) {
    return (
      <div className="admin-content-header">
        <div className="animate-pulse">Loading debug tools...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="admin-content-header">
        <div>
          <h1 className="admin-content-title">🔧 Rank System Debugger</h1>
          <p className="admin-content-subtitle">Test and debug ranking in real-time</p>
        </div>
      </div>

      {/* Stats Display */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Current Stats</h2>
        </div>
        <div className="admin-card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-[var(--admin-text-secondary)] mb-1">Rank</div>
              <div className="flex items-center gap-2">
                <RankBadge rank={userStats.currentRank} showPercentage={false} />
                <span className="text-xl font-bold text-[var(--admin-text-primary)]">{userStats.rankPercentage.toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-[var(--admin-text-secondary)] mb-1">Predictions</div>
              <div className="text-xl font-bold text-[var(--admin-text-primary)]">{userStats.totalPredictions}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--admin-text-secondary)] mb-1">Resolved</div>
              <div className="text-xl font-bold text-[var(--admin-text-primary)]">{userStats.totalResolvedPredictions}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--admin-text-secondary)] mb-1">Accuracy</div>
              <div className="text-xl font-bold text-[var(--admin-text-primary)]">{userStats.accuracyRate.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-sm text-[var(--admin-text-secondary)] mb-1">Correct</div>
              <div className="text-xl font-bold text-green-500">{userStats.correctPredictions}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--admin-text-secondary)] mb-1">Active Weeks</div>
              <div className="text-xl font-bold text-[var(--admin-text-primary)]">{userStats.weeklyActivityCount}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--admin-text-secondary)] mb-1">Account Age</div>
              <div className="text-xl font-bold text-[var(--admin-text-primary)]">
                {Math.floor((Date.now() - new Date(userStats.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
              </div>
            </div>
            <div>
              <div className="text-sm text-[var(--admin-text-secondary)] mb-1">Days in Rank</div>
              <div className="text-xl font-bold text-[var(--admin-text-primary)]">
                {Math.floor((Date.now() - new Date(userStats.currentRankStartDate).getTime()) / (1000 * 60 * 60 * 24))} days
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Debug Actions</h2>
        </div>
        <div className="admin-card-body space-y-4">
          {/* Basic Actions */}
          <div className="flex flex-wrap gap-2">
            <button onClick={simulateVote} disabled={loading} className="admin-btn admin-btn-secondary">
              📊 Simulate Vote
            </button>
            <button onClick={() => simulateResolvedPrediction(true)} disabled={loading} className="admin-btn admin-btn-success">
              ✅ Correct
            </button>
            <button onClick={() => simulateResolvedPrediction(false)} disabled={loading} className="admin-btn admin-btn-danger">
              ❌ Wrong
            </button>
            <button onClick={simulateWeekOfActivity} disabled={loading} className="admin-btn admin-btn-secondary">
              📅 +1 Week
            </button>
          </div>

          {/* Time Controls */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => simulateTimePassage(7)} disabled={loading} className="admin-btn admin-btn-secondary">
              ⏰ +7 Days
            </button>
            <button onClick={() => simulateTimePassage(30)} disabled={loading} className="admin-btn admin-btn-secondary">
              ⏰ +30 Days
            </button>
            <button onClick={() => simulateTimePassage(60)} disabled={loading} className="admin-btn admin-btn-secondary">
              ⏰ +60 Days
            </button>
          </div>

          {/* Rank Controls */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => recalculateRank(false)} disabled={loading} className="admin-btn admin-btn-primary">
              <RefreshCw size={16} /> Recalculate
            </button>
            <button onClick={() => recalculateRank(true)} disabled={loading} className="admin-btn admin-btn-primary">
              <RefreshCw size={16} /> Force Recalc
            </button>
          </div>

          {/* Auto Growth */}
          <div className="flex flex-wrap gap-2">
            {!autoGrowth ? (
              <button onClick={startAutoGrowth} disabled={loading} className="admin-btn admin-btn-success font-bold">
                <Play size={16} /> START AUTO-GROWTH
              </button>
            ) : (
              <button onClick={stopAutoGrowth} className="admin-btn admin-btn-danger font-bold">
                <Square size={16} /> STOP AUTO-GROWTH
              </button>
            )}
            <button onClick={resetToNovice} disabled={loading} className="admin-btn admin-btn-danger">
              <RotateCcw size={16} /> Reset to Novice
            </button>
          </div>

          {/* Utility */}
          <div className="flex gap-2">
            <button onClick={loadUserStats} disabled={loading} className="admin-btn admin-btn-secondary">
              <RefreshCw size={16} /> Reload Stats
            </button>
            <button onClick={() => setLogs([])} className="admin-btn admin-btn-secondary">
              <Trash2 size={16} /> Clear Logs
            </button>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Debug Logs ({logs.length})</h2>
        </div>
        <div className="admin-card-body">
          <div className="bg-black text-green-400 font-mono text-sm p-4 rounded max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Perform an action to see logs.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-2">
                  <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                  <span className={
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    'text-blue-400'
                  }>
                    [{log.type.toUpperCase()}]
                  </span>{' '}
                  {log.message}
                  {log.data && (
                    <pre className="ml-4 mt-1 text-gray-400 text-xs">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="admin-card bg-yellow-500/10 border-yellow-500/50">
        <div className="admin-card-body">
          <p className="text-yellow-600 dark:text-yellow-400 text-sm">
            ⚠️ <strong>Warning:</strong> All changes affect your real database. Check browser console (F12) for detailed logs.
          </p>
        </div>
      </div>
    </div>
  );
}
