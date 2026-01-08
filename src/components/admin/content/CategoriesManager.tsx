// src/components/admin/content/CategoriesManager.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, where, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { 
  Plus,
  Trash2, 
  RefreshCw,
  Tag,
  ChevronRight,
  Eye,
  X,
  Edit2,
  Check,
  TrendingUp
} from 'lucide-react';
import { EmptyState, ConfirmDialog } from '../shared';
import { logAdminAction } from '@/lib/firebase/adminActions';
import { useAuth } from '@/context/AuthContext';

interface Category {
  id: string;
  name: string;
  slug: string;
  color?: string;
  icon?: string;
  predictionCount?: number;
  subcategories?: string[];
}

interface Prediction {
  id: string;
  question: string;
  category: string;
  subcategory?: string;
  status: string;
  totalVotes: number;
  createdAt?: { toDate?: () => Date };
}

const CATEGORY_COLORS = [
  { name: 'Blue', value: '#3B82F6', bg: 'bg-blue-100 text-blue-700' },
  { name: 'Green', value: '#10B981', bg: 'bg-green-100 text-green-700' },
  { name: 'Purple', value: '#8B5CF6', bg: 'bg-purple-100 text-purple-700' },
  { name: 'Orange', value: '#F59E0B', bg: 'bg-orange-100 text-orange-700' },
  { name: 'Red', value: '#EF4444', bg: 'bg-red-100 text-red-700' },
  { name: 'Pink', value: '#EC4899', bg: 'bg-pink-100 text-pink-700' },
  { name: 'Teal', value: '#14B8A6', bg: 'bg-teal-100 text-teal-700' },
  { name: 'Indigo', value: '#6366F1', bg: 'bg-indigo-100 text-indigo-700' },
];

