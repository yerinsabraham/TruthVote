// src/components/admin/shared/AlertBanner.tsx
'use client';

import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

interface AlertBannerProps {
  type: 'warning' | 'error' | 'success' | 'info';
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

const alertConfig = {
  warning: { 
    className: 'admin-alert-warning', 
    icon: AlertTriangle,
    iconColor: 'text-[#b06c00]'
  },
  error: { 
    className: 'admin-alert-error', 
    icon: AlertCircle,
    iconColor: 'text-[var(--admin-error)]'
  },
  success: { 
    className: 'admin-alert-success', 
    icon: CheckCircle,
    iconColor: 'text-[var(--admin-success)]'
  },
  info: { 
    className: 'admin-alert-info', 
    icon: Info,
    iconColor: 'text-[var(--admin-info)]'
  },
};

export default function AlertBanner({ 
  type, 
  title, 
  message, 
  action,
  onDismiss 
}: AlertBannerProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div className={`admin-alert ${config.className}`}>
      <Icon size={18} className={`admin-alert-icon ${config.iconColor}`} />
      <div className="admin-alert-content">
        <div className="admin-alert-title">{title}</div>
        {message && <p className="text-[var(--admin-text-secondary)]">{message}</p>}
      </div>
      {action && (
        <button 
          onClick={action.onClick}
          className="admin-btn admin-btn-sm admin-btn-primary ml-auto"
        >
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="admin-btn admin-btn-icon admin-btn-sm admin-btn-ghost"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
