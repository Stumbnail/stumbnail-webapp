'use client';

import { useState } from 'react';
import { Theme } from '@/types';
import styles from './PaywallReasonModal.module.css';

interface PaywallReasonModalProps {
    open: boolean;
    onSubmit: (reason: string, optionalText?: string) => void;
    onDismiss: () => void;
    theme: Theme;
}

const REASON_OPTIONS = [
    { id: 'exploring', label: 'Just exploring / not ready', icon: '🔍' },
    { id: 'price', label: 'Price too high', icon: '💰' },
    { id: 'quality', label: "Don't trust the output quality yet", icon: '🎨' },
    { id: 'features', label: 'Missing features I need', icon: '✨' },
    { id: 'alternatives', label: 'I can do this with my current tools', description: 'ChatGPT/Canva/Photoshop/etc', icon: '🔧' },
    { id: 'confusing', label: 'Limits/credits are confusing', icon: '😕' },
    { id: 'frequency', label: "I don't make thumbnails often", icon: '📅' },
    { id: 'other', label: 'Other', icon: '💬' }
];

export default function PaywallReasonModal({
    open,
    onSubmit,
    onDismiss,
    theme
}: PaywallReasonModalProps) {
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [otherText, setOtherText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isDark = theme === 'dark';

    const handleSubmit = async () => {
        if (!selectedReason || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSubmit(
                selectedReason,
                selectedReason === 'other' ? otherText : undefined
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDismiss = () => {
        setSelectedReason(null);
        setOtherText('');
        onDismiss();
    };

    if (!open) return null;

    return (
        <div className={styles.overlay} onClick={handleDismiss}>
            <div className={`${styles.backdrop} ${isDark ? styles.backdropDark : styles.backdropLight}`} />

            <div
                className={`${styles.modal} ${isDark ? styles.modalDark : styles.modalLight}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={handleDismiss}
                    className={styles.closeButton}
                    aria-label="Close"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </button>

                <div className={styles.header}>
                    <div className={styles.iconWrapper}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <circle cx="12" cy="16" r="1" fill="currentColor"/>
                        </svg>
                    </div>
                    <h2 className={styles.title}>Quick question before you go</h2>
                    <p className={styles.subtitle}>
                        What&apos;s the main reason you&apos;re not upgrading today?
                    </p>
                </div>

                <div className={styles.options}>
                    {REASON_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            className={`${styles.option} ${selectedReason === option.id ? styles.optionSelected : ''}`}
                            onClick={() => setSelectedReason(option.id)}
                            type="button"
                        >
                            <span className={styles.optionIcon}>{option.icon}</span>
                            <div className={styles.optionContent}>
                                <span className={styles.optionLabel}>{option.label}</span>
                                {option.description && (
                                    <span className={styles.optionDescription}>{option.description}</span>
                                )}
                            </div>
                            {selectedReason === option.id && (
                                <div className={styles.optionCheck}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {selectedReason === 'other' && (
                    <div className={styles.otherInputWrapper}>
                        <textarea
                            className={styles.otherInput}
                            placeholder="Tell us more (optional)"
                            value={otherText}
                            onChange={(e) => setOtherText(e.target.value)}
                            maxLength={500}
                            rows={3}
                        />
                    </div>
                )}

                <div className={styles.actions}>
                    <button
                        className={styles.skipButton}
                        onClick={handleDismiss}
                    >
                        Skip
                    </button>
                    <button
                        className={`${styles.submitButton} ${!selectedReason ? styles.submitButtonDisabled : ''}`}
                        onClick={handleSubmit}
                        disabled={!selectedReason || isSubmitting}
                    >
                        {isSubmitting ? (
                            <span className={styles.spinner} />
                        ) : (
                            'Submit feedback'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
