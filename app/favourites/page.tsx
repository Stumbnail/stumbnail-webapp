'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, logOut } from '@/lib/firebase';
import dashboardStyles from '@/app/dashboard/dashboard.module.css';
import projectsStyles from '@/app/projects/projects.module.css';
import ProjectNameModal from '@/app/dashboard/ProjectNameModal';
import ProjectActionModal from '@/app/dashboard/ProjectActionModal';

interface NavItem {
    id: string;
    label: string;
    icon: string;
    active: boolean;
}

interface Project {
    id: number;
    name: string;
    thumbnail: string;
    createdAt: string;
    isPublic: boolean;
    isFavorite: boolean;
}

// Static nav items
const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '/assets/dashboard/icons/home-05-stroke-rounded 2-sidebar.svg', active: false },
    { id: 'projects', label: 'Projects', icon: '/assets/dashboard/icons/image-02-stroke-rounded 1-sidebar.svg', active: false },
    { id: 'community', label: 'Community', icon: '/assets/dashboard/icons/ai-cloud-stroke-rounded 1-sidebar.svg', active: false },
    { id: 'favourites', label: 'Favourites', icon: '/assets/dashboard/icons/play-list-favourite-02-stroke-rounded 1-sidebar.svg', active: true },
];

// Mock data generator - same as projects page
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

// Debounce utility
function debounce<T extends (...args: Parameters<T>) => void>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

