import { hasMarketingConsent } from './consent';

export const GOOGLE_TAG_ID = 'GT-T5P2FWBK';
export const GOOGLE_PURCHASE_CONVERSION_ID = 'AW-17277705517/1HSGCMurxJkcEK26065A';

export function trackSubscriptionSuccess(transactionId: string = ''): void {
  if (typeof window === 'undefined') return;
  if (!hasMarketingConsent()) return;
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', 'conversion', {
    send_to: GOOGLE_PURCHASE_CONVERSION_ID,
    value: 1.0,
    currency: 'PKR',
    transaction_id: transactionId,
  });
}
