/**
 * Analytics utility for tracking custom events
 * Sends events to both Vercel Analytics and Google Analytics
 * Also supports Firestore event storage for detailed analytics
 */

import { track } from '@vercel/analytics/react';
import { apiPost } from './api';

// Event properties type
type EventProperties = Record<string, string | number | boolean | null | undefined>;

// User plan type
type UserPlan = 'free' | 'creator' | 'automation';

// Session storage keys
const SESSION_ID_KEY = 'stumbnail_session_id';
const GENERATION_COUNT_KEY = 'stumbnail_gen_count';

// ============================================
// Session Management
// ============================================

/**
 * Get or create a session ID (persists in localStorage for the browser session)
 */
export function getSessionId(): string {
    if (typeof window === 'undefined') return 'server';

    let sessionId = localStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
}

/**
 * Get the current generation count for this session
 */
export function getGenerationCount(): number {
    if (typeof window === 'undefined') return 0;
    return parseInt(sessionStorage.getItem(GENERATION_COUNT_KEY) || '0', 10);
}

/**
 * Increment and return the generation count for this session
 */
export function incrementGenerationCount(): number {
    if (typeof window === 'undefined') return 0;
    const count = getGenerationCount() + 1;
    sessionStorage.setItem(GENERATION_COUNT_KEY, count.toString());
    return count;
}

/**
 * Reset the session (useful for testing or on explicit logout)
 */
export function resetSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.removeItem(GENERATION_COUNT_KEY);
}

// ============================================
// Firestore Event Tracking
// ============================================

interface FirestoreEventPayload {
    event_name: string;
    session_id: string;
    route?: string;
    project_id?: string;
    credits_remaining?: number;
    plan_tier?: UserPlan;
    generation_count_in_session?: number;
    properties?: EventProperties;
}

/**
 * Track an event to Firestore via the API (fire-and-forget, non-blocking)
 * This is for detailed analytics that need to be stored in Firestore
 */
export function trackFirestoreEvent(
    eventName: string,
    properties: EventProperties = {},
    context: {
        route?: string;
        projectId?: string;
        creditsRemaining?: number;
        planTier?: UserPlan;
    } = {}
): void {
    if (typeof window === 'undefined') return;

    const payload: FirestoreEventPayload = {
        event_name: eventName,
        session_id: getSessionId(),
        route: context.route || window.location.pathname,
        project_id: context.projectId,
        credits_remaining: context.creditsRemaining,
        plan_tier: context.planTier,
        generation_count_in_session: getGenerationCount(),
        properties
    };

    // Fire and forget - don't await, don't block
    setTimeout(() => {
        apiPost('/api/analytics/event', payload as unknown as Record<string, unknown>)
            .catch((err) => console.warn('[Analytics] Firestore tracking failed:', err));
    }, 0);
}

/**
 * Track multiple events to Firestore in batch (fire-and-forget)
 */
export function trackFirestoreEventsBatch(
    events: Array<{ eventName: string; properties?: EventProperties }>
): void {
    if (typeof window === 'undefined' || events.length === 0) return;

    const sessionId = getSessionId();
    const genCount = getGenerationCount();
    const route = window.location.pathname;

    const payload = {
        events: events.map(e => ({
            event_name: e.eventName,
            session_id: sessionId,
            route,
            generation_count_in_session: genCount,
            properties: e.properties || {}
        }))
    };

    setTimeout(() => {
        apiPost('/api/analytics/events', payload as unknown as Record<string, unknown>)
            .catch((err) => console.warn('[Analytics] Firestore batch tracking failed:', err));
    }, 0);
}

/**
 * Track a custom event to both Vercel Analytics and Google Analytics
 */
export function trackEvent(eventName: string, properties?: EventProperties): void {
    // Only track on client side
    if (typeof window === 'undefined') return;

    // Send to Vercel Analytics
    try {
        track(eventName, properties);
    } catch (error) {
        console.warn('[Analytics] Vercel tracking failed:', error);
    }

    // Send to Google Analytics (gtag)
    try {
        if (typeof window !== 'undefined' && 'gtag' in window) {
            (window as typeof window & { gtag: (...args: unknown[]) => void }).gtag(
                'event',
                eventName,
                properties
            );
        }
    } catch (error) {
        console.warn('[Analytics] GA tracking failed:', error);
    }
}

