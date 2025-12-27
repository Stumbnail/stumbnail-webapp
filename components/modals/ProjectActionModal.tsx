'use client';

import { useEffect } from 'react';
import { AnimatedBorder } from '@/components/ui';
import styles from './ProjectActionModal.module.css';

interface ProjectActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: 'delete' | 'duplicate';
  projectName: string;
  theme?: 'light' | 'dark';
  isLoading?: boolean;
}

export default function ProjectActionModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  projectName: _projectName, // eslint-disable-line @typescript-eslint/no-unused-vars
  theme = 'light',
  isLoading = false
}: ProjectActionModalProps) {
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

  const getTitle = () => {
    switch (type) {
      case 'delete':
        return (
          <>
            Delete Your <span className={styles.accent}>Project</span>
          </>
        );
      case 'duplicate':
        return (
          <>
            Duplicate Your <span className={styles.accent}>Project</span>
          </>
        );
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'delete':
        return 'Are you sure you want to delete this project?';
      case 'duplicate':
        return 'This will create a copy of your project.';
    }
  };

  const getConfirmText = () => {
    if (isLoading) {
      return (
        <span className={styles.loadingText}>
          <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" opacity="0.5" />
          </svg>
          {type === 'delete' ? 'Deleting...' : 'Duplicating...'}
        </span>
      );
    }
    switch (type) {
      case 'delete':
        return 'Yes';
      case 'duplicate':
        return 'Duplicate';
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

        <h2 className={styles.title}>{getTitle()}</h2>
        <p className={styles.description}>{getDescription()}</p>

        <div className={styles.buttonGroup}>
          <AnimatedBorder radius={14} borderWidth={1.5} gap={2} borderColor="#d5d5d5" fullWidth>
            <button
              className={styles.cancelButton}
              onClick={onClose}
            >
              {type === 'delete' ? 'No' : 'Cancel'}
            </button>
          </AnimatedBorder>
          <AnimatedBorder radius={14} borderWidth={1.5} gap={2} borderColor="#ff6f61" fullWidth>
            <button
              className={`${styles.confirmButton} ${isLoading ? styles.loading : ''}`}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {getConfirmText()}
            </button>
          </AnimatedBorder>
        </div>
      </div>
    </div>
  );
}
