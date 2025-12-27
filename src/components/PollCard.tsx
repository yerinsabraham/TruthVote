// src/components/PollCard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useVote } from '@/hooks/useVote';
import { useAuth } from '@/context/AuthContext';
import { useBookmark } from '@/hooks/useBookmark';
import { Comments } from './Comments';
import { ShareButton } from './ShareButton';
import { OptimizedImage } from './OptimizedImage';
import { AuthModal } from './AuthModal';
import Link from 'next/link';
import { PollOption } from '@/types/poll';

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
  };
  onVote?: (pollId: string, option: string) => Promise<boolean>;
}

export function PollCard({ poll, onVote }: PollCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [optimisticVotes, setOptimisticVotes] = useState<Record<string, number>>({});
  const { checkUserVote, loading } = useVote();
  const { user } = useAuth();
  const { toggleBookmark, isBookmarked } = useBookmark();
  
  // Normalize poll data - support both new and legacy formats with optimistic updates
  const pollOptions: PollOption[] = (poll.options || [
    { id: 'A', label: poll.optionA || 'Yes', votes: poll.voteCountA || 0 },
    { id: 'B', label: poll.optionB || 'No', votes: poll.voteCountB || 0 }
  ]).map(opt => ({
    ...opt,
    votes: optimisticVotes[opt.id] !== undefined ? optimisticVotes[opt.id] : opt.votes
  }));
  
  const isBinary = pollOptions.length === 2;
  
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
    originalOptions.forEach(opt => {
      newOptimisticVotes[opt.id] = opt.votes + (opt.id === optionId ? 1 : 0);
    });
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
  const minVoteThreshold = 10; // Hide probability if less than 10 votes
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
        <Link href={`/prediction?id=${poll.id}`}>
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
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md ${getCategoryColor(poll.category)} flex items-center justify-center text-sm font-bold`}>
                  {poll.category.charAt(0)}
                </div>
              )}
            </div>
            
            {/* Center: Question text - takes most space */}
            <div className="flex-1 min-w-0 pr-2">
              <CardTitle className="text-sm sm:text-base font-semibold leading-snug line-clamp-2">
                {poll.question}
              </CardTitle>
            </div>
            
            {/* Right: Probability Indicator - Semicircle gauge */}
            {showProbability && (
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
            {!showProbability && (
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
          {/* BINARY LAYOUT - Horizontal Side-by-Side with Progress Bars */}
          {isBinary && (
            <div className="grid grid-cols-2 gap-2">
              {pollOptions.map((option, index) => {
                const percentage = getPercentage(option.votes);
                const isSelected = selectedOption === option.id;
                const isWinner = winningOptionId === option.id;
                const isYes = option.label.toLowerCase() === 'yes' || index === 0;
                
                return (
                  <Button
                    key={option.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleVote(option.id);
                    }}
                    disabled={loading || (!!selectedOption && selectedOption !== option.id)}
                    className={`relative h-10 sm:h-11 px-3 font-bold text-sm rounded-lg transition-all overflow-hidden border-2 ${
                      isYes 
                        ? 'border-green-600/50 text-green-900' 
                        : 'border-red-600/50 text-red-900'
                    } ${
                      isSelected ? 'ring-2 ring-primary ring-offset-1 opacity-100' : selectedOption ? 'opacity-60' : 'opacity-100'
                    } ${
                      isWinner ? 'ring-2 ring-success ring-offset-1' : ''
                    }`}
                    variant="outline"
                  >
                    {/* Progress bar background */}
                    <div 
                      className={`absolute inset-0 transition-all duration-500 ${
                        isYes ? 'bg-green-600/50' : 'bg-red-600/50'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                    {/* Button text */}
                    <span className="relative z-10">{option.label}</span>
                  </Button>
                );
              })}
            </div>
          )}

          {/* MULTI-OPTION LAYOUT - Vertical List with Progress Bars */}
          {!isBinary && (
            <div className="space-y-2">
              {pollOptions.map((option, index) => {
                const percentage = getPercentage(option.votes);
                const isSelected = selectedOption === option.id;
                const isWinner = winningOptionId === option.id;
                
                return (
                  <Button
                    key={option.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleVote(option.id);
                    }}
                    disabled={loading || (!!selectedOption && selectedOption !== option.id)}
                    className={`relative w-full h-auto py-2.5 px-4 overflow-hidden rounded-lg text-left justify-start transition-all ${
                      isSelected ? 'ring-2 ring-primary ring-offset-1 opacity-100' : selectedOption ? 'opacity-60' : 'opacity-100'
                    } ${
                      isWinner ? 'ring-2 ring-success ring-offset-1' : ''
                    }`}
                    variant={isSelected || isWinner ? 'default' : 'outline'}
                  >
                    {/* Progress bar background */}
                    <div 
                      className="absolute inset-0 bg-primary/10 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                    <span className="relative z-10 font-semibold text-sm">{option.label}</span>
                  </Button>
                );
              })}
            </div>
          )}
          
          {/* Already Voted Indicator */}
          {selectedOption && (
            <div className="flex items-center justify-center gap-2 py-2 px-3 bg-primary/5 border border-primary/20 rounded-lg">
              <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-semibold text-primary">
                You voted for {pollOptions.find(opt => opt.id === selectedOption)?.label}
              </span>
            </div>
          )}
          
          {/* Metadata Row at Bottom */}
          <div className="flex items-center justify-between pt-2 mt-auto border-t border-border/40">
            {/* Left: Votes count and reward icon */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="text-xs text-muted-foreground/70">
                  {totalVotes.toLocaleString()} votes
                </span>
              </div>
              <button
                className="p-1 rounded-md hover:bg-muted/50 transition-colors"
                aria-label="Rewards"
                onClick={(e) => e.preventDefault()}
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
                    d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                  />
                </svg>
              </button>
            </div>
            
            {/* Right: Comments and Bookmark icons */}
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1 p-1 rounded-md hover:bg-muted/50 transition-colors"
                aria-label="View comments"
                onClick={(e) => e.preventDefault()}
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
