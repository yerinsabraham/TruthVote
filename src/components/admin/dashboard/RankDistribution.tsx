// src/components/admin/dashboard/RankDistribution.tsx
'use client';

// Rank colors mapping
const RANK_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  novice: { bg: 'bg-red-50', text: 'text-red-600', bar: '#EF4444' },
  amateur: { bg: 'bg-blue-50', text: 'text-blue-600', bar: '#3B82F6' },
  analyst: { bg: 'bg-purple-50', text: 'text-purple-600', bar: '#A855F7' },
  professional: { bg: 'bg-amber-50', text: 'text-amber-600', bar: '#F59E0B' },
  expert: { bg: 'bg-pink-50', text: 'text-pink-600', bar: '#EC4899' },
  master: { bg: 'bg-green-50', text: 'text-green-600', bar: '#22C55E' },
};

interface RankDistributionProps {
  distribution: Record<string, number>;
}

export default function RankDistribution({ distribution }: RankDistributionProps) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  
  // Sort ranks in order
  const rankOrder = ['novice', 'amateur', 'analyst', 'professional', 'expert', 'master'];
  const sortedRanks = rankOrder.filter(rank => distribution[rank] !== undefined);

  if (total === 0) {
    return (
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Rank Distribution</h3>
        </div>
        <div className="admin-card-body">
          <p className="text-[var(--admin-text-sm)] text-[var(--admin-text-secondary)] text-center py-4">
            No ranked users yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h3 className="admin-card-title">Rank Distribution</h3>
        <span className="text-[var(--admin-text-xs)] text-[var(--admin-text-tertiary)]">
          {total} users
        </span>
      </div>
      <div className="admin-card-body">
        <div className="space-y-3">
          {sortedRanks.map((rank) => {
            const count = distribution[rank] || 0;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
            const colors = RANK_COLORS[rank.toLowerCase()] || RANK_COLORS.novice;
            
            return (
              <div key={rank}>
                <div className="flex justify-between text-[var(--admin-text-xs)] mb-1">
                  <span className={`font-medium capitalize ${colors.text}`}>{rank}</span>
                  <span className="text-[var(--admin-text-tertiary)]">
                    {count} ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-[var(--admin-bg-tertiary)] rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ 
                      width: `${percentage}%`, 
                      backgroundColor: colors.bar 
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
