// src/hooks/usePredictions.ts
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface Prediction {
  id: string;
  question: string;
  description?: string;
  options?: Array<{ id: string; label: string; votes: number }>;
  category: string;
  categoryId?: string;
  subcategory?: string;
  tags?: string[];
  createdBy: string;
  creatorName?: string;
  status: 'draft' | 'scheduled' | 'active' | 'closed' | 'resolved' | 'pending' | 'cancelled';
  createdAt: Timestamp;
  startTime?: Timestamp;
  endTime: Timestamp;
  startDate?: Timestamp; // Legacy
  endDate?: Timestamp; // Legacy
  resolutionTime?: Timestamp;
  resolvedAt?: Timestamp;
  resolved?: boolean;
  winningOption?: string | null;
  resolvedOption?: 'A' | 'B' | 'cancelled';
  isApproved: boolean;
  published?: boolean;
  isFeatured?: boolean;
  viewCount?: number;
  totalVotes?: number;
  imageUrl?: string;
  sourceLink?: string;
  displayTemplate?: string;
  
  // Legacy fields for backward compatibility
  optionA?: string;
  optionB?: string;
  voteCountA?: number;
  voteCountB?: number;
}

export function usePredictions(status?: 'pending' | 'active' | 'resolved') {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const predictionsRef = collection(db, 'predictions');
      
      // Simplified query - just get all predictions ordered by creation date
      let q = query(
        predictionsRef,
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Prediction[];
        
        // Filter for approved predictions or predictions without isApproved field (legacy)
        // If isApproved is undefined, treat as approved for backward compatibility
        const approved = data.filter(p => p.isApproved !== false);
        
        // If status filter is provided, apply it
        const filtered = status 
          ? approved.filter(p => p.status === status)
          : approved;
        
        setPredictions(filtered);
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
