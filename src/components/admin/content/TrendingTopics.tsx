// src/components/admin/content/TrendingTopics.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  ExternalLink, 
  Plus, 
  X, 
  Newspaper,
  Clock,
  CheckCircle
} from 'lucide-react';
import { EmptyState, FilterSelect, LoadingSkeleton, AlertBanner } from '../shared';

interface TrendingTopic {
  id: string;
  headline: string;
  summary?: string;
  source: string;
  sourceUrl: string;
  sourceIcon: string;
  category: string;
  region: string;
  imageUrl?: string;
  publishedAt: Date;
  fetchedAt: Date;
  dismissed: boolean;
  usedForPrediction: boolean;
  relevanceScore: number;
  isPredictionWorthy: boolean;
  keywords: string[];
}

interface TrendingTopicsProps {
  onCreateFromTopic: (topic: TrendingTopic) => void;
}

export default function TrendingTopics({ onCreateFromTopic }: TrendingTopicsProps) {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'Sports', label: 'Sports' },
    { value: 'Politics', label: 'Politics' },
    { value: 'Entertainment', label: 'Entertainment' },
    { value: 'General', label: 'General' },
  ];

  const loadTopics = useCallback(async () => {
    try {
      setLoading(true);
      const getTrendingTopics = httpsCallable(functions, 'getTrendingTopics');
      const result = await getTrendingTopics({ 
        category: categoryFilter,
        limit: 30,
        includeDismissed: false 
      });
      const data = result.data as { topics: TrendingTopic[] };
      
      // Convert dates
      const processedTopics = data.topics.map(topic => ({
        ...topic,
        publishedAt: new Date(topic.publishedAt),
        fetchedAt: new Date(topic.fetchedAt),
      }));
      
      setTopics(processedTopics);
    } catch (error) {
      console.error('Error loading topics:', error);
      toast.error('Failed to load trending topics');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const fetchTrendingTopics = httpsCallable(functions, 'fetchTrendingTopics');
      const result = await fetchTrendingTopics({});
      const data = result.data as { success: boolean; newSaved: number; errors: Array<{ source: string; error: string }> };
      
      if (data.success) {
        toast.success(`Fetched ${data.newSaved} new topics`);
        if (data.errors && data.errors.length > 0) {
          toast.warning(`${data.errors.length} sources had errors`);
        }
        setLastFetch(new Date());
        await loadTopics();
      }
    } catch (error) {
      console.error('Error refreshing topics:', error);
      toast.error('Failed to refresh topics');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDismiss = async (topicId: string) => {
    try {
      const dismissTrendingTopic = httpsCallable(functions, 'dismissTrendingTopic');
      await dismissTrendingTopic({ topicId });
      toast.success('Topic dismissed');
      setTopics(prev => prev.filter(t => t.id !== topicId));
    } catch (error) {
      console.error('Error dismissing topic:', error);
      toast.error('Failed to dismiss topic');
    }
  };

  const handleCreate = (topic: TrendingTopic) => {
    onCreateFromTopic(topic);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Sports': return 'bg-green-50 text-green-700';
      case 'Politics': return 'bg-blue-50 text-blue-700';
      case 'Entertainment': return 'bg-purple-50 text-purple-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-content-header">
          <div>
            <h1 className="admin-content-title">Trending Topics</h1>
            <p className="admin-content-subtitle">News from Nigerian & African sources</p>
          </div>
        </div>
        <LoadingSkeleton type="row" count={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="admin-content-header">
        <div>
          <h1 className="admin-content-title">Trending Topics</h1>
          <p className="admin-content-subtitle">
            {lastFetch ? `Last refreshed: ${formatTimeAgo(lastFetch)}` : 'Click refresh to fetch latest news'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterSelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoryOptions}
          />
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="admin-btn admin-btn-primary"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{refreshing ? 'Fetching...' : 'Fetch News'}</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      {topics.length === 0 && !loading && (
        <AlertBanner
          type="info"
          title="No trending topics yet"
          message="Click 'Fetch News' to pull the latest headlines from news sources"
          action={{
            label: 'Fetch News Now',
            onClick: handleRefresh
          }}
        />
      )}

      {/* Topics List */}
      {topics.length > 0 && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">
              <Newspaper size={16} className="inline mr-2" />
              {topics.length} Topics Available
            </h3>
            <span className="text-[var(--admin-text-xs)] text-[var(--admin-text-tertiary)]">
              Click + to create a prediction
            </span>
          </div>
          <div className="divide-y divide-[var(--admin-border-light)]">
            {topics.map((topic) => (
              <div 
                key={topic.id} 
                className="flex items-start gap-3 p-4 hover:bg-[var(--admin-bg-tertiary)] transition-colors"
              >
                {/* Icon or Image */}
                {topic.imageUrl ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--admin-bg-tertiary)] flex-shrink-0">
                    <img 
                      src={topic.imageUrl} 
                      alt="" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to icon on error
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-xl">${topic.sourceIcon}</div>`;
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[var(--admin-bg-tertiary)] flex items-center justify-center text-xl flex-shrink-0">
                    {topic.sourceIcon}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-[var(--admin-text-sm)] font-medium text-[var(--admin-text-primary)] line-clamp-2 mb-1">
                    {topic.headline}
                  </h4>
                  
                  <div className="flex flex-wrap items-center gap-2 text-[var(--admin-text-xs)] text-[var(--admin-text-tertiary)]">
                    <span className="font-medium">{topic.source}</span>
                    <span>•</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(topic.category)}`}>
                      {topic.category}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatTimeAgo(topic.publishedAt)}
                    </span>
                    {topic.isPredictionWorthy && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={10} />
                          Prediction-worthy
                        </span>
                      </>
                    )}
                  </div>

                  {/* Keywords */}
                  {topic.keywords && topic.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {topic.keywords.slice(0, 5).map((keyword, idx) => (
                        <span 
                          key={idx}
                          className="px-1.5 py-0.5 bg-[var(--admin-bg-tertiary)] rounded text-[10px] text-[var(--admin-text-tertiary)]"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {topic.sourceUrl && (
                    <a
                      href={topic.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-btn admin-btn-icon admin-btn-sm admin-btn-ghost"
                      title="View Source"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    onClick={() => handleCreate(topic)}
                    className="admin-btn admin-btn-sm admin-btn-primary"
                    title="Create Prediction"
                  >
                    <Plus size={14} />
                    <span className="hidden sm:inline">Create</span>
                  </button>
                  <button
                    onClick={() => handleDismiss(topic.id)}
                    className="admin-btn admin-btn-icon admin-btn-sm admin-btn-ghost text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)]"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {topics.length === 0 && !loading && (
        <div className="admin-card">
          <div className="admin-card-body">
            <EmptyState
              icon={Newspaper}
              title="No trending topics"
              message="Fetch news from sources to see trending topics here"
              action={{
                label: 'Fetch News',
                onClick: handleRefresh
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
