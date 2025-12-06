'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './StyleDropdown.module.css';

interface Style {
  id: string;
  name: string;
  styleId: string;
  thumbnail: string;
}

interface StyleDropdownProps {
  selectedStyle: Style | null;
  onSelectStyle: (style: Style | null) => void;
  onCreateNew: () => void;
  theme?: 'light' | 'dark';
}

const SAMPLE_STYLES: Style[] = [
  {
    id: '1',
    name: 'Mr Beast',
    styleId: 'mr-beast-persona-577488qf3',
    thumbnail: '/assets/dashboard/profile.png'
  },
  {
    id: '2',
    name: 'Cristiano Ronaldo',
    styleId: 'CR7 person',
    thumbnail: '/assets/dashboard/profile.png'
  }
];

export default function StyleDropdown({ selectedStyle, onSelectStyle, onCreateNew, theme = 'light' }: StyleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleSelectStyle = (style: Style) => {
    onSelectStyle(style);
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    onSelectStyle(null);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    onCreateNew();
    setIsOpen(false);
  };

  return (
    <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : ''}`} ref={dropdownRef}>
      <button
        className={`${styles.trigger} ${selectedStyle ? styles.triggerSelected : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select style"
        aria-expanded={isOpen}
      >
        {selectedStyle ? (
          <Image
            src={selectedStyle.thumbnail}
            alt=""
            width={24}
            height={24}
            className={styles.selectedThumbnail}
            aria-hidden="true"
          />
        ) : (
          <Image
            src="/assets/dashboard/icons/style.svg"
            alt=""
            width={24}
            height={24}
            aria-hidden="true"
          />
        )}
        <span>{selectedStyle ? selectedStyle.name : 'Style'}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {/* Style Items */}
          <div className={styles.styleList}>
            {SAMPLE_STYLES.map((style) => (
              <button
                key={style.id}
                className={`${styles.styleItem} ${selectedStyle?.id === style.id ? styles.styleItemSelected : ''}`}
                onClick={() => handleSelectStyle(style)}
              >
                <div className={styles.styleThumbnail}>
                  <Image
                    src={style.thumbnail}
                    alt=""
                    width={30}
                    height={30}
                    className={styles.thumbnailImage}
                  />
                </div>
                <div className={styles.styleInfo}>
                  <p className={styles.styleName}>{style.name}</p>
                  <p className={styles.styleId}>{style.styleId}</p>
                </div>
                {selectedStyle?.id === style.id && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.checkIcon} aria-hidden="true">
                    <path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="#ff6f61" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className={styles.divider} />

          {/* Create New Button */}
          <button className={styles.actionButton} onClick={handleCreateNew}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="#8D8D8D" strokeWidth="1.5"/>
              <path d="M12 8V16M8 12H16" stroke="#8D8D8D" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>Create New</span>
          </button>

          {/* Clear Selection Button */}
          {selectedStyle && (
            <button className={styles.clearButton} onClick={handleClearSelection}>
              <span>Clear Selection</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
