'use client';

import { useMemo, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  subscribeToUserProjects,
  type Project,
} from '@/lib/services/firestoreProjectService';
import { useCachedFirestoreData } from './useCachedFirestoreData';

/**
 * Projects Firestore state
 */
export interface ProjectsFirestoreState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  isStale: boolean; // true if showing cached data while fetching fresh data
  cacheHit: boolean; // true if data was loaded from cache
}

/**
 * Custom hook for real-time Firestore subscription to user's projects with caching
 * SECURITY: Only accesses projects owned by the authenticated user
 *
 * Features:
 * - Instant loading from cache on mount
 * - Background refresh from Firestore
 * - Real-time updates when data changes
 * - Automatic cache invalidation (5 min TTL)
 *
 * @param user - The authenticated Firebase user (from useAuth)
 * @returns Projects state with loading and cache indicators
 *
 * @example
 * const { projects, loading, isStale, cacheHit } = useProjectsFirestore(user);
 * // isStale = true: showing cached data while loading fresh data
 * // cacheHit = true: data was loaded from cache (fast!)
 */
export function useProjectsFirestore(user: User | null): ProjectsFirestoreState {
  // Create subscription function for the user
  const subscriptionFn = useMemo(() => {
    if (!user) return null;

    return (callback: (projects: Project[]) => void) => {
      // SECURITY: user.uid comes from Firebase Auth, not user input
      return subscribeToUserProjects(user.uid, callback);
    };
  }, [user?.uid]);

  // Use cached Firestore data with user-specific cache key
  const cacheKey = user ? `projects_${user.uid}_cache` : 'projects_cache';
  const { data, loading, error, isStale, cacheHit } = useCachedFirestoreData<Project[]>(
    subscriptionFn,
    {
      cacheKey,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      showStaleWhileRevalidate: true, // Show cached data while loading fresh
    }
  );

  return {
    projects: data || [],
    loading,
    error,
    isStale,
    cacheHit,
  };
}
