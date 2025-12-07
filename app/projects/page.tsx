'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Types
import { Project, EditProjectModalState, ProjectActionModalState } from '@/types';

// Hooks
import { useAuth, useTheme, useMobile } from '@/hooks';

// Constants
import { getNavItemsForRoute, PROJECTS_PER_PAGE } from '@/lib/constants';

// Components
import { Sidebar } from '@/components/layout';

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
import styles from './projects.module.css';
import dashboardStyles from '@/app/dashboard/dashboard.module.css';

// Generate mock projects data
const generateMockProjects = (): Project[] => {
    const projectNames = [
        'Summer Vlog Thumbnail', 'Gaming Stream Cover', 'Product Review',
        'Tech Unboxing', 'Travel Adventure', 'Cooking Tutorial',
        'Fitness Journey', 'Music Cover Art', 'Podcast Episode',
        'DIY Crafts', 'Beauty Tips', 'Car Review',
        'Pet Video', 'Comedy Sketch', 'Documentary Preview',
        'Educational Content', 'Fashion Lookbook', 'Home Tour',
        'Interview Session', 'Live Stream Promo', 'Meditation Guide',
        'News Brief', 'Outdoor Camping', 'Photography Tips',
        'Quick Recipe', 'Room Makeover', 'Sports Highlights',
        'Tutorial Series', 'Unboxing Haul', 'Vlog Compilation',
        'Workout Routine', 'Yoga Session', 'Zen Moments'
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
        '1 week ago', '2 weeks ago', '3 weeks ago', '1 month ago'
    ];

    return projectNames.map((name, index) => ({
        id: index + 1,
        name,
        thumbnail: thumbnails[index % thumbnails.length],
        createdAt: timeAgo[index % timeAgo.length],
        isPublic: Math.random() > 0.5,
        isFavorite: Math.random() > 0.7
    }));
};

