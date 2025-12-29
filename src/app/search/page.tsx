'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { usePredictions } from '@/hooks/usePredictions';
import { useCategories } from '@/hooks/useCategories';
import { PollCard } from '@/components/PollCard';
import Link from 'next/link';
import { useVote } from '@/hooks/useVote';
import { 
  Landmark, 
  Trophy, 
  Tv, 
  Cpu, 
  DollarSign, 
  FlaskConical, 
  Globe,
  Briefcase,
  Heart,
  GraduationCap,
  Gamepad2,
  Mountain
} from 'lucide-react';

// Map category names to icons
const categoryIcons: Record<string, any> = {
  'Politics': Landmark,
  'Sports': Trophy,
  'Entertainment': Tv,
  'Technology': Cpu,
  'Finance': DollarSign,
  'Science': FlaskConical,
  'World': Globe,
  'Business': Briefcase,
  'Health': Heart,
  'Education': GraduationCap,
  'Gaming': Gamepad2,
  'Environment': Mountain,
};

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'categories' | 'predictions'>('all');
  const { predictions } = usePredictions();
  const { categories } = useCategories();
  const { submitVote, checkUserVote } = useVote();

  const trendingTopics = ['AI', 'Crypto', 'Elections 2025', 'Climate Change', 'World Cup', 'Bitcoin'];
  
  // Filter predictions based on search
  const filteredPredictions = searchQuery
    ? predictions.filter(p => 
        p.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Filter categories based on search
  const filteredCategories = searchQuery
    ? categories.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleVote = async (pollId: string, option: string): Promise<boolean> => {
    const poll = predictions.find(p => p.id === pollId);
    if (!poll) return false;
    return await submitVote(pollId, option, poll.question, poll.category);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search predictions, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
        </div>

        {!searchQuery ? (
          // Show trending when no search query
          <div className="space-y-8 pb-20 md:pb-6">
            {/* Trending Topics */}
            <div>
              <h2 className="text-lg font-bold mb-4">Trending Topics</h2>
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map(topic => (
                  <button
                    key={topic}
                    onClick={() => setSearchQuery(topic)}
                    className="px-4 py-2 bg-primary/25 hover:bg-primary/30 rounded-lg text-sm font-medium text-foreground transition-colors"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Categories */}
            <div>
              <h2 className="text-lg font-bold mb-4">Popular Categories</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categories.slice(0, 8).map(category => {
                  const IconComponent = categoryIcons[category.name] || Landmark;
                  return (
                    <Link
                      key={category.id}
                      href={`/?category=${category.name}`}
                      className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors"
                    >
                      <IconComponent className="w-5 h-5 text-foreground flex-shrink-0" strokeWidth={2} />
                      <div>
                        <p className="font-semibold text-sm">{category.name}</p>
                        <p className="text-xs text-muted-foreground">{category.subcategories?.length || 0} topics</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Recent Predictions */}
            <div>
              <h2 className="text-lg font-bold mb-4">Recent Predictions</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {predictions.slice(0, 6).map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={{
                      id: poll.id,
                      question: poll.question,
                      optionA: poll.optionA,
                      optionB: poll.optionB,
                      voteCountA: poll.voteCountA,
                      voteCountB: poll.voteCountB,
                      category: poll.category,
                      endDate: poll.endDate.toDate(),
                      status: poll.status,
                      resolvedOption: poll.resolvedOption,
                      imageUrl: poll.imageUrl,
                    }}
                    onVote={handleVote}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Show search results
          <div className="space-y-6 pb-20 md:pb-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-border">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({filteredCategories.length + filteredPredictions.length})
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'categories'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Categories ({filteredCategories.length})
              </button>
              <button
                onClick={() => setActiveTab('predictions')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'predictions'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Predictions ({filteredPredictions.length})
              </button>
            </div>

            {/* Results */}
            {(activeTab === 'all' || activeTab === 'categories') && filteredCategories.length > 0 && (
              <div>
                <h3 className="text-md font-semibold mb-3">Categories</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredCategories.map(category => {
                    const IconComponent = categoryIcons[category.name] || Landmark;
                    return (
                      <Link
                        key={category.id}
                        href={`/?category=${category.name}`}
                        className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors"
                      >
                        <IconComponent className="w-5 h-5 text-foreground flex-shrink-0" strokeWidth={2} />
                        <div>
                          <p className="font-semibold text-sm">{category.name}</p>
                          <p className="text-xs text-muted-foreground">{category.subcategories?.length || 0} topics</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'predictions') && filteredPredictions.length > 0 && (
              <div>
                <h3 className="text-md font-semibold mb-3">Predictions</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredPredictions.map((poll) => (
                    <PollCard
                      key={poll.id}
                      poll={{
                        id: poll.id,
                        question: poll.question,
                        optionA: poll.optionA,
                        optionB: poll.optionB,
                        voteCountA: poll.voteCountA,
                        voteCountB: poll.voteCountB,
                        category: poll.category,
                        endDate: poll.endDate.toDate(),
                        status: poll.status,
                        resolvedOption: poll.resolvedOption,
                        imageUrl: poll.imageUrl,
                      }}
                      onVote={handleVote}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredCategories.length === 0 && filteredPredictions.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground">Try searching for something else</p>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
