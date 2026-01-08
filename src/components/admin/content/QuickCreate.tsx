// src/components/admin/content/QuickCreate.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { 
  X, 
  Plus, 
  Trash2, 
  Upload, 
  Calendar,
  Tag,
  Image as ImageIcon,
  Link as LinkIcon,
  RefreshCw
} from 'lucide-react';
import { AlertBanner } from '../shared';

interface TrendingTopic {
  id: string;
  headline: string;
  summary?: string;
  source: string;
  sourceUrl: string;
  sourceIcon: string;
  category: string;
  keywords: string[];
  imageUrl?: string;
}

interface Category {
  id: string;
  name: string;
  subcategories?: string[];
}

interface QuickCreateProps {
  topic?: TrendingTopic | null;
  onClose: () => void;
  onSuccess: () => void;
}

const DISPLAY_TEMPLATES = [
  { value: 'two-option-horizontal', label: 'Two Options (Yes/No)' },
  { value: 'three-option-horizontal', label: 'Three Options' },
  { value: 'multi-option-horizontal', label: 'Multiple Options' },
  { value: 'multi-yes-no', label: 'Multi Yes/No' },
];

export default function QuickCreate({ topic, onClose, onSuccess }: QuickCreateProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    question: '',
    description: '',
    categoryId: '',
    subcategory: '',
    startTime: '',
    endTime: '',
    imageUrl: '',
    sourceLink: topic?.sourceUrl || '',
    options: [{ label: 'Yes' }, { label: 'No' }],
    displayTemplate: 'two-option-horizontal',
  });

  useEffect(() => {
    loadCategories();
    
    // Pre-fill from topic if provided
    if (topic) {
      setFormData(prev => ({
        ...prev,
        question: generateQuestionFromHeadline(topic.headline),
        description: topic.summary || '',
        sourceLink: topic.sourceUrl || '',
        imageUrl: topic.imageUrl || '',
        categoryId: '', // Will be matched below
      }));
      
      // Set image preview if topic has image
      if (topic.imageUrl) {
        setImagePreview(topic.imageUrl);
      }

      // Set end time to 7 days from now by default
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      setFormData(prev => ({
        ...prev,
        endTime: formatDateForInput(endDate),
      }));
    }
  }, [topic]);

  // Match category from topic
  useEffect(() => {
    if (topic && categories.length > 0) {
      const matchedCategory = categories.find(
        c => c.name.toLowerCase() === topic.category.toLowerCase()
      );
      if (matchedCategory) {
        setFormData(prev => ({
          ...prev,
          categoryId: matchedCategory.id,
        }));
      }
    }
  }, [topic, categories]);

  const loadCategories = async () => {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'categories'), orderBy('order', 'asc'))
      );
      const cats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Category[];
      setCategories(cats.filter(c => (c as unknown as { isActive?: boolean }).isActive !== false));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const generateQuestionFromHeadline = (headline: string): string => {
    // Simple transformation - you can enhance this
    const cleaned = headline.replace(/['"]/g, '');
    
    // Check if it's about a match/game
    if (cleaned.toLowerCase().includes(' vs ') || cleaned.toLowerCase().includes(' versus ')) {
      const teams = cleaned.split(/\s+vs\s+|\s+versus\s+/i);
      if (teams.length === 2) {
        return `Who will win: ${teams[0].trim()} or ${teams[1].trim().split(':')[0].trim()}?`;
      }
    }
    
    // Default: turn into a question
    if (cleaned.endsWith('?')) return cleaned;
    return `Will this happen: ${cleaned}?`;
  };

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().slice(0, 16);
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
      setFormData(prev => ({ ...prev, imageUrl: '' })); // Clear URL if file is selected
    }
  };

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) return formData.imageUrl;
    
    try {
      setUploadingImage(true);
      const timestamp = Date.now();
      const storageRef = ref(storage, `predictions/${timestamp}_${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return '';
    } finally {
      setUploadingImage(false);
    }
  };

  const addOption = () => {
    if (formData.options.length < 6) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, { label: '' }],
      }));
    }
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index),
      }));
    }
  };

  const updateOption = (index: number, label: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? { label } : opt),
    }));
  };

  const handleSubmit = async (asDraft: boolean = false) => {
    // Validation
    if (!formData.question.trim()) {
      toast.error('Please enter a question');
      return;
    }
    if (!formData.categoryId) {
      toast.error('Please select a category');
      return;
    }
    if (!formData.endTime) {
      toast.error('Please set an end time');
      return;
    }
    if (formData.options.some(opt => !opt.label.trim())) {
      toast.error('Please fill in all options');
      return;
    }

    try {
      setLoading(true);

      // Upload image if selected
      const imageUrl = await uploadImage();

      // Prepare options with IDs
      const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
      const options = formData.options.map((opt, i) => ({
        id: optionLabels[i],
        label: opt.label,
        votes: 0,
        votesYes: 0,
        votesNo: 0,
      }));

      // Get category name
      const category = categories.find(c => c.id === formData.categoryId);

      // Create prediction document
      const now = new Date();
      const startTime = formData.startTime ? new Date(formData.startTime) : now;
      const endTime = new Date(formData.endTime);

      let status: 'draft' | 'scheduled' | 'active' = 'active';
      if (asDraft) {
        status = 'draft';
      } else if (startTime > now) {
        status = 'scheduled';
      }

      const predictionData = {
        question: formData.question.trim(),
        description: formData.description.trim(),
        options,
        categoryId: formData.categoryId,
        category: category?.name || 'General',
        subcategory: formData.subcategory,
        imageUrl: imageUrl || '',
        sourceLink: formData.sourceLink,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status,
        published: !asDraft,
        totalVotes: 0,
        resolved: false,
        winningOption: null,
        displayTemplate: formData.displayTemplate,
        createdFromTopic: topic?.id || null,
        originalHeadline: topic?.headline || null,
      };

      await addDoc(collection(db, 'predictions'), predictionData);

      // Mark topic as used if applicable
      if (topic?.id) {
        try {
          const markTopicAsUsed = httpsCallable(functions, 'markTopicAsUsed');
          await markTopicAsUsed({ topicId: topic.id });
        } catch (error) {
          console.error('Error marking topic as used:', error);
        }
      }

      toast.success(asDraft ? 'Prediction saved as draft' : 'Prediction created successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating prediction:', error);
      toast.error('Failed to create prediction');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === formData.categoryId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="admin-content-header">
        <div>
          <h1 className="admin-content-title">
            {topic ? 'Create from Topic' : 'Create Prediction'}
          </h1>
          {topic && (
            <p className="admin-content-subtitle">
              Based on: {topic.source}
            </p>
          )}
        </div>
        <button onClick={onClose} className="admin-btn admin-btn-ghost">
          <X size={16} />
          Cancel
        </button>
      </div>

      {/* Topic Reference */}
      {topic && (
        <AlertBanner
          type="info"
          title="Creating from trending topic"
          message={topic.headline}
          action={topic.sourceUrl ? {
            label: 'View Source',
            onClick: () => window.open(topic.sourceUrl, '_blank')
          } : undefined}
        />
      )}

      {/* Form */}
      <div className="admin-card">
        <div className="admin-card-body space-y-4">
          {/* Question */}
          <div>
            <label className="admin-label">Question *</label>
            <textarea
              id="question"
              name="question"
              value={formData.question}
              onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Enter the prediction question..."
              className="admin-input h-20 resize-none py-2"
              style={{ height: 'auto', minHeight: '60px' }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="admin-label">Description (Optional)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add context or additional details..."
              className="admin-input h-16 resize-none py-2"
              style={{ height: 'auto', minHeight: '50px' }}
            />
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">
                <Tag size={12} className="inline mr-1" />
                Category *
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  categoryId: e.target.value,
                  subcategory: '' 
                }))}
                className="admin-select w-full"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {selectedCategory?.subcategories && selectedCategory.subcategories.length > 0 && (
              <div>
                <label className="admin-label">Subcategory</label>
                <select
                  id="subcategory"
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                  className="admin-select w-full"
                >
                  <option value="">Select subcategory</option>
                  {selectedCategory.subcategories.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Options */}
          <div>
            <label className="admin-label">Options *</label>
            <div className="space-y-2">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[var(--admin-bg-tertiary)] flex items-center justify-center text-[var(--admin-text-xs)] font-medium">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <input
                    id={`option-${index}`}
                    name={`option-${index}`}
                    type="text"
                    value={option.label}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    className="admin-input flex-1"
                  />
                  {formData.options.length > 2 && (
                    <button
                      onClick={() => removeOption(index)}
                      className="admin-btn admin-btn-icon admin-btn-sm admin-btn-ghost text-[var(--admin-error)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {formData.options.length < 6 && (
                <button
                  onClick={addOption}
                  className="admin-btn admin-btn-sm admin-btn-secondary w-full"
                >
                  <Plus size={14} />
                  Add Option
                </button>
              )}
            </div>
          </div>

          {/* Display Template */}
          <div>
            <label className="admin-label">Display Template</label>
            <select
              id="displayTemplate"
              name="displayTemplate"
              value={formData.displayTemplate}
              onChange={(e) => setFormData(prev => ({ ...prev, displayTemplate: e.target.value }))}
              className="admin-select w-full"
            >
              {DISPLAY_TEMPLATES.map((template) => (
                <option key={template.value} value={template.value}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">
                <Calendar size={12} className="inline mr-1" />
                Start Time (Optional)
              </label>
              <input
                id="startTime"
                name="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                className="admin-input w-full"
              />
              <p className="text-[var(--admin-text-xs)] text-[var(--admin-text-tertiary)] mt-1">
                Leave empty to start immediately
              </p>
            </div>

            <div>
              <label className="admin-label">
                <Calendar size={12} className="inline mr-1" />
                End Time *
              </label>
              <input
                id="endTime"
                name="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                className="admin-input w-full"
              />
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="admin-label">
              <ImageIcon size={12} className="inline mr-1" />
              Cover Image
            </label>
            <div className="flex items-start gap-3">
              {(imagePreview || formData.imageUrl) ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-[var(--admin-bg-tertiary)]">
                  <img 
                    src={imagePreview || formData.imageUrl} 
                    alt="Cover" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview('');
                      setFormData(prev => ({ ...prev, imageUrl: '' }));
                    }}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-lg border-2 border-dashed border-[var(--admin-border)] flex flex-col items-center justify-center gap-1 hover:border-[var(--admin-primary)] hover:bg-[var(--admin-primary-light)] transition-colors"
                >
                  <Upload size={20} className="text-[var(--admin-text-tertiary)]" />
                  <span className="text-[var(--admin-text-xs)] text-[var(--admin-text-tertiary)]">Upload</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <div className="flex-1">
                <input
                  id="imageUrl"
                  name="imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, imageUrl: e.target.value }));
                    if (e.target.value) setImagePreview(e.target.value);
                  }}
                  placeholder="Or paste image URL..."
                  className="admin-input w-full"
                />
                {topic && !formData.imageUrl && !imagePreview && (
                  <p className="text-[var(--admin-text-xs)] text-[var(--admin-text-tertiary)] mt-1">
                    💡 Click Refresh in Trending Topics to fetch news with images
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Source Link */}
          <div>
            <label className="admin-label">
              <LinkIcon size={12} className="inline mr-1" />
              Source Link
            </label>
            <input
              id="sourceLink"
              name="sourceLink"
              type="url"
              value={formData.sourceLink}
              onChange={(e) => setFormData(prev => ({ ...prev, sourceLink: e.target.value }))}
              placeholder="https://..."
              className="admin-input w-full"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="admin-card-footer flex justify-between">
          <button
            onClick={() => handleSubmit(true)}
            disabled={loading || uploadingImage}
            className="admin-btn admin-btn-secondary"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={loading || uploadingImage}
            className="admin-btn admin-btn-primary"
          >
            {loading ? 'Creating...' : 'Publish Prediction'}
          </button>
        </div>
      </div>
    </div>
  );
}
