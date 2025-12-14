'use client';

import { useState, useEffect } from 'react';
import {
  subscribeToProjectThumbnails,
  type Thumbnail,
} from '@/lib/services/firestoreThumbnailService';

/**
 * Thumbnails Firestore state
 */
export interface ThumbnailsFirestoreState {
  thumbnails: Thumbnail[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for real-time Firestore subscription to project thumbnails
 * SECURITY: Only accesses thumbnails owned by the authenticated user
 *
 * @param projectId - The project ID to subscribe to
 * @returns Thumbnails state with loading and error handling
 *
 * @example
 * const { thumbnails, loading, error } = useThumbnailsFirestore(projectId);
 */
export function useThumbnailsFirestore(projectId: string | null): ThumbnailsFirestoreState {
  const [state, setState] = useState<ThumbnailsFirestoreState>({
    thumbnails: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    // No projectId, reset state
    if (!projectId) {
      setState({
        thumbnails: [],
        loading: false,
        error: null,
      });
      return;
    }

    let unsubscribe: (() => void) | null = null;

    // Subscribe to project thumbnails
    const initSubscription = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        unsubscribe = await subscribeToProjectThumbnails(projectId, (thumbnails) => {
          setState({
            thumbnails,
            loading: false,
            error: null,
          });
        });
      } catch (error) {
        console.error('Error subscribing to thumbnails:', error);
        setState({
          thumbnails: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load thumbnails',
        });
      }
    };

    initSubscription();

    // Cleanup subscription on unmount or projectId change
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [projectId]);

  return state;
}
