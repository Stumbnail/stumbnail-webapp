'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';
import { AuthState } from '@/types';

/**
 * Custom hook for managing authentication state
 * Uses lazy-loaded Firebase to reduce initial bundle size
 */
export function useAuth(redirectToLogin: boolean = true) {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        loading: true,
    });
    const router = useRouter();

    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        // Dynamically import Firebase auth listener
        const initAuth = async () => {
            try {
                const { onAuthChange } = await import('@/lib/firebase');
                unsubscribe = await onAuthChange((currentUser: User | null) => {
                    if (currentUser) {
                        setAuthState({ user: currentUser, loading: false });
                    } else {
                        setAuthState({ user: null, loading: false });
                        if (redirectToLogin) {
                            router.push('/login');
                        }
                    }
                });
            } catch (error) {
                console.error('Error initializing auth:', error);
                setAuthState({ user: null, loading: false });
            }
        };

        initAuth();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [router, redirectToLogin]);

    const signOut = useCallback(async () => {
        try {
            const { logOut } = await import('@/lib/firebase');
            await logOut();
            router.push('/login');
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }, [router]);

    return {
        user: authState.user,
        loading: authState.loading,
        isAuthenticated: !!authState.user,
        signOut,
    };
}
