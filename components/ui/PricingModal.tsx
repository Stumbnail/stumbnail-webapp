'use client';

import { useState, useEffect } from 'react';
import { Theme } from '@/types';
import { redirectToCheckout, PlanType } from '@/lib/services/subscriptionService';
import styles from './PricingModal.module.css';
import { trackPricingModalOpen, trackPricingModalPlanClick } from '@/lib/analytics';

// Icons
function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
    );
}

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

function GlobeIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
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

const paidFeatures = [
    { icon: MergeIcon, text: "Smart Merge: combine assets with AI" },
    { icon: WandIcon, text: "Prompt-based generation" },
    { icon: YouTubeIcon, text: "Clone any YouTube thumbnail" },
    { icon: ImageIcon, text: "Upload custom assets" },
    { icon: LayersIcon, text: "Access to all AI models" },
    { icon: LockIcon, text: "Keep thumbnails private" },
];

const freeFeatures = [
    { icon: MergeIcon, text: "Smart Merge: combine assets with AI" },
    { icon: WandIcon, text: "Prompt-based generation" },
    { icon: YouTubeIcon, text: "Clone any YouTube thumbnail" },
    { icon: ImageIcon, text: "Upload custom assets" },
    { icon: LayersIcon, text: "Standard AI models" },
    { icon: GlobeIcon, text: "Thumbnails are public", isLimitation: true },
];

interface PricingModalProps {
    open: boolean;
    onClose: () => void;
    theme: Theme;
    userEmail?: string;
    source?: 'sidebar' | 'credits' | 'generate' | 'exhausted';
    currentPlan?: 'free' | 'creator' | 'automation';
}

export default function PricingModal({
    open,
    onClose,
    theme,
    userEmail,
    source = 'sidebar',
    currentPlan = 'free'
}: PricingModalProps) {
    const isDark = theme === 'dark';
    const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<'creator' | 'automation'>('creator');

    // Track modal open
    useEffect(() => {
        if (open) {
            trackPricingModalOpen(source, currentPlan);
        }
    }, [open, source, currentPlan]);

    const handleGetPlan = async (plan: PlanType) => {
        if (!userEmail) {
            setError('Please sign in to purchase a subscription');
            return;
        }

        // Track plan click
        trackPricingModalPlanClick(plan, currentPlan);

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
                        <h2 className={styles.title}>Simple, Credit-Based Pricing</h2>
                        <p className={styles.subtitle}>
                            Start free, upgrade when you need more.
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
                        {/* Free Trial Card */}
                        <div className={styles.cardFree}>
                            {/* Free Badge */}
                            <div className={styles.freeBadge}>
                                <SparklesIcon className={styles.badgeIcon} />
                                Start Here
                            </div>

                            <div className={styles.cardContent}>
                                {/* Price Display */}
                                <div className={styles.priceSection}>
                                    <p className={styles.planLabelFree}>Free Trial</p>
                                    <div className={styles.priceRow}>
                                        <span className={styles.price}>$0</span>
                                    </div>
                                    <p className={styles.creditsFree}>30 credits</p>
                                </div>

                                <div className={styles.dividerFree} />

                                {/* Features */}
                                <ul className={styles.featuresList}>
                                    {freeFeatures.map((feature, i) => (
                                        <li key={i} className={styles.featureItem}>
                                            <feature.icon className={feature.isLimitation ? styles.featureIconWarning : styles.featureIconFree} />
                                            <span className={feature.isLimitation ? styles.featureTextWarning : ''}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    className={styles.ctaFree}
                                    onClick={onClose}
                                >
                                    Start Free
                                </button>
                            </div>
                        </div>

                        {/* Paid Plans Card */}
                        <div className={styles.cardPaid}>
                            {/* Plan Toggle */}
                            <div className={`${styles.planToggle} ${isDark ? styles.planToggleDark : styles.planToggleLight}`}>
                                <button
                                    onClick={() => setSelectedPlan('creator')}
                                    className={`${styles.toggleButton} ${selectedPlan === 'creator' ? styles.toggleButtonActive : ''}`}
                                >
                                    Creator
                                </button>
                                <button
                                    onClick={() => setSelectedPlan('automation')}
                                    className={`${styles.toggleButton} ${selectedPlan === 'automation' ? styles.toggleButtonActive : ''}`}
                                >
                                    Automation
                                    {selectedPlan !== 'automation' && (
                                        <span className={styles.bestBadge}>
                                            <CrownIcon className={styles.bestBadgeIcon} />
                                            Best
                                        </span>
                                    )}
                                </button>
                            </div>

                            <div className={styles.cardContent}>
                                {/* Price Display */}
                                <div className={styles.priceSection}>
                                    <div className={styles.priceRow}>
                                        <span className={styles.price}>
                                            {selectedPlan === 'creator' ? '$12.99' : '$39'}
                                        </span>
                                        <span className={styles.period}>/mo</span>
                                    </div>
                                    <p className={styles.creditsPaid}>
                                        {selectedPlan === 'creator' ? '1,430 credits' : '4,500 credits'}
                                    </p>
                                </div>

                                <div className={styles.dividerPaid} />

                                {/* Features */}
                                <ul className={styles.featuresList}>
                                    {paidFeatures.map((feature, i) => (
                                        <li key={i} className={styles.featureItem}>
                                            <feature.icon className={styles.featureIconPaid} />
                                            <span>{feature.text}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    className={styles.ctaPaid}
                                    onClick={() => handleGetPlan(selectedPlan)}
                                    disabled={loadingPlan !== null}
                                >
                                    {loadingPlan === selectedPlan
                                        ? <LoadingSpinner />
                                        : `Get ${selectedPlan === 'creator' ? 'Creator' : 'Automation'}`
                                    }
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Credit Info */}
                    <div className={styles.footer}>
                        <p className={styles.footerText}>
                            Credits vary by AI model, from 3 to 47 per generation.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
