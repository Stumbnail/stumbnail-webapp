'use client';

import { useEffect, useState } from 'react';
import { AnimatedBorder } from '@/components/ui';
import styles from './ShareModal.module.css';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  privacy: 'public' | 'private';
  onMakePublic?: () => Promise<void>;
  theme?: 'light' | 'dark';
}

export default function ShareModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  privacy,
  onMakePublic,
  theme = 'light'
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${projectId}`;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setCopied(false);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleMakePublicClick = async () => {
    if (!onMakePublic) return;
    setIsUpdatingPrivacy(true);
    try {
      await onMakePublic();
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  return (
    <div className={`${styles.overlay} ${theme === 'dark' ? styles.darkTheme : ''}`} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close modal"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className={styles.iconContainer}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </div>

        <h2 className={styles.title}>
          Share <span className={styles.accent}>{projectName}</span>
        </h2>

        {privacy === 'private' ? (
          <div className={styles.privateWarning}>
            <div className={styles.warningIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className={styles.warningContent}>
              <h3 className={styles.warningTitle}>Project is Private</h3>
              <p className={styles.warningText}>
                This project is currently private and cannot be shared. Make it public to generate a shareable link.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className={styles.description}>
              Anyone with this link can view your project. They can explore, zoom, and export thumbnails.
            </p>

            <div className={styles.linkContainer}>
              <input
                type="text"
                value={shareUrl}
                readOnly
                className={styles.linkInput}
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                className={`${styles.copyButton} ${copied ? styles.copied : ''}`}
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
            </div>

            <div className={styles.tips}>
              <div className={styles.tip}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>No login required for viewers</span>
              </div>
              <div className={styles.tip}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>View-only mode (viewers can't edit)</span>
              </div>
            </div>
          </>
        )}

        <div className={styles.buttonGroup}>
          {privacy === 'private' ? (
            <>
              <AnimatedBorder radius={14} borderWidth={1.5} gap={2} borderColor="#d5d5d5" fullWidth>
                <button
                  className={styles.cancelButton}
                  onClick={onClose}
                >
                  Cancel
                </button>
              </AnimatedBorder>
              <AnimatedBorder radius={14} borderWidth={1.5} gap={2} borderColor="#ff6f61" fullWidth>
                <button
                  className={`${styles.confirmButton} ${isUpdatingPrivacy ? styles.loading : ''}`}
                  onClick={handleMakePublicClick}
                  disabled={isUpdatingPrivacy}
                >
                  {isUpdatingPrivacy ? (
                    <span className={styles.loadingText}>
                      <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" opacity="0.5" />
                      </svg>
                      Making Public...
                    </span>
                  ) : (
                    'Make Public & Share'
                  )}
                </button>
              </AnimatedBorder>
            </>
          ) : (
            <AnimatedBorder radius={14} borderWidth={1.5} gap={2} borderColor="#ff6f61" fullWidth>
              <button
                className={styles.doneButton}
                onClick={onClose}
              >
                Done
              </button>
            </AnimatedBorder>
          )}
        </div>
      </div>
    </div>
  );
}
