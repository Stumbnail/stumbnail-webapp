'use client';

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { UserDataState } from '@/types';
import { subscribeToUserData, calculateTotalCredits } from '@/lib/services/userService';

/**
 * Custom hook for fetching and subscribing to user data from Firestore
 * SECURITY: Only accesses the authenticated user's own document
 *
 * @param user - The authenticated Firebase user (from useAuth)
 * @returns User data state with loading and error handling
 *
 * @example
 * const { user } = useAuth();
 * const { userData, totalCredits, loading, error } = useUserData(user);
 */
export function useUserData(user: User | null) {
  const [state, setState] = useState<UserDataState>({
    userData: null,
    totalCredits: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // No user, reset state
    if (!user) {
      setState({
        userData: null,
        totalCredits: 0,
        loading: false,
        error: null,
      });
      return;
    }

    let unsubscribe: (() => void) | null = null;

    // Subscribe to user data changes
    const initSubscription = async () => {
      try {
        // SECURITY: user.uid comes from Firebase Auth, not user input
        unsubscribe = await subscribeToUserData(user.uid, (userData) => {
          if (userData) {
            setState({
              userData,
              totalCredits: calculateTotalCredits(userData),
              loading: false,
              error: null,
            });
          } else {
            setState({
              userData: null,
              totalCredits: 0,
              loading: false,
              error: 'User data not found',
            });
          }
        });
      } catch (error) {
        console.error('Error subscribing to user data:', error);
        setState({
          userData: null,
          totalCredits: 0,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load user data',
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
