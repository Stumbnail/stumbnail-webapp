/**
 * Subscription Service - Handles Stripe subscription and checkout operations
 */

import { apiPost, apiGet } from '../api';

// Product IDs from environment variables
export const STRIPE_CREATOR_PRODUCT_ID = process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID_CREATOR || '';
export const STRIPE_AUTOMATION_PRODUCT_ID = process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID_AUTOMATION || '';
export const STRIPE_MORECREDITS_PRODUCT_ID = process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID_MORECREDITS || '';

interface CheckoutResponse {
    url: string;
    sessionId: string;
}

interface PortalResponse {
    url: string;
}

interface SubscriptionStatus {
    hasSubscription: boolean;
    subscription: {
        name: string;
        status: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd: boolean;
        monthlyCredits: number;
        features: string[];
    } | null;
    credits: {
        oneTime: number;
        subscription: number;
        total: number;
    };
}

export type PlanType = 'creator' | 'automation' | 'morecredits';

/**
 * Get product ID for a given plan type
 */
function getProductId(plan: PlanType): string {
    switch (plan) {
        case 'creator':
            return STRIPE_CREATOR_PRODUCT_ID;
        case 'automation':
            return STRIPE_AUTOMATION_PRODUCT_ID;
        case 'morecredits':
            return STRIPE_MORECREDITS_PRODUCT_ID;
        default:
            throw new Error(`Unknown plan type: ${plan}`);
    }
}

/**
 * Create a Stripe checkout session for subscription or one-time purchase
 * @param productId - Stripe product ID
 * @param customerEmail - User's email address
 * @returns Checkout session URL to redirect user to
 */
export async function createCheckoutSession(
    productId: string,
    customerEmail: string,
    couponId?: string
): Promise<CheckoutResponse> {
    return apiPost<CheckoutResponse>('/api/subscription/checkout', {
        productId,
        customerEmail,
        couponId
    });
}

/**
 * Create a Stripe billing portal session
 * Allows users to manage their subscription, update payment methods, etc.
 * @returns Portal session URL to redirect user to
 */
export async function createPortalSession(): Promise<PortalResponse> {
    return apiPost<PortalResponse>('/api/subscription/portal');
}

/**
 * Get current subscription status
 * @returns Subscription status including plan details and credit balances
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
    return apiGet<SubscriptionStatus>('/api/subscription/status');
}

/**
 * Redirect user to Stripe checkout for subscription or one-time purchase
 * @param plan - 'creator', 'automation', or 'morecredits'
 * @param email - User's email address
 */
export async function redirectToCheckout(
    plan: PlanType,
    email: string
): Promise<void> {
    const productId = getProductId(plan);

    if (!productId) {
        throw new Error(`Missing Stripe product ID for ${plan} plan. Please configure NEXT_PUBLIC_STRIPE_PRODUCT_ID_${plan.toUpperCase()}.`);
    }

    const { url } = await createCheckoutSession(productId, email);

    // Redirect to Stripe checkout
    window.location.href = url;
}

/**
 * Redirect user to Stripe billing portal
 */
export async function redirectToPortal(): Promise<void> {
    const { url } = await createPortalSession();
    window.location.href = url;
}
