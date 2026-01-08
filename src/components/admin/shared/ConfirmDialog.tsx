// src/components/admin/shared/ConfirmDialog.tsx
'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const confirmButtonClass = variant === 'danger' 
    ? 'admin-btn-danger' 
    : variant === 'warning'
    ? 'bg-[var(--admin-warning)] text-white hover:bg-[#d99600]'
    : 'admin-btn-primary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-[var(--admin-bg-secondary)] rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[var(--admin-border)]">
          <div className={`p-2 rounded-full ${
            variant === 'danger' ? 'bg-[var(--admin-error-light)]' :
            variant === 'warning' ? 'bg-[var(--admin-warning-light)]' :
            'bg-[var(--admin-info-light)]'
          }`}>
            <AlertTriangle size={18} className={`${
              variant === 'danger' ? 'text-[var(--admin-error)]' :
              variant === 'warning' ? 'text-[var(--admin-warning)]' :
              'text-[var(--admin-info)]'
            }`} />
          </div>
          <h3 className="text-[var(--admin-text-md)] font-semibold flex-1">{title}</h3>
          <button 
            onClick={onClose}
            className="admin-btn admin-btn-icon admin-btn-sm admin-btn-ghost"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-[var(--admin-text-sm)] text-[var(--admin-text-secondary)]">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 bg-[var(--admin-bg-tertiary)] border-t border-[var(--admin-border)]">
          <button 
            onClick={onClose}
            className="admin-btn admin-btn-secondary"
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button 
            onClick={onConfirm}
            className={`admin-btn ${confirmButtonClass}`}
            disabled={loading}
          >
            {loading ? 'Loading...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
