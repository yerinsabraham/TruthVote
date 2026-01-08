// src/components/admin/shared/LoadingSkeleton.tsx
'use client';

interface LoadingSkeletonProps {
  type?: 'card' | 'row' | 'text' | 'stat';
  count?: number;
}

export default function LoadingSkeleton({ type = 'card', count = 1 }: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === 'stat') {
    return (
      <div className="admin-stats-grid">
        {items.map((i) => (
          <div key={i} className="admin-stat-card">
            <div className="flex justify-between mb-2">
              <div className="admin-skeleton h-3 w-16" />
              <div className="admin-skeleton h-5 w-5 rounded" />
            </div>
            <div className="admin-skeleton h-7 w-12 mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'row') {
    return (
      <div className="space-y-2">
        {items.map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="admin-skeleton h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="admin-skeleton h-3 w-3/4" />
              <div className="admin-skeleton h-2 w-1/2" />
            </div>
            <div className="admin-skeleton h-6 w-16 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className="space-y-2">
        {items.map((i) => (
          <div key={i} className="admin-skeleton h-3 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((i) => (
        <div key={i} className="admin-card">
          <div className="admin-card-body space-y-3">
            <div className="admin-skeleton h-4 w-3/4" />
            <div className="admin-skeleton h-3 w-1/2" />
            <div className="admin-skeleton h-8 w-full mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
