'use client';

import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { useConsentContext } from '@/contexts';
import { getFirebaseAnalytics, logAnalyticsEvent, setFirebaseConsent } from '@/lib/firebase';

interface AnalyticsProviderProps {
    children: React.ReactNode;
}

function removeVercelAnalyticsScript() {
    if (typeof document === 'undefined') return;

    const scriptSelectors = [
        'script[src*="/_vercel/insights/script.js"]',
        'script[src*="/insights/script.js"]',
        'script[src*="va.vercel-scripts.com"]',
    ];

    document.querySelectorAll<HTMLScriptElement>(scriptSelectors.join(',')).forEach((script) => {
        script.remove();
    });

    const analyticsWindow = window as typeof window & {
        va?: (...args: unknown[]) => void;
        vaq?: unknown[];
        webAnalyticsBeforeSend?: unknown;
    };

    delete analyticsWindow.va;
    delete analyticsWindow.webAnalyticsBeforeSend;
    analyticsWindow.vaq = [];
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
    const { isLoaded, preferences, hasAnalyticsConsent } = useConsentContext();

    useEffect(() => {
        // Advanced consent mode keeps Google defaults denied until the user decides.
        // Initializing here lets Firebase/gtag pick up those defaults immediately.
        getFirebaseAnalytics().catch((error) => {
            console.warn('Firebase Analytics initialization failed:', error);
        });
    }, []);

    useEffect(() => {
        if (!isLoaded) return;

        setFirebaseConsent(preferences).catch((error) => {
            console.warn('Firebase consent update failed:', error);
        });
    }, [isLoaded, preferences]);

    useEffect(() => {
        if (hasAnalyticsConsent) return;
        removeVercelAnalyticsScript();
    }, [hasAnalyticsConsent]);

    return (
        <>
            {children}
            {hasAnalyticsConsent ? <Analytics /> : null}
        </>
    );
}

// Re-export the logAnalyticsEvent function for easy access
export { logAnalyticsEvent };
