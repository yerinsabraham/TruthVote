// src/services/implementations/firebase/predictions.firebase.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  PredictionsService,
  Prediction,
  PredictionFilters,
  CreatePredictionData,
  UpdatePredictionData,
} from '@/services/api/predictions.api';

export class FirebasePredictionsService implements PredictionsService {
  private mapFirestoreDoc(docData: any, docId: string): Prediction {
    return {
      id: docId,
      question: docData.question,
      description: docData.description,
      options: docData.options || [
        { id: 'A', label: docData.optionA || 'Yes', votes: docData.voteCountA || 0 },
        { id: 'B', label: docData.optionB || 'No', votes: docData.voteCountB || 0 }
      ],
      category: docData.category || docData.categoryName || '',
      subcategory: docData.subcategory,
      imageUrl: docData.imageUrl,
      sourceLink: docData.sourceLink,
      createdBy: docData.createdBy || docData.creatorId || '',
      creatorName: docData.creatorName,
      status: docData.status || 'active',
      published: docData.published ?? true,
      isApproved: docData.isApproved ?? true,
      isFeatured: docData.isFeatured ?? false,
      startTime: docData.startTime?.toDate?.().toISOString(),
      endTime: docData.endTime?.toDate?.().toISOString() || new Date().toISOString(),
      resolutionTime: docData.resolutionTime?.toDate?.().toISOString(),
      resolved: docData.resolved ?? false,
      winningOption: docData.winningOption || docData.resolvedOption,
      totalVotes: docData.totalVotes || 0,
      viewCount: docData.viewCount || 0,
      createdAt: docData.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
      updatedAt: docData.updatedAt?.toDate?.().toISOString(),
    };
  }

  async getPrediction(id: string): Promise<Prediction | null> {
    try {
      const docRef = doc(db, 'predictions', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return this.mapFirestoreDoc(docSnap.data(), docSnap.id);
      }
      return null;
    } catch (error) {
      console.error('Error getting prediction:', error);
      return null;
    }
  }

  async listPredictions(filters: PredictionFilters = {}): Promise<Prediction[]> {
    try {
      const predictionsRef = collection(db, 'predictions');
      let q = query(predictionsRef, orderBy('createdAt', 'desc'));

      // Apply filters
      if (filters.isApproved !== undefined) {
        q = query(predictionsRef, where('isApproved', '==', filters.isApproved), orderBy('createdAt', 'desc'));
      }
      
      if (filters.status) {
        q = query(
          predictionsRef,
          where('isApproved', '==', filters.isApproved ?? true),
          where('status', '==', filters.status),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      const predictions = snapshot.docs.map(doc => this.mapFirestoreDoc(doc.data(), doc.id));

      // Apply additional client-side filters
      let filteredPredictions = predictions;

      if (filters.category) {
        filteredPredictions = filteredPredictions.filter(
          p => p.category === filters.category
        );
      }

      if (filters.createdBy) {
        filteredPredictions = filteredPredictions.filter(
          p => p.createdBy === filters.createdBy
        );
      }

      return filteredPredictions;
    } catch (error) {
      console.error('Error listing predictions:', error);
      return [];
    }
  }

  subscribeToPredictions(
    filters: PredictionFilters,
    onUpdate: (predictions: Prediction[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    try {
      const predictionsRef = collection(db, 'predictions');
      let q = query(
        predictionsRef,
        where('isApproved', '==', filters.isApproved ?? true),
        orderBy('createdAt', 'desc')
      );

      if (filters.status) {
        q = query(
          predictionsRef,
          where('isApproved', '==', filters.isApproved ?? true),
          where('status', '==', filters.status),
          orderBy('createdAt', 'desc')
        );
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          let predictions = snapshot.docs.map(doc =>
            this.mapFirestoreDoc(doc.data(), doc.id)
          );

          // Apply client-side filters
          if (filters.category) {
            predictions = predictions.filter(p => p.category === filters.category);
          }

          if (filters.createdBy) {
            predictions = predictions.filter(p => p.createdBy === filters.createdBy);
          }

          onUpdate(predictions);
        },
        (error) => {
          console.error('Error in predictions subscription:', error);
          if (onError) onError(error);
        }
      );

      return unsubscribe;
    } catch (error: any) {
      console.error('Error setting up predictions subscription:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  async createPrediction(data: CreatePredictionData, userId: string): Promise<Prediction> {
    try {
      const predictionsRef = collection(db, 'predictions');
      const newDocRef = doc(predictionsRef);

      const predictionData = {
        question: data.question,
        description: data.description || '',
        options: data.options.map((opt, index) => ({
          id: String.fromCharCode(65 + index), // 'A', 'B', 'C', etc.
          label: opt.label,
          votes: 0,
        })),
        category: data.category,
        subcategory: data.subcategory,
        imageUrl: data.imageUrl,
        sourceLink: data.sourceLink,
        createdBy: userId,
        status: 'draft',
        published: false,
        isApproved: false,
        isFeatured: false,
        startTime: data.startTime ? Timestamp.fromDate(new Date(data.startTime)) : null,
        endTime: Timestamp.fromDate(new Date(data.endTime)),
        resolutionTime: data.resolutionTime ? Timestamp.fromDate(new Date(data.resolutionTime)) : null,
        resolved: false,
        winningOption: null,
        totalVotes: 0,
        viewCount: 0,
        createdAt: Timestamp.now(),
      };

      await setDoc(newDocRef, predictionData);

      return this.mapFirestoreDoc(predictionData, newDocRef.id);
    } catch (error) {
      console.error('Error creating prediction:', error);
      throw error;
    }
  }

  async updatePrediction(id: string, data: UpdatePredictionData): Promise<void> {
    try {
      const docRef = doc(db, 'predictions', id);
      const updateData: any = { ...data };

      // Convert date strings to Timestamps
      if (data.endTime) {
        updateData.endTime = Timestamp.fromDate(new Date(data.endTime));
      }
      if (data.resolutionTime) {
        updateData.resolutionTime = Timestamp.fromDate(new Date(data.resolutionTime));
      }

      updateData.updatedAt = Timestamp.now();

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating prediction:', error);
      throw error;
    }
  }

  async deletePrediction(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'predictions', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting prediction:', error);
      throw error;
    }
  }

  async resolvePrediction(id: string, winningOption: string, userId: string): Promise<void> {
    try {
      const docRef = doc(db, 'predictions', id);
      await updateDoc(docRef, {
        status: 'resolved',
        resolved: true,
        winningOption,
        resolutionTime: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // TODO: Award points to correct voters (should be in Cloud Function)
    } catch (error) {
      console.error('Error resolving prediction:', error);
      throw error;
    }
  }

  async incrementViewCount(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'predictions', id);
      await updateDoc(docRef, {
        viewCount: increment(1),
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  }
}
