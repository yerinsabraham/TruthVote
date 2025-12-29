// src/components/admin/PredictionsManager.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { collection, query, where, orderBy, getDocs, doc, deleteDoc, addDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, functions, storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, X, TrendingUp } from 'lucide-react';

interface Prediction {
  id: string;
  question: string;
  description?: string;
  categoryId: string;
  status: 'draft' | 'scheduled' | 'active' | 'closed' | 'resolved';
  totalVotes: number;
  createdAt: unknown;
  endTime: unknown;
  startTime?: unknown;
  options: Array<{ id: string; label: string; votes: number }>;
  subcategory?: string;
  isTrending?: boolean;
  trendingSubcategory?: string | null;
  trendingAddedAt?: unknown;
  imageUrl?: string;
  sourceLink?: string;
  displayTemplate?: string;
}

interface Category {
  id: string;
  name: string;
  subcategories?: string[];
  description?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
  predictionCount?: number;
  order?: number;
  displayOrder?: number;
}

export default function PredictionsManager() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newCategory, setNewCategory] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  
  // Trending management
  const [showTrendingManager, setShowTrendingManager] = useState(false);
  const [trendingSearchQuery, setTrendingSearchQuery] = useState('');
  const [selectedPredictionForTrending, setSelectedPredictionForTrending] = useState<string | null>(null);
  const [trendingSubcategory, setTrendingSubcategory] = useState('');
  const [newTrendingSubcategory, setNewTrendingSubcategory] = useState('');
  
  // Edit mode
  const [editingPredictionId, setEditingPredictionId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [formData, setFormData] = useState({
    question: '',
    description: '',
    categoryId: '',
    subcategory: '',
    startTime: '', // Will be set to current time before submission if empty
    endTime: '',
    imageUrl: '',
    sourceLink: '',
    options: [{ label: 'Yes' }, { label: 'No' }],
    displayTemplate: 'two-option-horizontal' as 'two-option-horizontal' | 'three-option-horizontal' | 'multi-yes-no' | 'multi-option-horizontal',
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load categories with subcategories - try both ordering fields
      let categoriesSnapshot;
      try {
        categoriesSnapshot = await getDocs(
          query(collection(db, 'categories'), orderBy('order', 'asc'))
        );
      } catch (error) {
        console.log('Trying displayOrder field instead...');
        categoriesSnapshot = await getDocs(
          query(collection(db, 'categories'), orderBy('displayOrder'))
        );
      }
      
      const loadedCategories = categoriesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return { 
          id: doc.id, 
          name: data.name,
          subcategories: data.subcategories || [],
          isActive: data.isActive !== false // Default to true if not set
        };
      }).filter(cat => cat.isActive); // Only show active categories
      
      console.log('Loaded categories:', loadedCategories);
      setCategories(loadedCategories);

      // Load predictions
      let q = query(collection(db, 'predictions'), orderBy('createdAt', 'desc'));
      if (filter !== 'all') {
        q = query(collection(db, 'predictions'), where('status', '==', filter), orderBy('createdAt', 'desc'));
      }
      
      const snapshot = await getDocs(q);
      setPredictions(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Prediction))
      );
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load predictions');
    } finally {
      setLoading(false);
    }
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

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) return '';
    
    try {
      setUploadingImage(true);
      const timestamp = Date.now();
      const storageRef = ref(storage, `predictions/${timestamp}_${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return '';
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      const categoryRef = doc(collection(db, 'categories'));
      await setDoc(categoryRef, {
        name: newCategory.trim(),
        description: '',
        icon: '📊', // Default icon
        color: '#00649c', // Default color
        isActive: true,
        predictionCount: 0,
        order: categories.length,
        displayOrder: categories.length,
        subcategories: [],
        createdAt: new Date()
      });
      toast.success('Category added');
      setNewCategory('');
      loadData();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const handleAddSubcategory = async (categoryId: string) => {
    if (!newSubcategory.trim()) {
      toast.error('Please enter a subcategory name');
      return;
    }

    try {
      const category = categories.find(c => c.id === categoryId);
      if (!category) return;

      const updatedSubcategories = [...(category.subcategories || []), newSubcategory.trim()];
      await updateDoc(doc(db, 'categories', categoryId), {
        subcategories: updatedSubcategories
      });
      toast.success('Subcategory added');
      setNewSubcategory('');
      loadData();
    } catch (error) {
      console.error('Error adding subcategory:', error);
      toast.error('Failed to add subcategory');
    }
  };

  const handleAddTrendingSubcategory = async () => {
    const trendingCategory = categories.find(c => c.name === 'Trending');
    if (!trendingCategory || !newTrendingSubcategory.trim()) {
      toast.error('Please enter a trending subcategory name');
      return;
    }

    try {
      const updatedSubcategories = [...(trendingCategory.subcategories || []), newTrendingSubcategory.trim()];
      await updateDoc(doc(db, 'categories', trendingCategory.id), {
        subcategories: updatedSubcategories
      });
      toast.success('Trending subcategory added');
      setNewTrendingSubcategory('');
      loadData();
    } catch (error) {
      console.error('Error adding trending subcategory:', error);
      toast.error('Failed to add trending subcategory');
    }
  };

  const handleDeleteSubcategory = async (categoryId: string, subcategory: string) => {
    try {
      const category = categories.find(c => c.id === categoryId);
      if (!category) return;

      const updatedSubcategories = (category.subcategories || []).filter(s => s !== subcategory);
      await updateDoc(doc(db, 'categories', categoryId), {
        subcategories: updatedSubcategories
      });
      toast.success('Subcategory deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast.error('Failed to delete subcategory');
    }
  };

  const handleAddToTrending = async () => {
    if (!selectedPredictionForTrending || !trendingSubcategory.trim()) {
      toast.error('Please select a prediction and enter a trending subcategory');
      return;
    }

    try {
      const predictionRef = doc(db, 'predictions', selectedPredictionForTrending);
      const predictionDoc = await getDocs(query(collection(db, 'predictions'), where('__name__', '==', selectedPredictionForTrending)));
      
      if (predictionDoc.empty) {
        toast.error('Prediction not found');
        return;
      }

      // Update prediction to mark it as trending with subcategory
      await updateDoc(predictionRef, {
        isTrending: true,
        trendingSubcategory: trendingSubcategory.trim(),
        trendingAddedAt: new Date()
      });

      // Add trending subcategory to Trending category if not exists
      const trendingCategory = categories.find(c => c.name === 'Trending');
      if (trendingCategory) {
        const existingSubs = trendingCategory.subcategories || [];
        if (!existingSubs.includes(trendingSubcategory.trim())) {
          await updateDoc(doc(db, 'categories', trendingCategory.id), {
            subcategories: [...existingSubs, trendingSubcategory.trim()]
          });
        }
      }

      toast.success('Added to trending!');
      setSelectedPredictionForTrending(null);
      setTrendingSubcategory('');
      setTrendingSearchQuery('');
      loadData();
    } catch (error) {
      console.error('Error adding to trending:', error);
      toast.error('Failed to add to trending');
    }
  };

  const handleRemoveFromTrending = async (predictionId: string) => {
    try {
      await updateDoc(doc(db, 'predictions', predictionId), {
        isTrending: false,
        trendingSubcategory: null,
        trendingAddedAt: null
      });
      toast.success('Removed from trending');
      loadData();
    } catch (error) {
      console.error('Error removing from trending:', error);
      toast.error('Failed to remove from trending');
    }
  };

  const handleDeleteTrendingSubcategory = async (subcategory: string) => {
    const trendingCategory = categories.find(c => c.name === 'Trending');
    if (!trendingCategory) return;

    try {
      const updatedSubs = (trendingCategory.subcategories || []).filter(s => s !== subcategory);
      await updateDoc(doc(db, 'categories', trendingCategory.id), {
        subcategories: updatedSubs
      });
      
      // Remove trending subcategory from all predictions using it
      const predictionsWithSub = predictions.filter(p => p.trendingSubcategory === subcategory);
      for (const pred of predictionsWithSub) {
        await updateDoc(doc(db, 'predictions', pred.id), {
          trendingSubcategory: null
        });
      }
      
      toast.success('Trending subcategory deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting trending subcategory:', error);
      toast.error('Failed to delete trending subcategory');
    }
  };

  const handleUpdatePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingPredictionId || !formData.question || !formData.categoryId || !formData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      let imageUrl = formData.imageUrl;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      // Use current time if startTime is empty (immediate activation)
      const startTimeToSend = formData.startTime || new Date().toISOString();

      const dataToSend = {
        predictionId: editingPredictionId,
        question: formData.question,
        description: formData.description,
        categoryId: formData.categoryId,
        subcategory: formData.subcategory || null,
        imageUrl: imageUrl || null,
        sourceLink: formData.sourceLink || null,
        startTime: startTimeToSend,
        endTime: formData.endTime,
        options: formData.options,
        displayTemplate: formData.displayTemplate,
      };
      
      console.log('=== UPDATING PREDICTION ===');
      console.log('Data being sent to Cloud Function:', dataToSend);

      const updatePrediction = httpsCallable(functions, 'updatePrediction');
      await updatePrediction(dataToSend);

      toast.success('Prediction updated successfully!');
      setShowCreateForm(false);
      setIsEditMode(false);
      setEditingPredictionId(null);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error updating prediction:', error);
      toast.error(error.message || 'Failed to update prediction');
    }
  };

  const handleCreatePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.question || !formData.categoryId || !formData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      let imageUrl = formData.imageUrl;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      // Use current time if startTime is empty (immediate activation)
      const startTimeToSend = formData.startTime || new Date().toISOString();

      const dataToSend = {
        question: formData.question,
        description: formData.description,
        categoryId: formData.categoryId,
        subcategory: formData.subcategory || null,
        imageUrl: imageUrl || null,
        sourceLink: formData.sourceLink || null,
        startTime: startTimeToSend,
        endTime: formData.endTime,
        options: formData.options,
        displayTemplate: formData.displayTemplate,
      };
      
      console.log('=== CREATING PREDICTION ===');
      console.log('Data being sent to Cloud Function:', dataToSend);

      const createPrediction = httpsCallable(functions, 'createPrediction');
      await createPrediction(dataToSend);

      toast.success('Prediction created successfully');
      setShowCreateForm(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating prediction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create prediction';
      toast.error(errorMessage);
    }
  };

  const handleDeletePrediction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prediction?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'predictions', id));
      toast.success('Prediction deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting prediction:', error);
      toast.error('Failed to delete prediction');
    }
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { label: '' }],
    });
  };

  const updateOption = (index: number, label: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = { label };
    setFormData({ ...formData, options: newOptions });
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) {
      toast.error('Minimum 2 options required');
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  const resetForm = () => {
    setFormData({
      question: '',
      description: '',
      categoryId: '',
      subcategory: '',
      startTime: '',
      endTime: '',
      imageUrl: '',
      sourceLink: '',
      options: [{ label: 'Yes' }, { label: 'No' }],
      displayTemplate: 'two-option-horizontal',
    });
    setImageFile(null);
    setImagePreview('');
    setIsEditMode(false);
    setEditingPredictionId(null);
  };

  const handleEditPrediction = (prediction: Prediction) => {
    console.log('=== EDITING PREDICTION ===');
    console.log('Prediction data:', prediction);
    console.log('displayTemplate:', prediction.displayTemplate);
    console.log('imageUrl:', prediction.imageUrl);
    console.log('sourceLink:', prediction.sourceLink);
    console.log('startTime:', prediction.startTime);
    console.log('endTime:', prediction.endTime);
    
    setIsEditMode(true);
    setEditingPredictionId(prediction.id);
    setShowCreateForm(true);
    
    // Convert Firebase Timestamp to datetime-local format for inputs
    const formatDateForInput = (timestamp: any) => {
      if (!timestamp) return '';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const formattedData = {
      question: prediction.question,
      description: prediction.description || '',
      categoryId: prediction.categoryId,
      subcategory: prediction.subcategory || '',
      startTime: formatDateForInput(prediction.startTime),
      endTime: formatDateForInput(prediction.endTime),
      imageUrl: prediction.imageUrl || '',
      sourceLink: prediction.sourceLink || '',
      options: prediction.options.map(opt => ({ label: opt.label })),
      displayTemplate: (prediction.displayTemplate as any) || 'two-option-horizontal',
    };
    
    console.log('Formatted form data:', formattedData);
    setFormData(formattedData);
    
    // Set image preview if image exists
    if (prediction.imageUrl) {
      console.log('Setting image preview:', prediction.imageUrl);
      setImagePreview(prediction.imageUrl);
    } else {
      console.log('No image URL found');
      setImagePreview('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading predictions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Predictions Management</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowTrendingManager(!showTrendingManager)}
          >
            <TrendingUp size={16} className="mr-2" />
            Manage Trending
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus size={16} className="mr-2" />
            Create Prediction
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? 'Edit Prediction' : 'Create New Prediction'}</CardTitle>
            <p className="text-sm text-muted-foreground">Select a template first to see how your prediction will be displayed</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={isEditMode ? handleUpdatePrediction : handleCreatePrediction} className="space-y-6">
              
              {/* STEP 1: TEMPLATE SELECTION (Moved to top) */}
              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Step 1: Choose Display Template *</CardTitle>
                  <p className="text-sm text-muted-foreground">This determines how options are shown and affects the number of options needed</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div 
                      className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                        formData.displayTemplate === 'two-option-horizontal' 
                          ? 'border-primary bg-primary/10 shadow-md' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setFormData({ ...formData, displayTemplate: 'two-option-horizontal' })}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="radio"
                          name="displayTemplate"
                          value="two-option-horizontal"
                          checked={formData.displayTemplate === 'two-option-horizontal'}
                          onChange={() => setFormData({ ...formData, displayTemplate: 'two-option-horizontal' })}
                          className="w-4 h-4"
                        />
                        <span className="font-semibold">Two-Option Horizontal (Yes/No)</span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6 mb-2">Perfect for binary predictions. Two large horizontal buttons side-by-side.</p>
                      <div className="flex gap-2 ml-6">
                        <div className="flex-1 h-10 bg-green-600/20 border-2 border-green-600/50 rounded flex items-center justify-center text-sm font-bold">
                          Yes / Team A
                        </div>
                        <div className="flex-1 h-10 bg-red-600/20 border-2 border-red-600/50 rounded flex items-center justify-center text-sm font-bold">
                          No / Team B
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                        formData.displayTemplate === 'three-option-horizontal' 
                          ? 'border-primary bg-primary/10 shadow-md' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setFormData({ ...formData, displayTemplate: 'three-option-horizontal' })}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="radio"
                          name="displayTemplate"
                          value="three-option-horizontal"
                          checked={formData.displayTemplate === 'three-option-horizontal'}
                          onChange={() => setFormData({ ...formData, displayTemplate: 'three-option-horizontal' })}
                          className="w-4 h-4"
                        />
                        <span className="font-semibold">Three-Option Horizontal (With Middle Option)</span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6 mb-2">For predictions with a neutral middle option (Tie/Draw/Maybe/Unsure).</p>
                      <div className="flex gap-2 ml-6">
                        <div className="flex-1 h-10 bg-blue-600/20 border-2 border-blue-600/50 rounded flex items-center justify-center text-sm font-bold">
                          Option 1 (Left)
                        </div>
                        <div className="w-24 h-10 bg-gray-400/20 border-2 border-gray-400/50 rounded flex items-center justify-center text-xs font-bold">
                          Middle<br/>(Tie/Maybe)
                        </div>
                        <div className="flex-1 h-10 bg-green-600/20 border-2 border-green-600/50 rounded flex items-center justify-center text-sm font-bold">
                          Option 3 (Right)
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                        formData.displayTemplate === 'multi-yes-no' 
                          ? 'border-primary bg-primary/10 shadow-md' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setFormData({ ...formData, displayTemplate: 'multi-yes-no' })}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="radio"
                          name="displayTemplate"
                          value="multi-yes-no"
                          checked={formData.displayTemplate === 'multi-yes-no'}
                          onChange={() => setFormData({ ...formData, displayTemplate: 'multi-yes-no' })}
                          className="w-4 h-4"
                        />
                        <span className="font-semibold">Multi Yes/No (Vertical List)</span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6 mb-2">Each option gets Yes/No buttons. Perfect for multiple candidates/choices.</p>
                      <div className="space-y-2 ml-6">
                        <div className="flex items-center justify-between bg-muted/30 rounded p-2">
                          <span className="text-xs font-medium">Candidate A - 30%</span>
                          <div className="flex gap-1">
                            <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded text-xs">Yes</div>
                            <div className="px-3 py-1 bg-pink-500/20 border border-pink-500/50 rounded text-xs">No</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-muted/30 rounded p-2">
                          <span className="text-xs font-medium">Candidate B - 20%</span>
                          <div className="flex gap-1">
                            <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded text-xs">Yes</div>
                            <div className="px-3 py-1 bg-pink-500/20 border border-pink-500/50 rounded text-xs">No</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                        formData.displayTemplate === 'multi-option-horizontal' 
                          ? 'border-primary bg-primary/10 shadow-md' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setFormData({ ...formData, displayTemplate: 'multi-option-horizontal' })}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="radio"
                          name="displayTemplate"
                          value="multi-option-horizontal"
                          checked={formData.displayTemplate === 'multi-option-horizontal'}
                          onChange={() => setFormData({ ...formData, displayTemplate: 'multi-option-horizontal' })}
                          className="w-4 h-4"
                        />
                        <span className="font-semibold">Multi-Option Horizontal (4+ Choices)</span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6 mb-2">For 4+ distinct options with auto-assigned unique colors.</p>
                      <div className="grid grid-cols-2 gap-2 ml-6">
                        <div className="h-10 bg-primary/20 border-2 border-primary/50 rounded flex items-center justify-center text-xs font-bold">Option A</div>
                        <div className="h-10 bg-purple-600/20 border-2 border-purple-600/50 rounded flex items-center justify-center text-xs font-bold">Option B</div>
                        <div className="h-10 bg-orange-600/20 border-2 border-orange-600/50 rounded flex items-center justify-center text-xs font-bold">Option C</div>
                        <div className="h-10 bg-teal-600/20 border-2 border-teal-600/50 rounded flex items-center justify-center text-xs font-bold">Option D</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* STEP 2: PREDICTION DETAILS */}
              <Card className="border-2 border-muted">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Step 2: Prediction Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                <Label htmlFor="prediction-question">Question *</Label>
                <Input
                  id="prediction-question"
                  name="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="What will happen?"
                  maxLength={200}
                  required
                />
              </div>

              <div>
                <Label htmlFor="prediction-description">Description & Resolution Criteria</Label>
                <textarea
                  id="prediction-description"
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide context and explain how this prediction will be resolved. Example: 'This prediction resolves YES if X happens by the end date, otherwise NO.'"
                  className="w-full border border-border rounded-lg p-3 min-h-[120px] text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground mt-1">Explain the context and how the prediction will be resolved</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prediction-category">Category *</Label>
                  <div className="flex gap-2">
                    <select
                      id="prediction-category"
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={(e) => {
                        console.log('Category selected:', e.target.value);
                        setFormData({ ...formData, categoryId: e.target.value, subcategory: '' });
                      }}
                      className="flex-1 border border-border bg-background rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
                      required
                    >
                      <option value="" disabled>Select category</option>
                      {categories.length === 0 && <option disabled>Loading categories...</option>}
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowCategoryManager(!showCategoryManager)}
                      title="Manage Categories"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                  {categories.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ No categories found. Add one below.</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="prediction-subcategory">Subcategory (optional)</Label>
                  <select
                    id="prediction-subcategory"
                    name="subcategory"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    className="w-full border border-border bg-background rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
                    disabled={!formData.categoryId}
                  >
                    <option value="">None</option>
                    {formData.categoryId && categories.find(c => c.id === formData.categoryId)?.subcategories?.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                  {formData.categoryId && categories.find(c => c.id === formData.categoryId)?.subcategories?.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">No subcategories yet. Add one below.</p>
                  )}
                </div>
              </div>

              {/* Subcategory Management - Always show when category is selected */}
              {formData.categoryId && (
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Manage Subcategories for "{categories.find(c => c.id === formData.categoryId)?.name}"</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="new-subcategory-input" className="text-sm font-semibold">Add New Subcategory</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="new-subcategory-input"
                          name="newSubcategory"
                          value={newSubcategory}
                          onChange={(e) => setNewSubcategory(e.target.value)}
                          placeholder="e.g., Presidential Election, NBA Finals..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSubcategory(formData.categoryId);
                            }
                          }}
                        />
                        <Button 
                          type="button" 
                          onClick={() => handleAddSubcategory(formData.categoryId)}
                          disabled={!newSubcategory.trim()}
                        >
                          Add
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Press Enter or click Add to create subcategory</p>
                    </div>
                    
                    {categories.find(c => c.id === formData.categoryId)?.subcategories && categories.find(c => c.id === formData.categoryId)?.subcategories!.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Existing subcategories:</p>
                        <div className="flex flex-wrap gap-2">
                          {categories.find(c => c.id === formData.categoryId)?.subcategories?.map((sub) => (
                            <div key={sub} className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-md border border-border shadow-sm">
                              <span className="text-sm">{sub}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubcategory(formData.categoryId, sub)}
                                className="text-destructive hover:text-destructive/80 transition-colors"
                                title="Delete subcategory"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Category Manager - Show by default if no categories or when toggled */}
              {(showCategoryManager || categories.length === 0) && (
                <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Category Management</span>
                      {categories.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCategoryManager(false)}
                        >
                          <X size={16} />
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="new-category-input" className="text-sm font-semibold">Add New Category</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="new-category-input"
                          name="newCategory"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="e.g., Politics, Sports, Entertainment..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCategory();
                            }
                          }}
                        />
                        <Button 
                          type="button" 
                          onClick={handleAddCategory}
                          disabled={!newCategory.trim()}
                        >
                          Add
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Press Enter or click Add to create a new category</p>
                    </div>

                    {formData.categoryId && (
                      <div className="pt-3 border-t">
                        <Label htmlFor="new-subcategory-input" className="text-sm font-semibold">Add Subcategory to "{categories.find(c => c.id === formData.categoryId)?.name}"</Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            id="new-subcategory-input"
                            name="newSubcategory"
                            value={newSubcategory}
                            onChange={(e) => setNewSubcategory(e.target.value)}
                            placeholder="e.g., Presidential Election, NBA Finals..."
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubcategory(formData.categoryId);
                              }
                            }}
                          />
                          <Button 
                            type="button" 
                            onClick={() => handleAddSubcategory(formData.categoryId)}
                            disabled={!newSubcategory.trim()}
                          >
                            Add
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Create subcategories for trending topics within this category</p>
                        
                        {categories.find(c => c.id === formData.categoryId)?.subcategories && categories.find(c => c.id === formData.categoryId)?.subcategories!.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Existing subcategories:</p>
                            <div className="flex flex-wrap gap-2">
                              {categories.find(c => c.id === formData.categoryId)?.subcategories?.map((sub) => (
                                <div key={sub} className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-md border border-border shadow-sm">
                                  <span className="text-sm">{sub}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubcategory(formData.categoryId, sub)}
                                    className="text-destructive hover:text-destructive/80 transition-colors"
                                    title="Delete subcategory"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {!formData.categoryId && categories.length > 0 && (
                      <p className="text-sm text-muted-foreground italic">Select a category above to add subcategories</p>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Image</Label>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full"
                    >
                      <Upload size={16} className="mr-2" />
                      {imageFile ? 'Change Image' : 'Upload Image'}
                    </Button>
                    {imagePreview && (
                      <div className="relative w-full h-32 border rounded-lg overflow-hidden">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview('');
                          }}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded-full"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="prediction-source-link">Source Link (optional)</Label>
                  <Input
                    id="prediction-source-link"
                    name="sourceLink"
                    value={formData.sourceLink}
                    onChange={(e) => setFormData({ ...formData, sourceLink: e.target.value })}
                    placeholder="https://..."
                    type="url"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prediction-start-time">Start Time (optional)</Label>
                  <Input
                    id="prediction-start-time"
                    name="startTime"
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="prediction-end-time">End Time *</Label>
                  <Input
                    id="prediction-end-time"
                    name="endTime"
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="prediction-option-0">
                  Options *
                  {formData.displayTemplate === 'two-option-horizontal' && (
                    <span className="text-xs font-normal text-muted-foreground ml-2">(2 options: Option A/Yes, Option B/No)</span>
                  )}
                  {formData.displayTemplate === 'three-option-horizontal' && (
                    <span className="text-xs font-normal text-muted-foreground ml-2">(3 options: Option 1 (Left), Middle (Tie/Draw/Maybe), Option 3 (Right))</span>
                  )}
                  {(formData.displayTemplate === 'multi-yes-no' || formData.displayTemplate === 'multi-option-horizontal') && (
                    <span className="text-xs font-normal text-muted-foreground ml-2">(Add all candidates/choices you want to include)</span>
                  )}
                </Label>
                <div className="space-y-2 mt-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1 flex gap-2">
                        {/* Show position indicator for three-option template */}
                        {formData.displayTemplate === 'three-option-horizontal' && (
                          <div className={`flex-shrink-0 w-20 flex items-center justify-center rounded border-2 text-xs font-bold ${
                            index === 0 ? 'bg-blue-500/10 border-blue-500/50 text-blue-700' :
                            index === 1 ? 'bg-gray-400/10 border-gray-400/50 text-gray-700' :
                            'bg-green-500/10 border-green-500/50 text-green-700'
                          }`}>
                            {index === 0 ? 'LEFT' : index === 1 ? 'MIDDLE' : 'RIGHT'}
                          </div>
                        )}
                        {/* Show color indicator for two-option template */}
                        {formData.displayTemplate === 'two-option-horizontal' && (
                          <div className={`flex-shrink-0 w-16 flex items-center justify-center rounded border-2 text-xs font-bold ${
                            index === 0 ? 'bg-green-500/10 border-green-500/50 text-green-700' :
                            'bg-red-500/10 border-red-500/50 text-red-700'
                          }`}>
                            {index === 0 ? 'YES' : 'NO'}
                          </div>
                        )}
                        <Input
                          id={`prediction-option-${index}`}
                          name={`option-${index}`}
                          value={option.label}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={
                            formData.displayTemplate === 'three-option-horizontal' && index === 0 ? 'e.g., Team A, Yes, Option 1' :
                            formData.displayTemplate === 'three-option-horizontal' && index === 1 ? 'e.g., Tie, Draw, Maybe, Unsure' :
                            formData.displayTemplate === 'three-option-horizontal' && index === 2 ? 'e.g., Team B, No, Option 2' :
                            formData.displayTemplate === 'two-option-horizontal' && index === 0 ? 'e.g., Yes, Team A, Pass' :
                            formData.displayTemplate === 'two-option-horizontal' && index === 1 ? 'e.g., No, Team B, Fail' :
                            `Option ${index + 1}`
                          }
                          required
                          aria-label={`Option ${index + 1}`}
                        />
                      </div>
                      {formData.options.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeOption(index)}
                          aria-label={`Remove option ${index + 1}`}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {formData.options.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addOption}
                    className="mt-2"
                  >
                    Add Option
                  </Button>
                )}
                {formData.displayTemplate === 'three-option-horizontal' && formData.options.length !== 3 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Three-option template requires exactly 3 options</p>
                )}
                {formData.displayTemplate === 'two-option-horizontal' && formData.options.length !== 2 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Two-option template requires exactly 2 options</p>
                )}
              </div>
                </CardContent>
              </Card>

              {/* Submit Buttons */}
              <div className="flex gap-2">
                <Button type="submit">{isEditMode ? 'Update Prediction' : 'Create Prediction'}</Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Trending Manager */}
      {showTrendingManager && (
        <Card>
          <CardHeader>
            <CardTitle>Trending Management</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add predictions from any category to Trending with custom subcategories
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Trending Subcategories Management */}
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-3">Manage Trending Subcategories</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add new trending subcategory (e.g., Cryptocurrency, AFCON...)"
                    value={newTrendingSubcategory}
                    onChange={(e) => setNewTrendingSubcategory(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newTrendingSubcategory.trim()) {
                        e.preventDefault();
                        handleAddTrendingSubcategory();
                      }
                    }}
                  />
                  <Button 
                    type="button"
                    onClick={handleAddTrendingSubcategory}
                    disabled={!newTrendingSubcategory.trim()}
                  >
                    Add
                  </Button>
                </div>
                
                {categories.find(c => c.name === 'Trending')?.subcategories && 
                 categories.find(c => c.name === 'Trending')?.subcategories!.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Existing trending subcategories:</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.find(c => c.name === 'Trending')?.subcategories?.map((sub) => (
                        <div key={sub} className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">
                          <span className="text-sm">{sub}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTrendingSubcategory(sub)}
                            className="text-destructive hover:text-destructive/80"
                            title="Delete trending subcategory"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Add Prediction to Trending */}
            <div>
              <h3 className="font-semibold mb-3">Add Prediction to Trending</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="trending-search">Search Predictions</Label>
                  <Input
                    id="trending-search"
                    placeholder="Search by question..."
                    value={trendingSearchQuery}
                    onChange={(e) => setTrendingSearchQuery(e.target.value)}
                  />
                </div>

                {trendingSearchQuery && (
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {predictions
                      .filter(p => 
                        p.question.toLowerCase().includes(trendingSearchQuery.toLowerCase()) &&
                        p.status !== 'draft'
                      )
                      .slice(0, 10)
                      .map(pred => (
                        <div 
                          key={pred.id} 
                          className="p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer"
                          onClick={() => setSelectedPredictionForTrending(pred.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{pred.question}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {categories.find(c => c.id === pred.categoryId)?.name}
                                {pred.subcategory && ` • ${pred.subcategory}`}
                              </p>
                            </div>
                            {pred.isTrending && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                                  Trending: {pred.trendingSubcategory}
                                </span>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveFromTrending(pred.id);
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                            {!pred.isTrending && selectedPredictionForTrending === pred.id && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                Selected
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {selectedPredictionForTrending && !predictions.find(p => p.id === selectedPredictionForTrending)?.isTrending && (
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <Label htmlFor="trending-subcategory-select">Assign Trending Subcategory</Label>
                    <div className="flex gap-2 mt-2">
                      <select
                        id="trending-subcategory-select"
                        value={trendingSubcategory}
                        onChange={(e) => setTrendingSubcategory(e.target.value)}
                        className="flex-1 border border-border bg-background rounded-lg p-2 text-sm"
                      >
                        <option value="">Select trending subcategory</option>
                        {categories.find(c => c.name === 'Trending')?.subcategories?.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                      <Button
                        onClick={handleAddToTrending}
                        disabled={!trendingSubcategory}
                      >
                        Add to Trending
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      This prediction will appear in both its original category and Trending
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'scheduled', 'active', 'closed', 'resolved'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            size="sm"
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Predictions List */}
      <div className="grid gap-4">
        {predictions.map((prediction) => (
          <Card key={prediction.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start gap-4">
                {/* Image thumbnail */}
                {prediction.imageUrl && (
                  <div className="flex-shrink-0">
                    <img 
                      src={prediction.imageUrl} 
                      alt={prediction.question}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-border"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(prediction.status)}`}>
                      {prediction.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {prediction.totalVotes} votes
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{prediction.question}</h3>
                  {prediction.description && (
                    <p className="text-gray-600 text-sm mb-2">{prediction.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {prediction.options.map((option) => (
                      <span key={option.id} className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {option.label}: {option.votes}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPrediction(prediction)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePrediction(prediction.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {predictions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No predictions found
          </div>
        )}
      </div>
    </div>
  );
}