export default function CategoriesManager() {
  const { user: adminUser } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  
  // Subcategory management states
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [confirmDeleteSubcategory, setConfirmDeleteSubcategory] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get categories
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));
      let loadedCategories = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Category));
      
      // Get prediction counts per category
      const predictionsSnapshot = await getDocs(collection(db, 'predictions'));
      const categoryCounts: Record<string, number> = {};
      
      predictionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const category = data.category || 'uncategorized';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      // Add counts to categories
      loadedCategories = loadedCategories.map(cat => ({
        ...cat,
        predictionCount: categoryCounts[cat.slug] || categoryCounts[cat.name] || 0
      }));
      
      setCategories(loadedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadPredictionsForCategory = async (category: Category) => {
    try {
      setLoadingPredictions(true);
      setSelectedCategory(category);
      
      // Build array of possible category values, filtering out undefined
      const categoryValues = [category.slug, category.name, category.id].filter(Boolean);
      
      if (categoryValues.length === 0) {
        setPredictions([]);
        return;
      }
      
      // Query predictions by category
      const q = query(
        collection(db, 'predictions'),
        where('category', 'in', categoryValues)
      );
      
      const snapshot = await getDocs(q);
      const loadedPredictions = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Prediction))
        .sort((a, b) => {
          // Sort by createdAt in memory to avoid needing composite index
          const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
          return bTime - aTime;
        });
      
      setPredictions(loadedPredictions);
    } catch (error) {
      console.error('Error loading predictions:', error);
      toast.error('Failed to load predictions');
    } finally {
      setLoadingPredictions(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    
    try {
      const slug = newCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const id = slug;
      
      await setDoc(doc(db, 'categories', id), {
        name: newCategoryName.trim(),
        slug,
        color: newCategoryColor.value,
        createdAt: new Date()
      });
      
      if (adminUser) {
        await logAdminAction({
          type: 'prediction_created',
          description: `Created category: ${newCategoryName}`,
          adminId: adminUser.uid,
          targetId: id,
          targetName: newCategoryName
        });
      }
      
      setCategories(prev => [...prev, {
        id,
        name: newCategoryName.trim(),
        slug,
        color: newCategoryColor.value,
        predictionCount: 0
      }]);
      
      setNewCategoryName('');
      setShowAddForm(false);
      toast.success('Category created successfully');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editName.trim()) return;
    
    try {
      await setDoc(doc(db, 'categories', editingCategory.id), {
        ...editingCategory,
        name: editName.trim()
      }, { merge: true });
      
      setCategories(prev => prev.map(cat => 
        cat.id === editingCategory.id ? { ...cat, name: editName.trim() } : cat
      ));
      
      if (selectedCategory?.id === editingCategory.id) {
        setSelectedCategory({ ...selectedCategory, name: editName.trim() });
      }
      
      setEditingCategory(null);
      toast.success('Category updated');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    try {
      await deleteDoc(doc(db, 'categories', category.id));
      
      if (adminUser) {
        await logAdminAction({
          type: 'prediction_deleted',
          description: `Deleted category: ${category.name}`,
          adminId: adminUser.uid,
          targetId: category.id,
          targetName: category.name
        });
      }
      
      setCategories(prev => prev.filter(c => c.id !== category.id));
      
      if (selectedCategory?.id === category.id) {
        setSelectedCategory(null);
        setPredictions([]);
        setShowSubcategories(false);
      }
      
      setConfirmDelete(null);
      toast.success('Category deleted');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const handleAddSubcategory = async () => {
    if (!selectedCategory || !newSubcategoryName.trim()) {
      toast.error('Please enter a subcategory name');
      return;
    }
    
    try {
      const existingSubcategories = selectedCategory.subcategories || [];
      
      // Check for duplicates
      if (existingSubcategories.includes(newSubcategoryName.trim())) {
        toast.error('This subcategory already exists');
        return;
      }
      
      const updatedSubcategories = [...existingSubcategories, newSubcategoryName.trim()];
      
      await updateDoc(doc(db, 'categories', selectedCategory.id), {
        subcategories: updatedSubcategories
      });
      
      if (adminUser) {
        await logAdminAction({
          type: 'prediction_created',
          description: `Added subcategory "${newSubcategoryName}" to ${selectedCategory.name}`,
          adminId: adminUser.uid,
          targetId: selectedCategory.id,
          targetName: selectedCategory.name
        });
      }
      
      // Update local state
      const updatedCategory = { ...selectedCategory, subcategories: updatedSubcategories };
      setSelectedCategory(updatedCategory);
      setCategories(prev => prev.map(cat => 
        cat.id === selectedCategory.id ? updatedCategory : cat
      ));
      
      setNewSubcategoryName('');
      toast.success('Subcategory added');
    } catch (error) {
      console.error('Error adding subcategory:', error);
      toast.error('Failed to add subcategory');
    }
  };

  const handleDeleteSubcategory = async (subcategoryName: string) => {
    if (!selectedCategory) return;
    
    try {
      const updatedSubcategories = (selectedCategory.subcategories || []).filter(s => s !== subcategoryName);
      
      await updateDoc(doc(db, 'categories', selectedCategory.id), {
        subcategories: updatedSubcategories
      });
      
      if (adminUser) {
        await logAdminAction({
          type: 'prediction_deleted',
          description: `Deleted subcategory "${subcategoryName}" from ${selectedCategory.name}`,
          adminId: adminUser.uid,
          targetId: selectedCategory.id,
          targetName: selectedCategory.name
        });
      }
      
      // Update local state
      const updatedCategory = { ...selectedCategory, subcategories: updatedSubcategories };
      setSelectedCategory(updatedCategory);
      setCategories(prev => prev.map(cat => 
        cat.id === selectedCategory.id ? updatedCategory : cat
      ));
      
      setConfirmDeleteSubcategory(null);
      toast.success('Subcategory deleted');
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast.error('Failed to delete subcategory');
    }
  };

  const getCategoryColor = (category: Category) => {
    const found = CATEGORY_COLORS.find(c => c.value === category.color);
    return found?.bg || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-content-header">
          <div>
            <h1 className="admin-content-title">Category Management</h1>
            <p className="admin-content-subtitle">Manage prediction categories</p>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-body p-8 text-center">
            <RefreshCw className="animate-spin mx-auto text-[var(--admin-text-tertiary)]" size={24} />
            <p className="text-sm text-[var(--admin-text-secondary)] mt-2">Loading categories...</p>
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
          <h1 className="admin-content-title">Category Management</h1>
          <p className="admin-content-subtitle">{categories.length} categories</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="admin-btn admin-btn-primary"
        >
          <Plus size={14} />
          Add Category
        </button>
      </div>

      {/* Add Category Form */}
      {showAddForm && (
        <div className="admin-card">
          <div className="admin-card-header flex items-center justify-between">
            <h3 className="font-medium text-[var(--admin-text-primary)]">New Category</h3>
            <button onClick={() => setShowAddForm(false)} className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]">
              <X size={18} />
            </button>
          </div>
          <div className="admin-card-body space-y-4">
            <div>
              <label className="block text-sm text-[var(--admin-text-secondary)] mb-1">Category Name</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Politics, Sports, Technology"
                className="admin-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--admin-text-secondary)] mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setNewCategoryColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newCategoryColor.value === color.value 
                        ? 'border-[var(--admin-primary)] scale-110' 
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddForm(false)} className="admin-btn admin-btn-secondary">
                Cancel
              </button>
              <button onClick={handleAddCategory} className="admin-btn admin-btn-primary">
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Categories List */}
        <div className="admin-card">
          <div className="admin-card-header">
            <Tag size={16} className="text-[var(--admin-text-secondary)]" />
            <h3 className="font-medium text-[var(--admin-text-primary)]">Categories</h3>
          </div>
          <div className="admin-card-body p-0">
            {categories.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Tag}
                  title="No categories"
                  message="Create your first category to organize predictions"
                />
              </div>
            ) : (
              <div className="divide-y divide-[var(--admin-border)]">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className={`flex items-center justify-between p-3 hover:bg-[var(--admin-bg-secondary)] cursor-pointer transition-colors ${
                      selectedCategory?.id === category.id ? 'bg-[var(--admin-bg-secondary)]' : ''
                    }`}
                    onClick={() => loadPredictionsForCategory(category)}
                  >
                    <div className="flex items-center gap-3">
                      {editingCategory?.id === category.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="admin-input text-sm"
                          autoFocus
                        />
                      ) : (
                        <span className={`text-sm px-3 py-1 rounded-full ${getCategoryColor(category)}`}>
                          {category.name}
                        </span>
                      )}
                      <span className="text-xs text-[var(--admin-text-tertiary)]">
                        {category.predictionCount || 0} predictions
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {editingCategory?.id === category.id ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateCategory();
                            }}
                            className="p-1.5 hover:bg-green-100 rounded text-green-600"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCategory(null);
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCategory(category);
                              setEditName(category.name);
                            }}
                            className="p-1.5 hover:bg-[var(--admin-bg-tertiary)] rounded text-[var(--admin-text-tertiary)]"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(category);
                            }}
                            className="p-1.5 hover:bg-red-50 rounded text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                          <ChevronRight size={14} className="text-[var(--admin-text-tertiary)] ml-2" />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Predictions & Subcategories in Category */}
        <div className="admin-card">
          {/* Tab Header */}
          <div className="admin-card-header flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 flex-1">
              <TrendingUp size={16} className="text-[var(--admin-text-secondary)]" />
              <h3 className="font-medium text-[var(--admin-text-primary)]">
                {selectedCategory ? `"${selectedCategory.name}"` : 'Select a Category'}
              </h3>
            </div>
            {selectedCategory && (
              <div className="flex gap-1 bg-[var(--admin-bg-tertiary)] rounded-lg p-1">
                <button
                  onClick={() => setShowSubcategories(false)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    !showSubcategories 
                      ? 'bg-[var(--admin-bg-primary)] text-[var(--admin-text-primary)] shadow-sm' 
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                  }`}
                >
                  Predictions ({predictions.length})
                </button>
                <button
                  onClick={() => setShowSubcategories(true)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    showSubcategories 
                      ? 'bg-[var(--admin-bg-primary)] text-[var(--admin-text-primary)] shadow-sm' 
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                  }`}
                >
                  Subcategories ({selectedCategory.subcategories?.length || 0})
                </button>
              </div>
            )}
          </div>
          
          <div className="admin-card-body p-0">
            {!selectedCategory ? (
              <div className="p-8">
                <EmptyState
                  icon={Eye}
                  title="No category selected"
                  message="Click on a category to view its predictions and subcategories"
                />
              </div>
            ) : showSubcategories ? (
              /* Subcategories Tab */
              <div className="p-4 space-y-4">
                {/* Add Subcategory Form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubcategoryName}
                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                    placeholder="Enter subcategory name..."
                    className="admin-input flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubcategory();
                      }
                    }}
                  />
                  <button 
                    onClick={handleAddSubcategory}
                    disabled={!newSubcategoryName.trim()}
                    className="admin-btn admin-btn-primary"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
                
                {/* Subcategories List */}
                {(!selectedCategory.subcategories || selectedCategory.subcategories.length === 0) ? (
                  <EmptyState
                    icon={Tag}
                    title="No subcategories"
                    message="Add subcategories to organize predictions within this category"
                  />
                ) : (
                  <div className="divide-y divide-[var(--admin-border)] border rounded-lg">
                    {selectedCategory.subcategories.map((subcategory) => (
                      <div 
                        key={subcategory} 
                        className="flex items-center justify-between p-3 hover:bg-[var(--admin-bg-secondary)]"
                      >
                        <div className="flex items-center gap-2">
                          <Tag size={14} className="text-[var(--admin-text-tertiary)]" />
                          <span className="text-sm text-[var(--admin-text-primary)]">{subcategory}</span>
                        </div>
                        <button
                          onClick={() => setConfirmDeleteSubcategory(subcategory)}
                          className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-colors"
                          title="Delete subcategory"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : loadingPredictions ? (
              <div className="p-8 text-center">
                <RefreshCw className="animate-spin mx-auto text-[var(--admin-text-tertiary)]" size={20} />
                <p className="text-sm text-[var(--admin-text-secondary)] mt-2">Loading predictions...</p>
              </div>
            ) : predictions.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={TrendingUp}
                  title="No predictions"
                  message="No predictions in this category yet"
                />
              </div>
            ) : (
              <div className="divide-y divide-[var(--admin-border)] max-h-[400px] overflow-y-auto">
                {predictions.map((prediction) => (
                  <div key={prediction.id} className="p-3 hover:bg-[var(--admin-bg-secondary)]">
                    <p className="text-sm text-[var(--admin-text-primary)] line-clamp-2 mb-1">
                      {prediction.question}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[var(--admin-text-tertiary)]">
                      <span className={`px-2 py-0.5 rounded-full ${
                        prediction.status === 'active' ? 'bg-green-100 text-green-700' :
                        prediction.status === 'resolved' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {prediction.status}
                      </span>
                      <span>{prediction.totalVotes || 0} votes</span>
                      {prediction.subcategory && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          {prediction.subcategory}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Category */}
      {confirmDelete && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Category"
          message={`Are you sure you want to delete "${confirmDelete.name}"? This will not delete predictions in this category, but they will become uncategorized.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => handleDeleteCategory(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
      
      {/* Confirm Delete Subcategory */}
      {confirmDeleteSubcategory && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Subcategory"
          message={`Are you sure you want to delete "${confirmDeleteSubcategory}"? Predictions using this subcategory will keep their subcategory tag.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => handleDeleteSubcategory(confirmDeleteSubcategory)}
          onClose={() => setConfirmDeleteSubcategory(null)}
        />
      )}
    </div>
  );
}
