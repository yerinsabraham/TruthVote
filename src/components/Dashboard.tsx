'use client';

import { PollCard } from '@/components/PollCard';
import { useState, useMemo, useEffect } from 'react';
import { usePredictions } from '@/hooks/usePredictions';
import { useCategories } from '@/hooks/useCategories';
import { useVote } from '@/hooks/useVote';
import { PollCardSkeleton } from '@/components/LoadingSkeleton';
import { FilterDropdown, FilterOptions } from '@/components/FilterDropdown';

interface DashboardProps {
  searchQuery?: string;
}

export function Dashboard({ searchQuery = '' }: DashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState('Trending');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: 'trending',
    status: 'all',
    frequency: 'all',
  });
  const [userVotedIds, setUserVotedIds] = useState<Set<string>>(new Set());
  
  const { predictions, loading: predictionsLoading } = usePredictions();
  const { categories, loading: categoriesLoading } = useCategories();
  const { submitVote, checkUserVote, loading: voteLoading, getUserVotes } = useVote();
  
  // Trending subcategories
  const trendingSubcategories = ['AI', 'Crypto', 'Elections', 'World Cup', 'Climate', 'Markets'];
  
  const categoryNames = ['Trending', 'My Votes', ...categories.map(cat => cat.name)];
  
  // Get subcategories for selected category
  const selectedCategoryData = categories.find(cat => cat.name === selectedCategory);
  const subcategories = selectedCategory === 'Trending' ? trendingSubcategories : (selectedCategoryData?.subcategories || []);
  
  // Load user's voted predictions
  useEffect(() => {
    const loadUserVotes = async () => {
      if (getUserVotes) {
        try {
          const userVotes = await getUserVotes();
          const votedIds = new Set<string>();
          userVotes.forEach(vote => votedIds.add(vote.predictionId));
          setUserVotedIds(votedIds);
        } catch (error) {
          console.error('Error loading user votes:', error);
        }
      }
    };
    loadUserVotes();
  }, [getUserVotes, selectedCategory]); // Reload when category changes (for My Votes)
  
  // Filter and sort predictions
  const filteredPolls = useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let filtered = predictions.filter(poll => {
      // My Votes category - show only voted predictions
      if (selectedCategory === 'My Votes') {
        return userVotedIds.has(poll.id);
      }
      
      // For other categories, HIDE voted predictions from main feed
      if (userVotedIds.has(poll.id)) {
        return false;
      }
      
      // Category filter (Trending shows all)
      const categoryMatch = selectedCategory === 'Trending' || poll.category === selectedCategory;
      
      // Subcategory filter
      const subcategoryMatch = !selectedSubcategory || poll.subcategory === selectedSubcategory;
      
      // Search filter
      const searchMatch = !searchQuery || 
        poll.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        poll.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        poll.category?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter - handle both old and new field names
      const endDate = (poll.endTime || poll.endDate)?.toDate();
      const isActive = endDate ? endDate > now : true;
      let statusMatch = true;
      if (filters.status === 'active') statusMatch = isActive;
      if (filters.status === 'ended') statusMatch = !isActive;
      
      // Frequency filter
      let frequencyMatch = true;
      if (filters.frequency === 'daily') frequencyMatch = poll.createdAt.toDate() > oneDayAgo;
      if (filters.frequency === 'weekly') frequencyMatch = poll.createdAt.toDate() > oneWeekAgo;
      if (filters.frequency === 'monthly') frequencyMatch = poll.createdAt.toDate() > oneMonthAgo;
      
      return categoryMatch && subcategoryMatch && searchMatch && statusMatch && frequencyMatch;
    });

    // Sort based on selected filter
    filtered.sort((a, b) => {
      if (filters.sortBy === 'trending') {
        // Sort by total votes (engagement) - handle both old and new formats
        const votesA = a.totalVotes ?? ((a.voteCountA ?? 0) + (a.voteCountB ?? 0));
        const votesB = b.totalVotes ?? ((b.voteCountA ?? 0) + (b.voteCountB ?? 0));
        return votesB - votesA;
      } else if (filters.sortBy === 'newest') {
        // Sort by creation date (newest first)
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      } else if (filters.sortBy === 'ending-soon') {
        // Sort by end date (ending soonest first) - handle both old and new field names
        const endA = (a.endTime || a.endDate)?.toMillis() ?? 0;
        const endB = (b.endTime || b.endDate)?.toMillis() ?? 0;
        return endA - endB;
      } else if (filters.sortBy === '24h-volume') {
        // Sort by votes in last 24 hours (approximation using total votes for now)
        const votesA = a.totalVotes ?? ((a.voteCountA ?? 0) + (a.voteCountB ?? 0));
        const votesB = b.totalVotes ?? ((b.voteCountA ?? 0) + (b.voteCountB ?? 0));
        return votesB - votesA;
      }
      return 0;
    });

    return filtered;
  }, [predictions, selectedCategory, selectedSubcategory, searchQuery, filters, userVotedIds]);
  
  const handleVote = async (pollId: string, option: string): Promise<boolean> => {
    const poll = predictions.find(p => p.id === pollId);
    if (!poll) return false;
    
    const success = await submitVote(pollId, option, poll.question, poll.category || 'General');
    
    // Reload user votes to update the feed
    if (success && getUserVotes) {
      try {
        const userVotes = await getUserVotes();
        const votedIds = new Set<string>();
        userVotes.forEach(vote => votedIds.add(vote.predictionId));
        setUserVotedIds(votedIds);
      } catch (error) {
        console.error('Error reloading user votes:', error);
      }
    }
    
    return success;
  };
  
  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categoriesLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-24 bg-primary/10 animate-pulse rounded-lg"></div>
            ))}
          </>
        ) : (
          categoryNames.map(category => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setSelectedSubcategory(null);
              }}
              className={`px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-primary text-white rounded-lg shadow-md'
                  : 'bg-transparent text-foreground hover:text-primary'
              }`}
            >
              {category}
            </button>
          ))
        )}
      </div>
      
      {/* Subcategory Filter */}
      {subcategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedSubcategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              !selectedSubcategory
                ? 'bg-primary/10 text-primary border border-primary'
                : 'bg-card text-muted-foreground hover:bg-primary/10 border border-border'
            }`}
          >
            {selectedCategory === 'Trending' ? 'All Trending' : `All ${selectedCategory}`}
          </button>
          {subcategories.map(subcategory => (
            <button
              key={subcategory}
              onClick={() => setSelectedSubcategory(subcategory)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedSubcategory === subcategory
                  ? 'bg-primary/10 text-primary border border-primary'
                  : 'bg-card text-muted-foreground hover:bg-primary/10 border border-border'
              }`}
            >
              {subcategory}
            </button>
          ))}
        </div>
      )}
      
      {/* Filter Controls */}
      <div className="flex items-center justify-end">
        <FilterDropdown filters={filters} onFilterChange={setFilters} />
      </div>
      
      {/* Content */}
      <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {predictionsLoading ? (
            <>
              <PollCardSkeleton />
              <PollCardSkeleton />
              <PollCardSkeleton />
              <PollCardSkeleton />
              <PollCardSkeleton />
              <PollCardSkeleton />
            </>
          ) : filteredPolls.length > 0 ? (
            filteredPolls.map(poll => (
              <PollCard 
                key={poll.id} 
                poll={{
                  ...poll,
                  endDate: (poll.endTime || poll.endDate)?.toDate(),
                }} 
                onVote={handleVote}
                isCompact={true}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No predictions found. Be the first to <a href="/create" className="text-primary hover:underline">create one</a>!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
