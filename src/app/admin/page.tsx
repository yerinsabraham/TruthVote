// src/app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, doc, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PollOption } from '@/types/poll';

interface Category {
  id: string;
  name: string;
}

interface Prediction {
  id: string;
  question: string;
  description?: string;
  options: PollOption[];
  categoryId: string;
  categoryName: string;
  creatorId: string;
  status: 'draft' | 'active' | 'closed' | 'resolved';
  published: boolean;
  createdAt: any;
  startTime?: any;
  endTime: any;
  resolutionTime?: any;
  winningOption?: string;
  totalVotes: number;
}

interface FormData {
  question: string;
  description: string;
  categoryId: string;
  startTime: string;
  endTime: string;
  resolutionTime: string;
  options: { label: string }[];
}

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [viewFilter, setViewFilter] = useState<'draft' | 'active' | 'closed' | 'resolved'>('active');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    question: '',
    description: '',
    categoryId: '',
    startTime: '',
    endTime: '',
    resolutionTime: '',
    options: [{ label: 'Yes' }, { label: 'No' }] // Default binary
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error('Access denied. Admins only.');
      router.push('/');
    }
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    if (isAdmin) {
      loadCategories();
      loadPredictions();
    }
  }, [isAdmin, viewFilter]);

  const loadCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), orderBy('displayOrder'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'predictions'),
        where('status', '==', viewFilter),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Prediction[];
      
      setPredictions(data);
    } catch (error) {
      console.error('Error loading predictions:', error);
      toast.error('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = () => {
    if (formData.options.length >= 10) {
      toast.error('Maximum 10 options allowed');
      return;
    }
    setFormData({
      ...formData,
      options: [...formData.options, { label: '' }]
    });
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options.length <= 2) {
      toast.error('Minimum 2 options required');
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index].label = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.question.trim()) {
      toast.error('Question is required');
      return;
    }
    
    if (formData.options.some(opt => !opt.label.trim())) {
      toast.error('All options must have text');
      return;
    }

    if (!formData.categoryId) {
      toast.error('Please select a category');
      return;
    }

    if (!formData.endTime) {
      toast.error('End time is required');
      return;
    }

    try {
      const selectedCategory = categories.find(c => c.id === formData.categoryId);
      
      // Create poll options with IDs
      const pollOptions: PollOption[] = formData.options.map((opt, idx) => ({
        id: String.fromCharCode(65 + idx), // A, B, C, etc.
        label: opt.label.trim(),
        votes: 0
      }));

      const predictionData = {
        question: formData.question.trim(),
        description: formData.description.trim() || '',
        options: pollOptions,
        category: selectedCategory?.name || 'Other',
        categoryId: formData.categoryId,
        categoryName: selectedCategory?.name || 'Other',
        createdBy: user?.uid || '',
        creatorId: user?.uid || '',
        status: 'draft',
        published: false,
        resolved: false,
        winningOption: null,
        totalVotes: 0,
        createdAt: Timestamp.now(),
        startTime: formData.startTime ? Timestamp.fromDate(new Date(formData.startTime)) : Timestamp.now(),
        endTime: Timestamp.fromDate(new Date(formData.endTime)),
        resolutionTime: formData.resolutionTime ? Timestamp.fromDate(new Date(formData.resolutionTime)) : null,
        // Legacy fields for compatibility
        optionA: pollOptions[0]?.label || '',
        optionB: pollOptions[1]?.label || '',
        votesA: 0,
        votesB: 0
      };

      if (editingId) {
        await updateDoc(doc(db, 'predictions', editingId), predictionData);
        toast.success('Prediction updated!');
      } else {
        await addDoc(collection(db, 'predictions'), predictionData);
        toast.success('Prediction created!');
      }

      // Reset form
      setFormData({
        question: '',
        description: '',
        categoryId: '',
        startTime: '',
        endTime: '',
        resolutionTime: '',
        options: [{ label: 'Yes' }, { label: 'No' }]
      });
      setEditingId(null);
      setActiveTab('list');
      loadPredictions();
    } catch (error: any) {
      console.error('Error saving prediction:', error);
      toast.error('Failed to save: ' + error.message);
    }
  };

  const handleEdit = (prediction: Prediction) => {
    setFormData({
      question: prediction.question,
      description: prediction.description || '',
      categoryId: prediction.categoryId,
      startTime: prediction.startTime ? new Date(prediction.startTime.toDate()).toISOString().slice(0, 16) : '',
      endTime: new Date(prediction.endTime.toDate()).toISOString().slice(0, 16),
      resolutionTime: prediction.resolutionTime ? new Date(prediction.resolutionTime.toDate()).toISOString().slice(0, 16) : '',
      options: prediction.options.map(opt => ({ label: opt.label }))
    });
    setEditingId(prediction.id);
    setActiveTab('edit');
  };

  const handlePublish = async (predictionId: string, publish: boolean) => {
    try {
      await updateDoc(doc(db, 'predictions', predictionId), {
        published: publish,
        status: publish ? 'active' : 'draft'
      });
      toast.success(publish ? 'Published!' : 'Unpublished');
      loadPredictions();
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    }
  };

  const handleResolve = async (predictionId: string, winningOptionId: string) => {
    if (!confirm(`Resolve with Option ${winningOptionId} as winner?`)) return;
    
    try {
      await updateDoc(doc(db, 'predictions', predictionId), {
        status: 'resolved',
        resolved: true,
        winningOption: winningOptionId,
        resolvedAt: Timestamp.now()
      });
      
      toast.success('Prediction resolved!');
      loadPredictions();
    } catch (error: any) {
      toast.error('Failed to resolve: ' + error.message);
    }
  };

  const handleDelete = async (predictionId: string) => {
    if (!confirm('Permanently delete this prediction?')) return;
    
    try {
      await deleteDoc(doc(db, 'predictions', predictionId));
      toast.success('Deleted');
      loadPredictions();
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground mb-8">Platform curated predictions - Quality control, verifiable outcomes</p>

        {/* Main Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'list' ? 'default' : 'outline'}
            onClick={() => setActiveTab('list')}
          >
            Manage Predictions
          </Button>
          <Button
            variant={activeTab === 'create' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('create');
              setEditingId(null);
              setFormData({
                question: '',
                description: '',
                categoryId: '',
                startTime: '',
                endTime: '',
                resolutionTime: '',
                options: [{ label: 'Yes' }, { label: 'No' }]
              });
            }}
          >
            + Create New
          </Button>
        </div>

        {/* Create/Edit Form */}
        {(activeTab === 'create' || activeTab === 'edit') && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Prediction' : 'Create New Prediction'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Question */}
                <div>
                  <Label htmlFor="question">Question *</Label>
                  <Input
                    id="question"
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder="e.g., Will Bitcoin reach $100,000 by end of 2025?"
                    maxLength={200}
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description/Context (Optional)</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Additional context or clarification"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                  />
                </div>

                {/* Category */}
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <select
                    id="category"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Options */}
                <div>
                  <Label>Options * (Binary by default)</Label>
                  <div className="space-y-2 mt-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={option.label}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          required
                        />
                        {formData.options.length > 2 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleRemoveOption(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddOption}
                    className="mt-2"
                  >
                    + Add Option (Multi-option)
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Binary (2 options) is default. Add more only when necessary.
                  </p>
                </div>

                {/* Times */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time (Optional)</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time *</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="resolutionTime">Resolution Time (Optional)</Label>
                    <Input
                      id="resolutionTime"
                      type="datetime-local"
                      value={formData.resolutionTime}
                      onChange={(e) => setFormData({ ...formData, resolutionTime: e.target.value })}
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-2">
                  <Button type="submit">
                    {editingId ? 'Update' : 'Create'} Prediction
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setActiveTab('list');
                      setEditingId(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* List View */}
        {activeTab === 'list' && (
          <>
            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={viewFilter === 'draft' ? 'default' : 'outline'}
                onClick={() => setViewFilter('draft')}
              >
                Draft
              </Button>
              <Button
                variant={viewFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setViewFilter('active')}
              >
                Active
              </Button>
              <Button
                variant={viewFilter === 'closed' ? 'default' : 'outline'}
                onClick={() => setViewFilter('closed')}
              >
                Closed
              </Button>
              <Button
                variant={viewFilter === 'resolved' ? 'default' : 'outline'}
                onClick={() => setViewFilter('resolved')}
              >
                Resolved
              </Button>
            </div>

            {/* Predictions Grid */}
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : predictions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No {viewFilter} predictions
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {predictions.map(prediction => (
                  <Card key={prediction.id}>
                    <CardHeader>
                      <CardTitle className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-xl font-semibold mb-2">{prediction.question}</div>
                          {prediction.description && (
                            <p className="text-sm text-muted-foreground mb-2">{prediction.description}</p>
                          )}
                          <div className="flex gap-2 text-sm">
                            <span className="px-2 py-1 bg-primary/20 text-primary rounded">
                              {prediction.categoryName}
                            </span>
                            <span className="px-2 py-1 bg-muted rounded">
                              {prediction.options.length} options
                            </span>
                            {!prediction.published && (
                              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-700 rounded">
                                Unpublished
                              </span>
                            )}
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Options Display */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                        {prediction.options.map(option => (
                          <div key={option.id} className="p-3 rounded bg-muted">
                            <div className="text-sm text-muted-foreground">Option {option.id}</div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.votes} votes</div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(prediction)}
                        >
                          Edit
                        </Button>
                        
                        {!prediction.published ? (
                          <Button
                            size="sm"
                            onClick={() => handlePublish(prediction.id, true)}
                            className="bg-success hover:bg-success/90"
                          >
                            Publish
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePublish(prediction.id, false)}
                          >
                            Unpublish
                          </Button>
                        )}
                        
                        {viewFilter === 'active' && prediction.published && (
                          <>
                            {prediction.options.map(option => (
                              <Button
                                key={option.id}
                                size="sm"
                                onClick={() => handleResolve(prediction.id, option.id)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Resolve: {option.id} Wins
                              </Button>
                            ))}
                          </>
                        )}
                        
                        {viewFilter === 'resolved' && prediction.winningOption && (
                          <div className="text-success font-semibold">
                            ✓ Winner: Option {prediction.winningOption}
                          </div>
                        )}
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(prediction.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
