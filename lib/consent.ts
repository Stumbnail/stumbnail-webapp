export type ConsentStatus = 'granted' | 'denied';

export interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
}

export interface StoredConsent {
  version: number;
  updatedAt: string;
  preferences: ConsentPreferences;
}

export interface GoogleConsentSettings {
  [key: string]: ConsentStatus | number | undefined;
  ad_storage: ConsentStatus;
  ad_user_data: ConsentStatus;
  ad_personalization: ConsentStatus;
  analytics_storage: ConsentStatus;
  functionality_storage: ConsentStatus;
  personalization_storage: ConsentStatus;
  security_storage: ConsentStatus;
  wait_for_update?: number;
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const CONSENT_STORAGE_KEY = 'stumbnail-consent';
export const CONSENT_UPDATED_EVENT = 'stumbnail:consent-updated';
export const CONSENT_VERSION = 1;
export const CONSENT_WAIT_FOR_UPDATE_MS = 500;

export const DEFAULT_CONSENT_PREFERENCES: ConsentPreferences = {
  analytics: false,
  marketing: false,
};

function getConsentStatus(isGranted: boolean): ConsentStatus {
  return isGranted ? 'granted' : 'denied';
}

export function buildGoogleConsentSettings(
  preferences: ConsentPreferences,
  includeWaitForUpdate = false
): GoogleConsentSettings {
  const analyticsStatus = getConsentStatus(preferences.analytics);
  const marketingStatus = getConsentStatus(preferences.marketing);

  return {
    ad_storage: marketingStatus,
    ad_user_data: marketingStatus,
    ad_personalization: marketingStatus,
    analytics_storage: analyticsStatus,
    functionality_storage: 'granted',
    personalization_storage: marketingStatus,
    security_storage: 'granted',
    ...(includeWaitForUpdate ? { wait_for_update: CONSENT_WAIT_FOR_UPDATE_MS } : {}),
  };
}

function buildStoredConsent(preferences: ConsentPreferences): StoredConsent {
  return {
    version: CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
    preferences,
  };
}

export function parseStoredConsent(value: string | null): StoredConsent | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<StoredConsent> | null;
    const preferences = parsed?.preferences;

    if (
      typeof preferences?.analytics !== 'boolean' ||
      typeof preferences.marketing !== 'boolean'
    ) {
      return null;
    }

    return {
      version: parsed?.version ?? CONSENT_VERSION,
      updatedAt: parsed?.updatedAt ?? new Date(0).toISOString(),
      preferences,
    };
  } catch {
    return null;
  }
}

export function readStoredConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null;
  return parseStoredConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
}

export function writeStoredConsent(preferences: ConsentPreferences): StoredConsent {
  const storedConsent = buildStoredConsent(preferences);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(storedConsent));
    window.dispatchEvent(
      new CustomEvent(CONSENT_UPDATED_EVENT, {
        detail: storedConsent,
      })
    );
  }

  return storedConsent;
}

function ensureGtag(): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];

  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
  }
}

export function applyGoogleConsentUpdate(preferences: ConsentPreferences): void {
  if (typeof window === 'undefined') return;

  ensureGtag();
  window.gtag?.('consent', 'update', buildGoogleConsentSettings(preferences));
}

export function hasAnalyticsConsent(): boolean {
  return readStoredConsent()?.preferences.analytics === true;
}

export function hasMarketingConsent(): boolean {
  return readStoredConsent()?.preferences.marketing === true;
}

export function getConsentModeBootstrapScript(): string {
  const storageKey = JSON.stringify(CONSENT_STORAGE_KEY);
  const defaultConsent = JSON.stringify(
    buildGoogleConsentSettings(DEFAULT_CONSENT_PREFERENCES, true)
  );

  return `
    (function() {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };

      var defaultConsent = ${defaultConsent};
      var buildConsentSettings = function(preferences) {
        var analyticsStatus = preferences && preferences.analytics === true ? 'granted' : 'denied';
        var marketingStatus = preferences && preferences.marketing === true ? 'granted' : 'denied';

        return {
          ad_storage: marketingStatus,
          ad_user_data: marketingStatus,
          ad_personalization: marketingStatus,
          analytics_storage: analyticsStatus,
          functionality_storage: 'granted',
          personalization_storage: marketingStatus,
          security_storage: 'granted'
        };
      };

      window.gtag('consent', 'default', defaultConsent);

      try {
        var storedValue = window.localStorage.getItem(${storageKey});
        if (!storedValue) return;

        var parsed = JSON.parse(storedValue);
        if (!parsed || !parsed.preferences) return;

        window.gtag('consent', 'update', buildConsentSettings(parsed.preferences));
      } catch (error) {}
    })();
  `;
}
