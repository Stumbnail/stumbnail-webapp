'use client';

import { useState } from 'react';
import { Theme } from '@/types';
import styles from './IntentPromptModal.module.css';

interface IntentPromptModalProps {
    open: boolean;
    onSubmit: (answer: string) => void;
    theme: Theme;
}

const INTENT_OPTIONS = [
    {
        id: 'youtube',
        label: 'Creating YouTube thumbnails',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.54 6.42C22.4212 5.94541 22.1793 5.51057 21.8387 5.15941C21.498 4.80824 21.0708 4.55318 20.6 4.42C18.88 4 12 4 12 4C12 4 5.12 4 3.4 4.46C2.92925 4.59318 2.50198 4.84824 2.16135 5.19941C1.82072 5.55057 1.57879 5.98541 1.46 6.46C1.14521 8.20556 0.991235 9.97631 1 11.75C0.988687 13.537 1.14266 15.3213 1.46 17.08C1.59096 17.5398 1.83831 17.9581 2.17814 18.2945C2.51798 18.6308 2.93881 18.8738 3.4 19C5.12 19.46 12 19.46 12 19.46C12 19.46 18.88 19.46 20.6 19C21.0708 18.8668 21.498 18.6118 21.8387 18.2606C22.1793 17.9094 22.4212 17.4746 22.54 17C22.8524 15.2676 23.0063 13.5103 23 11.75C23.0113 9.96295 22.8573 8.1787 22.54 6.42Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.75 15.02L15.5 11.75L9.75 8.48V15.02Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        ),
        description: 'Making click-worthy thumbnails for my videos'
    },
    {
        id: 'social',
        label: 'Social media graphics',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        ),
        description: 'Eye-catching visuals for Instagram, Twitter, etc.'
    },
    {
        id: 'professional',
        label: 'Professional design work',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        ),
        description: 'Client projects, marketing materials, presentations'
    },
    {
        id: 'exploring',
        label: 'Just exploring',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        ),
        description: 'Checking out what AI can do'
    },
    {
        id: 'other',
        label: 'Something else',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="1" fill="currentColor"/>
                <circle cx="19" cy="12" r="1" fill="currentColor"/>
                <circle cx="5" cy="12" r="1" fill="currentColor"/>
            </svg>
        ),
        description: "I've got my own creative plans"
    }
];

export default function IntentPromptModal({ open, onSubmit, theme }: IntentPromptModalProps) {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isDark = theme === 'dark';

    const handleSubmit = async () => {
        if (!selectedOption || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSubmit(selectedOption);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className={`${styles.overlay} ${isDark ? styles.overlayDark : styles.overlayLight}`}>
            <div className={styles.content}>
                {/* Decorative gradient orbs */}
                <div className={styles.orbTop} />
                <div className={styles.orbBottom} />

                <div className={styles.header}>
                    <div className={styles.logoIcon}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#starGradient)" stroke="url(#starGradient)" strokeWidth="1" />
                            <defs>
                                <linearGradient id="starGradient" x1="2" y1="2" x2="22" y2="21" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#ff6f61" />
                                    <stop offset="1" stopColor="#e8a838" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1 className={styles.title}>
                        What brings you to Stumbnail?
                    </h1>
                    <p className={styles.subtitle}>
                        Help us personalize your experience
                    </p>
                </div>

                <div className={styles.options}>
                    {INTENT_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            className={`${styles.option} ${selectedOption === option.id ? styles.optionSelected : ''}`}
                            onClick={() => setSelectedOption(option.id)}
                            type="button"
                        >
                            <div className={styles.optionIcon}>
                                {option.icon}
                            </div>
                            <div className={styles.optionContent}>
                                <span className={styles.optionLabel}>{option.label}</span>
                                <span className={styles.optionDescription}>{option.description}</span>
                            </div>
                            <div className={styles.optionCheck}>
                                {selectedOption === option.id && (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                <button
                    className={`${styles.continueButton} ${!selectedOption ? styles.continueButtonDisabled : ''}`}
                    onClick={handleSubmit}
                    disabled={!selectedOption || isSubmitting}
                >
                    {isSubmitting ? (
                        <span className={styles.spinner} />
                    ) : (
                        <>
                            Continue
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
