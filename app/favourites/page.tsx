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
    const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
    const [editingProjectName, setEditingProjectName] = useState('');

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
                            {favoriteProjects.map((project, index) => (
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
