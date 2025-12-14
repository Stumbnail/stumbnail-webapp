'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './ModelDropdown.module.css';
import { AVAILABLE_MODELS } from '@/lib/constants';
import { Model } from '@/types';

interface ModelDropdownProps {
  selectedModel: Model | null;
  onSelectModel: (model: Model) => void;
  theme?: 'light' | 'dark';
  openUpward?: boolean;
  showLabel?: boolean;
  disabled?: boolean;
}

export default function ModelDropdown({ selectedModel, onSelectModel, theme = 'light', openUpward = false, showLabel = false, disabled = false }: ModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showMoreModels, setShowMoreModels] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Split models into primary and secondary
  const primaryModels = AVAILABLE_MODELS.filter(m => !m.isSecondary);
  const secondaryModels = AVAILABLE_MODELS.filter(m => m.isSecondary);

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

  // Get display name (no resolution suffix since it's now in options bar)
  const getDisplayName = (model: Model) => {
    return model.name;
  };

  // Render a model item
  const renderModelItem = (model: Model) => {
    const isSelected = selectedModel?.id === model.id;
    const showProBadge = model.hasResolutionOptions || model.isPro;

    return (
      <div key={model.id} className={styles.modelItemWrapper}>
        <button
          className={`${styles.modelItem} ${isSelected ? styles.modelItemSelected : ''} ${showProBadge ? styles.modelItemPro : ''}`}
          onClick={() => handleSelectModel(model)}
        >
          <div className={styles.modelLogo}>
            <Image
              src={model.logo}
              alt=""
              width={32}
              height={32}
              className={styles.logoImage}
            />
          </div>
          <div className={styles.modelInfo}>
            <div className={styles.modelNameRow}>
              <p className={styles.modelName}>{model.name}</p>
              {showProBadge && (
                <span className={styles.proBadge}>PRO</span>
              )}
            </div>
          </div>
          <div className={styles.modelMeta}>
            <div className={styles.creditsContainer}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={styles.creditIcon}>
                <circle cx="7" cy="7" r="6.5" fill="#DA9A28" stroke="#DA9A28" />
                <path d="M7 3.5V10.5M4.5 7H9.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className={styles.credits}>
                {model.credits}
              </span>
            </div>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : ''}`} ref={dropdownRef}>
      <button
        ref={triggerRef}
        className={`${styles.trigger} ${selectedModel ? styles.triggerSelected : ''} ${disabled ? styles.triggerDisabled : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-label="Select model"
        aria-expanded={isOpen}
        aria-disabled={disabled}
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
        {showLabel && <span className={styles.labelVisible}>{selectedModel ? getDisplayName(selectedModel) : 'Model'}</span>}
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
            <p className={styles.headerValue}>{selectedModel ? getDisplayName(selectedModel) : 'None'}</p>
          </div>

          {/* Primary Models */}
          <div className={styles.modelList}>
            {primaryModels.map(renderModelItem)}
          </div>

          {/* More Models Section */}
          {secondaryModels.length > 0 && (
            <>
              <button
                className={styles.moreModelsButton}
                onClick={() => setShowMoreModels(!showMoreModels)}
              >
                <span>More Models</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className={`${styles.moreModelsIcon} ${showMoreModels ? styles.moreModelsIconOpen : ''}`}
                >
                  <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {showMoreModels && (
                <div className={styles.modelList}>
                  {secondaryModels.map(renderModelItem)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

