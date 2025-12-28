'use client';

import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { getFirebaseAnalytics, logAnalyticsEvent } from '@/lib/firebase';

interface AnalyticsProviderProps {
    children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
    useEffect(() => {
        // Initialize Firebase Analytics on mount
        getFirebaseAnalytics().catch((error) => {
            console.warn('Firebase Analytics initialization failed:', error);
        });
    }, []);

    return (
        <>
            {children}
            {/* Vercel Analytics - automatically tracks page views */}
            <Analytics />
        </>
    );
}

// Re-export the logAnalyticsEvent function for easy access
export { logAnalyticsEvent };
