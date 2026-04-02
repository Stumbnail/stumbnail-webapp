'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  CONSENT_UPDATED_EVENT,
  DEFAULT_CONSENT_PREFERENCES,
  applyGoogleConsentUpdate,
  hasAnalyticsConsent,
  hasMarketingConsent,
  readStoredConsent,
  writeStoredConsent,
  type ConsentPreferences,
  type StoredConsent,
} from '@/lib/consent';

interface ConsentContextValue {
  consent: StoredConsent | null;
  preferences: ConsentPreferences;
  isLoaded: boolean;
  showBanner: boolean;
  preferencesOpen: boolean;
  hasAnalyticsConsent: boolean;
  hasMarketingConsent: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (preferences: ConsentPreferences) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

interface ConsentProviderProps {
  children: ReactNode;
}

export function ConsentProvider({ children }: ConsentProviderProps) {
  const [consent, setConsent] = useState<StoredConsent | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const syncConsent = useCallback(() => {
    setConsent(readStoredConsent());
  }, []);

  useEffect(() => {
    syncConsent();
    setIsLoaded(true);
  }, [syncConsent]);

  useEffect(() => {
    const handleConsentUpdate = () => {
      syncConsent();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key) {
        syncConsent();
      }
    };

    window.addEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncConsent]);

  const persistConsent = useCallback((preferences: ConsentPreferences) => {
    const storedConsent = writeStoredConsent(preferences);
    applyGoogleConsentUpdate(preferences);
    setConsent(storedConsent);
    setPreferencesOpen(false);
  }, []);

  const acceptAll = useCallback(() => {
    persistConsent({
      analytics: true,
      marketing: true,
    });
  }, [persistConsent]);

  const rejectNonEssential = useCallback(() => {
    persistConsent({
      analytics: false,
      marketing: false,
    });
  }, [persistConsent]);

  const value = useMemo<ConsentContextValue>(() => {
    const preferences = consent?.preferences ?? DEFAULT_CONSENT_PREFERENCES;
    const analyticsConsentGranted = consent ? preferences.analytics : hasAnalyticsConsent();
    const marketingConsentGranted = consent ? preferences.marketing : hasMarketingConsent();

    return {
      consent,
      preferences,
      isLoaded,
      showBanner: isLoaded && (!consent || preferencesOpen),
      preferencesOpen,
      hasAnalyticsConsent: analyticsConsentGranted,
      hasMarketingConsent: marketingConsentGranted,
      acceptAll,
      rejectNonEssential,
      savePreferences: persistConsent,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
    };
  }, [
    acceptAll,
    consent,
    isLoaded,
    persistConsent,
    preferencesOpen,
    rejectNonEssential,
  ]);

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsentContext(): ConsentContextValue {
  const context = useContext(ConsentContext);

  if (!context) {
    throw new Error('useConsentContext must be used within a ConsentProvider');
  }

  return context;
}
