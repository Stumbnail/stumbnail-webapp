'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Theme } from '@/types';

interface UseThemeOptions {
    userId?: string;
}

/**
 * Custom hook for managing theme state
 * Handles local storage, system preference, and database sync
 * Defers API calls to reduce initial load blocking
 */
export function useTheme(options: UseThemeOptions = {}) {
    const { userId } = options;
    const [theme, setThemeState] = useState<Theme>('light');
    const [isInitialized, setIsInitialized] = useState(false);
    const hasFetchedFromDb = useRef(false);

    // Initialize theme from localStorage or system preference (synchronous - fast)
    useEffect(() => {
        // First, check localStorage for immediate UI update
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        if (savedTheme) {
            setThemeState(savedTheme);
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setThemeState(prefersDark ? 'dark' : 'light');
        }
        setIsInitialized(true);
    }, []);

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
