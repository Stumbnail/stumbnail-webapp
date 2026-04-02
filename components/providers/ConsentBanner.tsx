'use client';

import { useEffect, useState } from 'react';
import { useConsentContext } from '@/contexts';
import styles from './ConsentBanner.module.css';

interface DraftPreferences {
  analytics: boolean;
  marketing: boolean;
}

export function ConsentBanner() {
  const {
    consent,
    preferences,
    isLoaded,
    showBanner,
    preferencesOpen,
    acceptAll,
    rejectNonEssential,
    savePreferences,
    openPreferences,
    closePreferences,
  } = useConsentContext();

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [draftPreferences, setDraftPreferences] = useState<DraftPreferences>({
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    setDraftPreferences({
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    });
  }, [preferences.analytics, preferences.marketing]);

  useEffect(() => {
    if (!showBanner) {
      setIsCustomizing(false);
      return;
    }

    if (!consent || preferencesOpen) {
      setIsCustomizing(preferencesOpen);
    }
  }, [consent, preferencesOpen, showBanner]);

  if (!isLoaded) return null;

  if (!showBanner) {
    return (
      <button
        type="button"
        className={styles.manageButton}
        onClick={openPreferences}
      >
        Privacy choices
      </button>
    );
  }

  const handleToggle = (key: keyof DraftPreferences) => {
    setDraftPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleSavePreferences = () => {
    savePreferences(draftPreferences);
  };

  return (
    <>
      <div className={styles.backdrop} aria-hidden="true" />
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-banner-title"
      >
        <h2 id="consent-banner-title" className={styles.title}>
          {consent ? 'Update your privacy choices' : 'Your privacy choices'}
        </h2>

        <p className={styles.description}>
          We use <strong>essential storage</strong> to keep the app secure and working.
          Optional consent lets us use <strong>analytics</strong> and Google&apos;s
          <strong> ad-related signals</strong> only when you allow them.
        </p>

        <div className={styles.badgeRow}>
          <span className={styles.badge}>Essential always on</span>
          <span className={styles.badge}>Google Consent Mode v2</span>
        </div>

        {!isCustomizing ? (
          <button
            type="button"
            className={styles.customizeButton}
            onClick={() => setIsCustomizing(true)}
          >
            Customize choices
          </button>
        ) : (
          <div className={styles.preferences}>
            <div className={styles.preferenceCard}>
              <div className={styles.preferenceRow}>
                <div>
                  <div className={styles.preferenceLabel}>Essential</div>
                  <p className={styles.preferenceCopy}>
                    Security and functionality storage required to authenticate,
                    protect sessions, and keep the site operating.
                  </p>
                </div>

                <button
                  type="button"
                  className={`${styles.toggle} ${styles.toggleOn} ${styles.toggleDisabled}`}
                  disabled
                  aria-disabled="true"
                >
                  <span className={styles.toggleLabel}>Essential storage always on</span>
                </button>
              </div>
            </div>

            <div className={styles.preferenceCard}>
              <div className={styles.preferenceRow}>
                <div>
                  <div className={styles.preferenceLabel}>Analytics</div>
                  <p className={styles.preferenceCopy}>
                    Helps us understand usage patterns and improve product flows with
                    Firebase and Vercel analytics.
                  </p>
                </div>

                <button
                  type="button"
                  aria-pressed={draftPreferences.analytics}
                  className={`${styles.toggle} ${draftPreferences.analytics ? styles.toggleOn : ''}`}
                  onClick={() => handleToggle('analytics')}
                >
                  <span className={styles.toggleLabel}>Toggle analytics consent</span>
                </button>
              </div>
            </div>

            <div className={styles.preferenceCard}>
              <div className={styles.preferenceRow}>
                <div>
                  <div className={styles.preferenceLabel}>Marketing</div>
                  <p className={styles.preferenceCopy}>
                    Controls ad storage, user data, personalization, and related Google
                    consent signals.
                  </p>
                </div>

                <button
                  type="button"
                  aria-pressed={draftPreferences.marketing}
                  className={`${styles.toggle} ${draftPreferences.marketing ? styles.toggleOn : ''}`}
                  onClick={() => handleToggle('marketing')}
                >
                  <span className={styles.toggleLabel}>Toggle marketing consent</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={acceptAll}
          >
            Accept all
          </button>

          <button
            type="button"
            className={`${styles.button} ${styles.buttonGhost}`}
            onClick={rejectNonEssential}
          >
            Reject optional
          </button>

          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={
              isCustomizing
                ? handleSavePreferences
                : consent
                  ? closePreferences
                  : () => setIsCustomizing(true)
            }
          >
            {isCustomizing ? 'Save choices' : consent ? 'Close' : 'Customize'}
          </button>
        </div>
      </section>
    </>
  );
}