export default function FavouritesPage() {
    const router = useRouter();

    // Auth state
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    // UI state
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [projectMenuOpen, setProjectMenuOpen] = useState<number | null>(null);

    // Project modals
    const [editProjectModal, setEditProjectModal] = useState<{
        isOpen: boolean;
        projectId: number | null;
        projectName: string;
        isPublic: boolean;
    }>({
        isOpen: false,
        projectId: null,
        projectName: '',
        isPublic: true
    });

    const [projectActionModal, setProjectActionModal] = useState<{
        isOpen: boolean;
        type: 'delete';
        projectId: number | null;
        projectName: string;
    }>({
        isOpen: false,
        type: 'delete',
        projectId: null,
        projectName: ''
    });

    // Projects state
    const [projects, setProjects] = useState<Project[]>(() => generateMockProjects());

    // Theme
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // Filtered favorites only
    const favoriteProjects = useMemo(() => {
        return projects.filter(p => p.isFavorite);
    }, [projects]);

    const checkMobile = useCallback(() => {
        setIsMobile(window.innerWidth <= 768);
        if (window.innerWidth > 768) {
            setSidebarOpen(false);
        }
    }, []);

    // Theme initialization
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) {
            setTheme(savedTheme);
        }
    }, []);

    // Auth listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/login');
            }
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        checkMobile();
        const debouncedCheckMobile = debounce(checkMobile, 150);
        window.addEventListener('resize', debouncedCheckMobile, { passive: true });
        return () => window.removeEventListener('resize', debouncedCheckMobile);
    }, [checkMobile]);

    // Click outside handler for dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('[data-project-menu]')) {
                setProjectMenuOpen(null);
            }
            if (!target.closest('[data-profile-menu]')) {
                setProfileMenuOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Navigation handlers
    const handleNavClick = (id: string) => {
        if (id === 'dashboard') {
            router.push('/dashboard');
        } else if (id === 'projects') {
            router.push('/projects');
        } else if (id === 'community') {
            router.push('/community');
        }
    };

    const handleSignOut = async () => {
        try {
            await logOut();
            setProfileMenuOpen(false);
            router.push('/login');
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    const handleThemeToggle = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const handleProjectMenuClick = (projectId: number) => {
        setProjectMenuOpen(projectMenuOpen === projectId ? null : projectId);
    };

    const handleEditProject = (projectId: number) => {
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
    };

    const handleEditProjectConfirm = (name: string, isPublic: boolean) => {
        if (editProjectModal.projectId === null) return;

        setProjects(projects.map(project =>
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
    };

    const handleToggleFavorite = (projectId: number) => {
        setProjects(projects.map(p =>
            p.id === projectId ? { ...p, isFavorite: !p.isFavorite } : p
        ));
        setProjectMenuOpen(null);
    };

    const handleOpenProject = (projectId: number) => {
        console.log('Open project:', projectId);
        setProjectMenuOpen(null);
    };

    const handleDeleteProject = (projectId: number) => {
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
    };

    const handleProjectActionConfirm = () => {
        if (projectActionModal.projectId === null) return;
        setProjects(projects.filter(project => project.id !== projectActionModal.projectId));
        setProjectActionModal({
            isOpen: false,
            type: 'delete',
            projectId: null,
            projectName: ''
        });
    };

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
                <div className={dashboardStyles.overlay} onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`${dashboardStyles.sidebar} ${sidebarOpen ? dashboardStyles.sidebarOpen : ''}`}>
                <div className={dashboardStyles.logo}>
                    <div className={dashboardStyles.logoIcon}>
                        <span className={dashboardStyles.logoText}>Logo</span>
                    </div>
                    <h1 className={dashboardStyles.logoTitle}>
                        <span className={dashboardStyles.logoAccent}>Stumb</span>nail
                    </h1>
                </div>

                <div className={dashboardStyles.userProfile} data-profile-menu>
                    {user?.photoURL ? (
                        <Image
                            src={user.photoURL}
                            alt="User avatar"
                            width={51}
                            height={51}
                            className={dashboardStyles.userAvatar}
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className={dashboardStyles.userAvatarPlaceholder}>
                            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
                        </div>
                    )}
                    <div className={dashboardStyles.userInfo}>
                        <p className={dashboardStyles.userName}>{user?.displayName || 'User'}</p>
                        <p className={dashboardStyles.userEmail}>{user?.email || ''}</p>
                    </div>
                    <button
                        className={dashboardStyles.userMenu}
                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    >
                        <span className={dashboardStyles.userMenuDot} />
                    </button>

                    {profileMenuOpen && (
                        <div className={dashboardStyles.profileDropdown}>
                            <div className={dashboardStyles.themeSection}>
                                <span className={dashboardStyles.themeSectionLabel}>Theme</span>
                                <div className={dashboardStyles.themeToggle}>
                                    <button
                                        className={`${dashboardStyles.themeButton} ${theme === 'light' ? dashboardStyles.themeButtonActive : ''}`}
                                        onClick={() => handleThemeToggle('light')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
                                            <path d="M8 1V2M8 14V15M15 8H14M2 8H1M12.95 12.95L12.24 12.24M3.76 3.76L3.05 3.05M12.95 3.05L12.24 3.76M3.76 12.24L3.05 12.95" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                        <span>Light</span>
                                    </button>
                                    <button
                                        className={`${dashboardStyles.themeButton} ${theme === 'dark' ? dashboardStyles.themeButtonActive : ''}`}
                                        onClick={() => handleThemeToggle('dark')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M14 8.5C13.3 10.5 11.4 12 9 12C6.2 12 4 9.8 4 7C4 4.6 5.5 2.7 7.5 2C4.7 2.3 2.5 4.6 2.5 7.5C2.5 10.5 5 13 8 13C10.9 13 13.2 10.8 13.5 8C13.7 8.2 13.9 8.3 14 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>Dark</span>
                                    </button>
                                </div>
                            </div>
                            <div className={dashboardStyles.profileMenuDivider} />
                            <button className={dashboardStyles.profileMenuItem} onClick={handleSignOut}>
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                    <path d="M6.75 15.75H3.75C3.35218 15.75 2.97064 15.592 2.68934 15.3107C2.40804 15.0294 2.25 14.6478 2.25 14.25V3.75C2.25 3.35218 2.40804 2.97064 2.68934 2.68934C2.97064 2.40804 3.35218 2.25 3.75 2.25H6.75M12 12.75L15.75 9M15.75 9L12 5.25M15.75 9H6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span>Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>

                <nav className={dashboardStyles.nav}>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            className={`${dashboardStyles.navItem} ${item.active ? dashboardStyles.navItemActive : ''}`}
                            onClick={() => handleNavClick(item.id)}
                        >
                            <Image src={item.icon} alt="" width={29} height={29} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className={dashboardStyles.progressSection}>
                    <div className={dashboardStyles.progressHeader}>
                        <Image src="/assets/dashboard/icons/credits.svg" alt="" width={24} height={24} className={dashboardStyles.progressIcon} />
                        <p className={dashboardStyles.progressText}>
                            <span className={dashboardStyles.progressCurrent}>7</span> / 10
                        </p>
                    </div>
                    <div className={dashboardStyles.progressBar}>
                        <div className={dashboardStyles.progressFill} style={{ width: '70%' }} />
                    </div>
                </div>

                <button className={dashboardStyles.upgradeButton}>
                    <Image src="/assets/dashboard/icons/crown-stroke-rounded 1-sidebar.svg" alt="" width={32} height={32} />
                    <span>Upgrade Plan</span>
                </button>
            </aside>

            {/* Main Content */}
            <main className={dashboardStyles.main}>
                <header className={dashboardStyles.header}>
                    {isMobile && (
                        <button className={dashboardStyles.menuButton} onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    )}

                    <h1 className={projectsStyles.pageTitle}>Favourites</h1>

                    {/* Create New Project Button */}
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

            {/* Edit Project Modal */}
            <ProjectNameModal
                isOpen={editProjectModal.isOpen}
                onClose={() => setEditProjectModal({
                    isOpen: false,
                    projectId: null,
                    projectName: '',
                    isPublic: true
                })}
                onCreateProject={handleEditProjectConfirm}
                editMode={true}
                initialName={editProjectModal.projectName}
                initialIsPublic={editProjectModal.isPublic}
                theme={theme}
            />

            {/* Delete Confirmation Modal */}
            <ProjectActionModal
                isOpen={projectActionModal.isOpen}
                onClose={() => setProjectActionModal({
                    isOpen: false,
                    type: 'delete',
                    projectId: null,
                    projectName: ''
                })}
                onConfirm={handleProjectActionConfirm}
                type="delete"
                projectName={projectActionModal.projectName}
                theme={theme}
            />
        </div>
    );
}
