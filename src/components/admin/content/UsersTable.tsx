// src/components/admin/content/UsersTable.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  Ban, 
  Trash2, 
  Shield, 
  ShieldOff,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  UserCheck,
  Search
} from 'lucide-react';
import { SearchInput, EmptyState, ConfirmDialog } from '../shared';
import { logAdminAction } from '@/lib/firebase/adminActions';
import { useAuth } from '@/context/AuthContext';

interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role?: string;
  currentRank?: string;
  points?: number;
  totalVotes?: number;
  accuracyRate?: number;
  createdAt?: { toDate?: () => Date };
  lastActive?: { toDate?: () => Date };
  isBanned?: boolean;
}

const USERS_PER_PAGE = 20;

export default function UsersTable() {
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'ban' | 'unban' | 'delete' | 'promote' | 'demote';
    user: User;
  } | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadUsers = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      
      // Fetch all users without ordering to avoid missing field issues
      const snapshot = await getDocs(collection(db, 'users'));
      const loadedUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
      
      // Sort in memory by createdAt (newest first), handling missing dates
      loadedUsers.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      
      setUsers(loadedUsers);
      setHasMore(false); // All users loaded at once
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBanUser = async (userId: string, ban: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isBanned: ban,
        bannedAt: ban ? new Date() : null,
        bannedBy: ban ? adminUser?.uid : null
      });
      
      const targetUser = users.find(u => u.id === userId);
      if (adminUser && targetUser) {
        await logAdminAction({
          type: ban ? 'user_banned' : 'user_unbanned',
          description: `${ban ? 'Banned' : 'Unbanned'} user: ${targetUser.displayName || targetUser.email}`,
          adminId: adminUser.uid,
          targetId: userId,
          targetName: targetUser.displayName || targetUser.email
        });
      }
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, isBanned: ban } : u
      ));
      
      toast.success(`User ${ban ? 'banned' : 'unbanned'} successfully`);
      setConfirmAction(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const targetUser = users.find(u => u.id === userId);
      
      await deleteDoc(doc(db, 'users', userId));
      
      if (adminUser && targetUser) {
        await logAdminAction({
          type: 'user_banned', // Using banned as closest type
          description: `Deleted user: ${targetUser.displayName || targetUser.email}`,
          adminId: adminUser.uid,
          targetId: userId,
          targetName: targetUser.displayName || targetUser.email
        });
      }
      
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User deleted successfully');
      setConfirmAction(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handlePromoteUser = async (userId: string, promote: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: promote ? 'admin' : 'user'
      });
      
      const targetUser = users.find(u => u.id === userId);
      if (adminUser && targetUser) {
        await logAdminAction({
          type: 'user_promoted',
          description: `${promote ? 'Promoted to admin' : 'Demoted to user'}: ${targetUser.displayName || targetUser.email}`,
          adminId: adminUser.uid,
          targetId: userId,
          targetName: targetUser.displayName || targetUser.email
        });
      }
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: promote ? 'admin' : 'user' } : u
      ));
      
      toast.success(`User ${promote ? 'promoted to admin' : 'demoted to user'}`);
      setConfirmAction(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  // Filter users by search
  const filteredUsers = users.filter(u => 
    (u.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: { toDate?: () => Date } | undefined) => {
    if (!timestamp?.toDate) return '-';
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRankColor = (rank?: string) => {
    switch (rank) {
      case 'Prophet': return 'text-yellow-600 bg-yellow-50';
      case 'Oracle': return 'text-purple-600 bg-purple-50';
      case 'Seer': return 'text-blue-600 bg-blue-50';
      case 'Visionary': return 'text-green-600 bg-green-50';
      case 'Initiate': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="space-y-4">
        <div className="admin-content-header">
          <div>
            <h1 className="admin-content-title">User Management</h1>
            <p className="admin-content-subtitle">Manage platform users</p>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-body p-8 text-center">
            <RefreshCw className="animate-spin mx-auto text-[var(--admin-text-tertiary)]" size={24} />
            <p className="text-sm text-[var(--admin-text-secondary)] mt-2">Loading users...</p>
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
          <h1 className="admin-content-title">User Management</h1>
          <p className="admin-content-subtitle">{users.length} users total</p>
        </div>
        <button 
          onClick={() => loadUsers(true)}
          className="admin-btn admin-btn-secondary"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="admin-card">
        <div className="admin-card-body">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name or email..."
          />
        </div>
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="admin-card-body">
            <EmptyState
              icon={Search}
              title="No users found"
              message={searchQuery ? "Try a different search term" : "No users registered yet"}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>User</th>
                  <th style={{ width: '100px' }}>Role</th>
                  <th style={{ width: '100px' }}>Rank</th>
                  <th style={{ width: '80px' }}>Votes</th>
                  <th style={{ width: '100px' }}>Joined</th>
                  <th style={{ width: '80px' }}>Status</th>
                  <th style={{ width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <>
                    <tr key={user.id} className={expandedRow === user.id ? 'bg-[var(--admin-bg-secondary)]' : ''}>
                      {/* Expand */}
                      <td>
                        <button
                          onClick={() => setExpandedRow(expandedRow === user.id ? null : user.id)}
                          className="p-1 hover:bg-[var(--admin-bg-tertiary)] rounded transition-colors"
                        >
                          {expandedRow === user.id ? (
                            <ChevronUp size={14} className="text-[var(--admin-text-tertiary)]" />
                          ) : (
                            <ChevronDown size={14} className="text-[var(--admin-text-tertiary)]" />
                          )}
                        </button>
                      </td>
                      
                      {/* User info */}
                      <td>
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[var(--admin-bg-tertiary)] flex items-center justify-center text-xs font-medium text-[var(--admin-text-secondary)]">
                              {(user.displayName || user.email || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-[var(--admin-text-primary)] line-clamp-1">
                              {user.displayName || 'No name'}
                            </p>
                            <p className="text-xs text-[var(--admin-text-tertiary)] line-clamp-1">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      {/* Role */}
                      <td>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      
                      {/* Rank */}
                      <td>
                        <span className={`text-xs px-2 py-1 rounded-full ${getRankColor(user.currentRank)}`}>
                          {user.currentRank || 'Initiate'}
                        </span>
                      </td>
                      
                      {/* Votes */}
                      <td>
                        <span className="text-sm text-[var(--admin-text-primary)]">
                          {user.totalVotes || 0}
                        </span>
                      </td>
                      
                      {/* Joined */}
                      <td>
                        <span className="text-xs text-[var(--admin-text-secondary)]">
                          {formatDate(user.createdAt)}
                        </span>
                      </td>
                      
                      {/* Status */}
                      <td>
                        {user.isBanned ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                            Banned
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                            Active
                          </span>
                        )}
                      </td>
                      
                      {/* Actions */}
                      <td>
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)}
                            className="p-1.5 hover:bg-[var(--admin-bg-tertiary)] rounded transition-colors"
                          >
                            <MoreVertical size={14} className="text-[var(--admin-text-tertiary)]" />
                          </button>
                          
                          {actionMenuOpen === user.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-[var(--admin-border)] py-1 z-10 min-w-[160px]">
                              {user.isBanned ? (
                                <button
                                  onClick={() => {
                                    setConfirmAction({ type: 'unban', user });
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--admin-bg-secondary)] text-green-600"
                                >
                                  <UserCheck size={14} />
                                  Unban User
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setConfirmAction({ type: 'ban', user });
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--admin-bg-secondary)] text-orange-600"
                                >
                                  <Ban size={14} />
                                  Ban User
                                </button>
                              )}
                              
                              {user.role === 'admin' ? (
                                <button
                                  onClick={() => {
                                    setConfirmAction({ type: 'demote', user });
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--admin-bg-secondary)] text-[var(--admin-text-primary)]"
                                >
                                  <ShieldOff size={14} />
                                  Remove Admin
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setConfirmAction({ type: 'promote', user });
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--admin-bg-secondary)] text-[var(--admin-text-primary)]"
                                >
                                  <Shield size={14} />
                                  Make Admin
                                </button>
                              )}
                              
                              <hr className="my-1 border-[var(--admin-border)]" />
                              
                              <button
                                onClick={() => {
                                  setConfirmAction({ type: 'delete', user });
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 text-red-600"
                              >
                                <Trash2 size={14} />
                                Delete User
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded row */}
                    {expandedRow === user.id && (
                      <tr className="bg-[var(--admin-bg-secondary)]">
                        <td colSpan={8} className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-[var(--admin-text-tertiary)] text-xs">Points</p>
                              <p className="font-medium text-[var(--admin-text-primary)]">{user.points || 0}</p>
                            </div>
                            <div>
                              <p className="text-[var(--admin-text-tertiary)] text-xs">Accuracy</p>
                              <p className="font-medium text-[var(--admin-text-primary)]">
                                {user.accuracyRate ? `${(user.accuracyRate * 100).toFixed(1)}%` : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[var(--admin-text-tertiary)] text-xs">Last Active</p>
                              <p className="font-medium text-[var(--admin-text-primary)]">
                                {formatDate(user.lastActive)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[var(--admin-text-tertiary)] text-xs">User ID</p>
                              <p className="font-mono text-xs text-[var(--admin-text-secondary)] truncate">
                                {user.id}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Load More */}
        {hasMore && (
          <div className="p-4 border-t border-[var(--admin-border)] text-center">
            <button
              onClick={() => loadUsers(false)}
              disabled={loading}
              className="admin-btn admin-btn-secondary"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={true}
          title={
            confirmAction.type === 'ban' ? 'Ban User' :
            confirmAction.type === 'unban' ? 'Unban User' :
            confirmAction.type === 'delete' ? 'Delete User' :
            confirmAction.type === 'promote' ? 'Promote to Admin' :
            'Remove Admin Role'
          }
          message={
            confirmAction.type === 'ban' ? `Are you sure you want to ban ${confirmAction.user.displayName || confirmAction.user.email}? They will not be able to vote or interact with the platform.` :
            confirmAction.type === 'unban' ? `Are you sure you want to unban ${confirmAction.user.displayName || confirmAction.user.email}?` :
            confirmAction.type === 'delete' ? `Are you sure you want to delete ${confirmAction.user.displayName || confirmAction.user.email}? This action cannot be undone.` :
            confirmAction.type === 'promote' ? `Are you sure you want to make ${confirmAction.user.displayName || confirmAction.user.email} an admin?` :
            `Are you sure you want to remove admin role from ${confirmAction.user.displayName || confirmAction.user.email}?`
          }
          confirmLabel={
            confirmAction.type === 'ban' ? 'Ban' :
            confirmAction.type === 'unban' ? 'Unban' :
            confirmAction.type === 'delete' ? 'Delete' :
            confirmAction.type === 'promote' ? 'Promote' :
            'Demote'
          }
          variant={confirmAction.type === 'delete' || confirmAction.type === 'ban' ? 'danger' : 'warning'}
          onConfirm={() => {
            if (confirmAction.type === 'ban') handleBanUser(confirmAction.user.id, true);
            else if (confirmAction.type === 'unban') handleBanUser(confirmAction.user.id, false);
            else if (confirmAction.type === 'delete') handleDeleteUser(confirmAction.user.id);
            else if (confirmAction.type === 'promote') handlePromoteUser(confirmAction.user.id, true);
            else if (confirmAction.type === 'demote') handlePromoteUser(confirmAction.user.id, false);
          }}
          onClose={() => setConfirmAction(null)}
        />
      )}

      {/* Click outside to close action menu */}
      {actionMenuOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </div>
  );
}
