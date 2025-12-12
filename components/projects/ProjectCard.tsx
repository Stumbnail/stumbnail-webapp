'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Project } from '@/types';
import styles from '@/app/dashboard/dashboard.module.css';
import AnimatedBorder from '@/components/ui/AnimatedBorder';

interface ProjectCardProps {
    project: Project;
    isMenuOpen: boolean;
    isEditing: boolean;
    editingName: string;
    /** Set to true for first visible cards to optimize LCP */
    isPriority?: boolean;
    onMenuClick: () => void;
    onEdit: () => void;
    onEditNameChange: (value: string) => void;
    onEditSave: () => void;
    onEditCancel: () => void;
    onToggleFavorite: () => void;
    onOpen: () => void;
    onDelete: () => void;
}

export default function ProjectCard({
    project,
    isMenuOpen,
    isEditing,
    editingName,
    isPriority = false,
    onMenuClick,
    onEdit,
    onEditNameChange,
    onEditSave,
    onEditCancel,
    onToggleFavorite,
    onOpen,
    onDelete,
}: ProjectCardProps) {
    const router = useRouter();
    const editInputRef = useRef<HTMLInputElement>(null);

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onEditSave();
        } else if (e.key === 'Escape') {
            onEditCancel();
        }
    };

    const handleCardClick = () => {
        router.push(`/project/${project.id}`);
    };

    return (
        <AnimatedBorder
            borderWidth={1.5}
            radius={14}
            gap={2}
            duration={0.3}
        >
            <div className={styles.projectCard}>
                <div
                    className={styles.projectThumbnail}
                    onClick={handleCardClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCardClick();
                        }
                    }}
                    aria-label={`Open ${project.name}`}
                >
                    <Image
                        src={project.thumbnail}
                        alt={project.name}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        style={{ objectFit: 'cover' }}
                        priority={isPriority}
                        loading={isPriority ? undefined : 'lazy'}
                        fetchPriority={isPriority ? 'high' : 'auto'}
                    />
                </div>
                <div className={styles.projectInfo}>
                    <div className={styles.projectHeader}>
                        {isEditing ? (
                            <input
                                ref={editInputRef}
                                type="text"
                                value={editingName}
                                onChange={(e) => onEditNameChange(e.target.value)}
                                onBlur={onEditSave}
                                onKeyDown={handleEditKeyDown}
                                className={styles.projectNameInput}
                                aria-label="Edit project name"
                                autoFocus
                            />
                        ) : (
                            <h3 className={styles.projectName}>{project.name}</h3>
                        )}
                        <div className={styles.projectMenu} data-project-menu>
                            <button
                                className={styles.projectMenuButton}
                                onClick={onMenuClick}
                                aria-label="Project options"
                            >
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="10" cy="4" r="1.5" fill="currentColor" />
                                    <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                                    <circle cx="10" cy="16" r="1.5" fill="currentColor" />
                                </svg>
                            </button>
                            {isMenuOpen && (
                                <div className={styles.projectDropdown}>
                                    <button
                                        className={styles.projectDropdownItem}
                                        onClick={onEdit}
                                    >
                                        <Image
                                            src="/assets/dashboard/icons/edit-01-stroke-rounded 1.svg"
                                            alt=""
                                            width={18}
                                            height={18}
                                            aria-hidden="true"
                                        />
                                        Edit
                                    </button>
                                    <button
                                        className={styles.projectDropdownItem}
                                        onClick={onToggleFavorite}
                                    >
                                        <Image
                                            src={project.isFavorite ? '/assets/dashboard/icons/heart-filled.svg' : '/assets/dashboard/icons/heart-outline.svg'}
                                            alt=""
                                            width={18}
                                            height={18}
                                            aria-hidden="true"
                                        />
                                        {project.isFavorite ? 'Unfavorite' : 'Favorite'}
                                    </button>
                                    <button
                                        className={styles.projectDropdownItem}
                                        onClick={onOpen}
                                    >
                                        <Image
                                            src="/assets/dashboard/icons/link-square-02-stroke-rounded 1.svg"
                                            alt=""
                                            width={18}
                                            height={18}
                                            aria-hidden="true"
                                        />
                                        Open project
                                    </button>
                                    <button
                                        className={`${styles.projectDropdownItem} ${styles.projectDropdownItemDanger}`}
                                        onClick={onDelete}
                                    >
                                        <Image
                                            src="/assets/dashboard/icons/delete-02-stroke-rounded 1.svg"
                                            alt=""
                                            width={18}
                                            height={18}
                                            aria-hidden="true"
                                        />
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={styles.projectMeta}>
                        <span className={styles.projectDate}>{project.createdAt}</span>
                        <span className={styles.projectVisibility}>
                            {project.isPublic ? (
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1.33331 8C1.33331 8 3.33331 3.33334 7.99998 3.33334C12.6666 3.33334 14.6666 8 14.6666 8C14.6666 8 12.6666 12.6667 7.99998 12.6667C3.33331 12.6667 1.33331 8 1.33331 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11.96 11.96C10.8204 12.8286 9.43255 13.305 8.00004 13.3133C3.33337 13.3133 1.33337 8.64666 1.33337 8.64666C2.12568 7.06819 3.24126 5.66931 4.60671 4.53332M6.60004 3.42666C7.05891 3.29806 7.52858 3.23294 8.00004 3.23332C12.6667 3.23332 14.6667 7.89999 14.6667 7.89999C14.2474 8.75709 13.7458 9.56973 13.1694 10.3233M9.41337 9.41332C9.23022 9.61117 9.00942 9.76969 8.76424 9.87911C8.51905 9.98852 8.25445 10.0467 7.98614 10.0496C7.71783 10.0526 7.45199 9.99998 7.20453 9.89552C6.95707 9.79107 6.73296 9.63697 6.54532 9.44267C6.35768 9.24838 6.21019 9.01773 6.11291 8.76451C6.01563 8.51129 5.97061 8.24113 5.9804 7.97027C5.99019 7.69941 6.05458 7.43349 6.17002 7.18801C6.28545 6.94252 6.44968 6.72294 6.65337 6.54332" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M1.33337 1.33334L14.6667 14.6667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                            {project.isPublic ? 'Public' : 'Private'}
                        </span>
                    </div>
                </div>
            </div>
        </AnimatedBorder>
    );
}
