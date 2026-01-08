// src/components/admin/layout/AdminHeader.tsx
'use client';

import { Menu, Home, Bell, LogOut, RefreshCw } from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AdminHeaderProps {
  onMenuToggle: () => void;
  onHomeClick: () => void;
}

export default function AdminHeader({ onMenuToggle, onHomeClick }: AdminHeaderProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut(auth);
      toast.success('Signed out');
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
    } finally {
      setSigningOut(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        {/* Mobile menu toggle */}
        <button 
          onClick={onMenuToggle}
          className="admin-btn admin-btn-icon admin-btn-ghost lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu size={18} />
        </button>

        {/* Logo */}
        <div className="admin-logo">
          <svg 
            className="admin-logo-icon" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="hidden sm:inline">TruthVote</span>
          <span className="text-[var(--admin-text-tertiary)] font-normal ml-1">Admin</span>
        </div>
      </div>

      <div className="admin-header-right">
        {/* Refresh button */}
        <button 
          onClick={handleRefresh}
          className="admin-btn admin-btn-icon admin-btn-ghost"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>

        {/* Home button */}
        <button 
          onClick={onHomeClick}
          className="admin-btn admin-btn-sm admin-btn-secondary hidden sm:flex"
        >
          <Home size={14} />
          <span>Go to App</span>
        </button>

        {/* Notifications - placeholder for future */}
        <button 
          className="admin-btn admin-btn-icon admin-btn-ghost relative"
          title="Notifications"
        >
          <Bell size={16} />
          {/* Notification dot */}
          {/* <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--admin-error)] rounded-full" /> */}
        </button>

        {/* Sign out */}
        <button 
          onClick={handleSignOut}
          disabled={signingOut}
          className="admin-btn admin-btn-sm admin-btn-ghost"
          title="Sign Out"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">{signingOut ? 'Signing out...' : 'Sign Out'}</span>
        </button>
      </div>
    </header>
  );
}
