'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatedBorder } from '@/components/ui';
import { X, Upload, Trash2 } from 'lucide-react';
import type { Theme, FeaturePriority, BugSeverity } from '@/types';
import styles from './FeedbackModal.module.css';

type FeedbackTab = 'feature' | 'bug' | 'general';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: FeedbackData) => Promise<void>;
    theme: Theme;
}

export interface FeedbackData {
    type: 'feature_request' | 'bug_report' | 'general';
    featureDescription?: string;
    featureWhy?: string;
    featurePriority?: FeaturePriority;
    bugDescription?: string;
    bugContext?: string;
    bugScreenshot?: File;
    bugSeverity?: BugSeverity;
    generalText?: string;
    generalScore?: number;
}

export default function FeedbackModal({
    isOpen,
    onClose,
    onSubmit,
    theme,
}: FeedbackModalProps) {
    const [activeTab, setActiveTab] = useState<FeedbackTab>('feature');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Feature Request state
    const [featureDescription, setFeatureDescription] = useState('');
    const [featureWhy, setFeatureWhy] = useState('');
    const [featurePriority, setFeaturePriority] = useState<FeaturePriority>('nice_to_have');

    // Bug Report state
    const [bugDescription, setBugDescription] = useState('');
    const [bugContext, setBugContext] = useState('');
    const [bugScreenshot, setBugScreenshot] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const [bugSeverity, setBugSeverity] = useState<BugSeverity>('minor');

    // General Feedback state
    const [generalText, setGeneralText] = useState('');
    const [generalScore, setGeneralScore] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            // Reset after a delay to avoid visual glitches
            setTimeout(() => {
                setActiveTab('feature');
                resetAllForms();
            }, 300);
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

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const resetAllForms = () => {
        setFeatureDescription('');
        setFeatureWhy('');
        setFeaturePriority('nice_to_have');
        setBugDescription('');
        setBugContext('');
        setBugScreenshot(null);
        setScreenshotPreview(null);
        setBugSeverity('minor');
        setGeneralText('');
        setGeneralScore(null);
        setIsSubmitting(false);
    };

    const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBugScreenshot(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setScreenshotPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeScreenshot = () => {
        setBugScreenshot(null);
        setScreenshotPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async () => {
        let data: FeedbackData;

        if (activeTab === 'feature') {
            if (!featureDescription.trim()) return;
            data = {
                type: 'feature_request',
                featureDescription: featureDescription.trim(),
                featureWhy: featureWhy.trim() || undefined,
                featurePriority,
            };
        } else if (activeTab === 'bug') {
            if (!bugDescription.trim()) return;
            data = {
                type: 'bug_report',
                bugDescription: bugDescription.trim(),
                bugContext: bugContext.trim() || undefined,
                bugScreenshot: bugScreenshot || undefined,
                bugSeverity,
            };
        } else {
            if (!generalText.trim()) return;
            data = {
                type: 'general',
                generalText: generalText.trim(),
                generalScore: generalScore || undefined,
            };
        }

        setIsSubmitting(true);
        try {
            await onSubmit(data);
            resetAllForms();
            onClose();
        } catch (error) {
            console.error('Error submitting feedback:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isFormValid = () => {
        if (activeTab === 'feature') return featureDescription.trim().length > 0;
        if (activeTab === 'bug') return bugDescription.trim().length > 0;
        return generalText.trim().length > 0;
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                className={`${styles.modal} ${theme === 'dark' ? styles.darkTheme : ''}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-labelledby="feedback-modal-title"
                aria-modal="true"
            >
                {/* Close Button */}
                <button
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Close feedback modal"
                >
                    <X size={24} />
                </button>

                {/* Title */}
                <h2 id="feedback-modal-title" className={styles.title}>
                    Give <span className={styles.titleAccent}>Feedback</span>
                </h2>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'feature' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('feature')}
                    >
                        Feature Request
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'bug' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('bug')}
                    >
                        Bug Report
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'general' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('general')}
                    >
                        General
                    </button>
                </div>

                {/* Tab Content */}
                <div className={styles.content}>
                    {/* Feature Request Tab */}
                    {activeTab === 'feature' && (
                        <div className={styles.formGroup}>
                            <label htmlFor="feature-description" className={styles.label}>
                                What feature would you like to see? <span className={styles.required}>*</span>
                            </label>
                            <textarea
                                id="feature-description"
                                className={styles.textarea}
                                placeholder="Describe the feature you'd like..."
                                value={featureDescription}
                                onChange={(e) => setFeatureDescription(e.target.value)}
                                rows={4}
                                maxLength={500}
                                required
                            />
                            <div className={styles.charCount}>{featureDescription.length}/500</div>

                            <label htmlFor="feature-why" className={styles.label}>
                                Why is this important to you? (optional)
                            </label>
                            <textarea
                                id="feature-why"
                                className={styles.textarea}
                                placeholder="Tell us why this would help..."
                                value={featureWhy}
                                onChange={(e) => setFeatureWhy(e.target.value)}
                                rows={3}
                                maxLength={300}
                            />
                            <div className={styles.charCount}>{featureWhy.length}/300</div>

                            <label className={styles.label}>Priority</label>
                            <div className={styles.radioGroup}>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="priority"
                                        value="nice_to_have"
                                        checked={featurePriority === 'nice_to_have'}
                                        onChange={(e) => setFeaturePriority(e.target.value as FeaturePriority)}
                                    />
                                    <span>Nice to have</span>
                                </label>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="priority"
                                        value="important"
                                        checked={featurePriority === 'important'}
                                        onChange={(e) => setFeaturePriority(e.target.value as FeaturePriority)}
                                    />
                                    <span>Important</span>
                                </label>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="priority"
                                        value="must_have"
                                        checked={featurePriority === 'must_have'}
                                        onChange={(e) => setFeaturePriority(e.target.value as FeaturePriority)}
                                    />
                                    <span>Must have</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Bug Report Tab */}
                    {activeTab === 'bug' && (
                        <div className={styles.formGroup}>
                            <label htmlFor="bug-description" className={styles.label}>
                                What happened? <span className={styles.required}>*</span>
                            </label>
                            <textarea
                                id="bug-description"
                                className={styles.textarea}
                                placeholder="Describe the bug or issue..."
                                value={bugDescription}
                                onChange={(e) => setBugDescription(e.target.value)}
                                rows={4}
                                maxLength={500}
                                required
                            />
                            <div className={styles.charCount}>{bugDescription.length}/500</div>

                            <label htmlFor="bug-context" className={styles.label}>
                                What were you trying to do? (optional)
                            </label>
                            <textarea
                                id="bug-context"
                                className={styles.textarea}
                                placeholder="Tell us what you were trying to accomplish..."
                                value={bugContext}
                                onChange={(e) => setBugContext(e.target.value)}
                                rows={3}
                                maxLength={300}
                            />
                            <div className={styles.charCount}>{bugContext.length}/300</div>

                            <label className={styles.label}>Upload Screenshot (optional)</label>
                            {!screenshotPreview ? (
                                <div
                                    className={styles.uploadArea}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload size={24} className={styles.uploadIcon} />
                                    <p className={styles.uploadText}>Click to upload a screenshot</p>
                                    <p className={styles.uploadHint}>PNG, JPG up to 5MB</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleScreenshotChange}
                                        className={styles.fileInput}
                                    />
                                </div>
                            ) : (
                                <div className={styles.screenshotPreview}>
                                    <img src={screenshotPreview} alt="Screenshot preview" />
                                    <button
                                        type="button"
                                        className={styles.removeButton}
                                        onClick={removeScreenshot}
                                        aria-label="Remove screenshot"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}

                            <label className={styles.label}>Severity</label>
                            <div className={styles.radioGroup}>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="severity"
                                        value="minor"
                                        checked={bugSeverity === 'minor'}
                                        onChange={(e) => setBugSeverity(e.target.value as BugSeverity)}
                                    />
                                    <span>Minor</span>
                                </label>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="severity"
                                        value="major"
                                        checked={bugSeverity === 'major'}
                                        onChange={(e) => setBugSeverity(e.target.value as BugSeverity)}
                                    />
                                    <span>Major</span>
                                </label>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="severity"
                                        value="critical"
                                        checked={bugSeverity === 'critical'}
                                        onChange={(e) => setBugSeverity(e.target.value as BugSeverity)}
                                    />
                                    <span>Critical</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* General Feedback Tab */}
                    {activeTab === 'general' && (
                        <div className={styles.formGroup}>
                            <label htmlFor="general-text" className={styles.label}>
                                Your feedback <span className={styles.required}>*</span>
                            </label>
                            <textarea
                                id="general-text"
                                className={styles.textarea}
                                placeholder="Share your thoughts..."
                                value={generalText}
                                onChange={(e) => setGeneralText(e.target.value)}
                                rows={6}
                                maxLength={500}
                                required
                            />
                            <div className={styles.charCount}>{generalText.length}/500</div>

                            <label className={styles.label}>
                                Rate your experience (optional)
                            </label>
                            <div className={styles.scoreGrid}>
                                {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
                                    <button
                                        type="button"
                                        key={score}
                                        className={`${styles.scoreButton} ${
                                            generalScore === score ? styles.scoreButtonActive : ''
                                        }`}
                                        onClick={() => setGeneralScore(score)}
                                        aria-label={`Rate ${score} out of 10`}
                                    >
                                        {score}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.scoreLabels}>
                                <span className={styles.scoreLabel}>Poor</span>
                                <span className={styles.scoreLabel}>Excellent</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <AnimatedBorder
                        radius={14}
                        borderWidth={1.5}
                        gap={2}
                        borderColor="#d5d5d5"
                        fullWidth
                    >
                        <button
                            className={styles.cancelButton}
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                    </AnimatedBorder>
                    <AnimatedBorder
                        radius={14}
                        borderWidth={1.5}
                        gap={2}
                        borderColor="#ff6f61"
                        fullWidth
                    >
                        <button
                            className={styles.submitButton}
                            onClick={handleSubmit}
                            disabled={!isFormValid() || isSubmitting}
                        >
                            {isSubmitting ? 'Sending...' : 'Submit Feedback'}
                        </button>
                    </AnimatedBorder>
                </div>
            </div>
        </div>
    );
}
