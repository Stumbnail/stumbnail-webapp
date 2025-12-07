'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

// Hooks
import { useAuth, useTheme } from '@/hooks';

// Styles
import styles from './projectCanvas.module.css';

// Creation mode types
type CreationMode = 'url' | 'image' | 'prompt' | 'sketch';

export default function ProjectCanvasPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  // Custom hooks
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme({ userId: user?.uid });

  // UI State
  const [projectName, setProjectName] = useState('My First Thumbnail');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedMode, setSelectedMode] = useState<CreationMode>('url');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [youtubeLinkError, setYoutubeLinkError] = useState<string | null>(null);

  // Refs
  const youtubeLinkInputRef = useRef<HTMLTextAreaElement>(null);

  // Handlers
  const handleBack = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleTogglePublic = useCallback(() => {
    setIsPublic(prev => !prev);
  }, []);

  const handleModeSelect = useCallback((mode: CreationMode) => {
    setSelectedMode(mode);
  }, []);

  const validateYoutubeLink = (url: string): boolean => {
    if (!url.trim()) {
      setYoutubeLinkError('Please enter a YouTube link');
      return false;
    }

    const youtubePatterns = [
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/v\/[\w-]+/,
      /^(https?:\/\/)?youtu\.be\/[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/,
    ];

    const isValid = youtubePatterns.some(pattern => pattern.test(url.trim()));

    if (!isValid) {
      setYoutubeLinkError('Please enter a valid YouTube link');
      return false;
    }

    setYoutubeLinkError(null);
    return true;
  };

  const handleYoutubeLinkChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setYoutubeLink(e.target.value);
    if (youtubeLinkError) {
      setYoutubeLinkError(null);
    }
  }, [youtubeLinkError]);

  const handleYoutubeLinkSubmit = useCallback(() => {
    if (validateYoutubeLink(youtubeLink)) {
      console.log('Generating from YouTube:', youtubeLink);
    }
  }, [youtubeLink]);

  // Show loading state
  if (authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading...</p>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : styles.lightTheme}`}>
      {/* Left Sidebar */}
      <aside className={styles.sidebar}>
        {/* Header with back button and project name */}
        <div className={styles.sidebarHeader}>
          <button
            className={styles.backButton}
            onClick={handleBack}
            aria-label="Go back to dashboard"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 19L8 12L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className={styles.projectTitle}>{projectName}</h1>
        </div>

        {/* Public toggle */}
        <div className={styles.publicToggleContainer}>
          <span className={styles.publicToggleLabel}>Make project public</span>
          <button
            className={`${styles.toggleSwitch} ${isPublic ? styles.toggleActive : ''}`}
            onClick={handleTogglePublic}
            role="switch"
            aria-checked={isPublic}
            aria-label="Toggle project visibility"
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>

        {/* Create New Section */}
        <div className={styles.createNewSection}>
          <h2 className={styles.createNewTitle}>Create New</h2>

          <div className={styles.createOptionsGrid}>
            {/* Using URL Option */}
            <button
              className={`${styles.createOption} ${selectedMode === 'url' ? styles.createOptionSelected : ''}`}
              onClick={() => handleModeSelect('url')}
              aria-pressed={selectedMode === 'url'}
            >
              <div className={styles.createOptionIcon}>
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.75 21.25L21.25 12.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19.125 22.6667L15.5833 26.2083C14.4221 27.3696 12.8554 28.0226 11.2225 28.0226C9.58961 28.0226 8.02291 27.3696 6.86166 26.2083C5.70041 25.0471 5.04742 23.4804 5.04742 21.8475C5.04742 20.2146 5.70041 18.6479 6.86166 17.4867L10.4033 13.945" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23.5967 20.055L27.1384 16.5133C28.2996 15.3521 28.9526 13.7854 28.9526 12.1525C28.9526 10.5196 28.2996 8.95291 27.1384 7.79166C25.9771 6.63041 24.4104 5.97742 22.7775 5.97742C21.1446 5.97742 19.5779 6.63041 18.4167 7.79166L14.875 11.3333" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className={styles.createOptionLabel}>Using URL</span>
            </button>

            {/* Image Option */}
            <button
              className={`${styles.createOption} ${selectedMode === 'image' ? styles.createOptionSelected : ''}`}
              onClick={() => handleModeSelect('image')}
              aria-pressed={selectedMode === 'image'}
            >
              <div className={styles.createOptionIcon}>
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4.25" y="4.25" width="25.5" height="25.5" rx="4" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12.75" cy="12.75" r="2.5" stroke="currentColor" strokeWidth="2"/>
                  <path d="M4.25 22.6667L10.2387 16.678C10.769 16.1477 11.4838 15.8478 12.2292 15.8478C12.9745 15.8478 13.6893 16.1477 14.2196 16.678L21.25 23.7083" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19.8333 21.25L22.1553 18.9279C22.6857 18.3976 23.4005 18.0977 24.1458 18.0977C24.8912 18.0977 25.606 18.3976 26.1363 18.9279L29.75 22.5416" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className={styles.createOptionLabel}>Image</span>
            </button>

            {/* Prompt Option */}
            <button
              className={`${styles.createOption} ${selectedMode === 'prompt' ? styles.createOptionSelected : ''}`}
              onClick={() => handleModeSelect('prompt')}
              aria-pressed={selectedMode === 'prompt'}
            >
              <div className={styles.createOptionIcon}>
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 4.25L19.5417 11.3333L26.625 8.79167L21.25 17L26.625 25.2083L19.5417 22.6667L17 29.75L14.4583 22.6667L7.375 25.2083L12.75 17L7.375 8.79167L14.4583 11.3333L17 4.25Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className={styles.createOptionLabel}>Prompt</span>
            </button>

            {/* Sketch to Thumbnail Option */}
            <button
              className={`${styles.createOption} ${selectedMode === 'sketch' ? styles.createOptionSelected : ''}`}
              onClick={() => handleModeSelect('sketch')}
              aria-pressed={selectedMode === 'sketch'}
            >
              <div className={styles.createOptionIcon}>
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24.0833 5.66667L28.3333 9.91667M5.66667 28.3333L7.79167 20.9583C7.90667 20.5583 8.12833 20.1958 8.43333 19.9083L22.1833 6.15833C22.4483 5.89333 22.7617 5.68167 23.1058 5.535C23.4499 5.38833 23.8184 5.31 24.1917 5.30667C24.565 5.30333 24.9348 5.37333 25.2815 5.5125C25.6282 5.65167 25.9458 5.85667 26.2167 6.115C26.4875 6.37333 26.7067 6.68 26.8617 7.0175C27.0167 7.355 27.1042 7.71833 27.1192 8.08833C27.1342 8.45833 27.0758 8.82833 26.9475 9.175C26.8192 9.52167 26.6233 9.83833 26.3717 10.1092L12.6217 23.8592C12.3342 24.1467 11.9775 24.3542 11.585 24.4617L5.66667 28.3333Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19.8333 8.5L25.5 14.1667" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className={styles.createOptionLabel}>Sketch to Thumbnail</span>
            </button>
          </div>
        </div>

        {/* Spacer */}
        <div className={styles.sidebarSpacer} />

        {/* YouTube Link Input Area */}
        {selectedMode === 'url' && (
          <div className={styles.youtubeInputSection}>
            <div className={`${styles.youtubeInputContainer} ${youtubeLinkError ? styles.youtubeInputError : ''}`}>
              <textarea
                ref={youtubeLinkInputRef}
                value={youtubeLink}
                onChange={handleYoutubeLinkChange}
                placeholder="Paste a YouTube link to generate thumbnail"
                className={styles.youtubeTextarea}
                aria-label="Paste YouTube video URL to generate thumbnail"
                aria-invalid={!!youtubeLinkError}
                rows={3}
              />
              <button
                className={styles.submitButton}
                onClick={handleYoutubeLinkSubmit}
                aria-label="Generate thumbnail from YouTube video"
                type="button"
                disabled={!youtubeLink.trim()}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            {youtubeLinkError && (
              <p className={styles.inputError}>{youtubeLinkError}</p>
            )}
          </div>
        )}
      </aside>

      {/* Main Canvas Area */}
      <main className={styles.canvas}>
        {/* Decorative blur elements */}
        <div className={styles.blurTop} />
        <div className={styles.blurBottomLeft} />

        {/* Dot pattern background */}
        <div className={styles.dotPattern} />

        {/* Canvas content area - placeholder for now */}
        <div className={styles.canvasContent}>
          {/* Future: Generated thumbnails will appear here */}
        </div>
      </main>
    </div>
  );
}
