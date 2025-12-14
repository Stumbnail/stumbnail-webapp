// Firebase configuration and authentication utilities
// Uses dynamic imports for code splitting to reduce initial bundle size

import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Cached references to avoid re-importing
let authInstance: Auth | null = null;
let authInitPromise: Promise<Auth> | null = null;
let firestoreInstance: Firestore | null = null;
let firestoreInitPromise: Promise<Firestore> | null = null;

/**
 * Lazily initialize Firebase Auth
 * This prevents the large Firebase bundle from blocking initial page load
 */
export async function getFirebaseAuth(): Promise<Auth> {
  if (authInstance) return authInstance;

  if (!authInitPromise) {
    authInitPromise = (async () => {
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');

      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      authInstance = getAuth(app);
      return authInstance;
    })();
  }

  return authInitPromise;
}

/**
 * Sign in with Google - lazily loads Firebase
 */
export const signInWithGoogle = async (): Promise<User> => {
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const auth = await getFirebaseAuth();

  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    const message = error instanceof Error ? error.message : 'Failed to sign in with Google';
    throw new Error(message);
  }
};

/**
 * Sign out the current user
 */
export const logOut = async (): Promise<void> => {
  const { signOut } = await import('firebase/auth');
  const auth = await getFirebaseAuth();

  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    const message = error instanceof Error ? error.message : 'Failed to sign out';
    throw new Error(message);
  }
};

/**
 * Subscribe to auth state changes
 * Returns unsubscribe function
 */
export const onAuthChange = async (
  callback: (user: User | null) => void
): Promise<() => void> => {
  const { onAuthStateChanged } = await import('firebase/auth');
  const auth = await getFirebaseAuth();

  return onAuthStateChanged(auth, callback);
};

/**
 * Lazily initialize Firestore
 * This prevents the large Firebase bundle from blocking initial page load
 */
export async function getFirestore(): Promise<Firestore> {
  if (firestoreInstance) return firestoreInstance;

  if (!firestoreInitPromise) {
    firestoreInitPromise = (async () => {
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getFirestore: getFirestoreInstance } = await import('firebase/firestore');

      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      firestoreInstance = getFirestoreInstance(app);
      return firestoreInstance;
    })();
  }

  return firestoreInitPromise;
}
