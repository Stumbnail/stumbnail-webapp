'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Types
import { Project, EditProjectModalState, ProjectActionModalState } from '@/types';

// Hooks
import { useAuth, useTheme, useMobile } from '@/hooks';

// Constants
import { getNavItemsForRoute } from '@/lib/constants';

// Components
import { Sidebar } from '@/components/layout';
import { LoadingSpinner } from '@/components/ui';

// Lazy load modals to reduce TBT
const ProjectNameModal = dynamic(
    () => import('@/components/modals/ProjectNameModal'),
    { ssr: false }
);
const ProjectActionModal = dynamic(
    () => import('@/components/modals/ProjectActionModal'),
    { ssr: false }
);

// Styles
import dashboardStyles from '@/app/dashboard/dashboard.module.css';
import projectsStyles from '@/app/projects/projects.module.css';

// Mock data generator
const generateMockProjects = (): Project[] => {
    const projectNames = [
        'Epic Gaming Montage', 'Summer Vlog Thumbnail', 'Tech Review',
        'Cooking Tutorial', 'Fitness Journey', 'Music Cover Art',
        'Travel Adventure', 'DIY Crafts', 'Beauty Tips', 'Car Review'
    ];

    const thumbnails = [
        '/assets/dashboard/template1.png',
        '/assets/dashboard/template2.png',
        '/assets/dashboard/template3.png',
        '/assets/dashboard/template4.png',
    ];

    const timeAgo = [
        'Just now', '1 hour ago', '2 hours ago', '5 hours ago',
        '1 day ago', '2 days ago', '3 days ago', '5 days ago',
        '1 week ago', '2 weeks ago'
    ];

    return projectNames.map((name, index) => ({
        id: index + 1,
        name,
        thumbnail: thumbnails[index % thumbnails.length],
        createdAt: timeAgo[index % timeAgo.length],
        isPublic: Math.random() > 0.5,
        isFavorite: index < 3 // First 3 are favorites by default for demo
    }));
};

