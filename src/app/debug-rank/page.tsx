'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserStats, updateUserActivityMetrics, updateUserRank } from '@/lib/repositories/userRankRepository';
import { rankEngine } from '@/lib/ranking/rankEngine';
import { RankService } from '@/lib/ranking/rankService';
import { UserStats, Rank } from '@/types/rank';
import { RankBadge } from '@/components/RankBadge';
import { useRouter } from 'next/navigation';

interface DebugLog {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

export default function DebugRankPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
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
    setLogs(prev => [log, ...prev].slice(0, 100)); // Keep last 100 logs
    
    // Also log to console with color
    const color = {
      info: '#3B82F6',
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
    }[type];
    
    console.log(`%c[DEBUG RANK ${type.toUpperCase()}] ${message}`, `color: ${color}; font-weight: bold`, data || '');
  };

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    loadUserStats();
  }, [currentUser]);

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const loadUserStats = async () => {
    if (!currentUser) return;
    
    try {
      addLog('info', 'Loading user stats...', { userId: currentUser.uid });
      const stats = await getUserStats(currentUser.uid);
      
      if (stats) {
        setUserStats(stats);
        addLog('success', 'User stats loaded', stats);
        
        // Calculate current rank percentage
        const calculation = rankEngine.calculateRankPercentage(stats);
        addLog('info', 'Current rank calculation', calculation);
      } else {
        addLog('error', 'User stats not found - user may not exist in database');
      }
    } catch (error: any) {
      addLog('error', 'Failed to load user stats', error.message);
    }
  };

  const simulateVote = async () => {
    if (!currentUser || !userStats) return;
    setLoading(true);
    
    try {
      addLog('info', 'Simulating vote...');
      
      // Add one prediction
      const newTotal = userStats.totalPredictions + 1;
      
      await updateUserActivityMetrics(currentUser.uid, {
        totalPredictions: newTotal,
        lastActiveAt: new Date().toISOString(),
      });
      
      addLog('success', `Vote simulated. Total predictions: ${newTotal}`);
      await loadUserStats();
    } catch (error: any) {
      addLog('error', 'Failed to simulate vote', error.message);
    } finally {
      setLoading(false);
    }
  };

  const simulateResolvedPrediction = async (wasCorrect: boolean) => {
    if (!currentUser || !userStats) return;
    setLoading(true);
    
    try {
      addLog('info', `Simulating resolved prediction (${wasCorrect ? 'CORRECT' : 'INCORRECT'})...`);
      
      const newTotalResolved = userStats.totalResolvedPredictions + 1;
      const newCorrect = wasCorrect ? userStats.correctPredictions + 1 : userStats.correctPredictions;
      const newAccuracy = (newCorrect / newTotalResolved) * 100;
      
      await updateUserActivityMetrics(currentUser.uid, {
        totalResolvedPredictions: newTotalResolved,
        correctPredictions: newCorrect,
        accuracyRate: newAccuracy,
        lastActiveAt: new Date().toISOString(),
      });
      
      addLog('success', `Resolved prediction simulated. Accuracy: ${newAccuracy.toFixed(2)}%`, {
        totalResolved: newTotalResolved,
        correct: newCorrect,
        accuracy: newAccuracy,
      });
      
      await loadUserStats();
    } catch (error: any) {
      addLog('error', 'Failed to simulate resolved prediction', error.message);
    } finally {
      setLoading(false);
    }
  };

  const simulateWeekOfActivity = async () => {
    if (!currentUser || !userStats) return;
    setLoading(true);
    
    try {
      addLog('info', 'Simulating week of activity...');
      
      const newWeeklyCount = userStats.weeklyActivityCount + 1;
      
      await updateUserActivityMetrics(currentUser.uid, {
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
    if (!currentUser || !userStats) return;
    setLoading(true);
    
    try {
      addLog('info', `Simulating ${days} days of time passage...`);
      
      // Move the account creation date back by X days
      const currentCreated = new Date(userStats.createdAt);
      const newCreated = new Date(currentCreated.getTime() - (days * 24 * 60 * 60 * 1000));
      
      // Also move rank start date back
      const currentRankStart = new Date(userStats.currentRankStartDate);
      const newRankStart = new Date(currentRankStart.getTime() - (days * 24 * 60 * 60 * 1000));
      
      // Update in Firestore
      const { doc, updateDoc, Timestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/config');
      const userRef = doc(db, 'users', currentUser.uid);
      
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
    if (!currentUser || !userStats) return;
    setLoading(true);
    
    try {
      addLog('info', `Recalculating rank (force=${force})...`);
      
      const rankService = new RankService();
      const result = await rankService.recalculateUserRank(currentUser.uid, force);
      
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
    addLog('info', '🚀 Starting auto-growth mode (1 action per second)');
    
    let counter = 0;
    intervalRef.current = setInterval(async () => {
      if (!currentUser || !userStats) return;
      
      counter++;
      const action = counter % 5;
      
      try {
        switch (action) {
          case 0:
            // Simulate vote
            const newTotal = userStats.totalPredictions + 1;
            await updateUserActivityMetrics(currentUser.uid, {
              totalPredictions: newTotal,
              lastActiveAt: new Date().toISOString(),
            });
            addLog('info', `[AUTO] Vote #${newTotal}`);
            break;
            
          case 1:
          case 2:
            // Simulate correct prediction
            const newResolved = userStats.totalResolvedPredictions + 1;
            const newCorrect = userStats.correctPredictions + 1;
            const newAccuracy = (newCorrect / newResolved) * 100;
            await updateUserActivityMetrics(currentUser.uid, {
              totalResolvedPredictions: newResolved,
              correctPredictions: newCorrect,
              accuracyRate: newAccuracy,
              lastActiveAt: new Date().toISOString(),
            });
            addLog('success', `[AUTO] Correct prediction (${newAccuracy.toFixed(1)}%)`);
            break;
            
          case 3:
            // Simulate week of activity
            const newWeeks = userStats.weeklyActivityCount + 1;
            await updateUserActivityMetrics(currentUser.uid, {
              weeklyActivityCount: newWeeks,
              lastActiveAt: new Date().toISOString(),
            });
            addLog('info', `[AUTO] Week #${newWeeks}`);
            break;
            
          case 4:
            // Recalculate rank
            const rankService = new RankService();
            const result = await rankService.recalculateUserRank(currentUser.uid, true);
            addLog('info', `[AUTO] Rank: ${result.percentage.toFixed(1)}%`, result.breakdown);
            
            if (result.eligibleForUpgrade) {
              addLog('success', `🎉 [AUTO] UPGRADE AVAILABLE to ${result.nextRank}!`);
              stopAutoGrowth();
            }
            break;
        }
        
        // Reload stats every cycle
        await loadUserStats();
        
      } catch (error: any) {
        addLog('error', '[AUTO] Error in auto-growth', error.message);
      }
    }, 1000); // Every second
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
    if (!currentUser) return;
    if (!confirm('Are you sure you want to reset to Novice rank? This will clear all progress.')) return;
    
    setLoading(true);
    
    try {
      addLog('warning', 'Resetting to Novice rank...');
      
      await updateUserRank(currentUser.uid, {
        currentRank: Rank.NOVICE,
        rankPercentage: 0,
        currentRankStartDate: new Date().toISOString(),
        lastRankUpdateAt: new Date().toISOString(),
        rankUpgradeHistory: [],
      });
      
      addLog('success', 'Reset to Novice rank complete');
      await loadUserStats();
    } catch (error: any) {
      addLog('error', 'Failed to reset rank', error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Logs cleared');
  };

  if (!currentUser) {
    return <div className="container mx-auto p-8">Please log in to access debug tools.</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2 text-foreground">🔧 Rank System Debugger</h1>
        <p className="text-muted-foreground">
          Test and debug the ranking system in real-time. Watch console logs and database updates.
        </p>
      </div>

      {/* User Stats Display */}
      {userStats && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-foreground">Current Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Current Rank</div>
              <div className="flex items-center gap-2 mt-1">
                <RankBadge rank={userStats.currentRank} showPercentage={false} />
                <span className="text-2xl font-bold">{userStats.rankPercentage.toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Predictions</div>
              <div className="text-2xl font-bold text-foreground">{userStats.totalPredictions}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Resolved</div>
              <div className="text-2xl font-bold text-foreground">{userStats.totalResolvedPredictions}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
              <div className="text-2xl font-bold text-foreground">{userStats.accuracyRate.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Correct</div>
              <div className="text-2xl font-bold text-success">{userStats.correctPredictions}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Active Weeks</div>
              <div className="text-2xl font-bold text-foreground">{userStats.weeklyActivityCount}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Account Age</div>
              <div className="text-2xl font-bold text-foreground">
                {Math.floor((Date.now() - new Date(userStats.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Days in Rank</div>
              <div className="text-2xl font-bold text-foreground">
                {Math.floor((Date.now() - new Date(userStats.currentRankStartDate).getTime()) / (1000 * 60 * 60 * 24))} days
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-foreground">Debug Actions</h2>
        
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={simulateVote}
              disabled={loading || !userStats}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
            >
              📊 Simulate Vote
            </button>
            
            <button
              onClick={() => simulateResolvedPrediction(true)}
              disabled={loading || !userStats}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
            >
              ✅ Correct Prediction
            </button>
            
            <button
              onClick={() => simulateResolvedPrediction(false)}
              disabled={loading || !userStats}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
            >
              ❌ Wrong Prediction
            </button>
            
            <button
              onClick={simulateWeekOfActivity}
              disabled={loading || !userStats}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
            >
              📅 +1 Active Week
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => simulateTimePassage(7)}
              disabled={loading || !userStats}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded disabled:opacity-50"
            >
              ⏰ +7 Days
            </button>
            
            <button
              onClick={() => simulateTimePassage(30)}
              disabled={loading || !userStats}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded disabled:opacity-50"
            >
              ⏰ +30 Days
            </button>
            
            <button
              onClick={() => simulateTimePassage(60)}
              disabled={loading || !userStats}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded disabled:opacity-50"
            >
              ⏰ +60 Days
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => recalculateRank(false)}
              disabled={loading || !userStats}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50"
            >
              🔄 Recalculate Rank
            </button>
            
            <button
              onClick={() => recalculateRank(true)}
              disabled={loading || !userStats}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50"
            >
              🔄 Force Recalculate
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {!autoGrowth ? (
              <button
                onClick={startAutoGrowth}
                disabled={loading || !userStats}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 font-bold"
              >
                🚀 START AUTO-GROWTH (1/sec)
              </button>
            ) : (
              <button
                onClick={stopAutoGrowth}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold"
              >
                ⏸️ STOP AUTO-GROWTH
              </button>
            )}
            
            <button
              onClick={resetToNovice}
              disabled={loading || !userStats}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
            >
              🔄 Reset to Novice
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadUserStats}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded disabled:opacity-50"
            >
              🔄 Reload Stats
            </button>
            
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
            >
              🗑️ Clear Logs
            </button>
          </div>
        </div>
      </div>

      {/* Logs Display */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-foreground">Debug Logs ({logs.length})</h2>
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

      <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
        <p className="text-yellow-600 dark:text-yellow-400 text-sm">
          ⚠️ <strong>Warning:</strong> This is a debug page. All changes affect your real database. 
          Use auto-growth mode to quickly test ranking progression. Check browser console for detailed logs.
        </p>
      </div>
    </div>
  );
}
