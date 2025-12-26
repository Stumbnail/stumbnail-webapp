'use client';

import { useState } from 'react';
import { Theme } from '@/types';
import { redirectToCheckout, PlanType } from '@/lib/services/subscriptionService';
import styles from './PricingModal.module.css';

// Icons
function MergeIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m8 6 4-4 4 4" />
            <path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22" />
            <path d="m20 22-5-5" />
        </svg>
    );
}

function WandIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4V2" />
            <path d="M15 16v-2" />
            <path d="M8 9h2" />
            <path d="M20 9h2" />
            <path d="M17.8 11.8 19 13" />
            <path d="M15 9h.01" />
            <path d="M17.8 6.2 19 5" />
            <path d="m3 21 9-9" />
            <path d="M12.2 6.2 11 5" />
        </svg>
    );
}

function YouTubeIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
            <path d="m10 15 5-3-5-3z" />
        </svg>
    );
}

function ImageIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
    );
}

function LayersIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
            <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
            <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
        </svg>
    );
}

function LockIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

function CrownIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
            <path d="M5 21h14" />
        </svg>
    );
}

function LoadingSpinner() {
    return (
        <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
    );
}

const features = [
    { icon: MergeIcon, text: "Smart Merge — combine assets intelligently" },
    { icon: WandIcon, text: "Prompt-based generation" },
    { icon: YouTubeIcon, text: "Clone any YouTube thumbnail" },
    { icon: ImageIcon, text: "Upload custom assets" },
    { icon: LayersIcon, text: "Access to multiple AI models" },
    { icon: LockIcon, text: "Keep thumbnails private" },
];

interface PricingModalProps {
    open: boolean;
    onClose: () => void;
    theme: Theme;
    userEmail?: string;
}

export default function PricingModal({ open, onClose, theme, userEmail }: PricingModalProps) {
    const isDark = theme === 'dark';
    const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGetPlan = async (plan: PlanType) => {
        if (!userEmail) {
            setError('Please sign in to purchase a subscription');
            return;
        }

        setLoadingPlan(plan);
        setError(null);

        try {
            await redirectToCheckout(plan, userEmail);
            // User will be redirected to Stripe checkout
        } catch (err) {
            console.error('Checkout error:', err);
            setError(err instanceof Error ? err.message : 'Failed to start checkout');
            setLoadingPlan(null);
        }
    };

    if (!open) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            {/* Backdrop */}
            <div className={`${styles.backdrop} ${isDark ? styles.backdropDark : styles.backdropLight}`} />

            {/* Modal Content */}
            <div
                className={`${styles.modal} ${isDark ? styles.modalDark : styles.modalLight}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className={`${styles.closeButton} ${isDark ? styles.closeButtonDark : styles.closeButtonLight}`}
                    aria-label="Close pricing"
                >
                    <svg className={styles.closeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </button>

                {/* Subtle background glow */}
                <div className={styles.glow} />

                <div className={styles.content}>
                    {/* Header */}
                    <div className={styles.header}>
                        <h2 className={styles.title}>Simple Pricing</h2>
                        <p className={styles.subtitle}>
                            Pay for what you use. Different models, different costs.
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className={styles.errorMessage}>
                            {error}
                        </div>
                    )}

                    {/* Pricing Cards */}
                    <div className={styles.cardsContainer}>
                        {/* Creator Plan */}
                        <div className={`${styles.card} ${isDark ? styles.cardDark : styles.cardLight}`}>
                            <div className={styles.cardContent}>
                                <div>
                                    <p className={styles.planLabel}>Creator</p>
                                    <div className={styles.priceRow}>
                                        <span className={styles.price}>$12.99</span>
                                        <span className={styles.period}>/mo</span>
                                    </div>
                                    <p className={styles.credits}>1,430 credits</p>
                                </div>

                                <div className={styles.divider} />

                                <ul className={styles.featuresList}>
                                    {features.map((feature, i) => (
                                        <li key={i} className={styles.featureItem}>
                                            <feature.icon className={styles.featureIconMuted} />
                                            <span>{feature.text}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    className={`${styles.ctaButton} ${styles.ctaSecondary} ${isDark ? styles.ctaSecondaryDark : styles.ctaSecondaryLight}`}
                                    onClick={() => handleGetPlan('creator')}
                                    disabled={loadingPlan !== null}
                                >
                                    {loadingPlan === 'creator' ? <LoadingSpinner /> : 'Get Creator'}
                                </button>
                            </div>
                        </div>

                        {/* Automation Plan */}
                        <div className={`${styles.card} ${styles.cardPro}`}>
                            {/* Best Value Badge */}
                            <div className={styles.badge}>
                                <CrownIcon className={styles.badgeIcon} />
                                Best Value
                            </div>

                            <div className={styles.cardContent}>
                                <div>
                                    <p className={`${styles.planLabel} ${styles.planLabelPro}`}>Automation</p>
                                    <div className={styles.priceRow}>
                                        <span className={styles.price}>$39</span>
                                        <span className={styles.period}>/mo</span>
                                    </div>
                                    <p className={styles.credits}>4,500 credits</p>
                                </div>

                                <div className={`${styles.divider} ${styles.dividerPro}`} />

                                <ul className={styles.featuresList}>
                                    {features.map((feature, i) => (
                                        <li key={i} className={styles.featureItem}>
                                            <feature.icon className={styles.featureIconPro} />
                                            <span>{feature.text}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    className={`${styles.ctaButton} ${styles.ctaPrimary}`}
                                    onClick={() => handleGetPlan('automation')}
                                    disabled={loadingPlan !== null}
                                >
                                    {loadingPlan === 'automation' ? <LoadingSpinner /> : 'Get Automation'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Free Plan CTA */}
                    <div className={styles.footer}>
                        <p className={styles.footerText}>
                            Want to try first?{' '}
                            <button className={styles.footerLink} onClick={onClose}>
                                Start free
                            </button>
                            {' '}— no card required.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
