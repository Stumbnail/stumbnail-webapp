'use client';

import React from 'react';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
    /** Theme for the spinner - affects background and text colors */
    theme?: 'light' | 'dark';
    /** Size of the spinner */
    size?: 'small' | 'medium' | 'large';
    /** Optional loading text to display below the spinner */
    text?: string;
    /** If true, the spinner will cover the full screen */
    fullScreen?: boolean;
    /** Additional class name for the container */
    className?: string;
}

/**
 * Signature loading spinner component with 4 rotating dots.
 * This is the branded loading animation used throughout the app.
 * Theme is automatically applied via the HTML element class set by the layout.
 */
export default function LoadingSpinner({
    theme,
    size = 'medium',
    text,
    fullScreen = false,
    className = '',
}: LoadingSpinnerProps) {
    const containerClasses = [
        styles.container,
        theme && styles[theme], // Apply explicit theme if provided
        fullScreen && styles.fullScreen,
        className,
    ].filter(Boolean).join(' ');

    const spinnerClasses = [
        styles.spinner,
        styles[size],
    ].join(' ');

    const textClasses = [
        styles.text,
        size === 'small' && styles.textSmall,
        size === 'large' && styles.textLarge,
    ].filter(Boolean).join(' ');

    return (
        <div className={containerClasses}>
            <div className={spinnerClasses}>
                <div className={styles.dot}></div>
                <div className={styles.dot}></div>
                <div className={styles.dot}></div>
                <div className={styles.dot}></div>
            </div>
            {text && <p className={textClasses}>{text}</p>}
        </div>
    );
}

