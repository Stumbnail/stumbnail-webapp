/**
 * Firestore Thumbnail Service - Direct Firestore access for real-time thumbnail data
 * SECURITY: Only accesses thumbnails owned by the authenticated user
 *
 * This service provides:
 * - Real-time subscription to project thumbnails (~50-100ms latency vs ~200-500ms API)
 * - Debounced position/size updates
 *
 * Backend API is still used for: create, delete, generate, and upload operations
 */

import { getFirestore } from '@/lib/firebase';
import type { Timestamp } from 'firebase/firestore';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

/**
 * Reference image for generation
 */
export interface RefImage {
  type: 'youtube' | 'upload' | 'url';
  youtubeVideoId?: string;
  youtubeUrl?: string;
  storageUrl?: string;
  previewUrl: string;
}

/**
 * Firestore Thumbnail document structure
 * Matches /projects/{projectId}/thumbnails/{thumbnailId} in Firestore
 */
export interface FirestoreThumbnail {
  id: string;
  projectId: string;
  ownerId: string;
  thumbnailUrl: string;
  type: 'generated' | 'youtube-thumbnail' | 'uploaded';
  status: 'generating' | 'complete' | 'failed';
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  aspectRatio: number;
  prompt: string | null;
  systemRefinedPrompt?: string | null;
  model: string | null;
  style: string | null;
  refImages: RefImage[];
  likesCount: number;
  likedBy?: string[];
  isPublic?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Frontend-friendly thumbnail type (Timestamps converted to strings)
 */
export interface Thumbnail {
  id: string;
  projectId: string;
  ownerId: string;
  thumbnailUrl: string;
  type: 'generated' | 'youtube-thumbnail' | 'uploaded';
  status: 'generating' | 'complete' | 'failed';
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  aspectRatio: number;
  prompt: string | null;
  systemRefinedPrompt?: string | null;
  model: string | null;
  style: string | null;
  refImages: RefImage[];
  likesCount: number;
  likedBy?: string[];
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Position/size update request
 */
export interface ThumbnailPositionUpdate {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/**
 * Batch position update
 */
export interface BatchPositionUpdate {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Transform Firestore document to frontend Thumbnail type
 */
function transformFirestoreThumbnail(doc: FirestoreThumbnail): Thumbnail {
  return {
    id: doc.id,
    projectId: doc.projectId,
    ownerId: doc.ownerId,
    thumbnailUrl: doc.thumbnailUrl,
    type: doc.type,
    status: doc.status,
    x: doc.x,
    y: doc.y,
    width: doc.width,
    height: doc.height,
    naturalWidth: doc.naturalWidth,
    naturalHeight: doc.naturalHeight,
    aspectRatio: doc.aspectRatio,
    prompt: doc.prompt,
    systemRefinedPrompt: doc.systemRefinedPrompt,
    model: doc.model,
    style: doc.style,
    refImages: doc.refImages || [],
    likesCount: doc.likesCount || 0,
    likedBy: doc.likedBy,
    isPublic: doc.isPublic,
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════
// REAL-TIME SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════

/**
 * Subscribe to all thumbnails in a project (real-time)
 * SECURITY: Firestore rules enforce that user can only read thumbnails they own
 *
 * @param projectId - Project document ID
 * @param callback - Called when thumbnails change
 * @returns Unsubscribe function
 */
export async function subscribeToProjectThumbnails(
  projectId: string,
  callback: (thumbnails: Thumbnail[]) => void
): Promise<() => void> {
  if (!projectId) {
    console.error('subscribeToProjectThumbnails: projectId is required');
    callback([]);
    return () => {};
  }

  try {
    const { collection, query, orderBy, onSnapshot } = await import('firebase/firestore');
    const db = await getFirestore();

    // SECURITY: Subcollection path inherits parent's security rules
    const thumbnailsRef = collection(db, `projects/${projectId}/thumbnails`);
    const q = query(thumbnailsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const thumbnails = snapshot.docs.map((doc) => {
          const data = doc.data() as FirestoreThumbnail;
          return transformFirestoreThumbnail({ ...data, id: doc.id });
        });
        callback(thumbnails);
      },
      (error) => {
        console.error('Error in thumbnails subscription:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up thumbnails subscription:', error);
    callback([]);
    return () => {};
  }
}

/**
 * Subscribe to a single thumbnail (real-time)
 * SECURITY: Firestore rules enforce that user can only read their own thumbnails
 *
 * @param projectId - Project document ID
 * @param thumbnailId - Thumbnail document ID
 * @param callback - Called when thumbnail changes
 * @returns Unsubscribe function
 */
export async function subscribeToThumbnail(
  projectId: string,
  thumbnailId: string,
  callback: (thumbnail: Thumbnail | null) => void
): Promise<() => void> {
  if (!projectId || !thumbnailId) {
    console.error('subscribeToThumbnail: projectId and thumbnailId are required');
    callback(null);
    return () => {};
  }

  try {
    const { doc, onSnapshot } = await import('firebase/firestore');
    const db = await getFirestore();

    const thumbnailRef = doc(db, `projects/${projectId}/thumbnails/${thumbnailId}`);

    const unsubscribe = onSnapshot(
      thumbnailRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          callback(null);
          return;
        }

        const data = docSnap.data() as FirestoreThumbnail;
        callback(transformFirestoreThumbnail({ ...data, id: docSnap.id }));
      },
      (error) => {
        console.error('Error in thumbnail subscription:', error);
        callback(null);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up thumbnail subscription:', error);
    callback(null);
    return () => {};
  }
}

// ═══════════════════════════════════════════════════════
// WRITE OPERATIONS (DEBOUNCED)
// ═══════════════════════════════════════════════════════

/**
 * Update thumbnail position/size (debounced in calling code)
 * SECURITY: Firestore rules enforce that only position fields can be updated
 *
 * @param projectId - Project document ID
 * @param thumbnailId - Thumbnail document ID
 * @param position - Partial position update { x?, y?, width?, height? }
 */
export async function updateThumbnailPosition(
  projectId: string,
  thumbnailId: string,
  position: ThumbnailPositionUpdate
): Promise<void> {
  if (!projectId || !thumbnailId) {
    throw new Error('updateThumbnailPosition: projectId and thumbnailId are required');
  }

  try {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const db = await getFirestore();

    const thumbnailRef = doc(db, `projects/${projectId}/thumbnails/${thumbnailId}`);

    // Build update object - only include fields that are provided
    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (position.x !== undefined) updates.x = position.x;
    if (position.y !== undefined) updates.y = position.y;
    if (position.width !== undefined) updates.width = position.width;
    if (position.height !== undefined) updates.height = position.height;

    await updateDoc(thumbnailRef, updates);
  } catch (error) {
    console.error('Error updating thumbnail position:', error);
    throw error;
  }
}

/**
 * Update multiple thumbnail positions in a batch (for group drag operations)
 * SECURITY: Firestore rules enforce that only position fields can be updated
 *
 * @param projectId - Project document ID
 * @param updates - Array of thumbnail position updates
 */
export async function batchUpdateThumbnailPositions(
  projectId: string,
  updates: BatchPositionUpdate[]
): Promise<void> {
  if (!projectId || !updates.length) {
    return;
  }

  try {
    const { doc, writeBatch, serverTimestamp } = await import('firebase/firestore');
    const db = await getFirestore();

    const batch = writeBatch(db);
    const timestamp = serverTimestamp();

    for (const update of updates) {
      const thumbnailRef = doc(db, `projects/${projectId}/thumbnails/${update.id}`);

      const updateData: Record<string, unknown> = {
        updatedAt: timestamp,
      };

      if (update.x !== undefined) updateData.x = update.x;
      if (update.y !== undefined) updateData.y = update.y;
      if (update.width !== undefined) updateData.width = update.width;
      if (update.height !== undefined) updateData.height = update.height;

      batch.update(thumbnailRef, updateData);
    }

    await batch.commit();
  } catch (error) {
    console.error('Error batch updating thumbnail positions:', error);
    throw error;
  }
}
