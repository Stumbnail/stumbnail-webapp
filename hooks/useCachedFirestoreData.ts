'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Cache configuration options
 */
interface CacheOptions {
  /**
   * LocalStorage key for caching
   */
  cacheKey: string;

  /**
   * Cache TTL in milliseconds (default: 5 minutes)
   */
  cacheTTL?: number;

  /**
   * Whether to show cached data immediately while loading fresh data
   */
  showStaleWhileRevalidate?: boolean;
}

/**
 * Cached data state
 */
interface CachedDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isStale: boolean; // true if showing cached data while revalidating
  cacheHit: boolean; // true if data was loaded from cache
}

/**
 * Hook for managing Firestore data with localStorage caching
 *
 * This hook provides:
 * - Instant loading from cache on mount
 * - Background refresh from Firestore
 * - Automatic cache invalidation
 * - Loading states for UI feedback
 *
 * @param subscriptionFn - Function that subscribes to Firestore data
 * @param options - Cache configuration options
 * @returns Cached data state with loading indicators
 *
 * @example
 * const { data, loading, isStale, cacheHit } = useCachedFirestoreData(
 *   (callback) => subscribeToUserProjects(userId, callback),
 *   { cacheKey: 'projects_cache', cacheTTL: 5 * 60 * 1000 }
 * );
 */
export function useCachedFirestoreData<T>(
  subscriptionFn: ((callback: (data: T) => void) => Promise<() => void>) | null,
  options: CacheOptions
): CachedDataState<T> {
  const {
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes default
    showStaleWhileRevalidate = true,
  } = options;

  const [state, setState] = useState<CachedDataState<T>>({
    data: null,
    loading: true,
    error: null,
    isStale: false,
    cacheHit: false,
  });

  // Load from cache on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        // Check if cache is still valid
        if (age < cacheTTL) {
          setState({
            data,
            loading: showStaleWhileRevalidate, // Still loading fresh data in background
            error: null,
            isStale: showStaleWhileRevalidate,
            cacheHit: true,
          });
          return;
        }
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    }

    // No valid cache, show loading state
    setState({
      data: null,
      loading: true,
      error: null,
      isStale: false,
      cacheHit: false,
    });
  }, [cacheKey, cacheTTL, showStaleWhileRevalidate]);

  // Subscribe to Firestore updates
  useEffect(() => {
    if (!subscriptionFn) {
      setState((prev) => ({
        ...prev,
        loading: false,
        isStale: false,
      }));
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const initSubscription = async () => {
      try {
        unsubscribe = await subscriptionFn((data) => {
          // Update state with fresh data
          setState({
            data,
            loading: false,
            error: null,
            isStale: false,
            cacheHit: false,
          });

          // Cache the fresh data
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                data,
                timestamp: Date.now(),
              })
            );
          } catch (error) {
            console.error('Error caching data:', error);
          }
        });
      } catch (error) {
        console.error('Error subscribing to data:', error);
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load data',
          isStale: false,
          cacheHit: false,
        });
      }
    };

    initSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [subscriptionFn, cacheKey]);

  return state;
}

/**
 * Clear cache for a specific key
 */
export function clearCache(cacheKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Clear all Firestore caches
 */
export function clearAllFirestoreCaches(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.endsWith('_cache')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
}
