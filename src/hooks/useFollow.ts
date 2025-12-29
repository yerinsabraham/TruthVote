// src/hooks/useFollow.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, deleteDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export function useFollow(targetUserId: string) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user || !targetUserId || user.uid === targetUserId) return;

      try {
        const followId = `${user.uid}_${targetUserId}`;
        const followDoc = await getDoc(doc(db, 'follows', followId));
        setIsFollowing(followDoc.exists());
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };

    checkFollowStatus();
  }, [user, targetUserId]);

  const toggleFollow = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to follow users');
      return;
    }

    if (user.uid === targetUserId) {
      toast.error("You can't follow yourself");
      return;
    }

    setLoading(true);
    try {
      const followId = `${user.uid}_${targetUserId}`;
      const followRef = doc(db, 'follows', followId);

      if (isFollowing) {
        // Unfollow
        await deleteDoc(followRef);
        
        // Update counts
        await updateDoc(doc(db, 'users', user.uid), {
          followingCount: increment(-1)
        });
        await updateDoc(doc(db, 'users', targetUserId), {
          followersCount: increment(-1)
        });

        setIsFollowing(false);
      } else {
        // Follow
        await setDoc(followRef, {
          followerId: user.uid,
          followingId: targetUserId,
          createdAt: new Date()
        });

        // Update counts
        await updateDoc(doc(db, 'users', user.uid), {
          followingCount: increment(1)
        });
        await updateDoc(doc(db, 'users', targetUserId), {
          followersCount: increment(1)
        });

        setIsFollowing(true);
      }
    } catch (error: any) {
      toast.error('Failed to update follow status: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [user, targetUserId, isFollowing]);

  return { isFollowing, loading, toggleFollow };
}
