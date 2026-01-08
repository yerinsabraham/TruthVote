// src/components/admin/shared/StatusBadge.tsx
'use client';

interface StatusBadgeProps {
  status: 'active' | 'pending' | 'closed' | 'resolved' | 'draft' | 'error' | 'scheduled';
  size?: 'sm' | 'md';
}

const statusConfig = {
  active: { label: 'Active', className: 'admin-badge-active' },
  pending: { label: 'Pending', className: 'admin-badge-pending' },
  closed: { label: 'Closed', className: 'admin-badge-closed' },
  resolved: { label: 'Resolved', className: 'admin-badge-resolved' },
  draft: { label: 'Draft', className: 'admin-badge-draft' },
  error: { label: 'Error', className: 'admin-badge-error' },
  scheduled: { label: 'Scheduled', className: 'admin-badge-resolved' },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <span 
      className={`admin-badge ${config.className} ${size === 'sm' ? 'text-[10px] px-1.5' : ''}`}
    >
      {config.label}
    </span>
  );
}
