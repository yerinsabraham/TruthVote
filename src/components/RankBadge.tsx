'use client';

import React, { useState, useEffect } from 'react';
import { Rank, RankConfig } from '@/types/rank';
import { RANK_CONFIGS, getNextRank } from '@/config/ranks';
import { Loader2, TrendingUp, Award, Clock } from 'lucide-react';

interface RankBadgeProps {
  userId: string;
  currentRank: Rank;
  rankPercentage: number;
  showProgress?: boolean;
  showTooltip?: boolean;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

interface RankStatusData {
  currentRank: Rank;
  rankPercentage: number;
  nextRank: Rank | null;
  daysToNextRank: number | null;
  isEligibleForUpgrade: boolean;
}

/**
 * RankBadge Component
 * Displays user's current rank with progress bar and upgrade information
 * 
 * Features:
 * - Rank icon and name with color coding
 * - Progress bar showing % toward next rank
 * - Tooltip with detailed progression info
 * - Celebration animation on rank upgrade
 * - Responsive sizing (small/medium/large)
 */
export const RankBadge: React.FC<RankBadgeProps> = ({
  userId,
  currentRank,
  rankPercentage,
  showProgress = true,
  showTooltip = true,
  size = 'medium',
  animated = true,
}) => {
  const [rankStatus, setRankStatus] = useState<RankStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [previousRank, setPreviousRank] = useState<Rank>(currentRank);

  const config: RankConfig = RANK_CONFIGS[currentRank];
  const nextRank = getNextRank(currentRank);

  // Size configurations
  const sizeConfig = {
    small: {
      iconSize: 'w-6 h-6',
      textSize: 'text-xs',
      badgeSize: 'px-2 py-1',
      progressHeight: 'h-1',
    },
    medium: {
      iconSize: 'w-8 h-8',
      textSize: 'text-sm',
      badgeSize: 'px-3 py-1.5',
      progressHeight: 'h-2',
    },
    large: {
      iconSize: 'w-12 h-12',
      textSize: 'text-base',
      badgeSize: 'px-4 py-2',
      progressHeight: 'h-3',
    },
  };

  const currentSize = sizeConfig[size];

  // Detect rank upgrades and trigger celebration
  useEffect(() => {
    if (animated && currentRank !== previousRank) {
      const rankOrder: Rank[] = [Rank.NOVICE, Rank.AMATEUR, Rank.ANALYST, Rank.PROFESSIONAL, Rank.EXPERT, Rank.MASTER];
      const prevIndex = rankOrder.indexOf(previousRank);
      const currIndex = rankOrder.indexOf(currentRank);
      
      if (currIndex > prevIndex) {
        // User was promoted!
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
      
      setPreviousRank(currentRank);
    }
  }, [currentRank, previousRank, animated]);

  // Fetch detailed rank status
  useEffect(() => {
    const fetchRankStatus = async () => {
      try {
        setIsLoading(true);
        
        // TODO: Replace with actual API call to rankService.getUserRankStatus()
        // For now, calculate locally
        const status: RankStatusData = {
          currentRank,
          rankPercentage,
          nextRank,
          daysToNextRank: null, // Would need averageDailyProgress to estimate
          isEligibleForUpgrade: rankPercentage >= 100 && nextRank !== null,
        };

        setRankStatus(status);
      } catch (error) {
        console.error('Error fetching rank status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchRankStatus();
    }
  }, [userId, currentRank, rankPercentage, nextRank]);

  // Progress bar color based on percentage
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  // Tooltip content
  const TooltipContent = () => {
    if (!rankStatus) return null;

    return (
      <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{config.displayName}</span>
            <span className="text-gray-300">{rankPercentage.toFixed(1)}%</span>
          </div>

          {rankStatus.nextRank && (
            <>
              <div className="border-t border-gray-700 pt-2">
                <div className="flex items-center gap-1 text-gray-300 mb-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Next: {RANK_CONFIGS[rankStatus.nextRank].displayName}</span>
                </div>
                {rankStatus.daysToNextRank !== null && (
                  <div className="flex items-center gap-1 text-gray-300">
                    <Clock className="w-3 h-3" />
                    <span>~{rankStatus.daysToNextRank} days</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-2 space-y-1">
                <div className="text-gray-400 text-[10px]">
                  Progression factors:
                </div>
                <ul className="text-gray-300 text-[10px] space-y-0.5">
                  <li>• Accuracy: {config.criteria.accuracyWeight * 100}%</li>
                  <li>• Consistency: {config.criteria.consistencyWeight * 100}%</li>
                  <li>• Volume: {config.criteria.volumeWeight * 100}%</li>
                  <li>• Time: {config.criteria.timeWeight * 100}%</li>
                </ul>
              </div>
            </>
          )}

          {rankStatus.isEligibleForUpgrade && (
            <div className="border-t border-green-700 pt-2 text-green-400 font-semibold">
              🎉 Ready for promotion!
            </div>
          )}
        </div>

        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
      </div>
    );
  };

  // Celebration animation (confetti effect)
  const CelebrationAnimation = () => {
    if (!showCelebration) return null;

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="celebrate">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][
                  Math.floor(Math.random() * 5)
                ],
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl px-6 py-4 animate-bounce">
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-yellow-500" />
              <span className="font-bold text-lg">Rank Up!</span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Now a {config.displayName}!
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${currentSize.badgeSize}`}>
        <Loader2 className={`${currentSize.iconSize} animate-spin text-gray-400`} />
        <span className={`${currentSize.textSize} text-gray-400`}>Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative group inline-block">
      <div
        className={`flex items-center gap-2 rounded-full ${currentSize.badgeSize} transition-all duration-200 hover:scale-105`}
        style={{
          background: `linear-gradient(135deg, ${config.displayColor}20, ${config.displayColor}40)`,
          border: `2px solid ${config.displayColor}`,
        }}
      >
        {/* Rank Icon */}
        <div className={`${currentSize.iconSize} flex items-center justify-center`}>
          <span className={`${currentSize.textSize} font-bold`} style={{ color: config.displayColor }}>
            {config.badgeIcon}
          </span>
        </div>

        {/* Rank Name */}
        <span
          className={`font-semibold ${currentSize.textSize}`}
          style={{ color: config.displayColor }}
        >
          {config.displayName}
        </span>
      </div>

      {/* Progress Bar */}
      {showProgress && nextRank && (
        <div className={`mt-2 bg-gray-200 rounded-full ${currentSize.progressHeight} overflow-hidden`}>
          <div
            className={`${currentSize.progressHeight} ${getProgressColor(rankPercentage)} transition-all duration-500 ease-out rounded-full`}
            style={{ width: `${Math.min(rankPercentage, 100)}%` }}
          />
        </div>
      )}

      {/* Percentage Label */}
      {showProgress && (
        <div className="mt-1 text-center">
          <span className="text-xs text-gray-600 font-medium">
            {rankPercentage.toFixed(1)}%
            {nextRank && ` to ${RANK_CONFIGS[nextRank].displayName}`}
          </span>
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && <TooltipContent />}

      {/* Celebration Animation */}
      <CelebrationAnimation />

      {/* CSS for confetti animation */}
      <style jsx>{`
        .celebrate {
          position: absolute;
          inset: 0;
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          animation: confetti-fall 2s ease-in-out forwards;
          opacity: 0;
        }

        @keyframes confetti-fall {
          0% {
            top: -10%;
            opacity: 1;
            transform: rotate(0deg);
          }
          100% {
            top: 110%;
            opacity: 0;
            transform: rotate(720deg);
          }
        }
      `}</style>
    </div>
  );
};

export default RankBadge;
