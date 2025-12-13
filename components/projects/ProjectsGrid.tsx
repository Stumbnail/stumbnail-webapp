'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Project, Theme } from '@/types';
import ProjectCard from './ProjectCard';
import { AnimatedBorder } from '@/components/ui';
import styles from '@/app/dashboard/dashboard.module.css';

interface ProjectsGridProps {
    filteredProjects: Project[];
    displayedProjects: Project[];
    hasMoreProjects: boolean;
    searchQuery: string;
    projectMenuOpen: string | null;
    editingProjectId: string | null;
    editingProjectName: string;
    theme?: Theme;
    onCreateProject: () => void;
    onProjectMenuClick: (projectId: string) => void;
    onEditProject: (projectId: string) => void;
    onEditNameChange: (value: string) => void;
    onEditSave: (projectId: string) => void;
    onEditCancel: () => void;
    onToggleFavorite: (projectId: string) => void;
    onOpenProject: (projectId: string) => void;
    onDeleteProject: (projectId: string) => void;
}

export default function ProjectsGrid({
    filteredProjects,
    displayedProjects,
    hasMoreProjects,
    searchQuery,
    projectMenuOpen,
    editingProjectId,
    editingProjectName,
    theme = 'dark',
    onCreateProject,
    onProjectMenuClick,
    onEditProject,
    onEditNameChange,
    onEditSave,
    onEditCancel,
    onToggleFavorite,
    onOpenProject,
    onDeleteProject,
}: ProjectsGridProps) {
    const router = useRouter();

    if (filteredProjects.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIconWrapper}>
                    <Image
                        src="/assets/dashboard/icons/project-section-youtube-with-sparkles.svg"
                        alt="No projects illustration"
                        width={80}
                        height={80}
                    />
                </div>
                <p className={styles.emptyText}>
                    {searchQuery
                        ? `No projects found for "${searchQuery}"`
                        : "No projects yet — let's create your first one!"}
                </p>
                {!searchQuery && (
                    <AnimatedBorder
                        borderWidth={1.5}
                        radius={14}
                        gap={2}
                        duration={0.3}
                    >
                        <button
                            className={styles.startButton}
                            onClick={onCreateProject}
                            aria-label="Start creating your first thumbnail project"
                        >
                            <Image
                                src="/assets/dashboard/icons/star-for-start-creating-button.svg"
                                alt=""
                                width={20}
                                height={20}
                                aria-hidden="true"
                            />
                            <span>Start Creating</span>
                        </button>
                    </AnimatedBorder>
                )}
            </div>
        );
    }

    return (
        <>
            <div className={styles.projectsGrid}>
                {/* Create Project Placeholder Card */}
                {filteredProjects.length > 0 && (
                    <button
                        className={styles.createProjectCard}
                        onClick={onCreateProject}
                        aria-label="Create new project"
                    >
                        <div className={styles.createProjectIcon}>
                            <Image
                                src="/assets/dashboard/icons/create-new-project-icon.svg"
                                alt=""
                                width={32}
                                height={32}
                                aria-hidden="true"
                            />
                        </div>
                        <span className={styles.createProjectText}>New Project</span>
                    </button>
                )}
                {displayedProjects.map((project, index) => (
                    <ProjectCard
                        key={project.id}
                        project={project}
                        isMenuOpen={projectMenuOpen === project.id}
                        isEditing={editingProjectId === project.id}
                        editingName={editingProjectName}
                        isPriority={index < 4}
                        theme={theme}
                        onMenuClick={() => onProjectMenuClick(project.id)}
                        onEdit={() => onEditProject(project.id)}
                        onEditNameChange={onEditNameChange}
                        onEditSave={() => onEditSave(project.id)}
                        onEditCancel={onEditCancel}
                        onToggleFavorite={() => onToggleFavorite(project.id)}
                        onOpen={() => onOpenProject(project.id)}
                        onDelete={() => onDeleteProject(project.id)}
                    />
                ))}
            </div>
            {hasMoreProjects && (
                <button className={styles.viewAllProjectsButton} onClick={() => router.push('/projects')}>
                    View All Projects ({filteredProjects.length})
                </button>
            )}
        </>
    );
}
