// src/lib/firebase/adminActions.ts
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

export type AdminActionType = 
  | 'prediction_created'
  | 'prediction_resolved'
  | 'prediction_deleted'
  | 'prediction_edited'
  | 'user_promoted'
  | 'user_banned'
  | 'user_unbanned'
  | 'rank_recalculated'
  | 'category_added'
  | 'settings_changed'
  | 'trending_set';

interface LogActionParams {
  type: AdminActionType;
  description: string;
  adminId: string;
  adminName?: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
}

/**
 * Log an admin action to Firestore for activity tracking
 */
export async function logAdminAction(params: LogActionParams): Promise<void> {
  try {
    await addDoc(collection(db, 'admin_actions'), {
      type: params.type,
      description: params.description,
      adminId: params.adminId,
      adminName: params.adminName || 'Admin',
      targetId: params.targetId || null,
      targetName: params.targetName || null,
      details: params.details || {},
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw - logging should be non-blocking
  }
}
