// src/components/admin/dashboard/QuickActions.tsx
'use client';

import { Plus, CheckCircle, Users, Newspaper, FolderOpen, TrendingUp } from 'lucide-react';

interface QuickActionsProps {
  onNavigate: (section: string, item: string) => void;
}

export default function QuickActions({ onNavigate }: QuickActionsProps) {
  const actions = [
    {
      label: 'Create Prediction',
      icon: Plus,
      onClick: () => onNavigate('content', 'create'),
      primary: true,
    },
    {
      label: 'Trending Topics',
      icon: Newspaper,
      onClick: () => onNavigate('content', 'trending'),
    },
    {
      label: 'Resolve Pending',
      icon: CheckCircle,
      onClick: () => onNavigate('resolution', 'pending'),
    },
    {
      label: 'Manage Users',
      icon: Users,
      onClick: () => onNavigate('users', 'search'),
    },
    {
      label: 'Categories',
      icon: FolderOpen,
      onClick: () => onNavigate('settings', 'categories'),
    },
    {
      label: 'All Predictions',
      icon: TrendingUp,
      onClick: () => onNavigate('content', 'manage'),
    },
  ];

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Quick Actions</h3>
      </div>
      <div className="admin-card-body">
        <div className="admin-quick-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`admin-quick-action ${action.primary ? 'border-[var(--admin-primary)] bg-[var(--admin-primary-light)]' : ''}`}
            >
              <action.icon 
                size={20} 
                className={action.primary ? 'text-[var(--admin-primary)]' : 'admin-quick-action-icon'} 
              />
              <span className={`admin-quick-action-label ${action.primary ? 'text-[var(--admin-primary)] font-medium' : ''}`}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
