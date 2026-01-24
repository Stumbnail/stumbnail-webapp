'use client';

import { useState, useEffect } from 'react';
import { Theme } from '@/types';
import styles from './ExportSatisfactionToast.module.css';

interface ExportSatisfactionToastProps {
    open: boolean;
    onSubmit: (rating: number, issue?: string, issueText?: string) => void;
    onDismiss: () => void;
    theme: Theme;
}

const ISSUE_OPTIONS = [
    { id: 'typography', label: 'Text/typography wasn\'t right' },
    { id: 'composition', label: 'Composition/layout' },
    { id: 'face', label: 'Face cutout/subject looks off' },
    { id: 'background', label: 'Background/style mismatch' },
    { id: 'reference', label: 'Not close to the reference/idea' },
    { id: 'generic', label: 'Too generic / not click-worthy' },
    { id: 'other', label: 'Other' }
];

export default function ExportSatisfactionToast({
    open,
    onSubmit,
    onDismiss,
    theme
}: ExportSatisfactionToastProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [selectedRating, setSelectedRating] = useState<number | null>(null);
    const [showIssueSelect, setShowIssueSelect] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
    const [otherText, setOtherText] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const isDark = theme === 'dark';

    // Handle visibility with animation
    useEffect(() => {
        if (open) {
            const showTimer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(showTimer);
        } else {
            setIsVisible(false);
            setSelectedRating(null);
            setShowIssueSelect(false);
            setSelectedIssue(null);
            setOtherText('');
            setIsSubmitted(false);
        }
    }, [open]);

    const handleRatingClick = (rating: number) => {
        setSelectedRating(rating);

        if (rating <= 3) {
            // Show issue selection for low ratings
            setShowIssueSelect(true);
        } else {
            // Submit immediately for high ratings
            setIsSubmitted(true);
            onSubmit(rating);
            setTimeout(() => {
                setIsVisible(false);
                setTimeout(onDismiss, 200);
            }, 1500);
        }
    };

    const handleIssueSubmit = () => {
        if (selectedRating === null) return;

        setIsSubmitted(true);
        onSubmit(
            selectedRating,
            selectedIssue || undefined,
            selectedIssue === 'other' ? otherText : undefined
        );

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
        <div className={`${styles.container} ${isDark ? styles.containerDark : styles.containerLight} ${isVisible ? styles.visible : ''}`}>
            <button
                className={styles.dismissButton}
                onClick={handleDismiss}
                aria-label="Dismiss"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                </svg>
            </button>

            {isSubmitted ? (
                <div className={styles.thankYou}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Thanks for your feedback!
                </div>
            ) : showIssueSelect ? (
                <div className={styles.issueSection}>
                    <span className={styles.issueQuestion}>What was missing?</span>
                    <div
                        className={styles.issueOptions}
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {ISSUE_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                className={`${styles.issueOption} ${selectedIssue === option.id ? styles.issueOptionSelected : ''}`}
                                onClick={() => setSelectedIssue(option.id)}
                                type="button"
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    {selectedIssue === 'other' && (
                        <input
                            type="text"
                            className={styles.otherInput}
                            placeholder="Tell us more (optional)"
                            value={otherText}
                            onChange={(e) => setOtherText(e.target.value)}
                            maxLength={200}
                        />
                    )}
                    <button
                        className={styles.submitButton}
                        onClick={handleIssueSubmit}
                        disabled={!selectedIssue}
                    >
                        Submit
                    </button>
                </div>
            ) : (
                <div className={styles.ratingSection}>
                    <span className={styles.question}>How satisfied are you?</span>
                    <div className={styles.ratings}>
                        {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                                key={rating}
                                className={`${styles.ratingButton} ${selectedRating === rating ? styles.ratingButtonSelected : ''}`}
                                onClick={() => handleRatingClick(rating)}
                                type="button"
                                aria-label={`Rate ${rating} out of 5`}
                            >
                                {rating}
                            </button>
                        ))}
                    </div>
                    <div className={styles.ratingLabels}>
                        <span>Not great</span>
                        <span>Love it</span>
                    </div>
                </div>
            )}
        </div>
    );
}
