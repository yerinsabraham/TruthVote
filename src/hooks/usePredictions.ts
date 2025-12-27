// src/hooks/usePredictions.ts
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface Prediction {
  id: string;
  question: string;
  description?: string;
  optionA: string;
  optionB: string;
  voteCountA: number;
  voteCountB: number;
  category: string;
  subcategory?: string;
  tags: string[];
  createdBy: string;
  creatorName: string;
  status: 'pending' | 'active' | 'resolved' | 'cancelled';
  createdAt: Timestamp;
  startDate: Timestamp;
  endDate: Timestamp;
  resolvedAt?: Timestamp;
  resolvedOption?: 'A' | 'B' | 'cancelled';
  isApproved: boolean;
  isFeatured: boolean;
  viewCount: number;
  imageUrl?: string;
}

export function usePredictions(status?: 'pending' | 'active' | 'resolved') {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const predictionsRef = collection(db, 'predictions');
      
      let q = query(
        predictionsRef,
        where('isApproved', '==', true),
        orderBy('createdAt', 'desc')
      );

      if (status) {
        q = query(
          predictionsRef,
          where('isApproved', '==', true),
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Prediction[];
        
        setPredictions(data);
        setLoading(false);
      }, (err) => {
        console.error('Error fetching predictions:', err);
        setError(err.message);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error setting up predictions listener:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [status]);

  return { predictions, loading, error };
}
