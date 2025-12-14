'use client';

import { useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for debounced Firestore updates
 * Batches rapid updates to reduce Firestore write operations
 *
 * @param updateFn - The Firestore update function to call
 * @param delay - Debounce delay in milliseconds (default: 500ms)
 * @returns Debounced update function
 *
 * @example
 * const updatePosition = useDebouncedFirestoreUpdate(
 *   (position) => updateThumbnailPosition(projectId, thumbnailId, position),
 *   500
 * );
 *
 * // Rapid calls will be batched
 * updatePosition({ x: 100 });
 * updatePosition({ x: 101 }); // Only this final position will be written
 * updatePosition({ x: 102 });
 */
export function useDebouncedFirestoreUpdate<T>(
  updateFn: (data: T) => Promise<void>,
  delay: number = 500
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<T | null>(null);
  const isMountedRef = useRef(true);

  // Track mounted state to prevent updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedUpdate = useCallback(
    (data: T) => {
      // Merge with pending update if exists
      if (pendingUpdateRef.current) {
        pendingUpdateRef.current = {
          ...pendingUpdateRef.current,
          ...data,
        };
      } else {
        pendingUpdateRef.current = data;
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(async () => {
        if (!isMountedRef.current || !pendingUpdateRef.current) return;

        const dataToUpdate = pendingUpdateRef.current;
        pendingUpdateRef.current = null;

        try {
          await updateFn(dataToUpdate);
        } catch (error) {
          console.error('Error in debounced Firestore update:', error);
        }
      }, delay);
    },
    [updateFn, delay]
  );

  // Flush any pending updates immediately
  const flush = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!pendingUpdateRef.current || !isMountedRef.current) return;

    const dataToUpdate = pendingUpdateRef.current;
    pendingUpdateRef.current = null;

    try {
      await updateFn(dataToUpdate);
    } catch (error) {
      console.error('Error flushing debounced update:', error);
    }
  }, [updateFn]);

  return { debouncedUpdate, flush };
}

/**
 * Debounced batch update hook for updating multiple items at once
 * Useful for group drag operations where multiple thumbnails move together
 *
 * @param batchUpdateFn - The batch Firestore update function
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns Debounced batch update function
 *
 * @example
 * const updatePositions = useDebouncedBatchUpdate(
 *   (updates) => batchUpdateThumbnailPositions(projectId, updates),
 *   300
 * );
 *
 * // Updates for multiple thumbnails will be batched
 * updatePositions([
 *   { id: 'thumb1', x: 100, y: 200 },
 *   { id: 'thumb2', x: 300, y: 400 },
 * ]);
 */
export function useDebouncedBatchUpdate<T extends { id: string }>(
  batchUpdateFn: (items: T[]) => Promise<void>,
  delay: number = 300
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<string, T>>(new Map());
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedBatchUpdate = useCallback(
    (items: T[]) => {
      // Add/merge items to pending updates map
      items.forEach((item) => {
        const existing = pendingUpdatesRef.current.get(item.id);
        pendingUpdatesRef.current.set(item.id, {
          ...existing,
          ...item,
        });
      });

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(async () => {
        if (!isMountedRef.current || pendingUpdatesRef.current.size === 0) return;

        const itemsToUpdate = Array.from(pendingUpdatesRef.current.values());
        pendingUpdatesRef.current.clear();

        try {
          await batchUpdateFn(itemsToUpdate);
        } catch (error) {
          console.error('Error in debounced batch update:', error);
        }
      }, delay);
    },
    [batchUpdateFn, delay]
  );

  // Flush any pending updates immediately
  const flush = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (pendingUpdatesRef.current.size === 0 || !isMountedRef.current) return;

    const itemsToUpdate = Array.from(pendingUpdatesRef.current.values());
    pendingUpdatesRef.current.clear();

    try {
      await batchUpdateFn(itemsToUpdate);
    } catch (error) {
      console.error('Error flushing debounced batch update:', error);
    }
  }, [batchUpdateFn]);

  return { debouncedBatchUpdate, flush };
}
