'use client';

import { useState, useEffect, useRef } from 'react';
import { usePredictions } from '@/hooks/usePredictions';
import { useCategories } from '@/hooks/useCategories';
import Link from 'next/link';
import { 
  Landmark, 
  Trophy, 
  Tv, 
  Cpu, 
  DollarSign, 
  FlaskConical, 
  Globe,
  Briefcase,
  Heart,
  GraduationCap,
  Gamepad2,
  Mountain
} from 'lucide-react';

// Helper function to create URL-friendly slug
function createSlug(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 60);
}

// Map category names to icons
const categoryIcons: Record<string, any> = {
  'Politics': Landmark,
  'Sports': Trophy,
  'Entertainment': Tv,
  'Technology': Cpu,
  'Finance': DollarSign,
  'Science': FlaskConical,
  'World': Globe,
  'Business': Briefcase,
  'Health': Heart,
  'Education': GraduationCap,
  'Gaming': Gamepad2,
  'Environment': Mountain,
};

interface SearchDropdownProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function SearchDropdown({ searchQuery, onSearchChange, isOpen, onClose }: SearchDropdownProps) {
  const { predictions } = usePredictions();
  const { categories } = useCategories();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const trendingTopics = ['AI', 'Crypto', 'Elections 2025', 'Climate Change', 'World Cup', 'Bitcoin'];
  
  // Filter predictions based on search
  const filteredPredictions = searchQuery
    ? predictions.filter(p => 
        p.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  // Filter categories based on search
  const filteredCategories = searchQuery
    ? categories.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 3)
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl z-50 max-h-[500px] md:max-h-[500px] overflow-y-auto"
      style={{ maxHeight: 'min(70vh, 500px)' }}
    >
      {!searchQuery ? (
        // Show trending when no search query
        <div className="p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Trending Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map(topic => (
              <button
                key={topic}
                onClick={() => {
                  onSearchChange(topic);
                }}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-sm text-foreground transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
          
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-3">
            Popular Searches
          </h3>
          <div className="space-y-2">
            {['Bitcoin price prediction', 'US Elections', 'Climate summit'].map(search => (
              <button
                key={search}
                onClick={() => {
                  onSearchChange(search);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-foreground transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {search}
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Show search results
        <div className="p-2">
          {filteredPredictions.length === 0 && filteredCategories.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>No results found for &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            <>
              {/* Categories Section */}
              {filteredCategories.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                    Categories
                  </h3>
                  <div className="space-y-1">
                    {filteredCategories.map(category => {
                      const IconComponent = categoryIcons[category.name] || Landmark;
                      return (
                        <button
                          key={category.id}
                          onClick={() => {
                            onSearchChange('');
                            onClose();
                            // Scroll to top and filter by category
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm transition-colors flex items-center gap-3"
                        >
                          <IconComponent className="w-5 h-5 text-foreground flex-shrink-0" strokeWidth={2} />
                          <div>
                            <div className="font-medium text-foreground">{category.name}</div>
                            <div className="text-xs text-muted-foreground">{category.predictionCount} predictions</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Predictions Section */}
              {filteredPredictions.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                    Predictions
                  </h3>
                  <div className="space-y-1">
                    {filteredPredictions.map(prediction => (
                      <Link
                        key={prediction.id}
                        href={`/prediction?id=${prediction.id}&q=${createSlug(prediction.question)}`}
                        onClick={() => {
                          onClose();
                        }}
                        className="block w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-sm transition-colors"
                      >
                        <div className="font-medium text-foreground line-clamp-1 mb-1">
                          {prediction.question}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">
                            {prediction.category}
                          </span>
                          <span>{prediction.voteCountA + prediction.voteCountB} votes</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
