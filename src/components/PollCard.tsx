// src/components/PollCard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useVote } from '@/hooks/useVote';
import { useAuth } from '@/context/AuthContext';
import { useBookmark } from '@/hooks/useBookmark';
import { ShareButton } from './ShareButton';
import { OptimizedImage } from './OptimizedImage';
import { AuthModal } from './AuthModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PollOption } from '@/types/poll';

// Helper function to create URL-friendly slug
function createSlug(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 60);
}

interface PollCardProps {
  poll: {
    id: string;
    question: string;
    // New format
    options?: PollOption[];
    // Legacy format
    optionA?: string;
    optionB?: string;
    voteCountA?: number;
    voteCountB?: number;
    category: string;
    endDate: Date;
    status: 'active' | 'pending' | 'resolved' | 'cancelled' | 'draft' | 'closed';
    resolved?: boolean;
    published?: boolean;
    resolvedOption?: string; // Now can be 'A', 'B', 'C', etc.
    winningOption?: string;
    imageUrl?: string;
    commentCount?: number;
    displayTemplate?: 'two-option-horizontal' | 'three-option-horizontal' | 'multi-yes-no' | 'multi-option-horizontal';
  };
  onVote?: (pollId: string, option: string) => Promise<boolean>;
  isCompact?: boolean; // When true, shows only top 2 options for multi-yes-no template
}