export default function FavouritesPage() {
    const router = useRouter();

    // Custom hooks
    const { user, loading: authLoading, signOut } = useAuth();
    const { theme, setTheme } = useTheme({ userId: user?.uid });
    const { isMobile, sidebarOpen, toggleSidebar, closeSidebar } = useMobile();

    // Navigation
    const navItems = useMemo(() => getNavItemsForRoute('favourites'), []);

    // UI state
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [projectMenuOpen, setProjectMenuOpen] = useState<number | null>(null);

    // Project modals
    const [editProjectModal, setEditProjectModal] = useState<EditProjectModalState>({
        isOpen: false,
        projectId: null,
        projectName: '',
        isPublic: true
    });

    const [projectActionModal, setProjectActionModal] = useState<ProjectActionModalState>({
        isOpen: false,
        type: 'delete',
        projectId: null,
        projectName: ''
    });

    // Projects state
    const [projects, setProjects] = useState<Project[]>(() => generateMockProjects());

    // Filtered favorites
    const favoriteProjects = useMemo(() =>
        projects.filter(p => p.isFavorite),
        [projects]
    );

    // Click outside handler for dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('[data-project-menu]')) {
                setProjectMenuOpen(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Handlers
    const handleSignOut = useCallback(async () => {
        try {
            await signOut();
            setProfileMenuOpen(false);
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }, [signOut]);

    const handleThemeToggle = useCallback((newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
    }, [setTheme]);

    const handleProjectMenuClick = useCallback((projectId: number) => {
        setProjectMenuOpen(prev => prev === projectId ? null : projectId);
    }, []);

    const handleEditProject = useCallback((projectId: number) => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            setEditProjectModal({
                isOpen: true,
                projectId,
                projectName: project.name,
                isPublic: project.isPublic
            });
        }
        setProjectMenuOpen(null);
    }, [projects]);

    const handleEditProjectConfirm = useCallback((name: string, isPublic: boolean) => {
        if (editProjectModal.projectId === null) return;

        setProjects(prev => prev.map(project =>
            project.id === editProjectModal.projectId
                ? { ...project, name, isPublic }
                : project
        ));

        setEditProjectModal({
            isOpen: false,
            projectId: null,
            projectName: '',
            isPublic: true
        });
    }, [editProjectModal.projectId]);

    const handleToggleFavorite = useCallback((projectId: number) => {
        setProjects(prev => prev.map(p =>
            p.id === projectId ? { ...p, isFavorite: !p.isFavorite } : p
        ));
        setProjectMenuOpen(null);
    }, []);

    const handleOpenProject = useCallback((projectId: number) => {
        console.log('Open project:', projectId);
        setProjectMenuOpen(null);
    }, []);

    const handleDeleteProject = useCallback((projectId: number) => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            setProjectActionModal({
                isOpen: true,
                type: 'delete',
                projectId,
                projectName: project.name
            });
        }
        setProjectMenuOpen(null);
    }, [projects]);

    const handleProjectActionConfirm = useCallback(() => {
        if (projectActionModal.projectId === null) return;
        setProjects(prev => prev.filter(project => project.id !== projectActionModal.projectId));
        setProjectActionModal({
            isOpen: false,
            type: 'delete',
            projectId: null,
            projectName: ''
        });
    }, [projectActionModal.projectId]);

    // Loading state
    if (authLoading) {
        return (
            <LoadingSpinner theme={theme} text="Loading..." fullScreen />
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className={`${dashboardStyles.container} ${theme === 'dark' ? `${dashboardStyles.darkTheme} darkTheme` : dashboardStyles.lightTheme}`}>
            {/* Decorative blur elements */}
            {!isMobile && (
                <>
                    <div className={dashboardStyles.blurTopRight} />
                    <div className={dashboardStyles.blurSidebarBottom} />
                </>
            )}

            {/* Mobile Overlay */}
            {isMobile && sidebarOpen && (
                <div className={dashboardStyles.overlay} onClick={closeSidebar} />
            )}

            {/* Sidebar */}
            <Sidebar
                user={user}
                navItems={navItems}
                theme={theme}
                sidebarOpen={sidebarOpen}
                profileMenuOpen={profileMenuOpen}
                onProfileMenuToggle={() => setProfileMenuOpen(prev => !prev)}
                onProfileMenuClose={() => setProfileMenuOpen(false)}
                onThemeToggle={handleThemeToggle}
                onSignOut={handleSignOut}
                onCloseSidebar={closeSidebar}
            />

            {/* Main Content */}
            <main className={dashboardStyles.main}>
                <header className={dashboardStyles.header}>
                    {isMobile && (
                        <button className={dashboardStyles.menuButton} onClick={toggleSidebar}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    )}

                    <h1 className={projectsStyles.pageTitle}>Favourites</h1>

                    <button
                        className={dashboardStyles.createButton}
                        onClick={() => router.push('/dashboard')}
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

                <div className={dashboardStyles.content}>
                    <div className={projectsStyles.pageHeader}>
                        <div className={projectsStyles.headerLeft}>
                            <h2 className={dashboardStyles.sectionTitle}>
                                Your <span className={dashboardStyles.titleAccent}>Favourites</span>
                            </h2>
                            <p className={projectsStyles.projectSubtext}>
                                {favoriteProjects.length} favourite {favoriteProjects.length === 1 ? 'project' : 'projects'}
                            </p>
                        </div>
                    </div>

                    {/* Projects Grid */}
                    {favoriteProjects.length > 0 ? (
                        <div className={projectsStyles.projectsGrid}>
                            {favoriteProjects.map((project) => (
                                <div key={project.id} className={dashboardStyles.projectCard}>
                                    <div className={dashboardStyles.projectThumbnail}>
                                        <Image
                                            src={project.thumbnail}
                                            alt={project.name}
                                            fill
                                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                            style={{ objectFit: 'cover' }}
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className={dashboardStyles.projectInfo}>
                                        <div className={dashboardStyles.projectHeader}>
                                            <h3 className={dashboardStyles.projectName}>{project.name}</h3>
                                            <div className={dashboardStyles.projectMenu} data-project-menu>
                                                <button
                                                    className={dashboardStyles.projectMenuButton}
                                                    onClick={() => handleProjectMenuClick(project.id)}
                                                    aria-label="Project options"
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                        <circle cx="10" cy="4" r="1.5" fill="currentColor" />
                                                        <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                                                        <circle cx="10" cy="16" r="1.5" fill="currentColor" />
                                                    </svg>
                                                </button>
                                                {projectMenuOpen === project.id && (
                                                    <div className={dashboardStyles.projectDropdown}>
                                                        <button
                                                            className={dashboardStyles.projectDropdownItem}
                                                            onClick={() => handleEditProject(project.id)}
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
                                                            className={dashboardStyles.projectDropdownItem}
                                                            onClick={() => handleToggleFavorite(project.id)}
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                                                                <path d="M9 15.75C9 15.75 2.0625 11.625 2.0625 6.5625C2.0625 5.50483 2.48284 4.49048 3.23041 3.74291C3.97798 2.99534 4.99233 2.575 6.05 2.575C7.3875 2.575 8.5375 3.2625 9 4.25C9.4625 3.2625 10.6125 2.575 11.95 2.575C13.0077 2.575 14.022 2.99534 14.7696 3.74291C15.5172 4.49048 15.9375 5.50483 15.9375 6.5625C15.9375 11.625 9 15.75 9 15.75Z" fill="#ff6f61" stroke="#ff6f61" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                            Unfavorite
                                                        </button>
                                                        <button
                                                            className={dashboardStyles.projectDropdownItem}
                                                            onClick={() => handleOpenProject(project.id)}
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
                                                            className={`${dashboardStyles.projectDropdownItem} ${dashboardStyles.projectDropdownItemDanger}`}
                                                            onClick={() => handleDeleteProject(project.id)}
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
                                        <div className={dashboardStyles.projectMeta}>
                                            <span className={dashboardStyles.projectDate}>{project.createdAt}</span>
                                            <span className={dashboardStyles.projectVisibility}>
                                                {project.isPublic ? (
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <path d="M1.33331 8C1.33331 8 3.33331 3.33334 7.99998 3.33334C12.6666 3.33334 14.6666 8 14.6666 8C14.6666 8 12.6666 12.6667 7.99998 12.6667C3.33331 12.6667 1.33331 8 1.33331 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                ) : (
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <path d="M11.96 11.96C10.8204 12.8286 9.43255 13.305 8.00004 13.3133C3.33337 13.3133 1.33337 8.64666 1.33337 8.64666C2.12568 7.06819 3.24126 5.66931 4.60671 4.53332M6.60004 3.42666C7.05891 3.29806 7.52858 3.23294 8.00004 3.23332C12.6667 3.23332 14.6667 7.89999 14.6667 7.89999C14.2474 8.75709 13.7458 9.56973 13.1694 10.3233M9.41337 9.41332C9.23022 9.61117 9.00942 9.76969 8.76424 9.87911C8.51905 9.98852 8.25445 10.0467 7.98614 10.0496C7.71783 10.0526 7.45199 9.99998 7.20453 9.89552C6.95707 9.79107 6.73296 9.63697 6.54532 9.44267C6.35768 9.24838 6.21019 9.01773 6.11291 8.76451C6.01563 8.51129 5.97061 8.24113 5.9804 7.97027C5.99019 7.69941 6.05458 7.43349 6.17002 7.18801C6.28545 6.94252 6.44968 6.72294 6.65337 6.54332" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M1.33337 1.33334L14.6667 14.6667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                                {project.isPublic ? 'Public' : 'Private'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={dashboardStyles.emptyState}>
                            <div className={dashboardStyles.emptyIconWrapper}>
                                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                                    <path d="M32 56C32 56 7.33333 41.3333 7.33333 23.3333C7.33333 19.5726 8.82348 15.9661 11.4907 13.2991C14.1578 10.632 17.7644 9.14288 21.5252 9.14288C26.283 9.14288 30.367 11.5856 32 14.0952C33.633 11.5856 37.717 9.14288 42.4748 9.14288C46.2356 9.14288 49.8422 10.632 52.5093 13.2991C55.1765 15.9661 56.6667 19.5726 56.6667 23.3333C56.6667 41.3333 32 56 32 56Z" stroke="#a3a3a3" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h3 className={dashboardStyles.emptyTitle}>No favourites yet</h3>
                            <p className={dashboardStyles.emptyText}>
                                Projects you favourite will appear here
                            </p>
                            <button
                                className={dashboardStyles.goToProjectsButton}
                                onClick={() => router.push('/projects')}
                            >
                                Browse Projects
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            <ProjectNameModal
                isOpen={editProjectModal.isOpen}
                onClose={() => setEditProjectModal(prev => ({ ...prev, isOpen: false }))}
                onCreateProject={handleEditProjectConfirm}
                editMode={true}
                initialName={editProjectModal.projectName}
                initialIsPublic={editProjectModal.isPublic}
                theme={theme}
            />

            <ProjectActionModal
                isOpen={projectActionModal.isOpen}
                onClose={() => setProjectActionModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleProjectActionConfirm}
                type="delete"
                projectName={projectActionModal.projectName}
                theme={theme}
            />
        </div>
    );
}
