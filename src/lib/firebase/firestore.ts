// src/lib/firebase/firestore.ts
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
  limit,
  serverTimestamp,
  Timestamp,
  WhereFilterOp
} from 'firebase/firestore';
import { db } from './config';

// Generic Firestore helpers
export async function getDocument(collectionName: string, documentId: string) {
  const docRef = doc(db, collectionName, documentId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

export async function getDocuments(
  collectionName: string, 
  filters?: { field: string; operator: WhereFilterOp; value: any }[],
  orderByField?: string,
  orderDirection: 'asc' | 'desc' = 'desc',
  limitCount?: number
) {
  let q = query(collection(db, collectionName));
  
  // Apply filters
  if (filters && filters.length > 0) {
    filters.forEach(filter => {
      q = query(q, where(filter.field, filter.operator, filter.value));
    });
  }
  
  // Apply ordering
  if (orderByField) {
    q = query(q, orderBy(orderByField, orderDirection));
  }
  
  // Apply limit
  if (limitCount) {
    q = query(q, limit(limitCount));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createDocument(collectionName: string, documentId: string, data: any) {
  await setDoc(doc(db, collectionName, documentId), {
    ...data,
    createdAt: serverTimestamp()
  });
}

export async function updateDocument(collectionName: string, documentId: string, data: any) {
  await updateDoc(doc(db, collectionName, documentId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function deleteDocument(collectionName: string, documentId: string) {
  await deleteDoc(doc(db, collectionName, documentId));
}

// Timestamp converter
export function timestampToDate(timestamp: Timestamp | undefined): Date | null {
  if (!timestamp) return null;
  return timestamp.toDate();
}

export { serverTimestamp, Timestamp };
