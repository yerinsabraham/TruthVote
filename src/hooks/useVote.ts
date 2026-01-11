// src/hooks/useVote.ts
'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { votesService } from '@/services';
import { getBadgeInfo } from '@/lib/badges';

export function useVote() {
  const [loading, setLoading] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const { user } = useAuth();

  const submitVote = useCallback(async (
    predictionId: string, 
    option: string, 
    predictionQuestion: string, 
    predictionCategory: string,
    optionLabel?: string
  ) => {
    if (!user) {
      toast.error('Please sign in to vote');
      return false;
    }

    setLoading(true);
    try {
      // Get user's display name and photo from auth context
      const userDisplayName = user.displayName || user.email?.split('@')[0] || 'Anonymous';
      const userPhotoURL = user.photoURL || undefined;
      
      // Use service layer instead of direct Firebase
      const result = await votesService.submitVote(
        predictionId,
        user.uid,
        option,
        predictionQuestion,
        predictionCategory,
        userDisplayName,
        optionLabel,
        userPhotoURL
      );

      if (!result.success) {
        toast.error(result.message || 'Failed to submit vote');
        setLoading(false);
        return false;
      }

      setHasVoted(true);
      setLoading(false);
      return true;
    } catch (error: any) {
      console.error('Error submitting vote:', error);
      toast.error(error.message || 'Failed to submit vote');
      setLoading(false);
      return false;
    }
  }, [user]);

  const checkUserVote = useCallback(async (predictionId: string): Promise<'A' | 'B' | null> => {
    if (!user) return null;

    try {
      // Use service layer instead of direct Firebase
      const option = await votesService.getUserVote(predictionId, user.uid);
      return option as 'A' | 'B' | null;
    } catch (error) {
      console.error('Error checking vote:', error);
      return null;
    }
  }, [user]);

  const getUserVotes = useCallback(async () => {
    if (!user) return [];

    try {
      // Use service layer instead of direct Firebase
      const votes = await votesService.getUserVotes(user.uid);
      return votes.map(vote => ({
        id: vote.id,
        predictionId: vote.predictionId,
        option: vote.option,
        votedAt: vote.votedAt,
      }));
    } catch (error) {
      console.error('Error getting user votes:', error);
      return [];
    }
  }, [user]);

  const submitMultiYesNoVote = useCallback(async (
    predictionId: string,
    optionId: string,
    yesNo: 'yes' | 'no',
    predictionQuestion: string,
    predictionCategory: string
  ) => {
    if (!user) {
      toast.error('Please sign in to vote');
      return false;
    }

    setLoading(true);
    try {
      // Combine option and yes/no into single option string
      const combinedOption = `${optionId}-${yesNo}`;
      const userDisplayName = user.displayName || user.email?.split('@')[0] || 'Anonymous';
      const userPhotoURL = user.photoURL || undefined;
      
      const result = await votesService.submitVote(
        predictionId,
        user.uid,
        combinedOption,
        predictionQuestion,
        predictionCategory,
        userDisplayName,
        `${optionId} - ${yesNo.charAt(0).toUpperCase() + yesNo.slice(1)}`,
        userPhotoURL
      );

      if (!result.success) {
        toast.error(result.message || 'Failed to submit vote');
        setLoading(false);
        return false;
      }

      setHasVoted(true);
      setLoading(false);
      return true;
    } catch (error: any) {
      console.error('Error submitting multi-yes-no vote:', error);
      toast.error(error.message || 'Failed to submit vote');
      setLoading(false);
      return false;
    }
  }, [user]);

  return { submitVote, submitMultiYesNoVote, checkUserVote, getUserVotes, loading, hasVoted, setHasVoted };
}