export default function ProjectsPage() {
    const router = useRouter();

    // Custom hooks
    const { user, loading: authLoading, signOut } = useAuth();
    const { theme, setTheme } = useTheme({ userId: user?.uid });
    const { isMobile, sidebarOpen, toggleSidebar, closeSidebar } = useMobile();

    // Navigation
    const navItems = useMemo(() => getNavItemsForRoute('projects'), []);

    // UI state
    const [isModalOpen, setIsModalOpen] = useState(false);
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
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [projectMenuOpen, setProjectMenuOpen] = useState<number | null>(null);

    // Projects state
    const [projects, setProjects] = useState<Project[]>(() => generateMockProjects());
    const [itemsToShow, setItemsToShow] = useState(PROJECTS_PER_PAGE);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    // Refs
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setItemsToShow(PROJECTS_PER_PAGE);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Memoized filtered projects
    const filteredProjects = useMemo(() => {
        if (!debouncedSearchQuery.trim()) return projects;
        const query = debouncedSearchQuery.toLowerCase();
        return projects.filter(project =>
            project.name.toLowerCase().includes(query)
        );
    }, [projects, debouncedSearchQuery]);

    const visibleProjects = useMemo(() =>
        filteredProjects.slice(0, itemsToShow),
        [filteredProjects, itemsToShow]
    );

    const hasMore = itemsToShow < filteredProjects.length;

    // Click outside for project menus
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (projectMenuOpen !== null) {
                const menus = document.querySelectorAll('[data-project-menu]');
                let clickedInside = false;
                menus.forEach(menu => {
                    if (menu.contains(event.target as Node)) {
                        clickedInside = true;
                    }
                });
                if (!clickedInside) {
                    setProjectMenuOpen(null);
                }
            }
        }

        if (projectMenuOpen !== null) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [projectMenuOpen]);

    // Handlers
    const handleCreateProject = useCallback((name: string, isPublic: boolean) => {
        console.log('Creating project:', { name, isPublic });
    }, []);

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

        const projectId = projectActionModal.projectId;

        switch (projectActionModal.type) {
            case 'delete':
                setProjects(prev => prev.filter(project => project.id !== projectId));
                break;

            case 'duplicate':
                const projectToDuplicate = projects.find(p => p.id === projectId);
                if (projectToDuplicate) {
                    const newProject: Project = {
                        ...projectToDuplicate,
                        id: Math.max(...projects.map(p => p.id)) + 1,
                        name: `${projectToDuplicate.name} (Copy)`,
                        createdAt: 'Just now'
                    };
                    setProjects(prev => [newProject, ...prev]);
                }
                break;
        }

        setProjectActionModal({
            isOpen: false,
            type: 'delete',
            projectId: null,
            projectName: ''
        });
    }, [projectActionModal, projects]);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    }, []);

    const handleLoadMore = useCallback(() => {
        setItemsToShow(prev => prev + PROJECTS_PER_PAGE);
    }, []);

    // Loading state
    if (authLoading) {
        return (
            <div className={dashboardStyles.loadingContainer}>
                <div className={dashboardStyles.loadingSpinner} />
                <p>Loading...</p>
            </div>
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
                <div
                    className={dashboardStyles.overlay}
                    onClick={closeSidebar}
                    aria-hidden="true"
                />
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
                {/* Header */}
                <header className={dashboardStyles.header}>
                    {isMobile && (
                        <button
                            className={dashboardStyles.menuButton}
                            onClick={toggleSidebar}
                            aria-label="Toggle sidebar menu"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    )}

                    <h1 className={styles.pageTitle}>My Projects</h1>

                    <button
                        className={dashboardStyles.createButton}
                        onClick={() => setIsModalOpen(true)}
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

                {/* Content */}
                <div className={dashboardStyles.content}>
                    {/* Page Header */}
                    <div className={styles.pageHeader}>
                        <div className={styles.headerLeft}>
                            <h2 className={dashboardStyles.sectionTitle}>
                                Your Created <span className={dashboardStyles.titleAccent}>Projects</span>
                            </h2>
                            <p className={styles.projectSubtext}>
                                Access your projects
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div
                            className={styles.searchBar}
                            onClick={() => searchInputRef.current?.focus()}
                        >
                            <Image
                                src="/assets/dashboard/icons/search.svg"
                                alt=""
                                width={16}
                                height={16}
                                className={styles.searchIcon}
                                aria-hidden="true"
                            />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder="Search projects..."
                                className={styles.searchInput}
                                aria-label="Search projects"
                            />
                        </div>
                    </div>

                    {/* Projects Grid */}
                    {visibleProjects.length === 0 ? (
                        <div className={dashboardStyles.emptyState}>
                            <div className={dashboardStyles.emptyIconWrapper}>
                                <Image
                                    src="/assets/dashboard/icons/project-section-youtube-with-sparkles.svg"
                                    alt="No projects illustration"
                                    width={80}
                                    height={80}
                                />
                            </div>
                            <p className={dashboardStyles.emptyText}>
                                {debouncedSearchQuery
                                    ? `No projects found for "${debouncedSearchQuery}"`
                                    : "No projects yet — let's create your first one!"}
                            </p>
                            {!debouncedSearchQuery && (
                                <button
                                    className={dashboardStyles.startButton}
                                    onClick={() => setIsModalOpen(true)}
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
                            )}
                        </div>
                    ) : (
                        <>
                            <div className={styles.projectsGrid}>
                                {/* Create Project Placeholder Card */}
                                {filteredProjects.length > 0 && (
                                    <button
                                        className={dashboardStyles.createProjectCard}
                                        onClick={() => setIsModalOpen(true)}
                                        aria-label="Create new project"
                                    >
                                        <div className={dashboardStyles.createProjectIcon}>
                                            <Image
                                                src="/assets/dashboard/icons/create-new-project-icon.svg"
                                                alt=""
                                                width={32}
                                                height={32}
                                                aria-hidden="true"
                                            />
                                        </div>
                                        <span className={dashboardStyles.createProjectText}>New Project</span>
                                    </button>
                                )}
                                {visibleProjects.map((project) => (
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
                                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                                ))}
                            </div>

                            {/* Load More Button */}
                            {hasMore && (
                                <div className={styles.loadMoreContainer}>
                                    <button
                                        className={styles.loadMoreButton}
                                        onClick={handleLoadMore}
                                    >
                                        Load More ({filteredProjects.length - visibleProjects.length} remaining)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Modals */}
            <ProjectNameModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreateProject={handleCreateProject}
                theme={theme}
            />

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
                type={projectActionModal.type}
                projectName={projectActionModal.projectName}
                theme={theme}
            />

            {/* Mobile Floating Action Button */}
            {isMobile && (
                <button
                    className={dashboardStyles.fab}
                    onClick={() => setIsModalOpen(true)}
                    aria-label="Create new project"
                >
                    <Image
                        src="/assets/dashboard/icons/create-new-project-icon.svg"
                        alt=""
                        width={24}
                        height={24}
                        aria-hidden="true"
                    />
                </button>
            )}
        </div>
    );
}
