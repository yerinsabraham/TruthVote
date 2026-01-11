'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';

export interface FilterOptions {
  sortBy: 'trending' | 'newest' | 'ending-soon' | '24h-volume';
  status: 'all' | 'active' | 'ended';
  frequency: 'all' | 'daily' | 'weekly' | 'monthly';
}

interface FilterDropdownProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
  { value: 'ending-soon', label: 'Ending Soon' },
  { value: '24h-volume', label: '24h Volume' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'ended', label: 'Ended' },
];

const FREQUENCY_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function FilterDropdown({ filters, onFilterChange }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'sortBy' | 'status' | 'frequency' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateFilter = <K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K]
  ) => {
    onFilterChange({ ...filters, [key]: value });
    setActiveDropdown(null);
  };

  const getSortByLabel = () => {
    const option = SORT_OPTIONS.find(opt => opt.value === filters.sortBy);
    return option?.label || 'Trending';
  };

  const getStatusLabel = () => {
    const option = STATUS_OPTIONS.find(opt => opt.value === filters.status);
    return option?.label || 'All';
  };

  const getFrequencyLabel = () => {
    const option = FREQUENCY_OPTIONS.find(opt => opt.value === filters.frequency);
    return option?.label || 'All Time';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2 bg-white border-gray-200 text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
      >
        <svg
          className="w-4 h-4 text-gray-900 dark:text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        Filter
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50">
          <div className="p-4 space-y-3">
            {/* Sort By Section */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'sortBy' ? null : 'sortBy')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex flex-col items-start">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Sort By</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{getSortByLabel()}</span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-900 dark:text-white transition-transform ${activeDropdown === 'sortBy' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {activeDropdown === 'sortBy' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateFilter('sortBy', option.value as FilterOptions['sortBy'])}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        filters.sortBy === option.value
                          ? 'bg-primary text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Section */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex flex-col items-start">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Status</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{getStatusLabel()}</span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-900 dark:text-white transition-transform ${activeDropdown === 'status' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {activeDropdown === 'status' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateFilter('status', option.value as FilterOptions['status'])}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        filters.status === option.value
                          ? 'bg-primary text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Frequency Section */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'frequency' ? null : 'frequency')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex flex-col items-start">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Frequency</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{getFrequencyLabel()}</span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-900 dark:text-white transition-transform ${activeDropdown === 'frequency' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {activeDropdown === 'frequency' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10">
                  {FREQUENCY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateFilter('frequency', option.value as FilterOptions['frequency'])}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        filters.frequency === option.value
                          ? 'bg-primary text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                onFilterChange({
                  sortBy: 'trending',
                  status: 'all',
                  frequency: 'all',
                });
                setActiveDropdown(null);
              }}
              className="w-full px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-t border-gray-200 dark:border-gray-600 pt-3 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
