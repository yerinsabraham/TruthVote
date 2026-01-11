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
    predictionCategory: string,
    userDisplayName?: string,
    optionLabel?: string,
    userPhotoURL?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Check if user already voted
      const voteId = `${userId}_${predictionId}`;
      const voteRef = doc(db, 'votes', voteId);
      const voteDoc = await getDoc(voteRef);

      if (voteDoc.exists()) {
        return { success: false, message: 'You have already voted on this prediction' };
      }

      // Parse option for multi-yes-no format (e.g., "A-yes" or "A-no")
      let actualOption = option;
      let voteType: 'yes' | 'no' | 'regular' = 'regular';
      
      if (option.includes('-yes')) {
        actualOption = option.replace('-yes', '');
        voteType = 'yes';
      } else if (option.includes('-no')) {
        actualOption = option.replace('-no', '');
        voteType = 'no';
      }

      // Create vote document with activity feed compatible fields
      const timestamp = Timestamp.now();
      const voteData: any = {
        predictionId,
        pollId: predictionId, // Alias for activity feed compatibility
        userId,
        option: actualOption, // Store the base option (e.g., 'A', 'B')
        voteType, // Store whether it's yes, no, or regular
        yesNo: voteType !== 'regular' ? voteType : undefined, // For activity feed display
        votedAt: timestamp,
        timestamp: timestamp, // Alias for activity feed ordering
        predictionQuestion,
        userDisplayName: userDisplayName || 'Anonymous',
        userPhotoURL: userPhotoURL || null,
        optionLabel: optionLabel || actualOption,
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
        const optionIndex = predictionData.options.findIndex((opt: any) => opt.id === actualOption);
        if (optionIndex !== -1) {
          const updatedOptions = [...predictionData.options];
          
          // Update the appropriate vote count based on vote type
          if (voteType === 'yes') {
            updatedOptions[optionIndex].votesYes = (updatedOptions[optionIndex].votesYes || 0) + 1;
          } else if (voteType === 'no') {
            updatedOptions[optionIndex].votesNo = (updatedOptions[optionIndex].votesNo || 0) + 1;
          } else {
            updatedOptions[optionIndex].votes = (updatedOptions[optionIndex].votes || 0) + 1;
          }
          
          await updateDoc(predictionRef, {
            options: updatedOptions,
            totalVotes: increment(1)
          });
        }
      } else {
        // Legacy format support
        const updateField = actualOption === 'A' ? 'voteCountA' : 'voteCountB';
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
        const data = voteDoc.data();
        const option = data.option;
        const voteType = data.voteType;
        
        // Reconstruct the full vote string for multi-yes-no format
        if (voteType === 'yes') {
          return `${option}-yes`;
        } else if (voteType === 'no') {
          return `${option}-no`;
        }
        return option;
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
