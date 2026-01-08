// src/app/admin/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// New layout components
import { AdminShell } from '@/components/admin/layout';

// Dashboard components
import { DashboardOverview, AdminActionsLog } from '@/components/admin/dashboard';

// Content components
import { TrendingTopics, QuickCreate, PredictionsTable, PendingResolutions, ResolutionHistory, UsersTable, CategoriesManager, RankManagement, GeneralSettings } from '@/components/admin/content';

// Legacy components - no longer needed
// import UsersManager from '@/components/admin/UsersManager';
// import RankManager from '@/components/admin/RankManager';

// Types
interface TrendingTopic {
  id: string;
  headline: string;
  summary?: string;
  source: string;
  sourceUrl: string;
  sourceIcon: string;
  category: string;
  keywords: string[];
}

type ActiveView = 
  | 'dashboard-overview'
  | 'dashboard-activity'
  | 'content-trending'
  | 'content-create'
  | 'content-manage'
  | 'content-drafts'
  | 'resolution-pending'
  | 'resolution-history'
  | 'users-search'
  | 'users-table'
  | 'users-ranks'
  | 'settings-categories'
  | 'settings-sources'
  | 'settings-general';

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Navigation state
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [activeItem, setActiveItem] = useState<string>('overview');
  
  // Content state
  const [pendingResolutions, setPendingResolutions] = useState<number>(0);
  const [selectedTopic, setSelectedTopic] = useState<TrendingTopic | null>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  // Load pending resolutions count
  const loadPendingCount = useCallback(async () => {
    try {
      const now = new Date();
      const q = query(
        collection(db, 'predictions'),
        where('status', 'in', ['active', 'closed']),
        orderBy('endTime', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const pendingCount = snapshot.docs.filter((doc) => {
        const data = doc.data();
        const endTime = data.endTime?.toDate?.();
        return endTime && endTime <= now;
      }).length;
      
      setPendingResolutions(pendingCount);
    } catch (error) {
      console.error('Error loading pending count:', error);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error('Access denied. Admins only.');
      router.push('/');
    }
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    if (isAdmin) {
      loadPendingCount();
    }
  }, [isAdmin, loadPendingCount]);

  const handleNavigate = (section: string, item: string) => {
    setActiveSection(section);
    setActiveItem(item);
    setShowQuickCreate(false);
    setSelectedTopic(null);
  };

  const handleCreateFromTopic = (topic: TrendingTopic) => {
    setSelectedTopic(topic);
    setShowQuickCreate(true);
    setActiveSection('content');
    setActiveItem('create');
  };

  const handleQuickCreateClose = () => {
    setShowQuickCreate(false);
    setSelectedTopic(null);
    setActiveSection('content');
    setActiveItem('trending');
  };

  const handleQuickCreateSuccess = () => {
    setShowQuickCreate(false);
    setSelectedTopic(null);
    loadPendingCount();
    // Navigate to predictions manager to see the new prediction
    setActiveSection('content');
    setActiveItem('manage');
    toast.success('Prediction created! View it in All Predictions.');
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--admin-bg-primary)]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--admin-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--admin-text-secondary)]">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Render content based on active section/item
  const renderContent = () => {
    const view = `${activeSection}-${activeItem}` as ActiveView;

    // Quick Create Flow
    if (showQuickCreate || (activeSection === 'content' && activeItem === 'create')) {
      return (
        <QuickCreate 
          topic={selectedTopic}
          onClose={handleQuickCreateClose}
          onSuccess={handleQuickCreateSuccess}
        />
      );
    }

    switch (view) {
      // Dashboard
      case 'dashboard-overview':
        return <DashboardOverview onNavigate={handleNavigate} />;
      
      case 'dashboard-activity':
        return <AdminActionsLog />;

      // Content
      case 'content-trending':
        return <TrendingTopics onCreateFromTopic={handleCreateFromTopic} />;
      
      case 'content-manage':
        return <PredictionsTable />;
      
      case 'content-drafts':
        return <PredictionsTable />;

      // Resolution
      case 'resolution-pending':
        return <PendingResolutions />;
      
      case 'resolution-history':
        return <ResolutionHistory />;

      // Users
      case 'users-search':
      case 'users-table':
        return <UsersTable />;
      
      case 'users-ranks':
        return <RankManagement />;

      // Settings
      case 'settings-categories':
        return <CategoriesManager />;
      
      case 'settings-sources':
        return (
          <div className="space-y-4">
            <div className="admin-content-header">
              <div>
                <h1 className="admin-content-title">News Sources</h1>
                <p className="admin-content-subtitle">Configure RSS feeds and news sources</p>
              </div>
            </div>
            <SourcesManager />
          </div>
        );
      
      case 'settings-general':
        return <GeneralSettings />;

      default:
        return <DashboardOverview onNavigate={handleNavigate} />;
    }
  };

  return (
    <AdminShell
      activeSection={activeSection}
      activeItem={activeItem}
      onNavigate={handleNavigate}
      pendingResolutions={pendingResolutions}
    >
      {renderContent()}
    </AdminShell>
  );
}

