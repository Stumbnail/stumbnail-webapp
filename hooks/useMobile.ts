'use client';

import { useState, useEffect, useCallback } from 'react';
import { debounce } from '@/lib/utils/debounce';

/**
 * Custom hook for detecting mobile viewport
 * Uses debounced resize handler for performance
 */
export function useMobile(breakpoint: number = 768) {
    const [isMobile, setIsMobile] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const checkMobile = useCallback(() => {
        setIsMobile(window.innerWidth <= breakpoint);
        if (window.innerWidth > breakpoint) {
            setSidebarOpen(false);
        }
    }, [breakpoint]);

    useEffect(() => {
        // Initial check
        checkMobile();

        // Debounced resize handler (150ms delay) for better performance
        const debouncedCheckMobile = debounce(checkMobile, 150);

        // Use passive event listener for better scroll/resize performance
        window.addEventListener('resize', debouncedCheckMobile, { passive: true });
        return () => window.removeEventListener('resize', debouncedCheckMobile);
    }, [checkMobile]);

    const toggleSidebar = useCallback(() => {
        setSidebarOpen(prev => !prev);
    }, []);

    const closeSidebar = useCallback(() => {
        setSidebarOpen(false);
    }, []);

    return {
        isMobile,
        sidebarOpen,
        toggleSidebar,
        closeSidebar,
        setSidebarOpen,
    };
}
