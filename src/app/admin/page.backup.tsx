// src/app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import DashboardOverview from '@/components/admin/DashboardOverview';
import PredictionsManager from '@/components/admin/PredictionsManager';
import ResolveManager from '@/components/admin/ResolveManager';
import UsersManager from '@/components/admin/UsersManager';
import RankManager from '@/components/admin/RankManager';

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error('Access denied. Admins only.');
      router.push('/');
    }
  }, [isAdmin, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-6xl space-y-6">
          {/* Header Skeleton */}
          <div className="animate-pulse">
            <div className="h-10 bg-muted rounded w-48 mb-2"></div>
            <div className="h-4 bg-muted rounded w-64"></div>
          </div>
          
          {/* Tabs Skeleton */}
          <div className="flex gap-2 border-b border-border">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-muted rounded-t w-24 animate-pulse"></div>
            ))}
          </div>
          
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-4"></div>
                <div className="h-8 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
          
          {/* Content Skeleton */}
          <div className="bg-card border border-border rounded-lg p-6 animate-pulse">
            <div className="space-y-4">
              <div className="h-6 bg-muted rounded w-40"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
              <div className="h-4 bg-muted rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && <DashboardOverview />}
      {activeTab === 'predictions' && <PredictionsManager />}
      {activeTab === 'resolve' && <ResolveManager />}
      {activeTab === 'users' && <UsersManager />}
      {activeTab === 'rank' && <RankManager />}
    </AdminLayout>
  );
}
