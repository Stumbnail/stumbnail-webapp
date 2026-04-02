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

  if (!showBanner) return null;

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
          Privacy settings
        </h2>

        <p className={styles.description}>
          Essential cookies stay on. You can choose analytics and marketing.
        </p>

        <div className={styles.links}>
          <a
            href="http://stumbnail.com/cookies"
            target="_blank"
            rel="noreferrer"
            className={styles.link}
          >
            Cookies
          </a>
          <a
            href="http://stumbnail.com/privacy"
            target="_blank"
            rel="noreferrer"
            className={styles.link}
          >
            Privacy
          </a>
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
                    Required for security and core app features.
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
                    Helps us understand product usage.
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
                    Allows marketing and ad-related consent signals.
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
            Reject all
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
