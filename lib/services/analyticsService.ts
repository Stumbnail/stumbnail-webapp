/**
 * Analytics Service - Manages prompt states and feedback throttling
 * Handles communication with the feedback API endpoints
 *
 * Note: Uses neutral naming (/api/f/*) to avoid ad blocker interference
 */

import { apiGet, apiPost } from '../api';
import { getSessionId, getGenerationCount } from '../analytics';

// Storage keys for client-side throttling
const CONFIDENCE_THROTTLE_KEY = 'stumbnail_confidence_throttle';

// Throttle constants
const CONFIDENCE_MAX_PER_SESSION = 2;
const CONFIDENCE_COOLDOWN_MS = 60 * 1000; // 60 seconds

// ============================================
// Context Helpers
// ============================================

// Store for user context (set by the app when user data is available)
let userContext: {
    creditsRemaining?: number;
    planTier?: 'free' | 'creator' | 'automation';
} = {};

/**
 * Set the user context for analytics (call this when user data loads)
 */
export function setAnalyticsUserContext(context: {
    creditsRemaining?: number;
    planTier?: 'free' | 'creator' | 'automation';
}): void {
    userContext = context;
}

/**
 * Get common event context
 */
function getEventContext() {
    return {
        session_id: getSessionId(),
        route: typeof window !== 'undefined' ? window.location.pathname : null,
        generation_count_in_session: getGenerationCount(),
        credits_remaining: userContext.creditsRemaining ?? null,
        plan_tier: userContext.planTier ?? null,
    };
}

// ============================================
// Types
// ============================================

export interface IntentPromptState {
    needsPrompt: boolean;
    state: {
        shownAt?: string;
        answeredAt?: string;
        answer?: string;
    } | null;
}

export interface PaywallReasonState {
    needsPrompt: boolean;
    state: {
        lastShownAt?: string;
        answers?: Array<{
            reason: string;
            optionalText?: string;
            timestamp: string;
        }>;
    } | null;
}

interface ConfidenceThrottleState {
    count: number;
    lastShownAt: number;
    projectIds: string[];
}

// ============================================
// Intent Prompt (First Login)
// ============================================

/**
 * Check if user needs to see the intent prompt
 */
export async function needsIntentPrompt(): Promise<boolean> {
    try {
        const response = await apiGet<IntentPromptState>('/api/f/state/intent');
        return response.needsPrompt;
    } catch (error) {
        console.warn('[AnalyticsService] Error checking intent prompt:', error);
        return false; // Don't show on error
    }
}

/**
 * Submit the user's intent answer
 */
export async function submitIntentAnswer(answer: string): Promise<void> {
    await apiPost('/api/f/state/intent', {
        answer,
        session_id: getSessionId(),
        markShown: true
    });
}

/**
 * Mark intent prompt as shown (without answer)
 */
export async function markIntentPromptShown(): Promise<void> {
    await apiPost('/api/f/state/intent/shown', {});
}

// ============================================
// Paywall Reason (7-day throttle)
// ============================================

/**
 * Check if user needs to see the paywall reason prompt
 * Returns true if never shown or last shown > 7 days ago
 */
export async function needsPaywallReason(): Promise<boolean> {
    try {
        const response = await apiGet<PaywallReasonState>('/api/f/state/paywall_reason');
        return response.needsPrompt;
    } catch (error) {
        console.warn('[AnalyticsService] Error checking paywall reason:', error);
        return false;
    }
}

/**
 * Submit the user's paywall reason
 */
export async function submitPaywallReason(reason: string, optionalText?: string): Promise<void> {
    await apiPost('/api/f/state/paywall_reason', {
        reason,
        optionalText: optionalText || null,
        session_id: getSessionId()
    });
}

// ============================================
// Confidence Feedback (Client-side throttling)
// ============================================

/**
 * Get the confidence throttle state from sessionStorage
 */
function getConfidenceThrottleState(): ConfidenceThrottleState {
    if (typeof window === 'undefined') {
        return { count: 0, lastShownAt: 0, projectIds: [] };
    }

    try {
        const stored = sessionStorage.getItem(CONFIDENCE_THROTTLE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Ignore parse errors
    }

    return { count: 0, lastShownAt: 0, projectIds: [] };
}

/**
 * Save the confidence throttle state to sessionStorage
 */
function saveConfidenceThrottleState(state: ConfidenceThrottleState): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(CONFIDENCE_THROTTLE_KEY, JSON.stringify(state));
}

/**
 * Check if we can show confidence feedback for a given project
 * Rules:
 * - Max 2 per session
 * - Max 1 per project
 * - 60 second cooldown between prompts
 */
export function canShowConfidenceFeedback(projectId: string): boolean {
    const state = getConfidenceThrottleState();
    const now = Date.now();

    // Check max per session
    if (state.count >= CONFIDENCE_MAX_PER_SESSION) {
        return false;
    }

    // Check if already shown for this project
    if (state.projectIds.includes(projectId)) {
        return false;
    }

    // Check cooldown
    if (state.lastShownAt && (now - state.lastShownAt) < CONFIDENCE_COOLDOWN_MS) {
        return false;
    }

    return true;
}

/**
 * Mark confidence feedback as shown for a project
 */
export function markConfidenceFeedbackShown(projectId: string): void {
    const state = getConfidenceThrottleState();
    state.count += 1;
    state.lastShownAt = Date.now();
    if (!state.projectIds.includes(projectId)) {
        state.projectIds.push(projectId);
    }
    saveConfidenceThrottleState(state);

    // Also update server-side state
    apiPost('/api/f/state/confidence', {
        projectId,
        session_id: getSessionId()
    }).catch(err => console.warn('[AnalyticsService] Error updating confidence state:', err));
}

