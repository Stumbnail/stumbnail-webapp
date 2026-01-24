'use client';

import { useState, useEffect } from 'react';
import { Theme } from '@/types';
import styles from './ConfidenceFeedback.module.css';

interface ConfidenceFeedbackProps {
    open: boolean;
    onSubmit: (rating: 'yes' | 'maybe' | 'no') => void;
    onDismiss: () => void;
    theme: Theme;
    autoHideMs?: number;
}

const RATING_OPTIONS = [
    { id: 'yes', label: 'Yes', emoji: '(' },
    { id: 'maybe', label: 'Maybe', emoji: '~' },
    { id: 'no', label: 'No', emoji: ')' }
] as const;

export default function ConfidenceFeedback({
    open,
    onSubmit,
    onDismiss,
    theme,
    autoHideMs = 20000
}: ConfidenceFeedbackProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const isDark = theme === 'dark';

    // Handle visibility with animation
    useEffect(() => {
        if (open) {
            // Small delay for entrance animation
            const showTimer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(showTimer);
        } else {
            setIsVisible(false);
            setIsSubmitted(false);
        }
    }, [open]);

    // Auto-hide after timeout
    useEffect(() => {
        if (!open || isSubmitted) return;

        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onDismiss, 200);
        }, autoHideMs);

        return () => clearTimeout(timer);
    }, [open, isSubmitted, autoHideMs, onDismiss]);

    const handleRating = (rating: 'yes' | 'maybe' | 'no') => {
        setIsSubmitted(true);
        onSubmit(rating);

        // Auto-dismiss after brief thank you
        setTimeout(() => {
            setIsVisible(false);
            setTimeout(onDismiss, 200);
        }, 1500);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(onDismiss, 200);
    };

    if (!open) return null;

    return (
        <div
            className={`${styles.container} ${isDark ? styles.containerDark : styles.containerLight} ${isVisible ? styles.visible : ''}`}
        >
            {isSubmitted ? (
                <div className={styles.thankYou}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Thanks for the feedback!
                </div>
            ) : (
                <>
                    <button
                        className={styles.dismissButton}
                        onClick={handleDismiss}
                        aria-label="Dismiss"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                        </svg>
                    </button>

                    <span className={styles.question}>Would you upload this as-is?</span>

                    <div className={styles.options}>
                        {RATING_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                className={`${styles.option} ${styles[`option${option.id.charAt(0).toUpperCase() + option.id.slice(1)}`]}`}
                                onClick={() => handleRating(option.id)}
                                type="button"
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
