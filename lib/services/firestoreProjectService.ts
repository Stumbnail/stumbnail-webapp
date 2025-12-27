/**
 * Firestore Project Service - Direct Firestore access for real-time project data
 * SECURITY: Only accesses projects owned by the authenticated user
 *
 * This service provides:
 * - Real-time subscription to user's projects (~50-100ms latency vs ~200-500ms API)
 * - Debounced viewport updates
 *
 * Backend API is still used for: create, delete, and metadata updates (name, privacy)
 */

import { getFirestore } from '@/lib/firebase';
import type { Timestamp } from 'firebase/firestore';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

/**
 * Firestore Project document structure
 * Matches /projects/{projectId} in Firestore
 */
export interface FirestoreProject {
  id: string;
  ownerId: string;
  ownerEmail: string;
  name: string;
  privacy: 'public' | 'private';
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  thumbnailsCount: number;
  previewImage: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isFavorite?: boolean;
}

/**
 * Frontend-friendly project type (Timestamps converted to strings)
 */
export interface Project {
  id: string;
  ownerId: string;
  ownerEmail: string;
  name: string;
  privacy: 'public' | 'private';
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  thumbnailsCount: number;
  previewImage: string | null;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
}

/**
 * Viewport update request
 */
export interface ViewportUpdate {
  x?: number;
  y?: number;
  zoom?: number;
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Transform Firestore document to frontend Project type
 */
function transformFirestoreProject(doc: FirestoreProject): Project {
  return {
    id: doc.id,
    ownerId: doc.ownerId,
    ownerEmail: doc.ownerEmail,
    name: doc.name,
    privacy: doc.privacy,
    viewport: doc.viewport,
    thumbnailsCount: doc.thumbnailsCount,
    previewImage: doc.previewImage,
    createdAt: doc.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
    updatedAt: doc.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
    isFavorite: doc.isFavorite || false,
  };
}

// ═══════════════════════════════════════════════════════
// REAL-TIME SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════

/**
 * Subscribe to all projects owned by the user (real-time)
 * SECURITY: Uses Firestore query where ownerId == authenticated UID
 *
 * @param userId - Authenticated user's UID (from Firebase Auth)
 * @param callback - Called when projects change
 * @returns Unsubscribe function
 */
export async function subscribeToUserProjects(
  userId: string,
  callback: (projects: Project[]) => void
): Promise<() => void> {
  if (!userId) {
    console.error('subscribeToUserProjects: userId is required');
    callback([]);
    return () => { };
  }

  try {
    const { collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');
    const db = await getFirestore();

    // SECURITY: Query projects where ownerId matches authenticated user
    const projectsRef = collection(db, 'projects');
    const q = query(
      projectsRef,
      where('ownerId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const projects = snapshot.docs.map((doc) => {
          const data = doc.data() as FirestoreProject;
          return transformFirestoreProject({ ...data, id: doc.id });
        });
        callback(projects);
      },
      (error) => {
        console.error('Error in projects subscription:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up projects subscription:', error);
    callback([]);
    return () => { };
  }
}

/**
 * Subscribe to a single project (real-time)
 * SECURITY: Firestore rules enforce that user can only read their own projects
 *
 * @param projectId - Project document ID
 * @param callback - Called when project changes
 * @returns Unsubscribe function
 */
export async function subscribeToProject(
  projectId: string,
  callback: (project: Project | null) => void
): Promise<() => void> {
  if (!projectId) {
    console.error('subscribeToProject: projectId is required');
    callback(null);
    return () => { };
  }

  try {
    const { doc, onSnapshot } = await import('firebase/firestore');
    const db = await getFirestore();

    const projectRef = doc(db, 'projects', projectId);

    const unsubscribe = onSnapshot(
      projectRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          callback(null);
          return;
        }

        const data = docSnap.data() as FirestoreProject;
        callback(transformFirestoreProject({ ...data, id: docSnap.id }));
      },
      (error) => {
        console.error('Error in project subscription:', error);
        callback(null);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up project subscription:', error);
    callback(null);
    return () => { };
  }
}

// ═══════════════════════════════════════════════════════
// WRITE OPERATIONS (DEBOUNCED)
// ═══════════════════════════════════════════════════════

/**
 * Update project viewport (debounced in calling code)
 * SECURITY: Firestore rules enforce that only viewport and updatedAt can be updated
 *
 * @param projectId - Project document ID
 * @param viewport - Partial viewport update { x?, y?, zoom? }
 */
export async function updateProjectViewport(
  projectId: string,
  viewport: ViewportUpdate
): Promise<void> {
  if (!projectId) {
    throw new Error('updateProjectViewport: projectId is required');
  }

  try {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const db = await getFirestore();

    const projectRef = doc(db, 'projects', projectId);

    // Build update object - only include fields that are provided
    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (viewport.x !== undefined) {
      updates['viewport.x'] = viewport.x;
    }
    if (viewport.y !== undefined) {
      updates['viewport.y'] = viewport.y;
    }
    if (viewport.zoom !== undefined) {
      updates['viewport.zoom'] = viewport.zoom;
    }

    await updateDoc(projectRef, updates);
  } catch (error) {
    console.error('Error updating project viewport:', error);
    throw error;
  }
}

/**
 * Toggle project favorite status
 * SECURITY: Firestore rules enforce that only owner can update
 * 
 * @param projectId - Project document ID
 * @param isFavorite - New favorite status
 */
export async function toggleProjectFavorite(
  projectId: string,
  isFavorite: boolean
): Promise<void> {
  if (!projectId) {
    throw new Error('toggleProjectFavorite: projectId is required');
  }

  try {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const db = await getFirestore();

    const projectRef = doc(db, 'projects', projectId);

    await updateDoc(projectRef, {
      isFavorite,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error toggling project favorite:', error);
    throw error;
  }
}
