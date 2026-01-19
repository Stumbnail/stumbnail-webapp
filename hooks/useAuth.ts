'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { User } from 'firebase/auth';
import { AuthState } from '@/types';

/**
 * Custom hook for managing authentication state
 * Uses lazy-loaded Firebase to reduce initial bundle size
 */
export function useAuth(redirectToLogin: boolean = true, redirectMessage?: string) {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        loading: true,
    });
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

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
                            // Construct return URL
                            let returnUrl = pathname;
                            const params = searchParams?.toString();
                            if (params) {
                                returnUrl += `?${params}`;
                            }

                            // Prevent redirect loops if already on login
                            if (pathname?.startsWith('/login')) return;

                            let loginUrl = `/login?redirect=${encodeURIComponent(returnUrl || '/')}`;
                            if (redirectMessage) {
                                loginUrl += `&message=${encodeURIComponent(redirectMessage)}`;
                            }

                            router.push(loginUrl);
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
    }, [router, redirectToLogin, pathname, searchParams]);

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
