'use client';

import { useEffect, RefObject } from 'react';

/**
 * Custom hook that triggers a callback when a click occurs outside of specified elements
 * 
 * @param refs - Array of refs to elements that should be considered "inside"
 * @param callback - Function to call when clicking outside
 * @param enabled - Whether the listener should be active (defaults to true)
 */
export function useClickOutside(
    refs: RefObject<HTMLElement>[],
    callback: () => void,
    enabled: boolean = true
) {
    useEffect(() => {
        if (!enabled) return;

        function handleClickOutside(event: MouseEvent) {
            const clickedOutsideAll = refs.every(ref =>
                ref.current && !ref.current.contains(event.target as Node)
            );

            if (clickedOutsideAll) {
                callback();
            }
        }

        // Use mousedown for better UX (triggers before focus changes)
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [refs, callback, enabled]);
}

/**
 * Simplified version for a single ref
 */
export function useClickOutsideSingle(
    ref: RefObject<HTMLElement>,
    callback: () => void,
    enabled: boolean = true
) {
    useClickOutside([ref], callback, enabled);
}
