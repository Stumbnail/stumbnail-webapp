'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, logOut } from '@/lib/firebase';
import styles from './projects.module.css';
import dashboardStyles from '@/app/dashboard/dashboard.module.css';
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

// Static nav items - moved outside to prevent recreation
const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '/assets/dashboard/icons/home-05-stroke-rounded 2-sidebar.svg', active: false },
    { id: 'projects', label: 'Projects', icon: '/assets/dashboard/icons/image-02-stroke-rounded 1-sidebar.svg', active: true },
    { id: 'community', label: 'Community', icon: '/assets/dashboard/icons/ai-cloud-stroke-rounded 1-sidebar.svg', active: false },
    { id: 'favourites', label: 'Favourites', icon: '/assets/dashboard/icons/play-list-favourite-02-stroke-rounded 1-sidebar.svg', active: false },
];

// Generate mock projects data - moved outside to prevent recreation
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

// Debounce utility for performance
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

// Constants
const PROJECTS_PER_PAGE = 12;

export default function ProjectsPage() {
    const router = useRouter();

    // Auth state
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    // UI state
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
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
        type: 'delete' | 'duplicate';
        projectId: number | null;
        projectName: string;
    }>({
        isOpen: false,
        type: 'delete',
        projectId: null,
        projectName: ''
    });
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [projectMenuOpen, setProjectMenuOpen] = useState<number | null>(null);

    // Projects state - lazy initialization for performance
    const [projects, setProjects] = useState<Project[]>(() => generateMockProjects());

    // Load more state
    const [itemsToShow, setItemsToShow] = useState(PROJECTS_PER_PAGE);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    // Theme state
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // Refs
    const searchInputRef = useRef<HTMLInputElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    // Debounced search update for performance
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setItemsToShow(PROJECTS_PER_PAGE); // Reset to initial items on search
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Memoized filtered projects for performance
    const filteredProjects = useMemo(() => {
        if (!debouncedSearchQuery.trim()) return projects;
        const query = debouncedSearchQuery.toLowerCase();
        return projects.filter(project =>
            project.name.toLowerCase().includes(query)
        );
    }, [projects, debouncedSearchQuery]);

    // Memoized visible projects with load more
    const visibleProjects = useMemo(() => {
        return filteredProjects.slice(0, itemsToShow);
    }, [filteredProjects, itemsToShow]);

    // Check if there are more projects to load
    const hasMore = useMemo(() => {
        return itemsToShow < filteredProjects.length;
    }, [itemsToShow, filteredProjects.length]);

    const checkMobile = useCallback(() => {
        setIsMobile(window.innerWidth <= 768);
        if (window.innerWidth > 768) {
            setSidebarOpen(false);
        }
    }, []);

    // Theme initialization
    useEffect(() => {
        const initializeTheme = async () => {
            const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
            if (savedTheme) {
                setTheme(savedTheme);
            } else {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setTheme(prefersDark ? 'dark' : 'light');
            }

            if (user) {
                try {
                    const response = await fetch(`/api/user/theme?userId=${user.uid}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.theme && (data.theme === 'light' || data.theme === 'dark')) {
                            setTheme(data.theme);
                            localStorage.setItem('theme', data.theme);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching theme from database:', error);
                }
            }
        };

        initializeTheme();
    }, [user]);

    // Auth state listener
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

    // Handle click outside for dropdowns
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setProfileMenuOpen(false);
            }
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

        if (profileMenuOpen || projectMenuOpen !== null) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [profileMenuOpen, projectMenuOpen]);

    // Navigation handlers
    const handleNavClick = (id: string) => {
        if (id === 'dashboard') {
            router.push('/dashboard');
        } else if (id === 'community') {
            router.push('/community');
        } else if (id === 'favourites') {
            router.push('/favourites');
        }
    };

    const handleCreateProject = (name: string, isPublic: boolean) => {
        console.log('Creating project:', { name, isPublic });
        // TODO: API integration
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

    const handleThemeToggle = async (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);

        if (user) {
            try {
                const response = await fetch('/api/user/theme', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.uid, theme: newTheme }),
                });

                if (!response.ok) {
                    console.error('Failed to update theme in database');
                }
            } catch (error) {
                console.error('Error updating theme:', error);
            }
        }
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
        // TODO: Navigate to project editor
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

        const projectId = projectActionModal.projectId;

        switch (projectActionModal.type) {
            case 'delete':
                setProjects(projects.filter(project => project.id !== projectId));
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
                    setProjects([newProject, ...projects]);
                }
                break;
        }

        setProjectActionModal({
            isOpen: false,
            type: 'delete',
            projectId: null,
            projectName: ''
        });
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleLoadMore = () => {
        setItemsToShow(prev => prev + PROJECTS_PER_PAGE);
    };

    // Show loading state
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
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside className={`${dashboardStyles.sidebar} ${sidebarOpen ? dashboardStyles.sidebarOpen : ''}`}>
                {/* Logo */}
                <div className={dashboardStyles.logo}>
                    <div className={dashboardStyles.logoIcon}>
                        <span className={dashboardStyles.logoText}>Logo</span>
                    </div>
                    <h1 className={dashboardStyles.logoTitle}>
                        <span className={dashboardStyles.logoAccent}>Stumb</span>nail
                    </h1>
                </div>

                {/* User Profile */}
                <div className={dashboardStyles.userProfile} ref={profileMenuRef}>
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
                        aria-label="User menu options"
                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                        aria-expanded={profileMenuOpen}
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
                                        aria-label="Switch to light theme"
                                        aria-pressed={theme === 'light'}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
                                            <path d="M8 1V2M8 14V15M15 8H14M2 8H1M12.95 12.95L12.24 12.24M3.76 3.76L3.05 3.05M12.95 3.05L12.24 3.76M3.76 12.24L3.05 12.95" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                        <span>Light</span>
                                    </button>
                                    <button
                                        className={`${dashboardStyles.themeButton} ${theme === 'dark' ? dashboardStyles.themeButtonActive : ''}`}
                                        onClick={() => handleThemeToggle('dark')}
                                        aria-label="Switch to dark theme"
                                        aria-pressed={theme === 'dark'}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                            <path d="M14 8.5C13.3 10.5 11.4 12 9 12C6.2 12 4 9.8 4 7C4 4.6 5.5 2.7 7.5 2C4.7 2.3 2.5 4.6 2.5 7.5C2.5 10.5 5 13 8 13C10.9 13 13.2 10.8 13.5 8C13.7 8.2 13.9 8.3 14 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>Dark</span>
                                    </button>
                                </div>
                            </div>
                            <div className={dashboardStyles.profileMenuDivider} />
                            <button className={dashboardStyles.profileMenuItem} onClick={handleSignOut}>
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <path d="M6.75 15.75H3.75C3.35218 15.75 2.97064 15.592 2.68934 15.3107C2.40804 15.0294 2.25 14.6478 2.25 14.25V3.75C2.25 3.35218 2.40804 2.97064 2.68934 2.68934C2.97064 2.40804 3.35218 2.25 3.75 2.25H6.75M12 12.75L15.75 9M15.75 9L12 5.25M15.75 9H6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span>Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className={dashboardStyles.nav}>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            className={`${dashboardStyles.navItem} ${item.active ? dashboardStyles.navItemActive : ''}`}
                            aria-current={item.active ? 'page' : undefined}
                            aria-label={`Navigate to ${item.label}`}
                            onClick={() => handleNavClick(item.id)}
                        >
                            <Image
                                src={item.icon}
                                alt=""
                                width={29}
                                height={29}
                                aria-hidden="true"
                            />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Progress Section */}
                <div className={dashboardStyles.progressSection}>
                    <div className={dashboardStyles.progressHeader}>
                        <Image
                            src="/assets/dashboard/icons/credits.svg"
                            alt=""
                            width={24}
                            height={24}
                            className={dashboardStyles.progressIcon}
                            aria-hidden="true"
                        />
                        <p className={dashboardStyles.progressText}>
                            <span className={dashboardStyles.progressCurrent}>7</span> / 10
                        </p>
                    </div>
                    <div className={dashboardStyles.progressBar}>
                        <div className={dashboardStyles.progressFill} style={{ width: '70%' }} />
                    </div>
                </div>

                {/* Upgrade Plan Button */}
                <button className={dashboardStyles.upgradeButton} aria-label="Upgrade to premium plan">
                    <Image
                        src="/assets/dashboard/icons/crown-stroke-rounded 1-sidebar.svg"
                        alt=""
                        width={32}
                        height={32}
                        aria-hidden="true"
                    />
                    <span>Upgrade Plan</span>
                </button>
            </aside>

            {/* Main Content */}
            <main className={dashboardStyles.main}>
                {/* Header */}
                <header className={dashboardStyles.header}>
                    {/* Mobile Menu Button */}
                    {isMobile && (
                        <button
                            className={dashboardStyles.menuButton}
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            aria-label="Toggle sidebar menu"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    )}

                    <h1 className={styles.pageTitle}>My Projects</h1>

                    {/* Create New Project Button */}
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
                                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M16 8V24M8 16H24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
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
                                                                {project.isFavorite ? (
                                                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                                                                        <path d="M9 15.75C9 15.75 2.0625 11.625 2.0625 6.5625C2.0625 5.50483 2.48284 4.49048 3.23041 3.74291C3.97798 2.99534 4.99233 2.575 6.05 2.575C7.3875 2.575 8.5375 3.2625 9 4.25C9.4625 3.2625 10.6125 2.575 11.95 2.575C13.0077 2.575 14.022 2.99534 14.7696 3.74291C15.5172 4.49048 15.9375 5.50483 15.9375 6.5625C15.9375 11.625 9 15.75 9 15.75Z" fill="#ff6f61" stroke="#ff6f61" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                                                                        <path d="M9 15.75C9 15.75 2.0625 11.625 2.0625 6.5625C2.0625 5.50483 2.48284 4.49048 3.23041 3.74291C3.97798 2.99534 4.99233 2.575 6.05 2.575C7.3875 2.575 8.5375 3.2625 9 4.25C9.4625 3.2625 10.6125 2.575 11.95 2.575C13.0077 2.575 14.022 2.99534 14.7696 3.74291C15.5172 4.49048 15.9375 5.50483 15.9375 6.5625C15.9375 11.625 9 15.75 9 15.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                )}
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
                                        aria-label="Load more projects"
                                    >
                                        Load More
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Project Name Modal - Create */}
            <ProjectNameModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreateProject={handleCreateProject}
                theme={theme}
            />

            {/* Project Name Modal - Edit */}
            <ProjectNameModal
                isOpen={editProjectModal.isOpen}
                onClose={() => setEditProjectModal({ ...editProjectModal, isOpen: false })}
                onCreateProject={handleEditProjectConfirm}
                editMode={true}
                initialName={editProjectModal.projectName}
                initialIsPublic={editProjectModal.isPublic}
                theme={theme}
            />

            {/* Project Action Modal - Delete/Duplicate */}
            <ProjectActionModal
                isOpen={projectActionModal.isOpen}
                onClose={() => setProjectActionModal({ ...projectActionModal, isOpen: false })}
                onConfirm={handleProjectActionConfirm}
                type={projectActionModal.type}
                projectName={projectActionModal.projectName}
                theme={theme}
            />
        </div>
    );
}
