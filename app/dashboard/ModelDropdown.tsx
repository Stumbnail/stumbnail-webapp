'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './ModelDropdown.module.css';

interface Model {
  id: string;
  name: string;
  description: string;
  featureTag: string;
  credits: number;
  logo: string;
}

interface ModelDropdownProps {
  selectedModel: Model | null;
  onSelectModel: (model: Model) => void;
  theme?: 'light' | 'dark';
  openUpward?: boolean;
  showLabel?: boolean;
}

const MODELS: Model[] = [
  {
    id: 'seedream-4',
    name: 'Seedream 4',
    description: 'Character reference support and text rendering',
    featureTag: 'Character Reference',
    credits: 8,
    logo: '/assets/dashboard/icons/seedream-4-model.webp'
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    description: 'Artistic style with custom text placement',
    featureTag: 'Text Placement',
    credits: 10,
    logo: '/assets/dashboard/icons/nano-banana-model.webp'
  },
  {
    id: 'flux-2-pro',
    name: 'Flux 2 Pro',
    description: 'Latest model with premium quality',
    featureTag: 'High Quality Designs',
    credits: 7,
    logo: '/assets/dashboard/icons/flux-2-model.svg'
  }
];

export default function ModelDropdown({ selectedModel, onSelectModel, theme = 'light', openUpward = false, showLabel = false }: ModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Calculate dropdown position when opening upward with fixed positioning
  useEffect(() => {
    if (isOpen && openUpward && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
      });
    } else if (!isOpen) {
      setDropdownPosition(null);
    }
  }, [isOpen, openUpward]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectModel = (model: Model) => {
    onSelectModel(model);
    setIsOpen(false);
  };

  return (
    <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : ''}`} ref={dropdownRef}>
      <button
        ref={triggerRef}
        className={`${styles.trigger} ${selectedModel ? styles.triggerSelected : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select model"
        aria-expanded={isOpen}
      >
        {selectedModel ? (
          <Image
            src={selectedModel.logo}
            alt=""
            width={24}
            height={24}
            className={styles.selectedLogo}
            aria-hidden="true"
          />
        ) : (
          <Image
            src="/assets/dashboard/icons/model.svg"
            alt=""
            width={24}
            height={24}
            aria-hidden="true"
          />
        )}
        {showLabel && <span className={styles.labelVisible}>{selectedModel ? selectedModel.name : 'Model'}</span>}
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`${styles.dropdown} ${openUpward ? styles.dropdownUpward : ''}`}
          style={openUpward && dropdownPosition ? {
            position: 'fixed',
            bottom: dropdownPosition.bottom,
            left: dropdownPosition.left,
            top: 'auto',
          } : undefined}
        >
          {/* Header */}
          <div className={styles.header}>
            <p className={styles.headerLabel}>Model Selected</p>
            <p className={styles.headerValue}>{selectedModel?.name || 'None'}</p>
          </div>

          {/* Model List */}
          <div className={styles.modelList}>
            {MODELS.map((model) => (
              <button
                key={model.id}
                className={`${styles.modelItem} ${selectedModel?.id === model.id ? styles.modelItemSelected : ''}`}
                onClick={() => handleSelectModel(model)}
              >
                <div className={styles.modelLogo}>
                  <Image
                    src={model.logo}
                    alt=""
                    width={24}
                    height={24}
                    className={styles.logoImage}
                  />
                </div>
                <div className={styles.modelInfo}>
                  <p className={styles.modelName}>{model.name}</p>
                </div>
                <div className={styles.creditsContainer}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <circle cx="7" cy="7" r="6.5" fill="#DA9A28" stroke="#DA9A28" />
                    <path d="M7 3.5V10.5M4.5 7H9.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <span className={styles.credits}>{model.credits}</span>
                </div>
                {selectedModel?.id === model.id && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.checkIcon} aria-hidden="true">
                    <path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="#ff6f61" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
