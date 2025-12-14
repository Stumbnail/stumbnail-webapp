// User data service - secure access to Firestore user documents
// SECURITY: Only accesses user's own document using authenticated UID

import { getFirestore } from '@/lib/firebase';
import type { UserData, PlanInfo } from '@/types';

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

    // Validate and return typed user data
    return {
      uid: uid,
      email: data.email || '',
      displayName: data.displayName || '',
      subscriptionCredits: data.subscriptionCredits || 0,
      toppedUpBalance: data.toppedUpBalance || 0,
      trialCredits: data.trialCredits || 0,
      hasTakenTour: data.hasTakenTour || false,
      createdAt: data.createdAt || '',
      updatedAt: data.updatedAt || '',
    };
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

        // Validate and return typed user data
        callback({
          uid: uid,
          email: data.email || '',
          displayName: data.displayName || '',
          subscriptionCredits: data.subscriptionCredits || 0,
          toppedUpBalance: data.toppedUpBalance || 0,
          trialCredits: data.trialCredits || 0,
          hasTakenTour: data.hasTakenTour || false,
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
        });
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
 * Creator: 1100 credits/month
 * Automation: 4500 credits/month
 * Free: 0 subscription credits
 * @param userData - User data from Firestore
 * @returns Plan information
 */
export function getUserPlan(userData: UserData | null): PlanInfo {
  if (!userData) {
    return { type: 'free', name: 'Free', monthlyCredits: 0 };
  }

  const subCredits = userData.subscriptionCredits || 0;

  if (subCredits >= 4500) {
    return { type: 'automation', name: 'Automation', monthlyCredits: 4500 };
  } else if (subCredits >= 1100) {
    return { type: 'creator', name: 'Creator', monthlyCredits: 1100 };
  } else {
    return { type: 'free', name: 'Free', monthlyCredits: 0 };
  }
}
