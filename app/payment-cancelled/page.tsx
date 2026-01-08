'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './payment-cancelled.module.css';

export default function PaymentCancelledPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <div className={styles.cancelIcon}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        </div>

        <div className={styles.logoContainer}>
          <Image
            src="/assets/logo.svg"
            alt="Stumbnail"
            width={48}
            height={48}
            priority
          />
        </div>

        <h1 className={styles.heading}>Payment Cancelled</h1>

        <p className={styles.message}>
          Your payment was cancelled. No charges were made to your account.
          You can try again anytime.
        </p>

        <div className={styles.buttonGroup}>
          <button
            onClick={() => router.push('/dashboard')}
            className={styles.buttonPrimary}
          >
            Back to Dashboard
          </button>
        </div>

        <p className={styles.redirect}>
          Redirecting in {countdown} seconds...
        </p>
      </div>
    </div>
  );
}
