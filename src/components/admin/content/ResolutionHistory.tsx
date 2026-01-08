// src/components/admin/content/ResolutionHistory.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  CheckCircle, 
  Clock, 
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Trophy,
  XCircle
} from 'lucide-react';
import { EmptyState, SearchInput, FilterSelect } from '../shared';

interface ResolvedPrediction {
  id: string;
  question: string;
  description?: string;
  categoryId: string;
  status: string;
  totalVotes: number;
  winningOptionId: string;
  winningOptionLabel?: string;
  resolutionTime: { toDate?: () => Date } | null;
  endTime: { toDate?: () => Date } | null;
  options: Array<{ id: string; label: string; votes: number }>;
  explanation?: string;
  sourceLink?: string;
  correctVoters?: number;
  incorrectVoters?: number;
}

export default function ResolutionHistory() {
  const [predictions, setPredictions] = useState<ResolvedPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const loadPredictions = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'predictions'),
        where('status', '==', 'resolved'),
        orderBy('resolutionTime', sortOrder === 'newest' ? 'desc' : 'asc')
      );
      
      const snapshot = await getDocs(q);
      const preds = snapshot.docs.map(doc => {
        const data = doc.data();
        const winningOption = data.options?.find((o: { id: string }) => o.id === data.winningOptionId);
        return {
          id: doc.id,
          ...data,
          winningOptionLabel: winningOption?.label || 'Unknown',
        } as ResolvedPrediction;
      });
      
      setPredictions(preds);
    } catch (error) {
      console.error('Error loading resolved predictions:', error);
    } finally {
      setLoading(false);
    }
  }, [sortOrder]);

  useEffect(() => {
    loadPredictions();
  }, [loadPredictions]);

  const filteredPredictions = predictions.filter(p =>
    p.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: { toDate?: () => Date } | null) => {
    if (!timestamp?.toDate) return '-';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-content-header">
          <div>
            <h1 className="admin-content-title">Resolution History</h1>
            <p className="admin-content-subtitle">Previously resolved predictions</p>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-body p-8 text-center">
            <RefreshCw className="animate-spin mx-auto text-[var(--admin-text-tertiary)]" size={24} />
            <p className="text-sm text-[var(--admin-text-secondary)] mt-2">Loading history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="admin-content-header">
        <div>
          <h1 className="admin-content-title">Resolution History</h1>
          <p className="admin-content-subtitle">{filteredPredictions.length} resolved predictions</p>
        </div>
        <button 
          onClick={loadPredictions}
          className="admin-btn admin-btn-secondary"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="admin-card">
        <div className="admin-card-body">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search resolved predictions..."
              />
            </div>
            <FilterSelect
              value={sortOrder}
              onChange={(v) => setSortOrder(v as 'newest' | 'oldest')}
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        {filteredPredictions.length === 0 ? (
          <div className="admin-card-body">
            <EmptyState
              icon={CheckCircle}
              title="No resolved predictions"
              message="Predictions will appear here once they are resolved"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Question</th>
                  <th style={{ width: '120px' }}>Winning Option</th>
                  <th style={{ width: '80px' }}>Correct</th>
                  <th style={{ width: '80px' }}>Wrong</th>
                  <th style={{ width: '120px' }}>Resolved</th>
                </tr>
              </thead>
              <tbody>
                {filteredPredictions.map((prediction) => {
                  const winningOption = prediction.options?.find(o => o.id === prediction.winningOptionId);
                  const correctCount = winningOption?.votes || 0;
                  const incorrectCount = prediction.totalVotes - correctCount;
                  
                  return (
                    <>
                      <tr key={prediction.id} className={expandedRow === prediction.id ? 'bg-[var(--admin-bg-secondary)]' : ''}>
                        {/* Expand toggle */}
                        <td>
                          <button
                            onClick={() => setExpandedRow(expandedRow === prediction.id ? null : prediction.id)}
                            className="p-1 hover:bg-[var(--admin-bg-tertiary)] rounded transition-colors"
                          >
                            {expandedRow === prediction.id ? (
                              <ChevronUp size={14} className="text-[var(--admin-text-tertiary)]" />
                            ) : (
                              <ChevronDown size={14} className="text-[var(--admin-text-tertiary)]" />
                            )}
                          </button>
                        </td>
                        
                        {/* Question */}
                        <td>
                          <span className="line-clamp-1 text-[var(--admin-text-primary)]" title={prediction.question}>
                            {prediction.question}
                          </span>
                        </td>
                        
                        {/* Winning Option */}
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Trophy size={12} className="text-yellow-500" />
                            <span className="text-sm font-medium text-[var(--admin-text-primary)]">
                              {prediction.winningOptionLabel}
                            </span>
                          </div>
                        </td>
                        
                        {/* Correct */}
                        <td>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle size={12} className="text-green-500" />
                            <span className="text-sm text-green-600 font-medium">{correctCount}</span>
                          </div>
                        </td>
                        
                        {/* Incorrect */}
                        <td>
                          <div className="flex items-center gap-1.5">
                            <XCircle size={12} className="text-red-400" />
                            <span className="text-sm text-red-500">{incorrectCount}</span>
                          </div>
                        </td>
                        
                        {/* Resolved Date */}
                        <td>
                          <span className="text-xs text-[var(--admin-text-secondary)]">
                            {formatDate(prediction.resolutionTime)}
                          </span>
                        </td>
                      </tr>
                      
                      {/* Expanded row */}
                      {expandedRow === prediction.id && (
                        <tr className="bg-[var(--admin-bg-secondary)]">
                          <td colSpan={6} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <h4 className="font-medium text-[var(--admin-text-primary)] mb-2">All Options & Results</h4>
                                <div className="space-y-2">
                                  {prediction.options?.map((opt) => {
                                    const isWinner = opt.id === prediction.winningOptionId;
                                    const percentage = prediction.totalVotes > 0
                                      ? ((opt.votes / prediction.totalVotes) * 100).toFixed(1)
                                      : '0';
                                    return (
                                      <div 
                                        key={opt.id} 
                                        className={`p-2 rounded-lg ${isWinner ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}
                                      >
                                        <div className="flex justify-between items-center">
                                          <div className="flex items-center gap-2">
                                            {isWinner && <Trophy size={14} className="text-yellow-500" />}
                                            <span className={isWinner ? 'font-medium text-green-700' : 'text-[var(--admin-text-secondary)]'}>
                                              {opt.label}
                                            </span>
                                          </div>
                                          <span className="text-xs text-[var(--admin-text-tertiary)]">
                                            {opt.votes} votes ({percentage}%)
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="space-y-4">
                                {prediction.explanation && (
                                  <div>
                                    <h4 className="font-medium text-[var(--admin-text-primary)] mb-2">Resolution Explanation</h4>
                                    <p className="text-[var(--admin-text-secondary)]">{prediction.explanation}</p>
                                  </div>
                                )}
                                {prediction.sourceLink && (
                                  <div>
                                    <h4 className="font-medium text-[var(--admin-text-primary)] mb-2">Source</h4>
                                    <a 
                                      href={prediction.sourceLink} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-[var(--admin-primary)] hover:underline flex items-center gap-1"
                                    >
                                      <ExternalLink size={12} />
                                      View source
                                    </a>
                                  </div>
                                )}
                                <div>
                                  <h4 className="font-medium text-[var(--admin-text-primary)] mb-2">Timeline</h4>
                                  <div className="space-y-1 text-[var(--admin-text-secondary)]">
                                    <div className="flex items-center gap-2">
                                      <Clock size={12} />
                                      <span>Ended: {formatDate(prediction.endTime)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <CheckCircle size={12} className="text-green-500" />
                                      <span>Resolved: {formatDate(prediction.resolutionTime)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
