'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatedBorder } from '@/components/ui';
import { X } from 'lucide-react';
import type { Theme } from '@/types';
import styles from './FeedbackToast.module.css';

interface FeedbackToastProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (score: number, text: string, permanentDismiss: boolean) => void;
    theme: Theme;
    trigger: string;
}

export default function FeedbackToast({
    isOpen,
    onClose,
    onSubmit,
    theme,
    trigger,
}: FeedbackToastProps) {
    const [selectedScore, setSelectedScore] = useState<number | null>(null);
    const [feedbackText, setFeedbackText] = useState('');
    const [permanentDismiss, setPermanentDismiss] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Reset state when toast opens
    useEffect(() => {
        if (isOpen) {
            setSelectedScore(null);
            setFeedbackText('');
            setPermanentDismiss(false);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const getFollowUpQuestion = (score: number): string => {
        if (score >= 9) {
            return "What do you love most about Stumbnail?";
        } else if (score >= 7) {
            return "What would make Stumbnail a 10 for you?";
        } else {
            return "What's the biggest issue you're facing?";
        }
    };

    const handleSubmit = async () => {
        if (selectedScore === null) return;

        setIsSubmitting(true);
        try {
            await onSubmit(selectedScore, feedbackText, permanentDismiss);
        } catch (error) {
            console.error('Error submitting feedback:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={`${styles.feedbackToast} ${theme === 'dark' ? styles.darkTheme : ''} ${
                isOpen ? styles.enter : styles.exit
            }`}
            role="dialog"
            aria-labelledby="feedback-title"
            aria-describedby="feedback-description"
        >
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.iconBadge}>
                    <span className={styles.iconEmoji}>💬</span>
                </div>
                <button
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Close feedback"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className={styles.content}>
                <h3 id="feedback-title" className={styles.title}>
                    How satisfied are you with{' '}
                    <span className={styles.titleAccent}>Stumbnail</span>?
                </h3>
                <p id="feedback-description" className={styles.description}>
                    Your feedback helps us build a better product for you.
                </p>

                {/* Score Selection (1-10) */}
                <div className={styles.scoreGrid}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
                        <button
                            key={score}
                            className={`${styles.scoreButton} ${
                                selectedScore === score ? styles.scoreButtonActive : ''
                            }`}
                            onClick={() => setSelectedScore(score)}
                            aria-label={`Rate ${score} out of 10`}
                            aria-pressed={selectedScore === score}
                        >
                            {score}
                        </button>
                    ))}
                </div>

                <div className={styles.scoreLabels}>
                    <span className={styles.scoreLabel}>Not satisfied</span>
                    <span className={styles.scoreLabel}>Very satisfied</span>
                </div>

                {/* Follow-up Question (shows after score selection) */}
                {selectedScore !== null && (
                    <div className={styles.followUp}>
                        <label htmlFor="feedback-text" className={styles.followUpLabel}>
                            {getFollowUpQuestion(selectedScore)}
                        </label>
                        <textarea
                            ref={textareaRef}
                            id="feedback-text"
                            className={styles.textarea}
                            placeholder="Your thoughts... (optional)"
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            rows={3}
                            maxLength={500}
                        />
                        <div className={styles.charCount}>{feedbackText.length}/500</div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
                <label className={styles.dontAskAgain}>
                    <input
                        type="checkbox"
                        checked={permanentDismiss}
                        onChange={(e) => setPermanentDismiss(e.target.checked)}
                    />
                    <span>Don't show feedback requests</span>
                </label>

                <div className={styles.actions}>
                    <button
                        className={styles.skipButton}
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Skip
                    </button>
                    <AnimatedBorder
                        radius={14}
                        borderWidth={1.5}
                        gap={2}
                        borderColor="#ff6f61"
                        fullWidth={false}
                    >
                        <button
                            className={styles.submitButton}
                            onClick={handleSubmit}
                            disabled={selectedScore === null || isSubmitting}
                        >
                            {isSubmitting ? 'Sending...' : 'Send Feedback'}
                        </button>
                    </AnimatedBorder>
                </div>
            </div>
        </div>
    );
}