// Sources Manager Component
function SourcesManager() {
  const [sources, setSources] = useState<Array<{
    id: string;
    name: string;
    url: string;
    category: string;
    icon: string;
    isActive: boolean;
    lastFetched?: Date;
    articlesCount?: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      setLoading(true);
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase/config');
      
      const getNewsSources = httpsCallable(functions, 'getNewsSources');
      const result = await getNewsSources({});
      const data = result.data as { sources: typeof sources };
      setSources(data.sources || []);
    } catch (error) {
      console.error('Error loading sources:', error);
      toast.error('Failed to load news sources');
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = async (sourceId: string, isActive: boolean) => {
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase/config');
      
      const toggleNewsSource = httpsCallable(functions, 'toggleNewsSource');
      await toggleNewsSource({ sourceId, isActive });
      
      setSources(prev => prev.map(s => 
        s.id === sourceId ? { ...s, isActive } : s
      ));
      
      toast.success(`Source ${isActive ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling source:', error);
      toast.error('Failed to update source');
    }
  };

  if (loading) {
    return (
      <div className="admin-card">
        <div className="admin-card-body">
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 bg-[var(--admin-bg-tertiary)] rounded" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-[var(--admin-bg-tertiary)] rounded w-1/3" />
                  <div className="h-2 bg-[var(--admin-bg-tertiary)] rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Configured Sources</h3>
        <span className="text-[var(--admin-text-xs)] text-[var(--admin-text-tertiary)]">
          {sources.filter(s => s.isActive).length} of {sources.length} active
        </span>
      </div>
      <div className="divide-y divide-[var(--admin-border-light)]">
        {sources.map((source) => (
          <div key={source.id} className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--admin-bg-tertiary)] flex items-center justify-center text-xl">
              {source.icon || '📰'}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[var(--admin-text-sm)] font-medium text-[var(--admin-text-primary)]">
                {source.name}
              </h4>
              <p className="text-[var(--admin-text-xs)] text-[var(--admin-text-tertiary)] truncate">
                {source.url}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[var(--admin-text-xs)] px-1.5 py-0.5 rounded bg-[var(--admin-bg-tertiary)]">
                  {source.category}
                </span>
                {source.articlesCount !== undefined && (
                  <span className="text-[var(--admin-text-xs)] text-[var(--admin-text-tertiary)]">
                    {source.articlesCount} articles fetched
                  </span>
                )}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={source.isActive}
                onChange={(e) => toggleSource(source.id, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[var(--admin-bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--admin-primary)]"></div>
            </label>
          </div>
        ))}
      </div>
      {sources.length === 0 && (
        <div className="admin-card-body text-center py-8">
          <p className="text-[var(--admin-text-secondary)]">
            No news sources configured. Click "Fetch News" in Trending Topics to initialize default sources.
          </p>
        </div>
      )}
    </div>
  );
}
