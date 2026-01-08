// src/components/admin/content/PredictionsTable.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { collection, query, where, orderBy, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { 
  Edit, 
  Trash2, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  Image as ImageIcon,
  X,
  Upload,
  RefreshCw,
  MoreVertical,
  TrendingUp,
  Filter
} from 'lucide-react';
import { FilterSelect, StatusBadge, EmptyState, SearchInput, ConfirmDialog } from '../shared';
import { logAdminAction } from '@/lib/firebase/adminActions';
import { useAuth } from '@/context/AuthContext';

interface Prediction {
  id: string;
  question: string;
  description?: string;
  categoryId: string;
  status: 'draft' | 'scheduled' | 'active' | 'closed' | 'resolved';
  totalVotes: number;
  createdAt: { toDate?: () => Date } | null;
  endTime: { toDate?: () => Date } | null;
  startTime?: { toDate?: () => Date } | null;
  options: Array<{ id: string; label: string; votes: number }>;
  subcategory?: string;
  isTrending?: boolean;
  imageUrl?: string;
  sourceLink?: string;
  displayTemplate?: string;
}

interface Category {
  id: string;
  name: string;
  subcategories?: string[];
}

export default function PredictionsTable() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editingPrediction, setEditingPrediction] = useState<Prediction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    question: '',
    description: '',
    categoryId: '',
    subcategory: '',
    endTime: '',
    imageUrl: '',
    sourceLink: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'draft', label: 'Draft' },
    { value: 'scheduled', label: 'Scheduled' },
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load categories
      const categoriesSnapshot = await getDocs(
        query(collection(db, 'categories'), orderBy('order', 'asc'))
      );
      const loadedCategories = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        subcategories: doc.data().subcategories || [],
      }));
      setCategories(loadedCategories);

      // Load predictions
      let q = query(collection(db, 'predictions'), orderBy('createdAt', 'desc'));
      if (statusFilter !== 'all') {
        q = query(collection(db, 'predictions'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
      }
      
      const snapshot = await getDocs(q);
      let preds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prediction));
      
      // Apply category filter
      if (categoryFilter !== 'all') {
        preds = preds.filter(p => p.categoryId === categoryFilter);
      }
      
      setPredictions(preds);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter predictions by search
  const filteredPredictions = predictions.filter(p => 
    p.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  const formatDate = (timestamp: { toDate?: () => Date } | null) => {
    if (!timestamp?.toDate) return '-';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const formatDateTime = (timestamp: { toDate?: () => Date } | null) => {
    if (!timestamp?.toDate) return '-';
    const date = timestamp.toDate();
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const handleDelete = async (predictionId: string) => {
    try {
      await deleteDoc(doc(db, 'predictions', predictionId));
      const pred = predictions.find(p => p.id === predictionId);
      
      // Log the action
      if (user) {
        await logAdminAction({
          type: 'prediction_deleted',
          description: `Deleted prediction: "${pred?.question?.substring(0, 50)}..."`,
          adminId: user.uid,
          targetId: predictionId,
          targetName: pred?.question?.substring(0, 50),
        });
      }
      
      toast.success('Prediction deleted');
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete prediction');
    }
  };

  const handleEdit = (prediction: Prediction) => {
    setEditingPrediction(prediction);
    setEditForm({
      question: prediction.question,
      description: prediction.description || '',
      categoryId: prediction.categoryId,
      subcategory: prediction.subcategory || '',
      endTime: prediction.endTime?.toDate?.()?.toISOString().slice(0, 16) || '',
      imageUrl: prediction.imageUrl || '',
      sourceLink: prediction.sourceLink || '',
    });
    setImagePreview(prediction.imageUrl || '');
    setActionMenuOpen(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPrediction) return;
    
    try {
      setSaving(true);
      let imageUrl = editForm.imageUrl;
      
      // Upload new image if selected
      if (imageFile) {
        const storageRef = ref(storage, `predictions/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      const updateData: Record<string, unknown> = {
        question: editForm.question,
        description: editForm.description,
        categoryId: editForm.categoryId,
        subcategory: editForm.subcategory,
        imageUrl,
        sourceLink: editForm.sourceLink,
      };
      
      if (editForm.endTime) {
        updateData.endTime = new Date(editForm.endTime);
      }
      
      await updateDoc(doc(db, 'predictions', editingPrediction.id), updateData);
      
      // Log the action
      if (user) {
        await logAdminAction({
          type: 'prediction_edited',
          description: `Edited prediction: "${editForm.question.substring(0, 50)}..."`,
          adminId: user.uid,
          targetId: editingPrediction.id,
          targetName: editForm.question.substring(0, 50),
        });
      }
      
      toast.success('Prediction updated');
      setEditingPrediction(null);
      setImageFile(null);
      loadData();
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Failed to update prediction');
    } finally {
      setSaving(false);
    }
  };

  const handleSetTrending = async (predictionId: string, isTrending: boolean) => {
    try {
      await updateDoc(doc(db, 'predictions', predictionId), {
        isTrending: !isTrending,
        trendingAddedAt: !isTrending ? new Date() : null,
      });
      toast.success(isTrending ? 'Removed from trending' : 'Added to trending');
      setActionMenuOpen(null);
      loadData();
    } catch (error) {
      console.error('Error updating trending:', error);
      toast.error('Failed to update trending status');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-content-header">
          <div>
            <h1 className="admin-content-title">All Predictions</h1>
            <p className="admin-content-subtitle">Manage your predictions</p>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-body p-8 text-center">
            <RefreshCw className="animate-spin mx-auto text-[var(--admin-text-tertiary)]" size={24} />
            <p className="text-sm text-[var(--admin-text-secondary)] mt-2">Loading predictions...</p>
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
          <h1 className="admin-content-title">All Predictions</h1>
          <p className="admin-content-subtitle">{filteredPredictions.length} predictions</p>
        </div>
        <button 
          onClick={loadData}
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
                placeholder="Search predictions..."
              />
            </div>
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
            />
            <FilterSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'all', label: 'All Categories' },
                ...categories.map(c => ({ value: c.id, label: c.name }))
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
              icon={Filter}
              title="No predictions found"
              message={searchQuery ? "Try adjusting your search or filters" : "Create your first prediction to get started"}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th style={{ width: '50px' }}>Image</th>
                  <th>Title</th>
                  <th style={{ width: '100px' }}>Category</th>
                  <th style={{ width: '80px' }}>Status</th>
                  <th style={{ width: '70px' }}>Votes</th>
                  <th style={{ width: '90px' }}>End Date</th>
                  <th style={{ width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPredictions.map((prediction) => (
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
                      
                      {/* Image */}
                      <td>
                        {prediction.imageUrl ? (
                          <img 
                            src={prediction.imageUrl} 
                            alt="" 
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-[var(--admin-bg-tertiary)] flex items-center justify-center">
                            <ImageIcon size={14} className="text-[var(--admin-text-tertiary)]" />
                          </div>
                        )}
                      </td>
                      
                      {/* Title */}
                      <td>
                        <div className="flex items-center gap-2">
                          {prediction.isTrending && (
                            <TrendingUp size={12} className="text-orange-500 flex-shrink-0" />
                          )}
                          <span className="line-clamp-1 text-[var(--admin-text-primary)]" title={prediction.question}>
                            {prediction.question}
                          </span>
                        </div>
                      </td>
                      
                      {/* Category */}
                      <td>
                        <span className="text-xs text-[var(--admin-text-secondary)]">
                          {getCategoryName(prediction.categoryId)}
                        </span>
                      </td>
                      
                      {/* Status */}
                      <td>
                        <StatusBadge 
                          status={prediction.status as 'active' | 'pending' | 'closed' | 'resolved' | 'draft' | 'scheduled'}
                        />
                      </td>
                      
                      {/* Votes */}
                      <td>
                        <span className="font-medium text-[var(--admin-text-primary)]">
                          {prediction.totalVotes || 0}
                        </span>
                      </td>
                      
                      {/* End Date */}
                      <td>
                        <span className="text-xs text-[var(--admin-text-secondary)]">
                          {formatDate(prediction.endTime)}
                        </span>
                      </td>
                      
                      {/* Actions */}
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(prediction)}
                            className="p-1.5 hover:bg-[var(--admin-bg-tertiary)] rounded transition-colors"
                            title="Edit"
                          >
                            <Edit size={14} className="text-[var(--admin-text-secondary)]" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(prediction.id)}
                            className="p-1.5 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setActionMenuOpen(actionMenuOpen === prediction.id ? null : prediction.id)}
                              className="p-1.5 hover:bg-[var(--admin-bg-tertiary)] rounded transition-colors"
                            >
                              <MoreVertical size={14} className="text-[var(--admin-text-tertiary)]" />
                            </button>
                            {actionMenuOpen === prediction.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-[var(--admin-border)] py-1 z-10 min-w-[150px]">
                                {prediction.sourceLink && (
                                  <a
                                    href={prediction.sourceLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--admin-bg-secondary)] text-[var(--admin-text-primary)]"
                                  >
                                    <ExternalLink size={14} />
                                    View Source
                                  </a>
                                )}
                                <button
                                  onClick={() => handleSetTrending(prediction.id, prediction.isTrending || false)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--admin-bg-secondary)] text-[var(--admin-text-primary)]"
                                >
                                  <TrendingUp size={14} />
                                  {prediction.isTrending ? 'Remove Trending' : 'Set Trending'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded row */}
                    {expandedRow === prediction.id && (
                      <tr className="bg-[var(--admin-bg-secondary)]">
                        <td colSpan={8} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <h4 className="font-medium text-[var(--admin-text-primary)] mb-2">Description</h4>
                              <p className="text-[var(--admin-text-secondary)]">
                                {prediction.description || 'No description provided'}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-medium text-[var(--admin-text-primary)] mb-2">Options</h4>
                              <div className="space-y-1">
                                {prediction.options?.map((opt, idx) => (
                                  <div key={opt.id || idx} className="flex justify-between text-[var(--admin-text-secondary)]">
                                    <span>{opt.label}</span>
                                    <span className="font-medium">{opt.votes || 0} votes</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium text-[var(--admin-text-primary)] mb-2">Timeline</h4>
                              <div className="space-y-1 text-[var(--admin-text-secondary)]">
                                <p>Created: {formatDateTime(prediction.createdAt)}</p>
                                <p>Ends: {formatDateTime(prediction.endTime)}</p>
                              </div>
                            </div>
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
                                  View source article
                                </a>
                              </div>
                            )}
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

      {/* Edit Modal */}
      {editingPrediction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[var(--admin-border)]">
              <h2 className="text-lg font-semibold text-[var(--admin-text-primary)]">Edit Prediction</h2>
              <button
                onClick={() => {
                  setEditingPrediction(null);
                  setImageFile(null);
                }}
                className="p-1 hover:bg-[var(--admin-bg-secondary)] rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1">Question</label>
                <input
                  type="text"
                  value={editForm.question}
                  onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                />
              </div>
              
              {/* Category & Subcategory */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1">Category</label>
                  <select
                    value={editForm.categoryId}
                    onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value, subcategory: '' })}
                    className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1">Subcategory</label>
                  <select
                    value={editForm.subcategory}
                    onChange={(e) => setEditForm({ ...editForm, subcategory: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                  >
                    <option value="">None</option>
                    {categories.find(c => c.id === editForm.categoryId)?.subcategories?.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1">End Time</label>
                <input
                  type="datetime-local"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                />
              </div>
              
              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1">Cover Image</label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="" className="w-20 h-20 rounded-lg object-cover" />
                      <button
                        onClick={() => {
                          setImagePreview('');
                          setImageFile(null);
                          setEditForm({ ...editForm, imageUrl: '' });
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-[var(--admin-border)] flex items-center justify-center cursor-pointer hover:border-[var(--admin-primary)] transition-colors"
                    >
                      <Upload size={20} className="text-[var(--admin-text-tertiary)]" />
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <div className="text-xs text-[var(--admin-text-secondary)]">
                    Click to upload a new image (max 5MB)
                  </div>
                </div>
              </div>
              
              {/* Source Link */}
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1">Source Link</label>
                <input
                  type="url"
                  value={editForm.sourceLink}
                  onChange={(e) => setEditForm({ ...editForm, sourceLink: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-[var(--admin-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--admin-border)]">
              <button
                onClick={() => {
                  setEditingPrediction(null);
                  setImageFile(null);
                }}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="admin-btn admin-btn-primary"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Prediction"
        message="Are you sure you want to delete this prediction? This action cannot be undone and will remove all associated votes."
        confirmLabel="Delete"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        variant="danger"
      />

      {/* Click outside to close action menu */}
      {actionMenuOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </div>
  );
}
