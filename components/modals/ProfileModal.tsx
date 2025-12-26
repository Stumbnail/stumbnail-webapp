'use client';

import { useState } from 'react';
import Image from 'next/image';
import { User } from 'firebase/auth';
import { Theme, UserData } from '@/types';
import { getUserPlan } from '@/lib/services/userService';
import { redirectToPortal } from '@/lib/services/subscriptionService';
import styles from './ProfileModal.module.css';

interface ProfileModalProps {
    open: boolean;
    onClose: () => void;
    user: User | null;
    userData: UserData | null;
    theme: Theme;
    onUpgradeClick?: () => void;
}

export default function ProfileModal({ open, onClose, user, userData, theme, onUpgradeClick }: ProfileModalProps) {
    const isDark = theme === 'dark';
    const [isLoadingPortal, setIsLoadingPortal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const plan = getUserPlan(userData);
    const hasActiveSubscription = plan.type !== 'free';
    const canUpgrade = plan.type !== 'automation'; // Not on highest tier

    const handleManageSubscription = async () => {
        setIsLoadingPortal(true);
        setError(null);
        try {
            await redirectToPortal();
        } catch (err) {
            console.error('Portal error:', err);
            setError(err instanceof Error ? err.message : 'Failed to open billing portal');
            setIsLoadingPortal(false);
        }
    };

    if (!open) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={`${styles.backdrop} ${isDark ? styles.backdropDark : styles.backdropLight}`} />

            <div
                className={`${styles.modal} ${isDark ? styles.modalDark : styles.modalLight}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className={styles.closeButton}
                    aria-label="Close profile"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </button>

                {/* Profile Header */}
                <div className={styles.header}>
                    <div className={styles.avatarContainer}>
                        {user?.photoURL ? (
                            <Image
                                src={user.photoURL}
                                alt="Profile"
                                width={80}
                                height={80}
                                className={styles.avatar}
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className={styles.avatarPlaceholder}>
                                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
                            </div>
                        )}
                        {hasActiveSubscription && (
                            <div className={styles.planBadge}>
                                {plan.name}
                            </div>
                        )}
                    </div>
                    <h2 className={styles.displayName}>
                        {user?.displayName || 'User'}
                    </h2>
                </div>

                {/* User Info */}
                <div className={styles.infoSection}>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Email</span>
                        <span className={styles.infoValue}>{user?.email || 'Not set'}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>User ID</span>
                        <span className={`${styles.infoValue} ${styles.userId}`}>
                            {user?.uid || 'Unknown'}
                        </span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Plan</span>
                        <span className={`${styles.infoValue} ${styles.planValue}`}>
                            {plan.name}
                            {plan.monthlyCredits > 0 && (
                                <span className={styles.planCredits}>
                                    {plan.monthlyCredits.toLocaleString()} credits/mo
                                </span>
                            )}
                        </span>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                {/* Subscription Management */}
                <div className={styles.actions}>
                    {/* Upgrade button - shown for non-Automation users */}
                    {canUpgrade && (
                        <button
                            className={styles.upgradeButton}
                            onClick={() => {
                                onUpgradeClick?.();
                                onClose();
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {hasActiveSubscription ? 'Upgrade Plan' : 'Get Started'}
                        </button>
                    )}

                    {hasActiveSubscription ? (
                        <>
                            <button
                                className={styles.manageButton}
                                onClick={handleManageSubscription}
                                disabled={isLoadingPortal}
                            >
                                {isLoadingPortal ? (
                                    <span className={styles.spinner} />
                                ) : (
                                    <>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect width="20" height="14" x="2" y="5" rx="2" />
                                            <path d="M2 10h20" />
                                        </svg>
                                        Manage Subscription
                                    </>
                                )}
                            </button>
                            <button
                                className={styles.cancelButton}
                                onClick={handleManageSubscription}
                                disabled={isLoadingPortal}
                            >
                                Cancel subscription
                            </button>
                        </>
                    ) : (
                        <p className={styles.freePlanNote}>
                            Upgrade to unlock private projects and more credits.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
