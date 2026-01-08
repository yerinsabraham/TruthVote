// src/components/admin/shared/EmptyState.tsx
'use client';

import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ 
  icon: Icon = Inbox, 
  title, 
  message,
  action 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-[var(--admin-bg-tertiary)] flex items-center justify-center mb-4">
        <Icon size={24} className="text-[var(--admin-text-tertiary)]" />
      </div>
      <h3 className="text-[var(--admin-text-md)] font-semibold text-[var(--admin-text-primary)] mb-1">
        {title}
      </h3>
      {message && (
        <p className="text-[var(--admin-text-sm)] text-[var(--admin-text-secondary)] max-w-sm">
          {message}
        </p>
      )}
      {action && (
        <button 
          onClick={action.onClick}
          className="admin-btn admin-btn-primary mt-4"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
