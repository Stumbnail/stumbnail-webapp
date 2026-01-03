/**
 * Analytics utility for tracking custom events
 * Sends events to both Vercel Analytics and Google Analytics
 */

import { track } from '@vercel/analytics/react';

// Event properties type
type EventProperties = Record<string, string | number | boolean | null | undefined>;

// User plan type
type UserPlan = 'free' | 'creator' | 'automation';

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
