import { hasMarketingConsent } from './consent';

export const GOOGLE_TAG_ID = 'GT-T5P2FWBK';

export function trackSubscriptionSuccess(): void {
  if (typeof window === 'undefined') return;
  if (!hasMarketingConsent()) return;
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', 'subscription_success', {
    page_path: window.location.pathname,
    page_title: document.title,
  });
}
