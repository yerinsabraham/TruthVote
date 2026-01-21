'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
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
import { AuthModal } from '@/components/AuthModal';
import { toast } from 'sonner';
import { Users, Clock, Calendar, TrendingUp, MessageCircle, Activity, Download, CheckCircle } from 'lucide-react';

interface PollOption {
  id: string;
  label: string;
  votes: number;
  votesYes?: number;
  votesNo?: number;
}

interface Prediction {
  id: string;
  question: string;
  description?: string;
  category: string;
  imageUrl?: string;
  options?: PollOption[];
  optionA?: string;
  optionB?: string;
  votesA?: number;
  votesB?: number;
  endTime?: { toDate?: () => Date; seconds?: number };
  endDate?: { toDate?: () => Date; seconds?: number };
  createdAt?: { toDate?: () => Date; seconds?: number };
  displayTemplate?: 'two-option-horizontal' | 'three-option-horizontal' | 'multi-yes-no' | 'multi-option-horizontal';
  resolved?: boolean;
  winningOption?: string | null;
  status?: string;
}

interface ActivityItem {
  id: string;
  type: 'vote' | 'comment';
  userId: string;
  userDisplayName?: string;
  userPhotoURL?: string;
  option?: string;
  optionLabel?: string;
  yesNo?: 'yes' | 'no';
  content?: string; // For comments
  timestamp?: { toDate?: () => Date; seconds?: number };
}

function PredictionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');
  
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const shareCardRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { submitVote, checkUserVote, submitMultiYesNoVote } = useVote();

  // Helper to safely get Date from Firestore timestamp
  const getDateFromTimestamp = (timestamp: { toDate?: () => Date; seconds?: number } | undefined): Date | null => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return null;
  };

  // Subscribe to real-time prediction updates
  useEffect(() => {
    if (!id) {
      router.push('/');
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'predictions', id), (docSnap) => {
      if (docSnap.exists()) {
        setPrediction({ id: docSnap.id, ...docSnap.data() } as Prediction);
      } else {
        toast.error('Prediction not found');
        router.push('/');
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching prediction:', error);
      toast.error('Failed to load prediction');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, router]);

  // Update meta tags for social sharing
  useEffect(() => {
    if (!prediction) return;

    const question = prediction.question;
    const imageUrl = prediction.imageUrl || '/assets/tv_logo_icon_transparent.png';
    
    // Get first 2-3 options for description
    let optionsText = '';
    if (prediction.displayTemplate === 'two-option-horizontal' || 
        (prediction.optionA && prediction.optionB)) {
      optionsText = `${prediction.optionA} vs ${prediction.optionB}`;
    } else if (prediction.options && Array.isArray(prediction.options)) {
      const firstOptions = prediction.options.slice(0, 3).map(opt => opt.label).join(', ');
      const hasMore = prediction.options.length > 3;
      optionsText = hasMore ? `${firstOptions}... and more` : firstOptions;
    }
    
    const description = optionsText 
      ? `${optionsText} - Make your prediction on TruthVote` 
      : prediction.description || 'Make your prediction on TruthVote';

    // Update document title
    document.title = `${question} - TruthVote`;

    // Update or create meta tags
    const updateMetaTag = (property: string, content: string) => {
      let metaTag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('property', property);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', content);
    };

    const updateNameTag = (name: string, content: string) => {
      let metaTag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', name);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', content);
    };

    // Open Graph tags
    updateMetaTag('og:title', question);
    updateMetaTag('og:description', description);
    updateMetaTag('og:image', imageUrl);
    updateMetaTag('og:type', 'website');
    updateMetaTag('og:site_name', 'TruthVote');
    updateMetaTag('og:url', window.location.href);

    // Twitter tags
    updateNameTag('twitter:card', 'summary_large_image');
    updateNameTag('twitter:title', question);
    updateNameTag('twitter:description', description);
    updateNameTag('twitter:image', imageUrl);

    // Standard meta description
    updateNameTag('description', description);
  }, [prediction]);

  // Subscribe to recent activity (votes and comments)
  useEffect(() => {
    if (!id) return;

    // Subscribe to votes
    const votesQuery = query(
      collection(db, 'votes'),
      where('predictionId', '==', id),
      orderBy('votedAt', 'desc'),
      limit(15)
    );

    // Subscribe to comments
    const commentsQuery = query(
      collection(db, 'comments'),
      where('predictionId', '==', id),
      orderBy('createdAt', 'desc'),
      limit(15)
    );

    let voteActivities: ActivityItem[] = [];
    let commentActivities: ActivityItem[] = [];

    const updateCombinedActivities = () => {
      const combined = [...voteActivities, ...commentActivities]
        .sort((a, b) => {
          const timeA = a.timestamp?.toDate?.()?.getTime() || a.timestamp?.seconds ? (a.timestamp.seconds! * 1000) : 0;
          const timeB = b.timestamp?.toDate?.()?.getTime() || b.timestamp?.seconds ? (b.timestamp.seconds! * 1000) : 0;
          return timeB - timeA;
        })
        .slice(0, 20);
      setActivities(combined);
    };

    const unsubscribeVotes = onSnapshot(votesQuery, (snapshot) => {
      voteActivities = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'vote' as const,
          userId: data.userId,
          userDisplayName: data.userDisplayName || 'Anonymous',
          userPhotoURL: data.userPhotoURL,
          option: data.option,
          optionLabel: data.optionLabel,
          yesNo: data.yesNo || data.voteType,
          timestamp: data.votedAt || data.timestamp,
        };
      });
      updateCombinedActivities();
    });

    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      commentActivities = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'comment' as const,
          userId: data.userId,
          userDisplayName: data.userDisplayName || 'Anonymous',
          userPhotoURL: data.userPhotoURL,
          content: data.content,
          timestamp: data.createdAt,
        };
      });
      updateCombinedActivities();
    });

    return () => {
      unsubscribeVotes();
      unsubscribeComments();
    };
  }, [id]);

  // Check user's existing vote
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

  // Build pollOptions from prediction data
  const pollOptions: PollOption[] = prediction?.options || [
    { id: 'A', label: prediction?.optionA || 'Yes', votes: prediction?.votesA || 0 },
    { id: 'B', label: prediction?.optionB || 'No', votes: prediction?.votesB || 0 },
  ];

  const isBinary = pollOptions.length === 2;
  const displayTemplate = prediction?.displayTemplate || (isBinary ? 'two-option-horizontal' : 'multi-yes-no');
  const isMultiYesNo = displayTemplate === 'multi-yes-no';

  const totalVotes = isMultiYesNo 
    ? pollOptions.reduce((sum, opt) => sum + (opt.votesYes || 0) + (opt.votesNo || 0), 0)
    : pollOptions.reduce((sum, opt) => sum + opt.votes, 0);

  const endDate = getDateFromTimestamp(prediction?.endTime || prediction?.endDate);
  const createdDate = getDateFromTimestamp(prediction?.createdAt);
  const isExpired = endDate ? endDate < new Date() : false;

  const handleVote = useCallback(async (optionId: string, yesNo?: 'yes' | 'no') => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!id || !prediction) return;

    try {
      if (isMultiYesNo && yesNo) {
        await submitMultiYesNoVote(id, optionId, yesNo, prediction.question, prediction.category);
        setSelectedOption(`${optionId}_${yesNo}`);
      } else {
        await submitVote(id, optionId, prediction.question, prediction.category);
        setSelectedOption(optionId);
      }
      toast.success('Vote submitted!');
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to submit vote');
    }
  }, [user, id, prediction, isMultiYesNo, submitVote, submitMultiYesNoVote]);

  // Download shareable image - Mobile-first approach using Canvas API directly
  const handleDownloadImage = async () => {
    if (!prediction) return;
    
    setIsDownloading(true);
    
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Create canvas directly - more reliable than html2canvas on mobile
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error('Canvas not supported');
        setIsDownloading(false);
        return;
      }
      
      // Set canvas size (square)
      const size = 600;
      canvas.width = size;
      canvas.height = size;
      
      // Background
      ctx.fillStyle = '#e8eef3';
      ctx.fillRect(0, 0, size, size);
      
      // Logo and brand
      ctx.fillStyle = '#1a4a6e';
      ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      
      // Draw checkmark circle icon manually
      ctx.beginPath();
      ctx.arc(size/2 - 80, 50, 14, 0, Math.PI * 2);
      ctx.strokeStyle = '#1a4a6e';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size/2 - 87, 50);
      ctx.lineTo(size/2 - 82, 55);
      ctx.lineTo(size/2 - 73, 45);
      ctx.strokeStyle = '#1a4a6e';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillText('TRUTHVOTE', size/2 + 20, 58);
      
      // Question text (word wrap)
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#1a4a6e';
      const question = prediction.question || '';
      const maxWidth = size - 80;
      const words = question.split(' ');
      let lines: string[] = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      
      // Draw question lines
      let yPos = 110;
      for (const line of lines.slice(0, 3)) { // Max 3 lines
        ctx.fillText(line, size/2, yPos);
        yPos += 32;
      }
      if (lines.length > 3) {
        ctx.fillText('...', size/2, yPos);
      }
      
      // Draw voting bars
      const barStartY = yPos + 30;
      const barHeight = 50;
      const barGap = 16;
      const barPadding = 40;
      const barWidth = size - barPadding * 2 - 80; // Leave space for percentage
      
      ctx.textAlign = 'left';
      
      pollOptions.forEach((option, index) => {
        const y = barStartY + (barHeight + barGap) * index;
        
        let percent: number;
        let barFillWidth: number;
        
        if (isMultiYesNo) {
          const optionTotal = (option.votesYes || 0) + (option.votesNo || 0);
          percent = optionTotal === 0 ? 0 : Math.round(((option.votesYes || 0) / optionTotal) * 100);
        } else {
          percent = totalVotes === 0 ? 0 : Math.round((option.votes / totalVotes) * 100);
        }
        
        barFillWidth = (percent / 100) * (barWidth - 8);
        
        // Bar background
        ctx.fillStyle = '#c8d5df';
        ctx.beginPath();
        ctx.roundRect(barPadding, y, barWidth, barHeight, 8);
        ctx.fill();
        
        // Bar fill (inside with padding)
        if (barFillWidth > 0) {
          ctx.fillStyle = '#08475f';
          ctx.beginPath();
          ctx.roundRect(barPadding + 4, y + 4, Math.max(barFillWidth, 40), barHeight - 8, 6);
          ctx.fill();
        }
        
        // Option label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(option.label.toUpperCase(), barPadding + 14, y + barHeight/2 + 5);
        
        // Percentage
        ctx.fillStyle = '#1a4a6e';
        ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${percent}%`, size - barPadding, y + barHeight/2 + 10);
        ctx.textAlign = 'left';
      });
      
      // Footer URL
      ctx.fillStyle = '#4a7a9e';
      ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('truthvote.io', size/2, size - 30);
      
      // Convert canvas to blob and share/download
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Failed to create image');
          setIsDownloading(false);
          return;
        }
        
        // Try Web Share API first (works great on mobile)
        if (navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], `truthvote-${prediction.id}.png`, { type: 'image/png' });
            const shareData = { files: [file] };
            
            if (navigator.canShare(shareData)) {
              await navigator.share(shareData);
              toast.success('Image shared!');
              setIsDownloading(false);
              return;
            }
          } catch (shareError: any) {
            // User cancelled or share failed, try download
            if (shareError.name !== 'AbortError') {
              console.log('Share failed, trying download:', shareError);
            }
          }
        }
        
        // Fallback: direct download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `truthvote-${prediction.id}.png`;
        
        // iOS Safari needs special handling
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          // Open image in new tab for iOS
          const newTab = window.open();
          if (newTab) {
            newTab.document.write(`
              <html>
                <head><title>Save Image</title></head>
                <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
                  <div style="text-align:center;color:white;font-family:sans-serif;">
                    <p style="margin-bottom:10px;">Press and hold the image to save</p>
                    <img src="${url}" style="max-width:100%;max-height:80vh;" />
                  </div>
                </body>
              </html>
            `);
            newTab.document.close();
          } else {
            window.location.href = url;
          }
          toast.success('Image opened! Press and hold to save.');
        } else {
          // Android and desktop
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success('Image downloaded!');
        }
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setIsDownloading(false);
      }, 'image/png', 1.0);
      
    } catch (error) {
      console.error('Error creating image:', error);
      toast.error('Failed to create image');
      setIsDownloading(false);
    }
  };
  
  // Helper function to download blob (keeping for compatibility)
  const downloadBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `truthvote-${prediction?.id || 'prediction'}.png`;
    link.href = url;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    toast.success('Image downloaded!');
    setIsDownloading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded-xl"></div>
            <div className="h-48 bg-muted rounded-xl"></div>
            <div className="h-32 bg-muted rounded-xl"></div>
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

  // Calculate percentages - FIX: 0 votes = 0%, not 50%
  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const getYesPercentage = (option: PollOption) => {
    const total = (option.votesYes || 0) + (option.votesNo || 0);
    if (total === 0) return 0; // FIX: Return 0% for no votes, not 50%
    return Math.round(((option.votesYes || 0) / total) * 100);
  };

  // Get option label by ID
  const getOptionLabel = (optionId: string) => {
    const option = pollOptions.find(opt => opt.id === optionId);
    return option?.label || optionId;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ===== MAIN CONTENT ===== */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. HEADER - Question with small image */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex gap-4">
                {prediction.imageUrl && (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <OptimizedImage
                      src={prediction.imageUrl}
                      alt={prediction.question}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      {prediction.category}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isExpired 
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' 
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    }`}>
                      {isExpired ? 'Closed' : 'Active'}
                    </span>
                  </div>
                  <h1 className="text-lg md:text-xl font-bold leading-tight">{prediction.question}</h1>
                </div>
              </div>
            </div>

            {/* 2. VOTE DISTRIBUTION - Horizontal Bars */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Vote Distribution</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadImage}
                  disabled={isDownloading}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isDownloading ? 'Downloading...' : 'Download'}
                </Button>
              </div>
              
              {/* Visible Bars on Page */}
              <div className="space-y-3">
                {isMultiYesNo ? (
                  // Multi Yes/No - Horizontal Bars with Mobile Voting
                  pollOptions.map((option) => {
                    const yesPercent = getYesPercentage(option);
                    const optionTotalVotes = (option.votesYes || 0) + (option.votesNo || 0);
                    const barWidth = optionTotalVotes === 0 ? 0 : yesPercent;
                    const userVotedYes = selectedOption === `${option.id}_yes`;
                    const userVotedNo = selectedOption === `${option.id}_no`;
                    const hasVoted = selectedOption !== null;
                    
                    return (
                      <div key={option.id}>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 relative h-11 rounded-lg overflow-hidden" style={{ backgroundColor: '#c8d5df' }}>
                            {/* Progress bar inside background */}
                            <div 
                              className="absolute top-1 bottom-1 left-1 right-1 rounded-md transition-all duration-500"
                              style={{ 
                                width: `calc(${Math.max(barWidth, 0)}% - 8px)`,
                                backgroundColor: '#08475f',
                                minWidth: barWidth > 0 ? '40px' : '0'
                              }}
                            />
                            {/* Label */}
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm text-white uppercase z-10">
                              {option.label}
                            </span>
                          </div>
                          <span className="text-xl font-bold min-w-14 text-right text-[#1a4a6e] dark:text-[#a8c5d8]">
                            {optionTotalVotes === 0 ? '0%' : `${yesPercent}%`}
                          </span>
                        </div>
                        
                        {/* Mobile Voting Buttons (only show on mobile for multi yes/no) */}
                        {user && !isExpired && (
                          <div className="lg:hidden flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() => handleVote(option.id, 'yes')}
                              disabled={hasVoted}
                              className={`flex-1 h-8 text-xs ${
                                userVotedYes 
                                  ? 'bg-green-600 hover:bg-green-600 text-white' 
                                  : 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/40 dark:hover:bg-green-900/60 dark:text-green-400 border-0'
                              }`}
                            >
                              Yes
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleVote(option.id, 'no')}
                              disabled={hasVoted}
                              className={`flex-1 h-8 text-xs ${
                                userVotedNo 
                                  ? 'bg-red-600 hover:bg-red-600 text-white' 
                                  : 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:hover:bg-red-900/60 dark:text-red-400 border-0'
                              }`}
                            >
                              No
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Standard Options - Horizontal Bars
                  pollOptions.map((option) => {
                    const percent = getPercentage(option.votes);
                    const barWidth = option.votes === 0 ? 0 : percent;
                    
                    return (
                      <div key={option.id} className="flex items-center gap-3">
                        <div className="flex-1 relative h-12 rounded-lg overflow-hidden" style={{ backgroundColor: '#c8d5df' }}>
                          {/* Progress bar inside background */}
                          <div 
                            className="absolute top-1 bottom-1 left-1 right-1 rounded-md transition-all duration-500"
                            style={{ 
                              width: `calc(${Math.max(barWidth, 0)}% - 8px)`,
                              backgroundColor: '#08475f',
                              minWidth: barWidth > 0 ? '50px' : '0'
                            }}
                          />
                          {/* Label */}
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm text-white uppercase z-10">
                            {option.label}
                          </span>
                        </div>
                        <span className="text-2xl font-bold min-w-16 text-right text-[#1a4a6e] dark:text-[#a8c5d8]">
                          {percent}%
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Vote count */}
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {totalVotes.toLocaleString()} total votes
              </div>
              
              {/* Hidden Shareable Card for Download Only - SQUARE */}
              <div 
                ref={shareCardRef}
                className="absolute -left-[9999px] p-10"
                style={{ backgroundColor: '#e8eef3', width: '600px', height: '600px' }}
              >
                {/* Logo - Only shows in download */}
                <div className="flex items-center justify-center gap-2 mb-8">
                  <CheckCircle className="w-7 h-7" style={{ color: '#1a4a6e' }} />
                  <span className="text-2xl font-bold" style={{ color: '#1a4a6e' }}>TRUTHVOTE</span>
                </div>
                
                {/* Question - Only shows in download */}
                <h3 
                  className="text-2xl font-bold text-center mb-10 leading-tight px-4"
                  style={{ color: '#1a4a6e' }}
                >
                  {prediction.question}
                </h3>
                
                {/* Bars for Download - Same style as visible */}
                <div className="space-y-4 px-2">
                  {isMultiYesNo ? (
                    pollOptions.map((option) => {
                      const yesPercent = getYesPercentage(option);
                      const optionTotalVotes = (option.votesYes || 0) + (option.votesNo || 0);
                      const barWidth = optionTotalVotes === 0 ? 0 : yesPercent;
                      
                      return (
                        <div key={option.id} className="flex items-center gap-4">
                          <div className="flex-1 relative h-14 rounded-lg overflow-hidden" style={{ backgroundColor: '#c8d5df' }}>
                            <div 
                              className="absolute top-1 bottom-1 left-1 rounded-md transition-all duration-500"
                              style={{ 
                                width: `calc(${Math.max(barWidth, 0)}% - 4px)`,
                                backgroundColor: '#7a9bb0',
                                minWidth: barWidth > 0 ? '50px' : '0'
                              }}
                            />
                            <span 
                              className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-base uppercase z-10"
                              style={{ color: 'white' }}
                            >
                              {option.label}
                            </span>
                          </div>
                          <span 
                            className="text-3xl font-bold min-w-20 text-right"
                            style={{ color: '#1a4a6e' }}
                          >
                            {optionTotalVotes === 0 ? '0%' : `${yesPercent}%`}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    pollOptions.map((option) => {
                      const percent = getPercentage(option.votes);
                      const barWidth = option.votes === 0 ? 0 : percent;
                      
                      return (
                        <div key={option.id} className="flex items-center gap-4">
                          <div className="flex-1 relative h-14 rounded-lg overflow-hidden" style={{ backgroundColor: '#c8d5df' }}>
                            <div 
                              className="absolute top-1 bottom-1 left-1 right-1 rounded-md transition-all duration-500"
                              style={{ 
                                width: `calc(${Math.max(barWidth, 0)}% - 8px)`,
                                backgroundColor: '#08475f',
                                minWidth: barWidth > 0 ? '50px' : '0'
                              }}
                            />
                            <span 
                              className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-base uppercase z-10"
                              style={{ color: 'white' }}
                            >
                              {option.label}
                            </span>
                          </div>
                          <span 
                            className="text-3xl font-bold min-w-20 text-right"
                            style={{ color: '#1a4a6e' }}
                          >
                            {percent}%
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {/* Footer URL - Only shows in download */}
                <div className="absolute bottom-10 left-0 right-0 text-center">
                  <span 
                    className="text-xl font-medium"
                    style={{ color: '#4a7a9e' }}
                  >
                    truthvote.io
                  </span>
                </div>
              </div>
            </div>

            {/* 3. DESCRIPTION / ABOUT */}
            {prediction.description && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <h2 className="text-lg font-semibold mb-3">About</h2>
                <p className="text-muted-foreground leading-relaxed">{prediction.description}</p>
              </div>
            )}

            {/* 4. MARKET INFO */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Market Info</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Participants</div>
                    <div className="font-semibold">{totalVotes.toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {isExpired ? 'Ended' : 'Ends'}
                    </div>
                    <div className="font-semibold text-sm">
                      {endDate ? formatDistanceToNow(endDate, { addSuffix: true }) : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Created</div>
                    <div className="font-semibold text-sm">
                      {createdDate ? formatDistanceToNow(createdDate, { addSuffix: true }) : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Options</div>
                    <div className="font-semibold">{pollOptions.length}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. COMMENTS & ACTIVITY TABS - Desktop only */}
            <div className="hidden lg:block">
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              {/* Tab Headers */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                    activeTab === 'comments'
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  Comments
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                    activeTab === 'activity'
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Activity
                  {activities.length > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                      {activities.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-5">
                {activeTab === 'comments' ? (
                  <Comments predictionId={prediction.id} />
                ) : (
                  // Activity Feed
                  <div className="space-y-3">
                    {activities.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No activity yet. Be the first to vote or comment!</p>
                    ) : (
                      activities.map((activity) => {
                        const activityDate = getDateFromTimestamp(activity.timestamp);
                        const displayName = activity.userDisplayName || 'Anonymous';
                        
                        return (
                          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {activity.userPhotoURL ? (
                                <OptimizedImage
                                  src={activity.userPhotoURL}
                                  alt={displayName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-primary font-semibold text-sm">
                                  {displayName[0]?.toUpperCase() || '?'}
                                </span>
                              )}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <a href={`/profile?id=${activity.userId}`} className="font-medium text-sm hover:text-primary transition-colors">{displayName}</a>
                                {activity.type === 'comment' ? (
                                  <>
                                    <span className="text-muted-foreground text-sm">commented</span>
                                    <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                                  </>
                                ) : (
                                  <>
                                    <span className="text-muted-foreground text-sm">voted</span>
                                    {activity.yesNo ? (
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        activity.yesNo === 'yes' 
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                      }`}>
                                        {activity.yesNo === 'yes' ? 'Yes' : 'No'}
                                      </span>
                                    ) : activity.option && (
                                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                        {activity.optionLabel || getOptionLabel(activity.option)}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              {/* Show comment preview */}
                              {activity.type === 'comment' && activity.content && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  &ldquo;{activity.content}&rdquo;
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {activityDate ? formatDistanceToNow(activityDate, { addSuffix: true }) : 'Just now'}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
            </div>

            {/* Share Button - Desktop only */}
            <div className="hidden lg:flex justify-end">
              <ShareButton 
                predictionId={prediction.id}
                question={prediction.question}
              />
            </div>

            {/* MOBILE: Comments/Activity always at bottom */}
            <div className="lg:hidden">
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                {/* Tab Headers */}
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                      activeTab === 'comments'
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Comments
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                      activeTab === 'activity'
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    Activity
                    {activities.length > 0 && (
                      <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                        {activities.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-5">
                  {activeTab === 'comments' ? (
                    <Comments predictionId={prediction.id} />
                  ) : (
                    // Activity Feed
                    <div className="space-y-3">
                      {activities.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No activity yet. Be the first to vote or comment!</p>
                      ) : (
                        activities.map((activity) => {
                          const activityDate = getDateFromTimestamp(activity.timestamp);
                          const displayName = activity.userDisplayName || 'Anonymous';
                          
                          return (
                            <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                              {/* Avatar */}
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {activity.userPhotoURL ? (
                                  <OptimizedImage
                                    src={activity.userPhotoURL}
                                    alt={displayName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-primary font-semibold text-sm">
                                    {displayName[0]?.toUpperCase() || '?'}
                                  </span>
                                )}
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <a href={`/profile?id=${activity.userId}`} className="font-medium text-sm hover:text-primary transition-colors">{displayName}</a>
                                  {activity.type === 'comment' ? (
                                    <>
                                      <span className="text-muted-foreground text-sm">commented</span>
                                      <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-muted-foreground text-sm">voted</span>
                                      {activity.yesNo ? (
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                          activity.yesNo === 'yes' 
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                        }`}>
                                          {activity.yesNo === 'yes' ? 'Yes' : 'No'}
                                        </span>
                                      ) : activity.option && (
                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                          {activity.optionLabel || getOptionLabel(activity.option)}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                                {/* Show comment preview */}
                                {activity.type === 'comment' && activity.content && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    &ldquo;{activity.content}&rdquo;
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {activityDate ? formatDistanceToNow(activityDate, { addSuffix: true }) : 'Just now'}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ===== SIDEBAR - Sticky Voting Card ===== */}
          <div className="lg:block hidden">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm sticky top-4">
              {/* Status & Votes */}
              <div className="flex items-center justify-between mb-4">
                <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  isExpired 
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' 
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                }`}>
                  {isExpired ? 'Closed' : 'Active'}
                </div>
                <span className="text-sm text-muted-foreground">
                  {totalVotes.toLocaleString()} votes
                </span>
              </div>

              {/* Voting Interface */}
              {!user ? (
                <Button 
                  className="w-full h-11"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign in to vote
                </Button>
              ) : isMultiYesNo ? (
                // Multi Yes/No Voting
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {pollOptions.map((option) => {
                    const yesPercent = getYesPercentage(option);
                    const userVotedYes = selectedOption === `${option.id}_yes`;
                    const userVotedNo = selectedOption === `${option.id}_no`;
                    const hasVoted = selectedOption !== null;
                    
                    return (
                      <div key={option.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm line-clamp-1">{option.label}</span>
                          <span className="text-xs text-green-600 dark:text-green-400 font-bold">
                            {(option.votesYes || 0) + (option.votesNo || 0) === 0 ? '—' : `${yesPercent}%`}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleVote(option.id, 'yes')}
                            disabled={isExpired || hasVoted}
                            className={`flex-1 h-9 ${
                              userVotedYes 
                                ? 'bg-green-600 hover:bg-green-600 text-white' 
                                : 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/40 dark:hover:bg-green-900/60 dark:text-green-400 border-0'
                            }`}
                          >
                            Yes
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleVote(option.id, 'no')}
                            disabled={isExpired || hasVoted}
                            className={`flex-1 h-9 ${
                              userVotedNo 
                                ? 'bg-red-600 hover:bg-red-600 text-white' 
                                : 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:hover:bg-red-900/60 dark:text-red-400 border-0'
                            }`}
                          >
                            No
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Standard Voting
                <div className="space-y-2">
                  {pollOptions.map((option, index) => {
                    const percent = getPercentage(option.votes);
                    const isSelected = selectedOption === option.id;
                    const colors = [
                      { bg: 'bg-green-600 hover:bg-green-700', light: 'bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-900/60 text-green-700 dark:text-green-400' },
                      { bg: 'bg-amber-500 hover:bg-amber-600', light: 'bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400' },
                      { bg: 'bg-red-500 hover:bg-red-600', light: 'bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-400' },
                      { bg: 'bg-purple-500 hover:bg-purple-600', light: 'bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-400' },
                      { bg: 'bg-blue-500 hover:bg-blue-600', light: 'bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-400' },
                    ];
                    const color = colors[index % colors.length];
                    
                    return (
                      <Button
                        key={option.id}
                        onClick={() => handleVote(option.id)}
                        disabled={isExpired || selectedOption !== null}
                        className={`w-full h-12 justify-between px-4 ${
                          isSelected 
                            ? `${color.bg} text-white` 
                            : `${color.light} border-0`
                        }`}
                      >
                        <span className="font-medium">{option.label}</span>
                        <span className="font-bold">{percent}%</span>
                      </Button>
                    );
                  })}
                </div>
              )}

              {/* Vote confirmation */}
              {selectedOption && (
                <div className="mt-3 p-2.5 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                  <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                    ✓ Vote submitted
                  </span>
                </div>
              )}

              {/* Ends info */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{isExpired ? 'Ended' : 'Ends'}</span>
                  <span className="font-medium">
                    {endDate ? formatDistanceToNow(endDate, { addSuffix: true }) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== MOBILE VOTING CARD (shows at bottom on mobile) ===== */}
          <div className="lg:hidden fixed bottom-16 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border shadow-lg z-40">
            {!user ? (
              <div className="p-3">
                <Button 
                  className="w-full h-11"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign in to vote
                </Button>
              </div>
            ) : selectedOption ? (
              <div className="text-center py-3">
                <span className="text-green-600 dark:text-green-400 font-medium">✓ Vote submitted</span>
              </div>
            ) : isMultiYesNo ? (
              // For multi yes/no, voting is done directly in the vote distribution section above
              <div className="text-center py-3 px-4">
                <p className="text-xs text-muted-foreground">Vote on each option above</p>
              </div>
            ) : isExpired ? (
              <div className="text-center py-3">
                <span className="text-muted-foreground text-sm">Poll closed</span>
              </div>
            ) : (
              // Standard poll - Show all options horizontally
              <div className="p-2 overflow-x-auto scrollbar-hide">
                <div className={`flex gap-2 ${pollOptions.length > 2 ? 'min-w-max' : ''}}`}>
                  {pollOptions.map((option, index) => {
                    const colors = [
                      'bg-green-600 hover:bg-green-700',
                      'bg-amber-500 hover:bg-amber-600',
                      'bg-red-500 hover:bg-red-600',
                      'bg-purple-500 hover:bg-purple-600',
                      'bg-blue-500 hover:bg-blue-600',
                    ];
                    
                    return (
                      <Button
                        key={option.id}
                        onClick={() => handleVote(option.id)}
                        disabled={isExpired || selectedOption !== null}
                        className={`flex-1 h-11 text-white ${colors[index % colors.length]} ${pollOptions.length > 2 ? 'min-w-[120px]' : ''}`}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileBottomNav />
      <Footer />
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
}

export default function PredictionDetail() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded-xl"></div>
            <div className="h-48 bg-muted rounded-xl"></div>
            <div className="h-32 bg-muted rounded-xl"></div>
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
