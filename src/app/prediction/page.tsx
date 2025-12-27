'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useVote } from '@/hooks/useVote';
import { formatDistanceToNow } from 'date-fns';
import { OptimizedImage } from '@/components/OptimizedImage';
import { ShareButton } from '@/components/ShareButton';
import { Comments } from '@/components/Comments';
import { toast } from 'sonner';

function PredictionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');
  
  interface Prediction {
    id: string;
    question: string;
    description?: string;
    optionA: string;
    optionB: string;
    votesA: number;
    votesB: number;
    category: string;
    imageUrl?: string;
    endDate: { toDate: () => Date };
    createdAt?: { toDate: () => Date };
  }
  
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | null>(null);
  
  interface Activity {
    id: string;
    userDisplayName?: string;
    option: string;
    timestamp?: { toDate: () => Date };
  }
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const { user } = useAuth();
  const { submitVote, checkUserVote } = useVote();

  useEffect(() => {
    if (!id) {
      router.push('/');
      return;
    }

    const fetchPrediction = async () => {
      try {
        const predictionDoc = await getDoc(doc(db, 'predictions', id));
        if (predictionDoc.exists()) {
          setPrediction({ id: predictionDoc.id, ...predictionDoc.data() } as Prediction);
        } else {
          toast.error('Prediction not found');
          router.push('/');
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching prediction:', error);
        toast.error('Failed to load prediction');
        setLoading(false);
      }
    };

    fetchPrediction();
  }, [id, router]);

  useEffect(() => {
    if (!user || !id) return;

    const checkVote = async () => {
      const vote = await checkUserVote(id);
      if (vote) {
        setSelectedOption(vote);
      }
    };

    checkVote();
  }, [user, id, checkUserVote]);

  useEffect(() => {
    if (!id) return;

    const votesQuery = query(
      collection(db, 'votes'),
      where('pollId', '==', id),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(votesQuery, (snapshot) => {
      const recentActivities = snapshot.docs
        .slice(0, 10)
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Activity[];
      setActivities(recentActivities);
    });

    return () => unsubscribe();
  }, [id]);

  const handleVote = async (option: 'A' | 'B') => {
    if (!user) {
      toast.error('Please sign in to vote');
      return;
    }

    if (!id || !prediction) return;

    try {
      await submitVote(id, option, prediction.question, prediction.category);
      setSelectedOption(option);
      toast.success('Vote submitted!');
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to submit vote');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-96 bg-gray-200 rounded-xl mb-6"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </main>
        <MobileBottomNav />
        <Footer />
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Prediction not found</h1>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </div>
        </main>
        <MobileBottomNav />
        <Footer />
      </div>
    );
  }

  const totalVotes = (prediction.votesA || 0) + (prediction.votesB || 0);
  const percentA = totalVotes > 0 ? ((prediction.votesA || 0) / totalVotes) * 100 : 50;
  const percentB = totalVotes > 0 ? ((prediction.votesB || 0) / totalVotes) * 100 : 50;

  const endDate = prediction.endDate.toDate();
  const isExpired = endDate < new Date();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Prediction Image */}
            {prediction.imageUrl && (
              <div className="relative w-full h-96 rounded-xl overflow-hidden bg-gray-100">
                <OptimizedImage
                  src={prediction.imageUrl}
                  alt={prediction.question}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Prediction Header */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                  {prediction.category}
                </span>
                <span className="text-sm text-muted-foreground">
                  Ends {formatDistanceToNow(endDate, { addSuffix: true })}
                </span>
              </div>

              <h1 className="text-3xl font-bold mb-4">{prediction.question}</h1>
              
              {prediction.description && (
                <p className="text-muted-foreground mb-6">{prediction.description}</p>
              )}

              {/* Vote Options */}
              <div className="space-y-4">
                <div>
                  <Button
                    onClick={() => handleVote('A')}
                    disabled={isExpired || selectedOption !== null}
                    className={`w-full h-auto py-4 text-left justify-between ${
                      selectedOption === 'A' 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'bg-card hover:bg-accent border-2 border-border'
                    }`}
                  >
                    <span className={`text-lg font-semibold ${selectedOption === 'A' ? 'text-white' : ''}`}>
                      {prediction.optionA}
                    </span>
                    <span className={`text-xl font-bold ${selectedOption === 'A' ? 'text-white' : 'text-primary'}`}>
                      {Math.round(percentA)}%
                    </span>
                  </Button>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${percentA}%` }}
                    />
                  </div>
                </div>

                <div>
                  <Button
                    onClick={() => handleVote('B')}
                    disabled={isExpired || selectedOption !== null}
                    className={`w-full h-auto py-4 text-left justify-between ${
                      selectedOption === 'B' 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'bg-card hover:bg-accent border-2 border-border'
                    }`}
                  >
                    <span className={`text-lg font-semibold ${selectedOption === 'B' ? 'text-white' : ''}`}>
                      {prediction.optionB}
                    </span>
                    <span className={`text-xl font-bold ${selectedOption === 'B' ? 'text-white' : 'text-primary'}`}>
                      {Math.round(percentB)}%
                    </span>
                  </Button>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${percentB}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Share Button */}
              <div className="mt-6 flex justify-end">
                <ShareButton 
                  predictionId={prediction.id}
                  question={prediction.question}
                />
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Comments</h2>
              <Comments predictionId={prediction.id} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm sticky top-4">
              <h2 className="text-lg font-bold mb-4">Prediction Stats</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Votes</div>
                  <div className="text-2xl font-bold">{totalVotes.toLocaleString()}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Created</div>
                  <div className="text-sm">
                    {prediction.createdAt?.toDate 
                      ? formatDistanceToNow(prediction.createdAt.toDate(), { addSuffix: true })
                      : 'Unknown'}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Status</div>
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    isExpired 
                      ? 'bg-gray-100 text-gray-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {isExpired ? 'Closed' : 'Active'}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
              
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold">
                          {activity.userDisplayName?.[0] || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {activity.userDisplayName || 'Anonymous'}
                        </div>
                        <div className="text-muted-foreground">
                          Voted {activity.option === 'A' ? prediction.optionA : prediction.optionB}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {activity.timestamp?.toDate 
                            ? formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true })
                            : 'Just now'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav />
      <Footer />
    </div>
  );
}

export default function PredictionDetail() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-96 bg-gray-200 rounded-xl mb-6"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </main>
        <MobileBottomNav />
        <Footer />
      </div>
    }>
      <PredictionContent />
    </Suspense>
  );
}
