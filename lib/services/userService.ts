// User data service - secure access to Firestore user documents
// SECURITY: Only accesses user's own document using authenticated UID

import { getFirestore } from '@/lib/firebase';
import type { UserData, PlanInfo } from '@/types';

function normalizeTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return null;
}

function mapUserData(uid: string, data: Record<string, unknown>): UserData {
  const subscription = data.subscription as Record<string, unknown> | undefined;

  return {
    uid,
    email: typeof data.email === 'string' ? data.email : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    subscription: subscription ? {
      id: typeof subscription.id === 'string' ? subscription.id : undefined,
      status: typeof subscription.status === 'string' ? subscription.status : undefined,
      productId: typeof subscription.productId === 'string' ? subscription.productId : undefined,
      productName: typeof subscription.productName === 'string' ? subscription.productName : undefined,
      itemId: typeof subscription.itemId === 'string' ? subscription.itemId : undefined,
      monthlyCredits: typeof subscription.monthlyCredits === 'number' ? subscription.monthlyCredits : 0,
      currentPeriodStart: normalizeTimestamp(subscription.currentPeriodStart) || undefined,
      currentPeriodEnd: normalizeTimestamp(subscription.currentPeriodEnd) || undefined,
      cancelAtPeriodEnd: typeof subscription.cancelAtPeriodEnd === 'boolean' ? subscription.cancelAtPeriodEnd : false,
      cancelAt: normalizeTimestamp(subscription.cancelAt),
    } : null,
    subscriptionCredits: typeof data.subscriptionCredits === 'number' ? data.subscriptionCredits : 0,
    toppedUpBalance: typeof data.toppedUpBalance === 'number' ? data.toppedUpBalance : 0,
    trialCredits: typeof data.trialCredits === 'number' ? data.trialCredits : 0,
    hasTakenTour: typeof data.hasTakenTour === 'boolean' ? data.hasTakenTour : false,
    createdAt: normalizeTimestamp(data.createdAt) || '',
    updatedAt: normalizeTimestamp(data.updatedAt) || '',
  };
}

/**
 * Get user data from Firestore
 * SECURITY: Only fetches data for the authenticated user's UID
 * @param uid - The authenticated user's UID (from Firebase Auth)
 * @returns User data or null if not found
 */
export async function getUserData(uid: string): Promise<UserData | null> {
  if (!uid) {
    console.error('getUserData: UID is required');
    return null;
  }

  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const db = await getFirestore();

    // SECURITY: Direct document access using authenticated UID
    // Firestore security rules should enforce that users can only read their own document
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      console.warn(`User document not found for UID: ${uid}`);
      return null;
    }

    const data = userDocSnap.data();

    return mapUserData(uid, data);
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time user data updates
 * SECURITY: Only subscribes to the authenticated user's document
 * @param uid - The authenticated user's UID (from Firebase Auth)
 * @param callback - Called when user data changes
 * @returns Unsubscribe function
 */
export async function subscribeToUserData(
  uid: string,
  callback: (userData: UserData | null) => void
): Promise<() => void> {
  if (!uid) {
    console.error('subscribeToUserData: UID is required');
    callback(null);
    return () => {};
  }

  try {
    const { doc, onSnapshot } = await import('firebase/firestore');
    const db = await getFirestore();

    // SECURITY: Direct document access using authenticated UID
    const userDocRef = doc(db, 'users', uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          console.warn(`User document not found for UID: ${uid}`);
          callback(null);
          return;
        }

        const data = docSnap.data();

        callback(mapUserData(uid, data));
      },
      (error) => {
        console.error('Error subscribing to user data:', error);
        callback(null);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up user data subscription:', error);
    callback(null);
    return () => {};
  }
}

/**
 * Calculate total available credits for a user
 * @param userData - User data from Firestore
 * @returns Total credits (trial + subscription + topped up)
 */
export function calculateTotalCredits(userData: UserData | null): number {
  if (!userData) return 0;

  return (
    (userData.trialCredits || 0) +
    (userData.subscriptionCredits || 0) +
    (userData.toppedUpBalance || 0)
  );
}

/**
 * Calculate display credits (subscription + topped up, excluding trial)
 * This is the main credit count shown in the sidebar
 * @param userData - User data from Firestore
 * @returns Credits from subscription and topped up balance
 */
export function calculateDisplayCredits(userData: UserData | null): number {
  if (!userData) return 0;

  return (
    (userData.subscriptionCredits || 0) +
    (userData.toppedUpBalance || 0)
  );
}

/**
 * Determine user's plan based on subscription credits
 * Starter: 590 credits/month
 * Creator: 1475 credits/month
 * Free: 0 subscription credits
 * @param userData - User data from Firestore
 * @returns Plan information
 */
export function getUserPlan(userData: UserData | null): PlanInfo {
  if (!userData) {
    return { type: 'free', name: 'Free', monthlyCredits: 0 };
  }

  const subscription = userData.subscription;
  const activeSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';
  const monthlyCredits = activeSubscription ? (subscription?.monthlyCredits || 0) : 0;
  const productName = activeSubscription ? (subscription?.productName || '').toLowerCase() : '';

  if (monthlyCredits >= 1475 || productName.includes('creator')) {
    return { type: 'creator', name: 'Creator', monthlyCredits: 1475 };
  } else if (monthlyCredits >= 590 || productName.includes('starter')) {
    return { type: 'starter', name: 'Starter', monthlyCredits: 590 };
  }

  const subCredits = userData.subscriptionCredits || 0;
  if (subCredits >= 1475) {
    return { type: 'creator', name: 'Creator', monthlyCredits: 1475 };
  } else if (subCredits >= 590) {
    return { type: 'starter', name: 'Starter', monthlyCredits: 590 };
  }

  return { type: 'free', name: 'Free', monthlyCredits: 0 };
}
