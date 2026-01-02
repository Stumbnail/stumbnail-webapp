'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import styles from './login.module.css';

// Hooks
import { useAuth } from '@/hooks';

// Analytics
import { trackLoginSuccess, trackSessionStart } from '@/lib/analytics';

// UI Components
import { LoadingSpinner } from '@/components/ui';

// Lazy load heavy GridMotion component (uses GSAP animations)
const GridMotion = dynamic(
  () => import('@/components/GridMotion/GridMotion'),
  {
    ssr: false,
    loading: () => <div className={styles.backgroundPlaceholder} />
  }
);

interface FirebaseError extends Error {
  code?: string;
}

/**
 * Get initial theme from localStorage or system preference
 * Used for rendering the loading spinner with correct theme before full page loads
 */
function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [initialTheme, setInitialTheme] = useState<'light' | 'dark'>('dark');
  const router = useRouter();

  // Check if user is already authenticated (don't redirect to login if not)
  const { user, loading: authLoading } = useAuth(false);

  // Initialize theme on mount
  useEffect(() => {
    const theme = getInitialTheme();
    setInitialTheme(theme);
    setIsDarkTheme(theme === 'dark');
  }, []);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  const themeClass = isDarkTheme ? styles.dark : styles.light;

  const handleGoogleSignIn = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Dynamically import Firebase only when user clicks sign in
      const { signInWithGoogle } = await import('@/lib/firebase');
      const signedInUser = await signInWithGoogle();

      // Track successful login - check if user is new by metadata
      const isNewUser = signedInUser.metadata.creationTime === signedInUser.metadata.lastSignInTime;
      trackLoginSuccess(isNewUser);

      // Track session start
      trackSessionStart(isNewUser, 'free', document.referrer || 'direct');

      router.push('/dashboard');
    } catch (err) {
      const firebaseError = err as FirebaseError;

      // Handle specific Firebase auth errors silently
      if (firebaseError.code === 'auth/popup-closed-by-user' ||
        firebaseError.code === 'auth/cancelled-popup-request') {
        setLoading(false);
        return;
      }

      setError(firebaseError.message || 'Failed to sign in');
      setLoading(false);
      console.error('Sign in error:', err);
    }
  }, [router]);

  // Show loading state while checking authentication
  if (authLoading || user) {
    return (
      <LoadingSpinner theme={initialTheme} fullScreen />
    );
  }

  // Generate thumbnail grid items for GridMotion (28 items total)
  const thumbnails = Array.from({ length: 13 }, (_, i) => `/assets/thumbnails/thumb${i + 1}.png`);
  const gridItems = Array.from({ length: 28 }, (_, i) => thumbnails[i % thumbnails.length]);

  // Avatar data with proper alt text
  const avatars = [
    { src: '/assets/avatars/user1.png', alt: 'User avatar 1' },
    { src: '/assets/avatars/user2.png', alt: 'User avatar 2' },
    { src: '/assets/avatars/user3.png', alt: 'User avatar 3' },
    { src: '/assets/avatars/user4.png', alt: 'User avatar 4' },
  ];

  return (
    <div className={`${styles.container} ${themeClass}`}>
      {/* GridMotion Background - Lazy loaded */}
      <div className={styles.backgroundGrid}>
        <GridMotion
          items={gridItems}
          gradientColor={isDarkTheme ? "rgba(12, 11, 11, 0.9)" : "rgba(26, 26, 26, 0.8)"}
        />
      </div>

      {/* Dark Overlay */}
      <div className={styles.overlay} />

      {/* Decorative Blur Elements */}
      <div className={styles.blurBottom} />
      <div className={styles.blurTop} />

      {/* Login Card */}
      <div className={styles.loginCard}>
        {/* Theme Toggle Button */}
        <button
          onClick={() => setIsDarkTheme(!isDarkTheme)}
          className={styles.themeToggle}
          aria-label={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDarkTheme ? '☀️ Light' : '🌙 Dark'}
        </button>

        <div className={styles.logoContainer}>
          <Image
            src="/assets/logo.svg"
            alt="Stumbnail"
            width={64}
            height={64}
            priority
          />
        </div>

        <h1 className={styles.heading}>
          Welcome to <span className={styles.brandName}>Stumbnail</span>
        </h1>

        <p className={styles.subtitle}>
          Login to access and start creating
        </p>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className={styles.googleButton}
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? 'Signing in...' : 'Login With Google'}
        </button>

        {error && <p className={styles.error}>{error}</p>}

        {/* Trust Indicator */}
        <div className={styles.trustSection}>
          <div className={styles.avatars}>
            {avatars.map((avatar, idx) => (
              <img
                key={idx}
                src={avatar.src}
                alt={avatar.alt}
                className={styles.avatar}
                style={{ left: `${idx * 38}px` }}
                loading="lazy"
              />
            ))}
          </div>
          <p className={styles.trustText}>Trusted by 25,712 Users</p>
        </div>
      </div>
    </div>
  );
}
