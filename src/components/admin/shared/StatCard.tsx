// src/components/admin/shared/StatCard.tsx
'use client';

import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  change?: {
    value: string;
    positive: boolean;
  };
  onClick?: () => void;
}

export default function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  iconColor = 'text-[var(--admin-primary)]',
  iconBg = 'bg-[var(--admin-primary-light)]',
  change,
  onClick
}: StatCardProps) {
  return (
    <div 
      className={`admin-stat-card group ${onClick ? 'cursor-pointer hover:border-[var(--admin-primary)]' : ''}`}
      onClick={onClick}
    >
      <div className="admin-stat-header">
        <span className="admin-stat-label">{label}</span>
        <div className={`admin-stat-icon ${iconBg} ${iconColor}`}>
          <Icon size={12} />
        </div>
      </div>
      <div className={`admin-stat-value ${onClick ? 'text-[var(--admin-primary)] group-hover:underline' : ''}`}>{value}</div>
      {change && (
        <div className={`admin-stat-change ${change.positive ? 'positive' : 'negative'}`}>
          <span>{change.positive ? '↑' : '↓'}</span>
          <span>{change.value}</span>
        </div>
      )}
    </div>
  );
}
