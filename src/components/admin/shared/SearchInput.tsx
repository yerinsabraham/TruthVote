// src/components/admin/shared/SearchInput.tsx
'use client';

import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export default function SearchInput({ 
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  debounceMs = 300
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, value, onChange, debounceMs]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="admin-input pl-3 pr-8"
      />
      {localValue && (
        <button
          onClick={() => {
            setLocalValue('');
            onChange('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--admin-bg-tertiary)] rounded"
        >
          <X size={12} className="text-[var(--admin-text-tertiary)]" />
        </button>
      )}
    </div>
  );
}
