'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Model } from '@/types';
import styles from './ModelOptionsBar.module.css';

interface ModelOptionsBarProps {
    model: Model | null;
    aspectRatio: string;
    resolution?: string;
    size?: string;
    megapixels?: string;
    onAspectRatioChange: (value: string) => void;
    onResolutionChange?: (value: string) => void;
    onSizeChange?: (value: string) => void;
    onMegapixelsChange?: (value: string) => void;
    theme?: 'light' | 'dark';
    compact?: boolean;
}

export default function ModelOptionsBar({
    model,
    aspectRatio,
    resolution,
    size,
    megapixels,
    onAspectRatioChange,
    onResolutionChange,
    onSizeChange,
    onMegapixelsChange,
    theme = 'light',
    compact = false
}: ModelOptionsBarProps) {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = useCallback((name: string) => {
        setOpenDropdown(prev => prev === name ? null : name);
    }, []);

    const handleSelect = useCallback((name: string, value: string) => {
        switch (name) {
            case 'aspectRatio':
                onAspectRatioChange(value);
                break;
            case 'resolution':
                onResolutionChange?.(value);
                break;
            case 'size':
                onSizeChange?.(value);
                break;
            case 'megapixels':
                onMegapixelsChange?.(value);
                break;
        }
        setOpenDropdown(null);
    }, [onAspectRatioChange, onResolutionChange, onSizeChange, onMegapixelsChange]);

    if (!model?.options) return null;

    const { aspectRatios, resolutions, sizes, megapixels: mpOptions } = model.options;

    // Format aspect ratio for display
    const formatAR = (ar: string) => ar === 'match_input_image' ? 'Match Input' : ar;

    return (
        <div
            ref={containerRef}
            className={`${styles.container} ${theme === 'dark' ? styles.dark : ''} ${compact ? styles.compact : ''}`}
        >
            {/* Aspect Ratio - Always shown */}
            <div className={styles.optionGroup}>
                <button
                    className={`${styles.optionPill} ${openDropdown === 'aspectRatio' ? styles.active : ''}`}
                    onClick={() => toggleDropdown('aspectRatio')}
                >
                    <span className={styles.optionLabel}>Ratio</span>
                    <span className={styles.optionValue}>{formatAR(aspectRatio)}</span>
                    <svg className={styles.chevron} width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                {openDropdown === 'aspectRatio' && (
                    <div className={styles.dropdown}>
                        {aspectRatios.map(ar => (
                            <button
                                key={ar}
                                className={`${styles.dropdownItem} ${ar === aspectRatio ? styles.selected : ''}`}
                                onClick={() => handleSelect('aspectRatio', ar)}
                            >
                                {formatAR(ar)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Resolution - nano-banana-pro */}
            {resolutions && onResolutionChange && (
                <div className={styles.optionGroup}>
                    <button
                        className={`${styles.optionPill} ${openDropdown === 'resolution' ? styles.active : ''}`}
                        onClick={() => toggleDropdown('resolution')}
                    >
                        <span className={styles.optionLabel}>Res</span>
                        <span className={styles.optionValue}>{resolution || model.defaultResolution || '2K'}</span>
                        <svg className={styles.chevron} width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    {openDropdown === 'resolution' && (
                        <div className={styles.dropdown}>
                            {resolutions.map(res => (
                                <button
                                    key={res}
                                    className={`${styles.dropdownItem} ${res === (resolution || model.defaultResolution) ? styles.selected : ''}`}
                                    onClick={() => handleSelect('resolution', res)}
                                >
                                    {res}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Size - seedream-4 */}
            {sizes && onSizeChange && (
                <div className={styles.optionGroup}>
                    <button
                        className={`${styles.optionPill} ${openDropdown === 'size' ? styles.active : ''}`}
                        onClick={() => toggleDropdown('size')}
                    >
                        <span className={styles.optionLabel}>Size</span>
                        <span className={styles.optionValue}>{size || model.defaultSize || '4K'}</span>
                        <svg className={styles.chevron} width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    {openDropdown === 'size' && (
                        <div className={styles.dropdown}>
                            {sizes.map(s => (
                                <button
                                    key={s}
                                    className={`${styles.dropdownItem} ${s === (size || model.defaultSize) ? styles.selected : ''}`}
                                    onClick={() => handleSelect('size', s)}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Megapixels - flux-2-pro */}
            {mpOptions && onMegapixelsChange && (
                <div className={styles.optionGroup}>
                    <button
                        className={`${styles.optionPill} ${openDropdown === 'megapixels' ? styles.active : ''}`}
                        onClick={() => toggleDropdown('megapixels')}
                    >
                        <span className={styles.optionLabel}>MP</span>
                        <span className={styles.optionValue}>{megapixels || model.defaultMegapixels || '1 MP'}</span>
                        <svg className={styles.chevron} width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    {openDropdown === 'megapixels' && (
                        <div className={styles.dropdown}>
                            {mpOptions.map(mp => (
                                <button
                                    key={mp}
                                    className={`${styles.dropdownItem} ${mp === (megapixels || model.defaultMegapixels) ? styles.selected : ''}`}
                                    onClick={() => handleSelect('megapixels', mp)}
                                >
                                    {mp}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
