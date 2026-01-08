// src/components/admin/dashboard/AdminActionsLog.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  FileText, 
  CheckCircle, 
  UserCheck,
  Trash2,
  Edit,
  Plus,
  RefreshCw,
  Award,
  Settings,
  TrendingUp,
  Ban
} from 'lucide-react';
import { EmptyState } from '../shared';

interface AdminAction {
  id: string;
  type: 'prediction_created' | 'prediction_resolved' | 'prediction_deleted' | 'prediction_edited' | 
        'user_promoted' | 'user_banned' | 'user_unbanned' | 'rank_recalculated' | 
        'category_added' | 'settings_changed' | 'trending_set';
  description: string;
  targetId?: string;
  targetName?: string;
  adminId: string;
  adminName?: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export default function AdminActionsLog() {
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Try to load from admin_actions collection
      const actionsQuery = query(
        collection(db, 'admin_actions'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(actionsQuery);
      
      if (snapshot.empty) {
        // Collection doesn't exist yet - that's okay
        setActions([]);
      } else {
        const loadedActions = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: data.type,
            description: data.description,
            targetId: data.targetId,
            targetName: data.targetName,
            adminId: data.adminId,
            adminName: data.adminName,
            timestamp: data.timestamp?.toDate?.() || new Date(),
            details: data.details
          } as AdminAction;
        });
        setActions(loadedActions);
      }
    } catch (error) {
      console.error('Error loading admin actions:', error);
      // If collection doesn't exist, just show empty state
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const getActionIcon = (type: AdminAction['type']) => {
    switch (type) {
      case 'prediction_created':
        return { icon: Plus, bg: 'bg-green-50', color: 'text-green-600' };
      case 'prediction_resolved':
        return { icon: CheckCircle, bg: 'bg-blue-50', color: 'text-blue-600' };
      case 'prediction_deleted':
        return { icon: Trash2, bg: 'bg-red-50', color: 'text-red-600' };
      case 'prediction_edited':
        return { icon: Edit, bg: 'bg-orange-50', color: 'text-orange-600' };
      case 'user_promoted':
        return { icon: UserCheck, bg: 'bg-purple-50', color: 'text-purple-600' };
      case 'user_banned':
        return { icon: Ban, bg: 'bg-red-50', color: 'text-red-600' };
      case 'user_unbanned':
        return { icon: UserCheck, bg: 'bg-green-50', color: 'text-green-600' };
      case 'rank_recalculated':
        return { icon: Award, bg: 'bg-yellow-50', color: 'text-yellow-600' };
      case 'category_added':
        return { icon: Settings, bg: 'bg-gray-50', color: 'text-gray-600' };
      case 'settings_changed':
        return { icon: Settings, bg: 'bg-gray-50', color: 'text-gray-600' };
      case 'trending_set':
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-content-header">
          <div>
            <h1 className="admin-content-title">Activity Feed</h1>
            <p className="admin-content-subtitle">Your recent admin actions</p>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-body">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-2 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
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
          <h1 className="admin-content-title">Activity Feed</h1>
          <p className="admin-content-subtitle">Track your recent admin actions</p>
        </div>
        <button 
          onClick={loadActions}
          className="admin-btn admin-btn-secondary"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Actions List */}
      <div className="admin-card">
        <div className="admin-card-body p-0">
          {actions.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FileText}
                title="No actions recorded yet"
                message="Your admin actions will appear here as you manage predictions, users, and settings. Actions like creating predictions, resolving outcomes, and user management are logged automatically."
              />
            </div>
          ) : (
            <div className="divide-y divide-[var(--admin-border)]">
              {actions.map((action) => {
                const { icon: Icon, bg, color } = getActionIcon(action.type);
                return (
                  <div key={action.id} className="flex items-start gap-3 p-4 hover:bg-[var(--admin-bg-secondary)] transition-colors">
                    <div className={`w-8 h-8 rounded-full ${bg} ${color} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--admin-text-primary)]">
                        {action.description}
                      </p>
                      {action.targetName && (
                        <p className="text-xs text-[var(--admin-text-tertiary)] mt-0.5">
                          Target: {action.targetName}
                        </p>
                      )}
                      <p className="text-xs text-[var(--admin-text-tertiary)] mt-1">
                        {formatTime(action.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="admin-card">
        <div className="admin-card-body">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <FileText size={14} />
            </div>
            <div>
              <h4 className="text-sm font-medium text-[var(--admin-text-primary)]">
                How Activity Logging Works
              </h4>
              <p className="text-xs text-[var(--admin-text-secondary)] mt-1">
                Actions are automatically logged when you:
              </p>
              <ul className="text-xs text-[var(--admin-text-tertiary)] mt-2 space-y-1 list-disc list-inside">
                <li>Create, edit, or delete predictions</li>
                <li>Resolve prediction outcomes</li>
                <li>Manage users (promote, ban, unban)</li>
                <li>Recalculate user ranks</li>
                <li>Add or modify categories</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
