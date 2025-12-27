// src/hooks/useBookmark.ts
'use client';

import { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export function useBookmark() {
  const [bookmarkedPredictions, setBookmarkedPredictions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Fetch user's bookmarks on mount
  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user) {
        setBookmarkedPredictions(new Set());
        return;
      }
      try {
        const bookmarksQuery = query(
          collection(db, 'bookmarks'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(bookmarksQuery);
        const bookmarks = new Set<string>();
        snapshot.docs.forEach(doc => {
          bookmarks.add(doc.data().predictionId);
        });
        setBookmarkedPredictions(bookmarks);
      } catch (error) {
        console.error('Error fetching bookmarks:', error);
      }
    };

    fetchBookmarks();
  }, [user]);

  const toggleBookmark = async (predictionId: string) => {
    if (!user) {
      toast.error('Please sign in to bookmark predictions');
      return false;
    }

    setLoading(true);
    try {
      const bookmarkId = `${user.uid}_${predictionId}`;
      const bookmarkRef = doc(db, 'bookmarks', bookmarkId);

      if (bookmarkedPredictions.has(predictionId)) {
        // Remove bookmark
        await deleteDoc(bookmarkRef);
        setBookmarkedPredictions(prev => {
          const newSet = new Set(prev);
          newSet.delete(predictionId);
          return newSet;
        });
        toast.success('Removed from bookmarks');
      } else {
        // Add bookmark
        await setDoc(bookmarkRef, {
          userId: user.uid,
          predictionId,
          createdAt: new Date(),
        });
        setBookmarkedPredictions(prev => new Set(prev).add(predictionId));
        toast.success('Added to bookmarks');
      }

      setLoading(false);
      return true;
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update bookmark');
      setLoading(false);
      return false;
    }
  };

  const isBookmarked = (predictionId: string) => {
    return bookmarkedPredictions.has(predictionId);
  };

  return { toggleBookmark, isBookmarked, bookmarkedPredictions, loading };
}
