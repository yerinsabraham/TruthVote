// src/components/admin/content/PendingResolutions.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/config';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { EmptyState, AlertBanner } from '../shared';
import { logAdminAction } from '@/lib/firebase/adminActions';
import { useAuth } from '@/context/AuthContext';

interface Prediction {
  id: string;
  question: string;
  description?: string;
  status: string;
  totalVotes: number;
  endTime: { toDate: () => Date } | null;
  options: Array<{ id: string; label: string; votes: number }>;
  sourceLink?: string;
}

export default function PendingResolutions() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [explanation, setExplanation] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  const [showResolveModal, setShowResolveModal] = useState<Prediction | null>(null);

  const loadPredictions = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'predictions'),
        where('status', 'in', ['active', 'closed']),
        orderBy('endTime', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const now = new Date();
      const preds = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Prediction))
        .filter(pred => {
          const endTime = pred.endTime?.toDate();
          return endTime && endTime <= now;
        });
      
      setPredictions(preds);
    } catch (error) {
      console.error('Error loading predictions:', error);
      toast.error('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPredictions();
  }, [loadPredictions]);

  const handleResolve = async () => {
    if (!showResolveModal || !selectedOption) {
      toast.error('Please select a winning option');
      return;
    }

    try {
      setResolvingId(showResolveModal.id);
      const resolvePrediction = httpsCallable(functions, 'resolvePrediction');
      const result = await resolvePrediction({
        predictionId: showResolveModal.id,
        winningOptionId: selectedOption,
        explanation,
        sourceLink,
      });

      const data = result.data as { success: boolean; correctCount: number; incorrectCount: number };
      
      // Log the action
      if (user) {
        const winningOption = showResolveModal.options.find(o => o.id === selectedOption);
        await logAdminAction({
          type: 'prediction_resolved',
          description: `Resolved "${showResolveModal.question.substring(0, 40)}..." → ${winningOption?.label}`,
          adminId: user.uid,
          targetId: showResolveModal.id,
          targetName: showResolveModal.question.substring(0, 50),
          details: { 
            correctCount: data.correctCount, 
            incorrectCount: data.incorrectCount,
            winningOption: winningOption?.label
          }
        });
      }
      
      toast.success(
        `Resolved! ${data.correctCount} correct, ${data.incorrectCount} incorrect`
      );
      
      setShowResolveModal(null);
      setSelectedOption('');
      setExplanation('');
      setSourceLink('');
      loadPredictions();
    } catch (error) {
      console.error('Error resolving:', error);
      toast.error('Failed to resolve prediction');
    } finally {
      setResolvingId(null);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-content-header">
          <div>
            <h1 className="admin-content-title">Pending Resolutions</h1>
            <p className="admin-content-subtitle">Predictions awaiting outcomes</p>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-body p-8 text-center">
            <RefreshCw className="animate-spin mx-auto text-[var(--admin-text-tertiary)]" size={24} />
            <p className="text-sm text-[var(--admin-text-secondary)] mt-2">Loading...</p>
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
          <h1 className="admin-content-title">Pending Resolutions</h1>
          <p className="admin-content-subtitle">{predictions.length} predictions need resolution</p>
        </div>
        <button 
          onClick={loadPredictions}
          className="admin-btn admin-btn-secondary"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Alert */}
      {predictions.length > 0 && (
        <AlertBanner
          type="warning"
          title={`${predictions.length} prediction${predictions.length !== 1 ? 's' : ''} need resolution`}
          message="These predictions have ended and are waiting for you to declare the correct outcome."
        />
      )}

      {/* Table */}
      <div className="admin-card overflow-hidden">
        {predictions.length === 0 ? (
          <div className="admin-card-body">
            <EmptyState
              icon={CheckCircle}
              title="All caught up!"
              message="No predictions are waiting for resolution"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Question</th>
                  <th style={{ width: '80px' }}>Votes</th>
                  <th style={{ width: '100px' }}>Ended</th>
                  <th style={{ width: '100px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((prediction) => (
                  <>
                    <tr key={prediction.id} className={expandedRow === prediction.id ? 'bg-[var(--admin-bg-secondary)]' : ''}>
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
                      
                      <td>
                        <span className="line-clamp-1 text-[var(--admin-text-primary)]" title={prediction.question}>
                          {prediction.question}
                        </span>
                      </td>
                      
                      <td>
                        <span className="font-medium text-[var(--admin-text-primary)]">
                          {prediction.totalVotes}
                        </span>
                      </td>
                      
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-orange-500" />
                          <span className="text-xs text-[var(--admin-text-secondary)]">
                            {prediction.endTime?.toDate && formatTimeAgo(prediction.endTime.toDate())}
                          </span>
                        </div>
                      </td>
                      
                      <td>
                        <button
                          onClick={() => setShowResolveModal(prediction)}
                          className="admin-btn admin-btn-primary text-xs py-1 px-2"
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                    
                    {expandedRow === prediction.id && (
                      <tr className="bg-[var(--admin-bg-secondary)]">
                        <td colSpan={5} className="p-4">
                          <div className="space-y-3">
                            {prediction.description && (
                              <div>
                                <h4 className="font-medium text-[var(--admin-text-primary)] text-sm mb-1">Description</h4>
                                <p className="text-sm text-[var(--admin-text-secondary)]">{prediction.description}</p>
                              </div>
                            )}
                            <div>
                              <h4 className="font-medium text-[var(--admin-text-primary)] text-sm mb-2">Vote Distribution</h4>
                              <div className="space-y-2">
                                {prediction.options?.map((opt) => {
                                  const percentage = prediction.totalVotes > 0
                                    ? ((opt.votes / prediction.totalVotes) * 100).toFixed(1)
                                    : '0';
                                  return (
                                    <div key={opt.id} className="bg-gray-50 p-2 rounded-lg">
                                      <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-[var(--admin-text-primary)]">{opt.label}</span>
                                        <span className="text-[var(--admin-text-secondary)]">
                                          {opt.votes} votes ({percentage}%)
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div
                                          className="bg-blue-500 h-1.5 rounded-full"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[var(--admin-border)]">
              <h2 className="text-lg font-semibold text-[var(--admin-text-primary)]">Resolve Prediction</h2>
              <button
                onClick={() => {
                  setShowResolveModal(null);
                  setSelectedOption('');
                  setExplanation('');
                  setSourceLink('');
                }}
                className="p-1 hover:bg-[var(--admin-bg-secondary)] rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <h3 className="font-medium text-[var(--admin-text-primary)]">{showResolveModal.question}</h3>
                <p className="text-sm text-[var(--admin-text-secondary)] mt-1">
                  {showResolveModal.totalVotes} total votes
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-2">
                  Select Winning Option *
                </label>
                <div className="space-y-2">
                  {showResolveModal.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedOption(option.id)}
                      className={`w-full p-3 text-left border-2 rounded-lg transition-colors ${
                        selectedOption === option.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-[var(--admin-border)] hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[var(--admin-text-primary)]">{option.label}</span>
                        <span className="text-sm text-[var(--admin-text-secondary)]">{option.votes} votes</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1">
                  Explanation (optional)
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain the outcome..."
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1">
                  Source Link (optional)
                </label>
                <input
                  type="url"
                  value={sourceLink}
                  onChange={(e) => setSourceLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                />
              </div>

              {selectedOption && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-blue-900 text-sm mb-1">Impact Preview</h4>
                  <p className="text-xs text-blue-800">
                    ✓ {showResolveModal.options.find(o => o.id === selectedOption)?.votes || 0} users marked correct
                  </p>
                  <p className="text-xs text-blue-800">
                    ✗ {showResolveModal.totalVotes - (showResolveModal.options.find(o => o.id === selectedOption)?.votes || 0)} users marked incorrect
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--admin-border)]">
              <button
                onClick={() => {
                  setShowResolveModal(null);
                  setSelectedOption('');
                  setExplanation('');
                  setSourceLink('');
                }}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!selectedOption || resolvingId === showResolveModal.id}
                className="admin-btn admin-btn-primary"
              >
                {resolvingId === showResolveModal.id ? 'Resolving...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
