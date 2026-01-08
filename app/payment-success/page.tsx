'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './payment-success.module.css';

export default function PaymentSuccessPage() {
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
          <div className={styles.successIcon}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
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

        <h1 className={styles.heading}>Payment Successful!</h1>

        <p className={styles.message}>
          Thank you for your purchase. Your credits have been added to your account.
        </p>

        <button
          onClick={() => router.push('/dashboard')}
          className={styles.button}
        >
          Go to Dashboard
        </button>

        <p className={styles.redirect}>
          Redirecting in {countdown} seconds...
        </p>
      </div>
    </div>
  );
}
