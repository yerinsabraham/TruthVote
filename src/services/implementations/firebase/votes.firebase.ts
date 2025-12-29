// src/services/implementations/firebase/votes.firebase.ts
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection, 
  query, 
  where,
  updateDoc,
  deleteDoc, 
  increment, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { VotesService, Vote } from '@/services/api/votes.api';
import { checkAndAwardBadges, getBadgeInfo } from '@/lib/badges';

export class FirebaseVotesService implements VotesService {
  async submitVote(
    predictionId: string,
    userId: string,
    option: string,
    predictionQuestion: string,
    predictionCategory: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Check if user already voted
      const voteId = `${userId}_${predictionId}`;
      const voteRef = doc(db, 'votes', voteId);
      const voteDoc = await getDoc(voteRef);

      if (voteDoc.exists()) {
        return { success: false, message: 'You have already voted on this prediction' };
      }

      // Create vote document
      const voteData: any = {
        predictionId,
        userId,
        option,
        votedAt: Timestamp.now(),
        predictionQuestion,
      };
      
      // Only add predictionCategory if it's defined
      if (predictionCategory) {
        voteData.predictionCategory = predictionCategory;
      }
      
      await setDoc(voteRef, voteData);

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
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        totalVotes: increment(1),
      });

      // Check and award badges
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        await checkAndAwardBadges(userId, {
          totalVotes: userData.totalVotes || 0,
          correctVotes: userData.correctVotes || 0,
          accuracyRate: userData.accuracyRate || 0,
          currentBadges: userData.badges || []
        });
      }

      return { success: true, message: 'Vote submitted successfully' };
    } catch (error: any) {
      console.error('Error submitting vote:', error);
      return { success: false, message: error.message || 'Failed to submit vote' };
    }
  }

  async getUserVote(predictionId: string, userId: string): Promise<string | null> {
    try {
      const voteId = `${userId}_${predictionId}`;
      const voteRef = doc(db, 'votes', voteId);
      const voteDoc = await getDoc(voteRef);

      if (voteDoc.exists()) {
        return voteDoc.data().option;
      }
      return null;
    } catch (error) {
      console.error('Error checking vote:', error);
      return null;
    }
  }

  async getUserVotes(userId: string): Promise<Vote[]> {
    try {
      const votesRef = collection(db, 'votes');
      const q = query(votesRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          predictionId: data.predictionId,
          userId: data.userId,
          option: data.option,
          votedAt: data.votedAt?.toDate().toISOString() || new Date().toISOString(),
          predictionQuestion: data.predictionQuestion,
          predictionCategory: data.predictionCategory,
          isCorrect: data.isCorrect,
          pointsAwarded: data.pointsAwarded,
        };
      });
    } catch (error) {
      console.error('Error getting user votes:', error);
      return [];
    }
  }

  async getPredictionVotes(predictionId: string): Promise<Vote[]> {
    try {
      const votesRef = collection(db, 'votes');
      const q = query(votesRef, where('predictionId', '==', predictionId));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          predictionId: data.predictionId,
          userId: data.userId,
          option: data.option,
          votedAt: data.votedAt?.toDate().toISOString() || new Date().toISOString(),
          predictionQuestion: data.predictionQuestion,
          predictionCategory: data.predictionCategory,
          isCorrect: data.isCorrect,
          pointsAwarded: data.pointsAwarded,
        };
      });
    } catch (error) {
      console.error('Error getting prediction votes:', error);
      return [];
    }
  }

  async deleteVote(predictionId: string, userId: string): Promise<void> {
    try {
      const voteId = `${userId}_${predictionId}`;
      const voteRef = doc(db, 'votes', voteId);
      
      // Get vote data before deleting to update counts
      const voteDoc = await getDoc(voteRef);
      if (!voteDoc.exists()) {
        throw new Error('Vote not found');
      }
      
      const voteData = voteDoc.data();
      
      // Delete vote
      await deleteDoc(voteRef);
      
      // Update prediction vote counts
      const predictionRef = doc(db, 'predictions', predictionId);
      const predictionDoc = await getDoc(predictionRef);
      const predictionData = predictionDoc.data();
      
      if (predictionData?.options) {
        const optionIndex = predictionData.options.findIndex((opt: any) => opt.id === voteData.option);
        if (optionIndex !== -1) {
          const updatedOptions = [...predictionData.options];
          updatedOptions[optionIndex].votes = Math.max(0, (updatedOptions[optionIndex].votes || 0) - 1);
          await updateDoc(predictionRef, {
            options: updatedOptions,
            totalVotes: increment(-1)
          });
        }
      }
      
      // Update user total votes
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        totalVotes: increment(-1),
      });
    } catch (error) {
      console.error('Error deleting vote:', error);
      throw error;
    }
  }
}
