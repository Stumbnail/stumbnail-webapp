'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Theme } from '@/types';

interface UseThemeOptions {
    userId?: string;
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
 * Handles local storage, system preference, and database sync
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

        // Use requestIdleCallback to defer API call until browser is idle
        const fetchThemeFromDb = async () => {
            try {
                const response = await fetch(`/api/user/theme?userId=${userId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.theme && (data.theme === 'light' || data.theme === 'dark')) {
                        setThemeState(data.theme);
                        localStorage.setItem('theme', data.theme);
                    }
                }
            } catch (error) {
                console.error('Error fetching theme from database:', error);
            }
            hasFetchedFromDb.current = true;
        };

        // Defer the API call to reduce blocking during initial load
        if ('requestIdleCallback' in window) {
            (window as typeof window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(() => {
                fetchThemeFromDb();
            });
        } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(fetchThemeFromDb, 100);
        }
    }, [userId]);

    const setTheme = useCallback(async (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);

        // Persist theme to database for cross-device sync (non-blocking)
        if (userId) {
            // Don't await - fire and forget for better performance
            fetch('/api/user/theme', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    theme: newTheme,
                }),
            }).catch(error => {
                console.error('Error updating theme:', error);
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
