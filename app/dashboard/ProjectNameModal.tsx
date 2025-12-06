'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './ProjectNameModal.module.css';

interface ProjectNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (name: string, isPublic: boolean) => void;
  editMode?: boolean;
  initialName?: string;
  initialIsPublic?: boolean;
  theme?: 'light' | 'dark';
}

export default function ProjectNameModal({
  isOpen,
  onClose,
  onCreateProject,
  editMode = false,
  initialName = 'untitled',
  initialIsPublic = true,
  theme = 'light'
}: ProjectNameModalProps) {
  const [projectName, setProjectName] = useState(initialName);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Set initial values based on edit mode
      setProjectName(editMode ? initialName : 'untitled');
      setIsPublic(editMode ? initialIsPublic : true);
      // Focus input and select all text after a brief delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, editMode, initialName, initialIsPublic]);

  const handleSubmit = () => {
    if (projectName.trim()) {
      onCreateProject(projectName.trim(), isPublic);
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`${styles.overlay} ${theme === 'dark' ? styles.darkTheme : ''}`} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close modal"
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M24 8L8 24M8 8L24 24" stroke="#D5D5D5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Title */}
        <h2 className={styles.title}>
          {editMode ? 'Edit your' : 'Name your'} <span className={styles.titleAccent}>Project</span>
        </h2>

        {/* Icon and Label */}
        <div className={styles.labelRow}>
          <div className={styles.iconWrapper}>
            <Image
              src="/assets/dashboard/icons/pencil-edit.svg"
              alt=""
              width={24}
              height={24}
              aria-hidden="true"
            />
          </div>
          <p className={styles.label}>{editMode ? 'Edit your project' : 'Name your project'}</p>
        </div>

        {/* Input Field */}
        <div className={styles.inputContainer}>
          <input
            ref={inputRef}
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Name here"
            className={styles.input}
            aria-label="Project name"
          />
        </div>

        {/* Toggle Switch */}
        <div className={styles.toggleContainer}>
          <p className={styles.toggleLabel}>Make this project public</p>
          <button
            className={`${styles.toggle} ${isPublic ? styles.toggleActive : ''}`}
            onClick={() => setIsPublic(!isPublic)}
            role="switch"
            aria-checked={isPublic}
            aria-label="Make this project public"
          >
            <div className={styles.toggleKnob} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={styles.createButton}
            onClick={handleSubmit}
          >
            {editMode ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