/**
 * Submit confidence feedback
 */
export async function submitConfidenceFeedback(
    rating: 'yes' | 'maybe' | 'no',
    projectId: string,
    thumbnailIds: string[] = []
): Promise<void> {
    try {
        const payload = {
            event_name: 'confidence_submitted',
            ...getEventContext(),
            project_id: projectId,
            properties: {
                rating,
                thumbnail_ids: thumbnailIds,
                thumbnail_count: thumbnailIds.length
            }
        };
        await apiPost('/api/f/e', payload);
    } catch (err) {
        console.error('[AnalyticsService] Error submitting confidence:', err);
    }
}

// ============================================
// Export Satisfaction (No throttle - show for each export)
// ============================================

/**
 * Check if we can show export satisfaction toast
 * Always returns true - we want feedback for every export
 */
export function canShowExportSatisfaction(): boolean {
    return typeof window !== 'undefined';
}

/**
 * Mark export satisfaction as shown (no-op, kept for API compatibility)
 */
export function markExportSatisfactionShown(): void {
    // No throttling - we want feedback for each export
}

/**
 * Submit export satisfaction rating
 */
export async function submitExportSatisfaction(
    rating: number,
    projectId: string,
    thumbnailIds: string[] = []
): Promise<void> {
    try {
        const payload = {
            event_name: 'satisfaction_rated',
            ...getEventContext(),
            project_id: projectId,
            properties: {
                rating,
                thumbnail_ids: thumbnailIds,
                thumbnail_count: thumbnailIds.length
            }
        };
        await apiPost('/api/f/e', payload);

        // Update server-side state
        await apiPost('/api/f/state/satisfaction', {
            session_id: getSessionId()
        });
    } catch (err) {
        console.error('[AnalyticsService] Error submitting satisfaction:', err);
    }
}

/**
 * Submit satisfaction issue (follow-up when rating is 1-3)
 */
export async function submitSatisfactionIssue(
    reason: string,
    optionalText?: string,
    projectId?: string,
    thumbnailIds: string[] = []
): Promise<void> {
    try {
        const payload = {
            event_name: 'satisfaction_issue_selected',
            ...getEventContext(),
            project_id: projectId,
            properties: {
                reason,
                optional_text: optionalText || null,
                thumbnail_ids: thumbnailIds,
                thumbnail_count: thumbnailIds.length
            }
        };
        await apiPost('/api/f/e', payload);
    } catch (err) {
        console.error('[AnalyticsService] Error submitting satisfaction issue:', err);
    }
}

// ============================================
// Core Funnel Event Helpers
// ============================================

/**
 * Track app open event
 */
export async function trackAppOpen(isReturning: boolean): Promise<void> {
    try {
        await apiPost('/api/f/e', {
            event_name: 'app_open',
            ...getEventContext(),
            properties: { is_returning: isReturning }
        });
    } catch (err) {
        console.error('[AnalyticsService] Error tracking app open:', err);
    }
}

/**
 * Track editor open event
 */
export async function trackEditorOpen(projectId: string, hasThumbnails: boolean): Promise<void> {
    try {
        await apiPost('/api/f/e', {
            event_name: 'editor_open',
            ...getEventContext(),
            project_id: projectId,
            properties: { has_thumbnails: hasThumbnails }
        });
    } catch (err) {
        console.error('[AnalyticsService] Error tracking editor open:', err);
    }
}

/**
 * Track results viewed event
 */
export async function trackResultsViewed(projectId: string, count: number): Promise<void> {
    try {
        await apiPost('/api/f/e', {
            event_name: 'results_viewed',
            ...getEventContext(),
            project_id: projectId,
            properties: { count }
        });
    } catch (err) {
        console.error('[AnalyticsService] Error tracking results viewed:', err);
    }
}

/**
 * Track export clicked event
 */
export async function trackExportClicked(count: number): Promise<void> {
    try {
        await apiPost('/api/f/e', {
            event_name: 'export_clicked',
            ...getEventContext(),
            properties: { count }
        });
    } catch (err) {
        console.error('[AnalyticsService] Error tracking export clicked:', err);
    }
}

/**
 * Track export succeeded event
 */
export async function trackExportSucceeded(
    projectId: string,
    thumbnailId?: string
): Promise<void> {
    try {
        await apiPost('/api/f/e', {
            event_name: 'export_succeeded',
            ...getEventContext(),
            project_id: projectId,
            properties: { thumbnail_id: thumbnailId || null }
        });
    } catch (err) {
        console.error('[AnalyticsService] Error tracking export succeeded:', err);
    }
}

/**
 * Track paywall viewed event
 */
export async function trackPaywallViewed(
    source: 'sidebar' | 'credits' | 'generate' | 'exhausted',
    currentPlan: string
): Promise<void> {
    try {
        await apiPost('/api/f/e', {
            event_name: 'paywall_viewed',
            ...getEventContext(),
            properties: { source, current_plan: currentPlan }
        });
    } catch (err) {
        console.error('[AnalyticsService] Error tracking paywall viewed:', err);
    }
}

/**
 * Track upgrade clicked event
 */
export async function trackUpgradeClicked(
    source: string,
    currentPlan: string,
    targetPlan?: string
): Promise<void> {
    try {
        await apiPost('/api/f/e', {
            event_name: 'upgrade_clicked',
            ...getEventContext(),
            properties: { source, current_plan: currentPlan, target_plan: targetPlan || null }
        });
    } catch (err) {
        console.error('[AnalyticsService] Error tracking upgrade clicked:', err);
    }
}
