// src/components/layout/Navbar.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState, useCallback } from 'react';
import Image from 'next/image';
import { SearchDropdown } from '@/components/SearchDropdown';
import { AuthModal } from '@/components/AuthModal';

// Rank colors mapping - Lighter colors for backgrounds
const RANK_COLORS: Record<string, string> = {
  novice: '#EF4444',      // Light Red
  amateur: '#3B82F6',     // Light Blue
  analyst: '#A855F7',     // Light Purple
  professional: '#F59E0B', // Light Amber/Orange
  expert: '#EC4899',      // Light Pink
  master: '#22C55E',      // Light Green
};

// Format rank name with capital first letter
const formatRankName = (rank: string): string => {
  if (!rank) return 'Novice';
  return rank.charAt(0).toUpperCase() + rank.slice(1).toLowerCase();
};

// Get rank color
const getRankColor = (rank: string): string => {
  return RANK_COLORS[rank?.toLowerCase()] || RANK_COLORS.novice;
};

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function Navbar({ searchQuery = '', onSearchChange }: NavbarProps = {}) {
  const { user, userProfile, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sign out');
    }
  };

  const openLoginModal = useCallback(() => {
    setAuthMode('login');
    setShowAuthModal(true);
  }, []);

  const openSignupModal = useCallback(() => {
    setAuthMode('signup');
    setShowAuthModal(true);
  }, []);

  const toggleAuthMode = useCallback(() => {
    setAuthMode(prev => prev === 'login' ? 'signup' : 'login');
  }, []);

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <Image
                src="/assets/tv_logo_icon_transparent.png"
                alt="TruthVote"
                width={32}
                height={32}
                className="object-contain"
              />
              <span className="text-xl md:text-2xl font-bold text-primary whitespace-nowrap">TruthVote</span>
            </Link>
            
            {/* Desktop Search Bar Only */}
            <div className="hidden md:flex flex-1 max-w-2xl">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search predictions..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  onFocus={() => setSearchDropdownOpen(true)}
                  className="w-full px-4 py-2 pl-10 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <SearchDropdown
                  searchQuery={searchQuery}
                  onSearchChange={onSearchChange || (() => {})}
                  isOpen={searchDropdownOpen}
                  onClose={() => setSearchDropdownOpen(false)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {loading ? (
              <div className="h-9 w-20 bg-gray-200 animate-pulse rounded" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 border-2 border-primary/40 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Profile Picture */}
                  {user?.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={userProfile?.displayName || user?.displayName || 'User'}
                      className="w-8 h-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: getRankColor(userProfile?.rank || 'novice') }}
                    >
                      {(userProfile?.displayName?.[0] || user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="text-sm font-medium leading-tight">{userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User'}</p>
                    <span 
                      className="text-xs font-semibold leading-tight px-2.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: getRankColor(userProfile?.rank || 'novice') }}
                    >
                      {formatRankName(userProfile?.rank || 'novice')}
                    </span>
                  </div>
                </button>
                
                {userMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setUserMenuOpen(false)}
                    />
                    
                    <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-border bg-primary/25 flex items-center gap-3">
                        {user?.photoURL ? (
                          <img 
                            src={user.photoURL} 
                            alt={userProfile?.displayName || user?.displayName || 'User'}
                            className="w-10 h-10 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white"
                            style={{ backgroundColor: getRankColor(userProfile?.rank || 'novice') }}
                          >
                            {(userProfile?.displayName?.[0] || user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User'}</p>
                          <span 
                            className="inline-block text-xs font-semibold mt-1 px-2.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: getRankColor(userProfile?.rank || 'novice') }}
                          >
                            {formatRankName(userProfile?.rank || 'novice')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="py-1">
                        <Link
                          href="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile
                        </Link>
                        
                        <Link
                          href="/leaderboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Leaderboard
                        </Link>
                        
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-warning hover:bg-muted/50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                            Admin Panel
                          </Link>
                        )}
                        
                        <button
                          onClick={() => {
                            handleSignOut();
                            setUserMenuOpen(false);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors border-t border-border mt-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={openLoginModal}>
                  Login
                </Button>
                <Button size="sm" onClick={openSignupModal}>
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        mode={authMode}
        onModeToggle={toggleAuthMode}
      />
    </nav>
  );
}
