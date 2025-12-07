'use client';

import { useRef } from 'react';
import Image from 'next/image';
import styles from '@/app/dashboard/dashboard.module.css';

interface HeaderProps {
    isMobile: boolean;
    searchQuery: string;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onToggleSidebar: () => void;
    onCreateProject: () => void;
}

export default function Header({
    isMobile,
    searchQuery,
    onSearchChange,
    onToggleSidebar,
    onCreateProject,
}: HeaderProps) {
    const searchInputRef = useRef<HTMLInputElement>(null);

    return (
        <header className={styles.header}>
            {/* Mobile Menu Button */}
            {isMobile && (
                <button
                    className={styles.menuButton}
                    onClick={onToggleSidebar}
                    aria-label="Toggle sidebar menu"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            )}

            {/* Search Bar */}
            <div
                className={styles.searchBar}
                onClick={() => searchInputRef.current?.focus()}
            >
                <Image
                    src="/assets/dashboard/icons/search.svg"
                    alt=""
                    width={18}
                    height={18}
                    className={styles.searchIcon}
                    aria-hidden="true"
                />
                <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={onSearchChange}
                    placeholder="Search projects or templates..."
                    className={styles.searchInput}
                    aria-label="Search projects or templates"
                />
            </div>

            {/* Create New Project Button */}
            <button
                className={styles.createButton}
                onClick={onCreateProject}
                aria-label="Create new thumbnail project"
            >
                <Image
                    src="/assets/dashboard/icons/create-new-project-icon.svg"
                    alt=""
                    width={20}
                    height={20}
                    aria-hidden="true"
                />
                <span>Create New Project</span>
            </button>
        </header>
    );
}
