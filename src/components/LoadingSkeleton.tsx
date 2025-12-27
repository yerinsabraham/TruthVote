// src/components/LoadingSkeleton.tsx
export function PollCardSkeleton() {
  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-sm animate-pulse flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-200 rounded-full w-24"></div>
        <div className="h-5 bg-gray-200 rounded-full w-16"></div>
      </div>

      {/* Question */}
      <div className="space-y-2 mb-6">
        <div className="h-5 bg-gray-300 rounded w-full"></div>
        <div className="h-5 bg-gray-300 rounded w-4/5"></div>
      </div>

      {/* Creator info */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>

      {/* Vote buttons */}
      <div className="space-y-3 mt-auto">
        <div className="h-14 bg-gray-100 rounded-lg"></div>
        <div className="h-14 bg-gray-100 rounded-lg"></div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="bg-card rounded-lg p-6 border border-border animate-pulse">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-20 h-20 bg-muted rounded-full"></div>
        <div className="flex-1">
          <div className="h-8 bg-muted rounded w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded w-32"></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i}>
            <div className="h-4 bg-muted rounded w-20 mb-2"></div>
            <div className="h-8 bg-muted rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border animate-pulse">
          <div className="w-8 h-8 bg-muted rounded"></div>
          <div className="w-12 h-12 bg-muted rounded-full"></div>
          <div className="flex-1">
            <div className="h-5 bg-muted rounded w-32 mb-2"></div>
            <div className="h-4 bg-muted rounded w-48"></div>
          </div>
          <div className="h-8 bg-muted rounded w-16"></div>
        </div>
      ))}
    </div>
  );
}