// ============================================
// Authentication Events
// ============================================

export const trackLoginSuccess = (isNewUser: boolean) =>
    trackEvent('login_success', { is_new_user: isNewUser });

// ============================================
// Project Events
// ============================================

export const trackProjectCreate = (
    source: 'template' | 'empty',
    templateName: string | null,
    userPlan: UserPlan
) =>
    trackEvent('project_create', {
        source,
        template_name: templateName,
        user_plan: userPlan,
    });

// ============================================
// Generation Events
// ============================================

export const trackGenerationStart = (
    type: 'prompt' | 'smart-merge' | 'youtube-clone',
    model: string,
    editorMode: 'sidebar' | 'expanded',
    batchCount: number,
    userPlan: UserPlan
) =>
    trackEvent('generation_start', {
        type,
        model,
        editor_mode: editorMode,
        batch_count: batchCount,
        user_plan: userPlan,
    });

export const trackGenerationSuccess = (
    type: string,
    model: string,
    durationMs: number,
    userPlan: UserPlan
) =>
    trackEvent('generation_success', {
        type,
        model,
        duration_ms: durationMs,
        user_plan: userPlan,
    });

export const trackGenerationFailure = (
    type: string,
    error: string,
    userPlan: UserPlan
) =>
    trackEvent('generation_failure', {
        type,
        error,
        user_plan: userPlan,
    });

// ============================================
// Canvas & Asset Events
// ============================================

export const trackAssetUpload = (type: 'image' | 'youtube') =>
    trackEvent('asset_upload', { type });

export const trackCanvasExport = (
    format: string,
    resolution: string,
    userPlan: UserPlan
) =>
    trackEvent('canvas_export', {
        format,
        resolution,
        user_plan: userPlan,
    });

// ============================================
// Credits & Pricing Events
// ============================================

export const trackCreditsExhausted = (userPlan: UserPlan, actionAttempted: string) =>
    trackEvent('credits_exhausted', {
        user_plan: userPlan,
        action_attempted: actionAttempted,
    });

export const trackPricingModalOpen = (
    source: 'sidebar' | 'credits' | 'generate' | 'exhausted',
    currentPlan: UserPlan
) =>
    trackEvent('pricing_modal_open', {
        source,
        current_plan: currentPlan,
    });

export const trackPricingModalPlanClick = (targetPlan: string, currentPlan: UserPlan) =>
    trackEvent('pricing_modal_plan_click', {
        target_plan: targetPlan,
        current_plan: currentPlan,
    });

// ============================================
// UI Preference Events
// ============================================

export const trackPromptEditorOpen = (mode: 'expanded' | 'sidebar') =>
    trackEvent('prompt_editor_open', { mode });

export const trackCategorySelect = (
    category: string,
    isCustom: boolean,
    userPlan: UserPlan
) =>
    trackEvent('category_select', {
        category,
        is_custom: isCustom,
        user_plan: userPlan,
    });

export const trackVisibilityToggle = (
    visibility: 'private' | 'public',
    userPlan: UserPlan
) =>
    trackEvent('visibility_toggle', {
        visibility,
        user_plan: userPlan,
    });

export const trackBatchCountChange = (count: number, userPlan: UserPlan) =>
    trackEvent('batch_count_change', {
        count,
        user_plan: userPlan,
    });

// ============================================
// Session Events
// ============================================

export const trackSessionStart = (
    isNewUser: boolean,
    userPlan: UserPlan,
    referrer: string
) =>
    trackEvent('session_start', {
        is_new_user: isNewUser,
        user_plan: userPlan,
        referrer,
    });

export const trackSessionEnd = (
    totalDuration: number,
    pagesVisited: number,
    isNewUser: boolean,
    userPlan: UserPlan
) =>
    trackEvent('session_end', {
        total_duration: totalDuration,
        pages_visited: pagesVisited,
        is_new_user: isNewUser,
        user_plan: userPlan,
    });

export const trackErrorDisplayed = (errorType: string, page: string) =>
    trackEvent('error_displayed', {
        error_type: errorType,
        page,
    });
