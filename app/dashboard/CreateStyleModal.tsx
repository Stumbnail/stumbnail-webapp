'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './CreateStyleModal.module.css';

interface CreateStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateStyle: (name: string, images: File[]) => void;
}

export default function CreateStyleModal({
  isOpen,
  onClose,
  onCreateStyle
}: CreateStyleModalProps) {
  const [styleName, setStyleName] = useState('');
  const [uploadedImages, setUploadedImages] = useState<{ id: string; file: File; preview: string }[]>([]);
  const [inputMode, setInputMode] = useState<'youtube' | 'upload'>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const REQUIRED_IMAGES = 10;
  const imagesNeeded = REQUIRED_IMAGES - uploadedImages.length;

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

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, []);

  if (!isOpen) return null;

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files).filter(file => {
      const isValid = file.type === 'image/jpeg' || file.type === 'image/png';
      if (!isValid) {
        alert(`${file.name} is not a JPG or PNG file`);
      }
      return isValid;
    });

    const remainingSlots = REQUIRED_IMAGES - uploadedImages.length;
    const filesToAdd = validFiles.slice(0, remainingSlots);

    const newImages = filesToAdd.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file)
    }));

    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setUploadedImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleSubmit = () => {
    if (!styleName.trim()) {
      alert('Please enter a style name');
      return;
    }

    if (inputMode === 'youtube') {
      if (!youtubeUrl.trim()) {
        alert('Please enter a YouTube channel URL');
        return;
      }
      // TODO: Implement YouTube URL fetching
      console.log('Creating style from YouTube:', youtubeUrl);
    } else {
      if (uploadedImages.length !== REQUIRED_IMAGES) {
        alert(`Please upload exactly ${REQUIRED_IMAGES} images`);
        return;
      }
      const files = uploadedImages.map(img => img.file);
      onCreateStyle(styleName.trim(), files);
    }

    handleClose();
  };

  const handleClose = () => {
    setStyleName('');
    setUploadedImages(prev => {
      prev.forEach(img => URL.revokeObjectURL(img.preview));
      return [];
    });
    setInputMode('youtube');
    setYoutubeUrl('');
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close modal"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <h2 className={styles.title}>
          Create New <span className={styles.accent}>Style</span>
        </h2>

        {/* Style Name Input */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.iconWrapper}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.26 3.6L5.05 12.29C4.74 12.62 4.44 13.27 4.38 13.72L4.01 16.96C3.88 18.13 4.72 18.93 5.88 18.73L9.1 18.18C9.55 18.1 10.18 17.77 10.49 17.43L18.7 8.74C20.12 7.24 20.76 5.53 18.55 3.44C16.35 1.37 14.68 2.1 13.26 3.6Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11.89 5.05C12.32 7.81 14.56 9.92 17.34 10.2" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className={styles.sectionTitle}>Enter Style Name</h3>
          </div>
          <input
            type="text"
            value={styleName}
            onChange={(e) => setStyleName(e.target.value)}
            placeholder="Name here"
            className={styles.input}
            maxLength={50}
          />
        </div>

        {/* Input Mode Selector */}
        <div className={styles.modeSelector}>
          <button
            className={`${styles.modeButton} ${inputMode === 'youtube' ? styles.modeButtonActive : ''}`}
            onClick={() => setInputMode('youtube')}
          >
            <div className={styles.modeIcon}>
              <Image
                src="/assets/dashboard/icons/attachment-02-stroke-rounded 1.svg"
                alt=""
                width={20}
                height={20}
                className={styles.modeIconImage}
              />
            </div>
            <span>Fetch from YouTube</span>
          </button>
          <button
            className={`${styles.modeButton} ${inputMode === 'upload' ? styles.modeButtonActive : ''}`}
            onClick={() => setInputMode('upload')}
          >
            <div className={styles.modeIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 10C10.1046 10 11 9.10457 11 8C11 6.89543 10.1046 6 9 6C7.89543 6 7 6.89543 7 8C7 9.10457 7.89543 10 9 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2.67 18.95L7.6 15.64C8.39 15.11 9.53 15.17 10.24 15.78L10.57 16.07C11.35 16.74 12.61 16.74 13.39 16.07L17.55 12.5C18.33 11.83 19.59 11.83 20.37 12.5L22 13.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span>Upload Images</span>
          </button>
        </div>

        {/* Mode Description */}
        <div className={styles.modeDescription}>
          {inputMode === 'youtube' ? (
            <p className={styles.modeDescriptionText}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 11V8M8 5H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Paste a YouTube channel URL and we'll automatically fetch the 10 most recent video thumbnails to train your custom style.
            </p>
          ) : (
            <p className={styles.modeDescriptionText}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 11V8M8 5H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Upload exactly 10 images (JPG or PNG) that represent the style you want to create. These will be used to train your custom style.
            </p>
          )}
        </div>

        {inputMode === 'youtube' ? (
          /* YouTube URL Input */
          <div className={styles.section}>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/@channelname"
              className={styles.input}
            />
          </div>
        ) : (
          /* Image Upload Section */
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.iconWrapper}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 10C10.1046 10 11 9.10457 11 8C11 6.89543 10.1046 6 9 6C7.89543 6 7 6.89543 7 8C7 9.10457 7.89543 10 9 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2.67 18.95L7.6 15.64C8.39 15.11 9.53 15.17 10.24 15.78L10.57 16.07C11.35 16.74 12.61 16.74 13.39 16.07L17.55 12.5C18.33 11.83 19.59 11.83 20.37 12.5L22 13.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className={styles.sectionTitle}>
                Upload Image <span className={styles.progress}>({uploadedImages.length}/{REQUIRED_IMAGES})</span>
              </h3>
              {uploadedImages.length < REQUIRED_IMAGES && (
                <button
                  className={styles.addMoreButton}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 3.33334V12.6667M3.33333 8H12.6667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>

            {uploadedImages.length < REQUIRED_IMAGES && (
              <p className={styles.uploadHint}>
                {imagesNeeded} more image{imagesNeeded !== 1 ? 's' : ''} needed • Only JPG and PNG files
              </p>
            )}

            <div className={styles.imagesGrid}>
              {uploadedImages.map((img) => (
                <div key={img.id} className={styles.imagePreview}>
                  <Image
                    src={img.preview}
                    alt={img.file.name}
                    fill
                    className={styles.previewImage}
                  />
                  <button
                    className={styles.removeButton}
                    onClick={() => handleRemoveImage(img.id)}
                    aria-label={`Remove ${img.file.name}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              ))}

              {uploadedImages.length < REQUIRED_IMAGES && (
                <div
                  ref={dropZoneRef}
                  className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 30V18M18 24H30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M42 24C42 33.9411 33.9411 42 24 42C14.0589 42 6 33.9411 6 24C6 14.0589 14.0589 6 24 6C33.9411 6 42 14.0589 42 24Z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <p className={styles.dropZoneText}>Drop images here or click to browse</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={handleFileInputChange}
              className={styles.hiddenInput}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={handleClose}>
            Cancel
          </button>
          <button
            className={styles.createButton}
            onClick={handleSubmit}
            disabled={!styleName.trim() || (inputMode === 'upload' && uploadedImages.length !== REQUIRED_IMAGES) || (inputMode === 'youtube' && !youtubeUrl.trim())}
          >
            <span>Create Style</span>
            <div className={styles.credits}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 4V10M4 7H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>70 Credits</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
