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
import { LoadingSpinner, AnimatedBorder } from '@/components/ui';
import { ProjectCard } from '@/components/projects';

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
    const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
    const [editingProjectName, setEditingProjectName] = useState('');

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
            setEditingProjectId(projectId);
            setEditingProjectName(project.name);
        }
        setProjectMenuOpen(null);
    }, [projects]);

    const handleEditNameChange = useCallback((value: string) => {
        setEditingProjectName(value);
    }, []);

    const handleEditSave = useCallback(() => {
        if (editingProjectId === null || !editingProjectName.trim()) {
            setEditingProjectId(null);
            setEditingProjectName('');
            return;
        }

        setProjects(prev => prev.map(project =>
            project.id === editingProjectId
                ? { ...project, name: editingProjectName.trim() }
                : project
        ));

        setEditingProjectId(null);
        setEditingProjectName('');
    }, [editingProjectId, editingProjectName]);

    const handleEditCancel = useCallback(() => {
        setEditingProjectId(null);
        setEditingProjectName('');
    }, []);

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
                                <AnimatedBorder
                                    borderWidth={1.5}
                                    radius={14}
                                    gap={2}
                                    duration={0.3}
                                >
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
                                </AnimatedBorder>
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
                                {visibleProjects.map((project, index) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        isMenuOpen={projectMenuOpen === project.id}
                                        isEditing={editingProjectId === project.id}
                                        editingName={editingProjectName}
                                        isPriority={index < 4}
                                        onMenuClick={() => handleProjectMenuClick(project.id)}
                                        onEdit={() => handleEditProject(project.id)}
                                        onEditNameChange={handleEditNameChange}
                                        onEditSave={handleEditSave}
                                        onEditCancel={handleEditCancel}
                                        onToggleFavorite={() => handleToggleFavorite(project.id)}
                                        onOpen={() => handleOpenProject(project.id)}
                                        onDelete={() => handleDeleteProject(project.id)}
                                    />
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
