'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Theme } from '@/types';
import { apiGet, apiPost } from '@/lib/api';

interface UseThemeOptions {
    userId?: string;
}

interface ThemeResponse {
    theme: Theme;
}

/**
 * Get initial theme synchronously from localStorage or system preference
 * This runs during useState initialization to prevent flash of wrong theme
 */
function getInitialTheme(): Theme {
    // Check if we're on the server (no window object)
    if (typeof window === 'undefined') {
        return 'light'; // Default for SSR, will be corrected on hydration
    }

    // Try localStorage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
    }

    // Fall back to system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }

    return 'light';
}

/**
 * Custom hook for managing theme state
 * Handles local storage, system preference, and backend API sync
 * Defers API calls to reduce initial load blocking
 */
export function useTheme(options: UseThemeOptions = {}) {
    const { userId } = options;
    // Use lazy initializer to read theme synchronously on first render
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);
    const [isInitialized, setIsInitialized] = useState(false);
    const hasFetchedFromDb = useRef(false);

    // Mark as initialized after first render (handles SSR hydration)
    useEffect(() => {
        // Re-check theme on mount in case SSR default was wrong
        const correctTheme = getInitialTheme();
        if (correctTheme !== theme) {
            setThemeState(correctTheme);
        }
        setIsInitialized(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally only run on mount
    }, []);

    // Sync theme with HTML element class for global theme application
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Remove both classes first to avoid conflicts
        document.documentElement.classList.remove('light', 'dark');
        // Add the current theme class
        document.documentElement.classList.add(theme);
    }, [theme]);

    // Defer database fetch to after initial render (non-blocking)
    useEffect(() => {
        if (!userId || hasFetchedFromDb.current) return;

        // Fetch theme from backend API
        const fetchThemeFromBackend = async () => {
            try {
                const data = await apiGet<ThemeResponse>('/api/user/theme');
                if (data.theme && (data.theme === 'light' || data.theme === 'dark')) {
                    setThemeState(data.theme);
                    localStorage.setItem('theme', data.theme);
                }
            } catch (error) {
                // Silently fail - user will keep their local preference
                console.error('Error fetching theme from backend:', error);
            }
            hasFetchedFromDb.current = true;
        };

        // Defer the API call to reduce blocking during initial load
        if ('requestIdleCallback' in window) {
            (window as typeof window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(() => {
                fetchThemeFromBackend();
            });
        } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(fetchThemeFromBackend, 100);
        }
    }, [userId]);

    const setTheme = useCallback(async (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);

        // Persist theme to backend API for cross-device sync (non-blocking)
        if (userId) {
            // Use toggle endpoint to sync with backend
            apiPost<ThemeResponse>('/api/user/theme/toggle').catch(error => {
                console.error('Error toggling theme on backend:', error);
            });
        }
    }, [userId]);

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    }, [theme, setTheme]);

    return {
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
        isLight: theme === 'light',
        isInitialized,
    };
}

