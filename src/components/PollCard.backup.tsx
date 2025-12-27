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
import Link from 'next/link';

interface PollCardProps {
  poll: {
    id: string;
    question: string;
    optionA: string;
    optionB: string;
    voteCountA: number;
    voteCountB: number;
    category: string;
    endDate: Date;
    status: 'active' | 'pending' | 'resolved' | 'cancelled';
    resolvedOption?: 'A' | 'B' | 'cancelled';
    imageUrl?: string;
  };
  onVote?: (pollId: string, option: 'A' | 'B') => Promise<boolean>;
}

export function PollCard({ poll, onVote }: PollCardProps) {
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | null>(null);
  const { checkUserVote, loading } = useVote();
  const { user } = useAuth();
  const { toggleBookmark, isBookmarked } = useBookmark();
  
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
  
  const totalVotes = poll.voteCountA + poll.voteCountB;
  const percentA = totalVotes > 0 ? (poll.voteCountA / totalVotes) * 100 : 50;
  const percentB = totalVotes > 0 ? (poll.voteCountB / totalVotes) * 100 : 50;
  
  const isExpired = poll.endDate < new Date();
  const canVote = poll.status === 'active' && !isExpired && user && !selectedOption;
  
  const handleVote = async (option: 'A' | 'B') => {
    if (!canVote || loading) return;
    if (!user) {
      alert('Please sign in to vote');
      return;
    }
    
    const success = await onVote?.(poll.id, option);
    if (success) {
      setSelectedOption(option);
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
  
  return (
    <Link href={`/prediction?id=${poll.id}`}>
      <Card id={`prediction-${poll.id}`} className="card-elevated border border-border/50 overflow-hidden group hover:border-primary/50 transition-all duration-300 cursor-pointer">
      {/* Image Section - Display at top if available */}
      {poll.imageUrl && (
        <div className="relative w-full h-48 sm:h-56 overflow-hidden bg-muted">
          <OptimizedImage
            src={poll.imageUrl}
            alt={poll.question}
            fill
            className="object-cover"
            priority={false}
          />
        </div>
      )}
      
      <CardHeader className="pb-3 px-4 sm:px-6">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(poll.category)}`}>
            {poll.category}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBookmarkClick}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={isBookmarked(poll.id) ? 'Remove bookmark' : 'Add bookmark'}
            >
              <svg
                className={`w-5 h-5 ${isBookmarked(poll.id) ? 'fill-primary text-primary' : 'fill-none text-muted-foreground'}`}
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
            <span className="text-xs text-muted-foreground">
              {isExpired ? 'Ended' : `Ends ${formatDistanceToNow(poll.endDate, { addSuffix: true })}`}
            </span>
          </div>
        </div>
        <CardTitle className="text-lg font-bold leading-tight">
          {poll.question}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Option A */}
        <div className="space-y-2">
          <Button
            onClick={() => handleVote('A')}
            disabled={!canVote || selectedOption !== null}
            className={`w-full h-auto py-4 px-4 relative overflow-hidden group/button ${
              selectedOption === 'A' ? 'ring-2 ring-success' : ''
            } ${
              poll.resolvedOption === 'A' ? 'ring-2 ring-success' : ''
            }`}
            variant={selectedOption === 'A' || poll.resolvedOption === 'A' ? 'default' : 'outline'}
          >
            <div className="absolute inset-0 gradient-green opacity-0 group-hover/button:opacity-10 transition-opacity" />
            <div className="relative z-10 flex items-center justify-between w-full">
              <span className="font-semibold text-left text-sm sm:text-base break-words">{poll.optionA}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs sm:text-sm opacity-80">{percentA.toFixed(1)}%</span>
                <span className="text-xs px-2 py-1 rounded bg-black/20">{poll.voteCountA}</span>
              </div>
            </div>
          </Button>
          
          {/* Progress bar A */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full gradient-green transition-all duration-500"
              style={{ width: `${percentA}%` }}
            />
          </div>
        </div>
        
        {/* Option B */}
        <div className="space-y-2">
          <Button
            onClick={() => handleVote('B')}
            disabled={!canVote || selectedOption !== null}
            className={`w-full h-auto py-4 px-4 relative overflow-hidden group/button ${
              selectedOption === 'B' ? 'ring-2 ring-danger' : ''
            } ${
              poll.resolvedOption === 'B' ? 'ring-2 ring-danger' : ''
            }`}
            variant={selectedOption === 'B' || poll.resolvedOption === 'B' ? 'default' : 'outline'}
          >
            <div className="absolute inset-0 gradient-red opacity-0 group-hover/button:opacity-10 transition-opacity" />
            <div className="relative z-10 flex items-center justify-between w-full">
              <span className="font-semibold text-left">{poll.optionB}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm opacity-80">{percentB.toFixed(1)}%</span>
                <span className="text-xs px-2 py-1 rounded bg-black/20">{poll.voteCountB}</span>
              </div>
            </div>
          </Button>
          
          {/* Progress bar B */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full gradient-red transition-all duration-500"
              style={{ width: `${percentB}%` }}
            />
          </div>
        </div>
        
        {/* Status badges */}
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span>{totalVotes.toLocaleString()} total votes</span>
          {poll.status === 'resolved' && poll.resolvedOption && (
            <span className="px-2 py-1 rounded bg-primary/20 text-primary font-semibold">
              ✓ Resolved: {poll.resolvedOption === 'A' ? poll.optionA : poll.optionB}
            </span>
          )}
        </div>

        {/* Share Button */}
        <div className="flex justify-end mt-4">
          <ShareButton predictionId={poll.id} question={poll.question} />
        </div>

        {/* Comments Section */}
        <Comments predictionId={poll.id} />
      </CardContent>
    </Card>
    </Link>
  );
}
