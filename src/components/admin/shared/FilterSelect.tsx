// src/components/admin/shared/FilterSelect.tsx
'use client';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  label?: string;
  className?: string;
}

export default function FilterSelect({ 
  value, 
  onChange, 
  options,
  label,
  className = ''
}: FilterSelectProps) {
  return (
    <div className={className}>
      {label && <label className="admin-label">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="admin-select"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
