// src/components/Comments.tsx
'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { Rank } from '@/types/rank';
import { RANK_CONFIGS } from '@/config/ranks';

interface Comment {
  id: string;
  predictionId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  userRank?: Rank;
  content: string;
  createdAt: any;
  likes: number;
  likedBy: string[];
  parentId: string | null;
  replyCount: number;
}

interface CommentsProps {
  predictionId: string;
  initiallyOpen?: boolean;
}

export interface CommentsRef {
  scrollIntoView: () => void;
  openComments: () => void;
}

// Mini rank badge component for comments
const MiniRankBadge = ({ rank }: { rank?: Rank }) => {
  if (!rank) return null;
  
  const config = RANK_CONFIGS[rank];
  if (!config) return null;
  
  return (
    <span 
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ml-1.5"
      style={{ 
        backgroundColor: `${config.displayColor}20`,
        color: config.displayColor 
      }}
    >
      <span>{config.displayName}</span>
    </span>
  );
};

// Single comment component
const CommentItem = ({ 
  comment, 
  userId, 
  onLike, 
  onReply,
  replies,
  depth = 0
}: { 
  comment: Comment; 
  userId?: string;
  onLike: (commentId: string) => void;
  onReply: (parentId: string, content: string) => void;
  replies: Comment[];
  depth?: number;
}) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(depth < 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isLiked = userId && comment.likedBy?.includes(userId);
  const hasReplies = replies.length > 0;
  const maxDepth = 2; // Max nesting depth
  
  const handleSubmitReply = async () => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    await onReply(comment.id, replyText.trim());
    setReplyText('');
    setShowReplyInput(false);
    setShowReplies(true);
    setIsSubmitting(false);
  };

  const timestamp = comment.createdAt?.toDate?.() 
    ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })
    : 'Just now';

  const router = useRouter();

  const handleUsernameClick = () => {
    // If current user's comment, go to own profile
    if (userId && comment.userId === userId) {
      router.push('/profile');
    } else {
      router.push(`/profile?id=${comment.userId}`);
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-6 sm:ml-10 border-l-2 border-border pl-3 sm:pl-4' : ''}`}>
      <div className="py-3">
        {/* Comment header */}
        <div className="flex items-center gap-2 mb-1.5">
          {/* User avatar */}
          {comment.userPhotoURL && comment.userPhotoURL.trim() !== '' ? (
            <Image
              src={comment.userPhotoURL}
              alt={comment.userDisplayName || 'User'}
              width={28}
              height={28}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              unoptimized
            />
          ) : (
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ backgroundColor: comment.userRank ? RANK_CONFIGS[comment.userRank]?.displayColor || '#6B7280' : '#6B7280' }}
            >
              {comment.userDisplayName?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          
          {/* Name and rank */}
          <div className="flex items-center flex-wrap">
            <button 
              onClick={handleUsernameClick}
              className="font-semibold text-sm hover:text-primary transition-colors"
            >
              {comment.userDisplayName || 'Anonymous'}
            </button>
            <MiniRankBadge rank={comment.userRank} />
          </div>
          
          {/* Timestamp */}
          <span className="text-xs text-muted-foreground ml-auto">{timestamp}</span>
        </div>
        
        {/* Comment content */}
        <p className="text-sm text-foreground leading-relaxed pl-9">{comment.content}</p>
        
        {/* Actions */}
        <div className="flex items-center gap-4 mt-2 pl-9">
          {/* Like button */}
          <button
            onClick={() => onLike(comment.id)}
            className={`flex items-center gap-1 text-xs transition-colors ${
              isLiked 
                ? 'text-red-500' 
                : 'text-muted-foreground hover:text-red-500'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
            <span>{comment.likes || 0}</span>
          </button>
          
          {/* Reply button (only show if not at max depth) */}
          {depth < maxDepth && userId && (
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Reply</span>
            </button>
          )}
          
          {/* Show/hide replies */}
          {hasReplies && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showReplies ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
            </button>
          )}
        </div>
        
        {/* Reply input */}
        {showReplyInput && (
          <div className="flex gap-2 mt-3 pl-9">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 px-4 py-2.5 text-sm rounded-lg bg-background border-2 border-border/50 hover:border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              onKeyPress={(e) => e.key === 'Enter' && !isSubmitting && handleSubmitReply()}
              disabled={isSubmitting}
            />
            <Button 
              size="sm" 
              onClick={handleSubmitReply} 
              disabled={isSubmitting || !replyText.trim()}
              className="px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Nested replies */}
      {showReplies && hasReplies && (
        <div className="space-y-0">
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              userId={userId}
              onLike={onLike}
              onReply={onReply}
              replies={[]} // No further nesting for simplicity
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Comments = forwardRef<CommentsRef, CommentsProps>(({ predictionId, initiallyOpen = true }, ref) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [userRank, setUserRank] = useState<Rank | undefined>();

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    scrollIntoView: () => {
      const element = document.getElementById('comments-section');
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    openComments: () => setIsOpen(true)
  }));

  // Fetch user's rank
  useEffect(() => {
    if (!user) return;
    
    const fetchUserRank = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRank(userData.currentRank || Rank.NOVICE);
        }
      } catch (error) {
        console.error('Error fetching user rank:', error);
      }
    };
    
    fetchUserRank();
  }, [user]);

  // Real-time comments listener
  useEffect(() => {
    if (!predictionId) return;

    const q = query(
      collection(db, 'comments'),
      where('predictionId', '==', predictionId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(data);
    }, (error) => {
      console.error('Error loading comments:', error);
    });

    return () => unsubscribe();
  }, [predictionId]);

  // Get top-level comments (no parent)
  const topLevelComments = comments.filter(c => !c.parentId);
  
  // Get replies for a comment
  const getReplies = useCallback((parentId: string) => {
    return comments.filter(c => c.parentId === parentId);
  }, [comments]);

  // Handle like
  const handleLike = async (commentId: string) => {
    if (!user) {
      toast.error('Please sign in to like comments');
      return;
    }

    try {
      const commentRef = doc(db, 'comments', commentId);
      const comment = comments.find(c => c.id === commentId);
      
      if (!comment) return;
      
      const isLiked = comment.likedBy?.includes(user.uid);
      
      await updateDoc(commentRef, {
        likes: increment(isLiked ? -1 : 1),
        likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('Failed to like comment');
    }
  };

  // Handle reply
  const handleReply = async (parentId: string, content: string) => {
    if (!user) {
      toast.error('Please sign in to reply');
      return;
    }

    try {
      console.log('Creating reply with photoURL:', user.photoURL);
      // Add reply
      await addDoc(collection(db, 'comments'), {
        predictionId,
        userId: user.uid,
        userDisplayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        userPhotoURL: user.photoURL || '',
        userRank: userRank || Rank.NOVICE,
        content,
        createdAt: Timestamp.now(),
        likes: 0,
        likedBy: [],
        parentId,
        replyCount: 0
      });

      // Update parent reply count
      const parentRef = doc(db, 'comments', parentId);
      await updateDoc(parentRef, {
        replyCount: increment(1)
      });

      // Update prediction comment count
      const predictionRef = doc(db, 'predictions', predictionId);
      await updateDoc(predictionRef, {
        commentCount: increment(1)
      });

      toast.success('Reply posted!');
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Failed to post reply');
    }
  };

  // Handle new comment submit
  const handleSubmitComment = async () => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating comment with photoURL:', user.photoURL);
      await addDoc(collection(db, 'comments'), {
        predictionId,
        userId: user.uid,
        userDisplayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        userPhotoURL: user.photoURL || '',
        userRank: userRank || Rank.NOVICE,
        content: newComment.trim(),
        createdAt: Timestamp.now(),
        likes: 0,
        likedBy: [],
        parentId: null,
        replyCount: 0
      });

      // Update prediction comment count
      const predictionRef = doc(db, 'predictions', predictionId);
      await updateDoc(predictionRef, {
        commentCount: increment(1)
      });

      setNewComment('');
      toast.success('Comment posted!');
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  const totalComments = comments.length;

  return (
    <div id="comments-section" className="scroll-mt-20">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 text-left"
      >
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Comments ({totalComments})
        </h3>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="space-y-4">
          {/* Comment Input */}
          {user ? (
            <div className="flex gap-3 items-start">
              {/* User avatar */}
              {user.photoURL && user.photoURL.trim() !== '' ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  unoptimized
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: userRank ? RANK_CONFIGS[userRank]?.displayColor || '#6B7280' : '#6B7280' }}
                >
                  {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              
              <div className="flex-1 flex gap-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="What's your prediction?"
                  className="flex-1 px-5 py-3.5 text-base rounded-lg bg-background border-2 border-border/50 hover:border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  onKeyPress={(e) => e.key === 'Enter' && !loading && handleSubmitComment()}
                  disabled={loading}
                />
                <Button 
                  onClick={handleSubmitComment} 
                  disabled={loading || !newComment.trim()}
                  size="default"
                  className="rounded-lg px-6 font-medium"
                >
                  Post
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Please <span className="text-primary font-medium">sign in</span> to leave a comment
              </p>
            </div>
          )}

          {/* Comments List */}
          <div className="divide-y divide-border">
            {topLevelComments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No comments yet. Be the first to share your thoughts!
              </p>
            ) : (
              topLevelComments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  userId={user?.uid}
                  onLike={handleLike}
                  onReply={handleReply}
                  replies={getReplies(comment.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

Comments.displayName = 'Comments';
