// src/components/Comments.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  predictionId: string;
  userId: string;
  userDisplayName: string;
  text: string;
  createdAt: any;
}

interface CommentsProps {
  predictionId: string;
}

export function Comments({ predictionId }: CommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [predictionId, showComments]);

  const loadComments = async () => {
    try {
      const q = query(
        collection(db, 'comments'),
        where('predictionId', '==', predictionId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

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
      await addDoc(collection(db, 'comments'), {
        predictionId,
        userId: user.uid,
        userDisplayName: user.displayName || 'Anonymous',
        text: newComment.trim(),
        createdAt: Timestamp.now()
      });

      setNewComment('');
      await loadComments();
      toast.success('Comment posted!');
    } catch (error: any) {
      toast.error('Failed to post comment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <Button
        variant="outline"
        onClick={() => setShowComments(!showComments)}
        className="w-full"
      >
        💬 {showComments ? 'Hide' : 'Show'} Comments ({comments.length})
      </Button>

      {showComments && (
        <div className="mt-4 space-y-3">
          {/* Comment Input */}
          {user && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
              />
              <Button onClick={handleSubmitComment} disabled={loading}>
                Post
              </Button>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-2">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              comments.map(comment => (
                <Card key={comment.id}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-sm">{comment.userDisplayName}</div>
                        <p className="text-sm mt-1">{comment.text}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {comment.createdAt && formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