export function PollCard({ poll, onVote, isCompact = false }: PollCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [optimisticVotes, setOptimisticVotes] = useState<Record<string, number>>({});
  const { checkUserVote, loading } = useVote();
  const { user } = useAuth();
  const { toggleBookmark, isBookmarked } = useBookmark();
  const router = useRouter();
  
  // Normalize poll data - support both new and legacy formats with optimistic updates
  const pollOptions: PollOption[] = (poll.options || [
    { id: 'A', label: poll.optionA || 'Yes', votes: poll.voteCountA || 0 },
    { id: 'B', label: poll.optionB || 'No', votes: poll.voteCountB || 0 }
  ]).map(opt => ({
    ...opt,
    votes: optimisticVotes[opt.id] !== undefined ? optimisticVotes[opt.id] : opt.votes,
    votesYes: optimisticVotes[`${opt.id}-votesYes`] !== undefined ? optimisticVotes[`${opt.id}-votesYes`] : opt.votesYes,
    votesNo: optimisticVotes[`${opt.id}-votesNo`] !== undefined ? optimisticVotes[`${opt.id}-votesNo`] : opt.votesNo
  }));
  
  const isBinary = pollOptions.length === 2;
  const displayTemplate = poll.displayTemplate || (isBinary ? 'two-option-horizontal' : 'multi-yes-no');
  
  useEffect(() => {
    const loadUserVote = async () => {
      const userVote = await checkUserVote(poll.id);
      if (userVote) {
        setSelectedOption(userVote);
      }
    };
    
    if (user) {
      loadUserVote();
    }
  }, [poll.id, user, checkUserVote]);

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleBookmark(poll.id);
  };
  
  const totalVotes = pollOptions.reduce((sum, opt) => sum + opt.votes, 0);
  const getPercentage = (votes: number) => totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
  
  const isExpired = poll.endDate < new Date();
  const isPublished = poll.published !== false; // Default true if undefined
  const canVote = poll.status === 'active' && !isExpired && user && !selectedOption && isPublished;
  const winningOptionId = poll.winningOption || poll.resolvedOption;
  
  const handleVote = async (optionId: string) => {
    if (!user) {
      setAuthMode('signup');
      setShowAuthModal(true);
      return;
    }
    
    if (!canVote || loading) return;
    
    // Get current vote counts
    const originalOptions = poll.options || [
      { id: 'A', label: poll.optionA || 'Yes', votes: poll.voteCountA || 0 },
      { id: 'B', label: poll.optionB || 'No', votes: poll.voteCountB || 0 }
    ];
    
    // Optimistic updates - update UI immediately
    setSelectedOption(optionId);
    const newOptimisticVotes: Record<string, number> = {};
    
    // Handle multi-yes-no format
    if (optionId.includes('-yes') || optionId.includes('-no')) {
      const actualOption = optionId.replace('-yes', '').replace('-no', '');
      const voteType = optionId.includes('-yes') ? 'yes' : 'no';
      
      originalOptions.forEach(opt => {
        if (opt.id === actualOption) {
          // Update the appropriate vote count
          if (voteType === 'yes') {
            newOptimisticVotes[`${opt.id}-votesYes`] = (opt.votesYes || 0) + 1;
            newOptimisticVotes[`${opt.id}-votesNo`] = opt.votesNo || 0;
          } else {
            newOptimisticVotes[`${opt.id}-votesYes`] = opt.votesYes || 0;
            newOptimisticVotes[`${opt.id}-votesNo`] = (opt.votesNo || 0) + 1;
          }
        } else {
          newOptimisticVotes[`${opt.id}-votesYes`] = opt.votesYes || 0;
          newOptimisticVotes[`${opt.id}-votesNo`] = opt.votesNo || 0;
        }
      });
    } else {
      // Regular voting
      originalOptions.forEach(opt => {
        newOptimisticVotes[opt.id] = opt.votes + (opt.id === optionId ? 1 : 0);
      });
    }
    
    setOptimisticVotes(newOptimisticVotes);
    
    // Perform database operations in the background
    const success = await onVote?.(poll.id, optionId);
    
    // If vote failed, revert the optimistic updates
    if (!success) {
      setSelectedOption(null);
      setOptimisticVotes({});
    }
  };
  
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Politics': 'bg-blue-500/20 text-blue-400',
      'Sports': 'bg-green-500/20 text-green-400',
      'Entertainment': 'bg-purple-500/20 text-purple-400',
      'Technology': 'bg-orange-500/20 text-orange-400',
      'Finance': 'bg-yellow-500/20 text-yellow-400',
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400';
  };
  
  const getOptionGradient = (index: number) => {
    const gradients = [
      'gradient-green',
      'gradient-red',
      'gradient-blue',
      'gradient-purple',
      'gradient-orange',
      'gradient-yellow',
      'gradient-pink',
      'gradient-indigo',
      'gradient-teal',
      'gradient-cyan'
    ];
    return gradients[index % gradients.length];
  };

  // Don't show unpublished predictions to non-admins
  if (!isPublished) {
    return null;
  }
  
  // Calculate highest probability for color coding
  const highestPercentage = Math.max(...pollOptions.map(opt => getPercentage(opt.votes)));
  const minVoteThreshold = 1; // Show probability as soon as there's at least 1 vote
  const showProbability = totalVotes >= minVoteThreshold;
  
  const getProbabilityColor = (percentage: number) => {
    if (percentage < 33) return 'text-red-400/80';
    if (percentage < 67) return 'text-yellow-500/80';
    return 'text-green-500/80';
  };
  
  const getProbabilityStroke = (percentage: number) => {
    if (percentage < 33) return 'stroke-red-400/60';
    if (percentage < 67) return 'stroke-yellow-500/60';
    return 'stroke-green-500/60';
  };

  return (
    <>
      <Card id={`prediction-${poll.id}`} className="card-elevated border border-border/50 overflow-hidden group hover:border-primary/50 hover:shadow-lg transition-all duration-200 h-full flex flex-col">
        
        {/* Header Row - Single Horizontal Row - Clickable to prediction page */}
        <Link href={`/prediction?id=${poll.id}&q=${createSlug(poll.question)}`}>
          <CardHeader className="pb-2 px-4 sm:px-6 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
            {/* Left: Small square thumbnail (36-40px) */}
            <div className="flex-shrink-0">
              {poll.imageUrl ? (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md overflow-hidden bg-muted">
                  <OptimizedImage
                    src={poll.imageUrl}
                    alt={poll.question}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                    priority={false}
                  />
                </div>
              ) : (
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md ${getCategoryColor(poll.category || 'General')} flex items-center justify-center text-sm font-bold`}>
                  {(poll.category || 'General').charAt(0)}
                </div>
              )}
            </div>
            
            {/* Center: Question text - takes most space */}
            <div className="flex-1 min-w-0 pr-2">
              <CardTitle className="text-sm sm:text-base font-semibold leading-snug line-clamp-2">
                {poll.question}
              </CardTitle>
            </div>
            
            {/* Right: Probability Indicator - Semicircle gauge (hidden for multi-yes-no template) */}
            {displayTemplate !== 'multi-yes-no' && showProbability && (
              <div className="flex-shrink-0 flex flex-col items-center gap-1">
                {/* Semicircle gauge */}
                <div className="relative w-14 h-7">
                  <svg viewBox="0 0 100 50" className="w-full h-full">
                    {/* Background arc */}
                    <path
                      d="M 10 45 A 40 40 0 0 1 90 45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted/20"
                    />
                    {/* Progress arc */}
                    <path
                      d="M 10 45 A 40 40 0 0 1 90 45"
                      fill="none"
                      strokeWidth="8"
                      strokeDasharray={`${highestPercentage * 1.26} 126`}
                      strokeLinecap="round"
                      className={`transition-all duration-500 ${
                        highestPercentage < 33 ? 'stroke-red-500' :
                        highestPercentage < 67 ? 'stroke-yellow-500' :
                        'stroke-green-500'
                      }`}
                      style={{
                        strokeDashoffset: 0,
                        transform: 'rotate(0deg)',
                        transformOrigin: 'center'
                      }}
                    />
                  </svg>
                  {/* Percentage in center */}
                  <div className="absolute inset-0 flex items-end justify-center pb-0.5">
                    <span className="text-[10px] font-bold text-foreground/70">{highestPercentage.toFixed(0)}%</span>
                  </div>
                </div>
                <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wide">chance</span>
              </div>
            )}
            {displayTemplate !== 'multi-yes-no' && !showProbability && (
              <div className="flex-shrink-0 flex flex-col items-center gap-1">
                {/* Semicircle gauge placeholder */}
                <div className="relative w-14 h-7">
                  <svg viewBox="0 0 100 50" className="w-full h-full">
                    <path
                      d="M 10 45 A 40 40 0 0 1 90 45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted/20"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-end justify-center pb-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground/40">—%</span>
                  </div>
                </div>
                <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wide">chance</span>
              </div>
            )}
          </div>
        </CardHeader>
      </Link>
        
        <CardContent className="space-y-3 px-4 sm:px-6 pt-3 flex-1 flex flex-col">
          {/* TEMPLATE 1: TWO-OPTION HORIZONTAL - Polymarket/Kalshi Style */}
          {displayTemplate === 'two-option-horizontal' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 sm:gap-3 poll-buttons-horizontal">
              {pollOptions.map((option, index) => {
                const percentage = getPercentage(option.votes);
                const isSelected = selectedOption === option.id;
                const isWinner = winningOptionId === option.id;
                const isYes = option.label.toLowerCase() === 'yes' || index === 0;
                
                return (
                  <div key={option.id} className="flex flex-col items-center gap-1">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleVote(option.id);
                      }}
                      disabled={loading || (!!selectedOption && selectedOption !== option.id)}
                      className={`relative h-12 sm:h-14 w-full px-4 font-bold text-sm sm:text-base rounded-xl transition-all border-2 ${
                        isYes 
                          ? 'bg-green-500/10 border-green-500/40 text-green-700 hover:bg-green-500/20 hover:border-green-500/60' 
                          : 'bg-red-500/10 border-red-500/40 text-red-700 hover:bg-red-500/20 hover:border-red-500/60'
                      } ${
                        isSelected 
                          ? isYes 
                            ? 'bg-green-500 border-green-600 text-white ring-2 ring-green-400 ring-offset-2 shadow-md' 
                            : 'bg-red-500 border-red-600 text-white ring-2 ring-red-400 ring-offset-2 shadow-md'
                          : selectedOption ? 'opacity-50' : 'opacity-100 hover:scale-[1.02]'
                      } ${
                        isWinner ? 'ring-2 ring-yellow-400 ring-offset-2 animate-pulse' : ''
                      }`}
                      variant="outline"
                    >
                      <span className="font-bold">{option.label}</span>
                    </Button>
                    {/* Percentage below button - large and prominent */}
                    {totalVotes > 0 && (
                      <span className="text-lg sm:text-xl font-medium text-foreground">
                        {percentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          )}

          {/* TEMPLATE 2: THREE-OPTION HORIZONTAL - Polymarket/Kalshi Style */}
          {displayTemplate === 'three-option-horizontal' && (
            <div className="space-y-2">
              <div className="flex gap-2 sm:gap-3 poll-buttons-horizontal">
              {pollOptions.map((option, index) => {
                const percentage = getPercentage(option.votes);
                const isSelected = selectedOption === option.id;
                const isWinner = winningOptionId === option.id;
                const isTieOption = index === 1 || option.label.toLowerCase().includes('tie') || option.label.toLowerCase().includes('draw');
                
                // Color scheme for three options - faint background, bold text
                const getColorScheme = () => {
                  if (index === 0) return { 
                    bg: 'bg-green-500/10', 
                    border: 'border-green-500/40', 
                    text: 'text-green-700',
                    hoverBg: 'hover:bg-green-500/20',
                    hoverBorder: 'hover:border-green-500/60',
                    selectedBg: 'bg-green-500',
                    selectedBorder: 'border-green-600',
                    selectedRing: 'ring-green-400'
                  };
                  if (isTieOption) return { 
                    bg: 'bg-blue-500/10', 
                    border: 'border-blue-500/40', 
                    text: 'text-blue-700',
                    hoverBg: 'hover:bg-blue-500/20',
                    hoverBorder: 'hover:border-blue-500/60',
                    selectedBg: 'bg-blue-500',
                    selectedBorder: 'border-blue-600',
                    selectedRing: 'ring-blue-400'
                  };
                  return { 
                    bg: 'bg-red-500/10', 
                    border: 'border-red-500/40', 
                    text: 'text-red-700',
                    hoverBg: 'hover:bg-red-500/20',
                    hoverBorder: 'hover:border-red-500/60',
                    selectedBg: 'bg-red-500',
                    selectedBorder: 'border-red-600',
                    selectedRing: 'ring-red-400'
                  };
                };
                
                const colors = getColorScheme();
                
                return (
                  <div 
                    key={option.id} 
                    className={`flex flex-col items-center gap-1 ${
                      isTieOption ? 'w-20 sm:w-24 flex-shrink-0' : 'flex-1'
                    }`}
                  >
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleVote(option.id);
                      }}
                      disabled={loading || (!!selectedOption && selectedOption !== option.id)}
                      className={`relative h-12 sm:h-14 w-full px-2 sm:px-4 font-bold text-xs sm:text-sm rounded-xl transition-all border-2 ${
                        colors.bg
                      } ${
                        colors.border
                      } ${
                        colors.text
                      } ${
                        colors.hoverBg
                      } ${
                        colors.hoverBorder
                      } ${
                        isSelected 
                          ? `${colors.selectedBg} ${colors.selectedBorder} text-white ring-2 ${colors.selectedRing} ring-offset-2 shadow-md` 
                          : selectedOption ? 'opacity-50' : 'opacity-100 hover:scale-[1.02]'
                      } ${
                        isWinner ? 'ring-2 ring-yellow-400 ring-offset-2 animate-pulse' : ''
                      }`}
                      variant="outline"
                    >
                      <span className="font-bold leading-tight">{option.label}</span>
                    </Button>
                    {/* Percentage below button - large and prominent */}
                    {totalVotes > 0 && (
                      <span className="text-base sm:text-lg font-medium text-foreground">
                        {percentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          )}

          {/* TEMPLATE 4: MULTI-OPTION HORIZONTAL - Polymarket/Kalshi Style Grid */}
          {displayTemplate === 'multi-option-horizontal' && (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 poll-buttons-horizontal">
              {pollOptions.map((option, index) => {
                const percentage = getPercentage(option.votes);
                const isSelected = selectedOption === option.id;
                const isWinner = winningOptionId === option.id;
                
                // Color scheme for multiple options - faint background, bold text
                const getColorScheme = () => {
                  const colors = [
                    { bg: 'bg-green-500/10', border: 'border-green-500/40', text: 'text-green-700', hoverBg: 'hover:bg-green-500/20', hoverBorder: 'hover:border-green-500/60', selectedBg: 'bg-green-500', selectedBorder: 'border-green-600', selectedRing: 'ring-green-400' },
                    { bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-700', hoverBg: 'hover:bg-amber-500/20', hoverBorder: 'hover:border-amber-500/60', selectedBg: 'bg-amber-500', selectedBorder: 'border-amber-600', selectedRing: 'ring-amber-400' },
                    { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-700', hoverBg: 'hover:bg-red-500/20', hoverBorder: 'hover:border-red-500/60', selectedBg: 'bg-red-500', selectedBorder: 'border-red-600', selectedRing: 'ring-red-400' },
                    { bg: 'bg-purple-500/10', border: 'border-purple-500/40', text: 'text-purple-700', hoverBg: 'hover:bg-purple-500/20', hoverBorder: 'hover:border-purple-500/60', selectedBg: 'bg-purple-500', selectedBorder: 'border-purple-600', selectedRing: 'ring-purple-400' },
                    { bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-700', hoverBg: 'hover:bg-blue-500/20', hoverBorder: 'hover:border-blue-500/60', selectedBg: 'bg-blue-500', selectedBorder: 'border-blue-600', selectedRing: 'ring-blue-400' },
                    { bg: 'bg-teal-500/10', border: 'border-teal-500/40', text: 'text-teal-700', hoverBg: 'hover:bg-teal-500/20', hoverBorder: 'hover:border-teal-500/60', selectedBg: 'bg-teal-500', selectedBorder: 'border-teal-600', selectedRing: 'ring-teal-400' },
                    { bg: 'bg-pink-500/10', border: 'border-pink-500/40', text: 'text-pink-700', hoverBg: 'hover:bg-pink-500/20', hoverBorder: 'hover:border-pink-500/60', selectedBg: 'bg-pink-500', selectedBorder: 'border-pink-600', selectedRing: 'ring-pink-400' },
                    { bg: 'bg-indigo-500/10', border: 'border-indigo-500/40', text: 'text-indigo-700', hoverBg: 'hover:bg-indigo-500/20', hoverBorder: 'hover:border-indigo-500/60', selectedBg: 'bg-indigo-500', selectedBorder: 'border-indigo-600', selectedRing: 'ring-indigo-400' },
                  ];
                  return colors[index % colors.length];
                };
                
                const colors = getColorScheme();
                
                return (
                  <div key={option.id} className="flex flex-col items-center gap-1">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleVote(option.id);
                      }}
                      disabled={loading || (!!selectedOption && selectedOption !== option.id)}
                      className={`relative h-12 sm:h-14 w-full px-4 font-bold text-sm sm:text-base rounded-xl transition-all border-2 ${
                        colors.bg
                      } ${
                        colors.border
                      } ${
                        colors.text
                      } ${
                        colors.hoverBg
                      } ${
                        colors.hoverBorder
                      } ${
                        isSelected 
                          ? `${colors.selectedBg} ${colors.selectedBorder} text-white ring-2 ${colors.selectedRing} ring-offset-2 shadow-md` 
                          : selectedOption ? 'opacity-50' : 'opacity-100 hover:scale-[1.02]'
                      } ${
                        isWinner ? 'ring-2 ring-yellow-400 ring-offset-2 animate-pulse' : ''
                      }`}
                      variant="outline"
                    >
                      <span className="font-bold">{option.label}</span>
                    </Button>
                    {/* Percentage below button - large and prominent */}
                    {totalVotes > 0 && (
                      <span className="text-lg sm:text-xl font-medium text-foreground">
                        {percentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TEMPLATE 3: MULTI YES/NO - Vertical List with Dual Buttons */}
          {displayTemplate === 'multi-yes-no' && (() => {
            // Sort options by total yes votes (descending) and limit to top 2 if compact mode
            const sortedOptions = [...pollOptions].sort((a, b) => (b.votesYes || 0) - (a.votesYes || 0));
            const displayOptions = isCompact && pollOptions.length > 2 
              ? sortedOptions.slice(0, 2) 
              : sortedOptions;
            const hiddenCount = isCompact ? pollOptions.length - 2 : 0;
            
            return (
              <div className="space-y-1.5">
                {displayOptions.map((option, index) => {
                const yesVotes = option.votesYes || 0;
                const noVotes = option.votesNo || 0;
                const optionTotal = yesVotes + noVotes;
                const yesPercentage = optionTotal > 0 ? (yesVotes / optionTotal) * 100 : 0;
                const isSelectedYes = selectedOption === `${option.id}-yes`;
                const isSelectedNo = selectedOption === `${option.id}-no`;
                const isWinner = winningOptionId === option.id;
                
                return (
                  <div 
                    key={option.id}
                    className={`relative rounded-lg p-1.5 sm:p-2 border transition-all hover:shadow-sm ${
                      isWinner ? 'border-yellow-400 bg-yellow-50/50 shadow-sm' : 'border-border/30 bg-muted/10 hover:border-border/50'
                    }`}
                  >
                    
                    <div className="relative flex items-center justify-between gap-2">
                      {/* Left: Candidate name and percentage */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-semibold truncate flex items-center gap-1.5">
                          {option.label}
                          {isWinner && (
                            <span className="inline-flex items-center text-[10px] bg-yellow-400/20 text-yellow-600 px-1.5 py-0.5 rounded-full">
                              🏆
                            </span>
                          )}
                        </div>
                        {optionTotal > 0 && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="flex-1 h-1 bg-muted/50 rounded-full overflow-hidden">
                              <div 
                                className="h-full transition-all duration-700 bg-primary"
                                style={{ width: `${yesPercentage}%` }}
                              />
                            </div>
                            <span className="text-[10px] sm:text-xs font-bold tabular-nums text-primary">
                              {yesPercentage.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Right: Yes/No buttons */}
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleVote(`${option.id}-yes`);
                          }}
                          disabled={loading || (!!selectedOption && selectedOption !== `${option.id}-yes`)}
                          className={`h-6 sm:h-7 px-2 sm:px-3 text-[10px] sm:text-xs font-bold rounded-md border transition-all ${
                            isSelectedYes 
                              ? 'bg-green-500 border-green-600 text-white shadow-sm' 
                              : 'bg-green-500/10 border-green-500/40 text-green-700 hover:bg-green-500/20 hover:border-green-500/60'
                          } ${
                            selectedOption && !isSelectedYes ? 'opacity-40' : ''
                          }`}
                          variant="outline"
                        >
                          Yes
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleVote(`${option.id}-no`);
                          }}
                          disabled={loading || (!!selectedOption && selectedOption !== `${option.id}-no`)}
                          className={`h-6 sm:h-7 px-2 sm:px-3 text-[10px] sm:text-xs font-bold rounded-md border transition-all ${
                            isSelectedNo 
                              ? 'bg-pink-500 border-pink-600 text-white shadow-sm' 
                              : 'bg-pink-500/10 border-pink-500/40 text-pink-700 hover:bg-pink-500/20 hover:border-pink-500/60'
                          } ${
                            selectedOption && !isSelectedNo ? 'opacity-40' : ''
                          }`}
                          variant="outline"
                        >
                          No
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Show "View all options" link when truncated */}
              {isCompact && hiddenCount > 0 && (
                <div className="text-center pt-1">
                  <Link 
                    href={`/prediction?id=${poll.id}`}
                    className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium text-primary/70 bg-primary/5 px-2 py-1 rounded-md border border-primary/20 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>+{hiddenCount} more</span>
                    <span className="text-muted-foreground hidden sm:inline">· Click to view all</span>
                  </Link>
                </div>
              )}
            </div>
            );
          })()}
          
          {/* Already Voted Indicator */}
          {selectedOption && (
            <div className="flex items-center justify-center gap-2 py-2 px-3 bg-primary/5 border border-primary/20 rounded-lg">
              <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold text-primary">
                {displayTemplate === 'multi-yes-no' 
                  ? `You voted ${selectedOption.includes('-yes') ? 'Yes' : 'No'}` 
                  : `You voted for ${pollOptions.find(opt => opt.id === selectedOption)?.label || selectedOption}`
                }
              </span>
            </div>
          )}
          
          {/* Metadata Row at Bottom */}
          <div className="flex items-center justify-between pt-2 mt-auto border-t border-border/40">
            {/* Left: Votes count and Comments */}
            <div className="flex items-center gap-3">
              {/* Votes */}
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="text-xs text-muted-foreground/70">
                  {totalVotes.toLocaleString()} {totalVotes === 1 ? 'vote' : 'votes'}
                </span>
              </div>
              
              {/* Comments */}
              <button
                className="flex items-center gap-1 p-1 rounded-md hover:bg-muted/50 transition-colors"
                aria-label="View comments"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const slug = createSlug(poll.question);
                  router.push(`/prediction?id=${poll.id}&q=${slug}#comments-section`);
                }}
              >
                <svg
                  className="w-4 h-4 text-muted-foreground/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                {poll.commentCount && poll.commentCount > 0 && (
                  <span className="text-xs text-muted-foreground/70">{poll.commentCount}</span>
                )}
              </button>
            </div>
            
            {/* Right: Action icons - Share, Bookmark */}
            <div className="flex items-center gap-2">
              {/* Share */}
              <ShareButton 
                pollId={poll.id} 
                pollQuestion={poll.question}
                variant="icon"
              />
              
              {/* Bookmark */}
              <button
                onClick={handleBookmarkClick}
                className="p-1 rounded-md hover:bg-muted/50 transition-colors"
                aria-label={isBookmarked(poll.id) ? 'Remove bookmark' : 'Add bookmark'}
              >
                <svg
                  className={`w-4 h-4 ${isBookmarked(poll.id) ? 'fill-primary text-primary' : 'fill-none text-muted-foreground/60'}`}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        mode={authMode}
        onModeToggle={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
      />
    </>
  );
}
