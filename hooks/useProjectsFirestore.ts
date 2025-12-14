'use client';

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import {
  subscribeToUserProjects,
  type Project,
} from '@/lib/services/firestoreProjectService';

/**
 * Projects Firestore state
 */
export interface ProjectsFirestoreState {
  projects: Project[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for real-time Firestore subscription to user's projects
 * SECURITY: Only accesses projects owned by the authenticated user
 *
 * @param user - The authenticated Firebase user (from useAuth)
 * @returns Projects state with loading and error handling
 *
 * @example
 * const { user } = useAuth();
 * const { projects, loading, error } = useProjectsFirestore(user);
 */
export function useProjectsFirestore(user: User | null): ProjectsFirestoreState {
  const [state, setState] = useState<ProjectsFirestoreState>({
    projects: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    // No user, reset state
    if (!user) {
      setState({
        projects: [],
        loading: false,
        error: null,
      });
      return;
    }

    let unsubscribe: (() => void) | null = null;

    // Subscribe to user's projects
    const initSubscription = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        // SECURITY: user.uid comes from Firebase Auth, not user input
        unsubscribe = await subscribeToUserProjects(user.uid, (projects) => {
          setState({
            projects,
            loading: false,
            error: null,
          });
        });
      } catch (error) {
        console.error('Error subscribing to projects:', error);
        setState({
          projects: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load projects',
        });
      }
    };

    initSubscription();

    // Cleanup subscription on unmount or user change
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  return state;
}
