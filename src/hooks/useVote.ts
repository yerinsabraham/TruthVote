// src/hooks/useVote.ts
'use client';

import { useState } from 'react';
import { doc, setDoc, getDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { checkAndAwardBadges, getBadgeInfo } from '@/lib/badges';

export function useVote() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const submitVote = async (predictionId: string, option: string, predictionQuestion: string, predictionCategory: string) => {
    if (!user) {
      toast.error('Please sign in to vote');
      return false;
    }

    setLoading(true);
    try {
      // Check if user already voted
      const voteId = `${user.uid}_${predictionId}`;
      const voteRef = doc(db, 'votes', voteId);
      const voteDoc = await getDoc(voteRef);

      if (voteDoc.exists()) {
        toast.error('You have already voted on this prediction');
        setLoading(false);
        return false;
      }

      // Create vote document
      await setDoc(voteRef, {
        predictionId,
        userId: user.uid,
        option,
        votedAt: Timestamp.now(),
        predictionQuestion,
        predictionCategory,
      });

      // Update prediction vote counts
      const predictionRef = doc(db, 'predictions', predictionId);
      const predictionDoc = await getDoc(predictionRef);
      const predictionData = predictionDoc.data();
      
      // Support new options array format
      if (predictionData?.options) {
        const optionIndex = predictionData.options.findIndex((opt: any) => opt.id === option);
        if (optionIndex !== -1) {
          const updatedOptions = [...predictionData.options];
          updatedOptions[optionIndex].votes = (updatedOptions[optionIndex].votes || 0) + 1;
          await updateDoc(predictionRef, {
            options: updatedOptions,
            totalVotes: increment(1)
          });
        }
      } else {
        // Legacy format support
        const updateField = option === 'A' ? 'voteCountA' : 'voteCountB';
        await updateDoc(predictionRef, {
          [updateField]: increment(1),
        });
      }

      // Update user total votes
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        totalVotes: increment(1),
      });

      // Check and award badges
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newBadges = await checkAndAwardBadges(user.uid, {
          totalVotes: userData.totalVotes || 0,
          correctVotes: userData.correctVotes || 0,
          accuracyRate: userData.accuracyRate || 0,
          currentBadges: userData.badges || []
        });

        // Show badge notifications
        if (newBadges.length > 0) {
          newBadges.forEach(badgeId => {
            const badge = getBadgeInfo(badgeId);
            if (badge) {
              toast.success(`🎉 Badge earned: ${badge.icon} ${badge.name}!`, { duration: 5000 });
            }
          });
        }
      }

      toast.success('Vote submitted successfully!');
      setLoading(false);
      return true;
    } catch (error: any) {
      console.error('Error submitting vote:', error);
      toast.error(error.message || 'Failed to submit vote');
      setLoading(false);
      return false;
    }
  };

  const checkUserVote = async (predictionId: string): Promise<'A' | 'B' | null> => {
    if (!user) return null;

    try {
      const voteId = `${user.uid}_${predictionId}`;
      const voteRef = doc(db, 'votes', voteId);
      const voteDoc = await getDoc(voteRef);

      if (voteDoc.exists()) {
        return voteDoc.data().option as 'A' | 'B';
      }
      return null;
    } catch (error) {
      console.error('Error checking vote:', error);
      return null;
    }
  };

  const getUserVotes = async () => {
    if (!user) return [];

    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const votesRef = collection(db, 'votes');
      const q = query(votesRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        predictionId: doc.data().predictionId,
        option: doc.data().option,
        votedAt: doc.data().votedAt,
      }));
    } catch (error) {
      console.error('Error getting user votes:', error);
      return [];
    }
  };

  return { submitVote, checkUserVote, getUserVotes, loading };
}
