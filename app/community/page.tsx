'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, logOut } from '@/lib/firebase';
import styles from './community.module.css';
import dashboardStyles from '@/app/dashboard/dashboard.module.css';

interface NavItem {
    id: string;
    label: string;
    icon: string;
    active: boolean;
}

interface Thumbnail {
    id: number;
    imageUrl: string;
    prompt?: string;
    youtubeUrl?: string;
    creator: {
        name: string;
        avatar: string;
    };
    model: string;
    likes: number;
    isLiked: boolean;
}

// Static nav items
const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '/assets/dashboard/icons/home-05-stroke-rounded 2-sidebar.svg', active: false },
    { id: 'projects', label: 'Projects', icon: '/assets/dashboard/icons/image-02-stroke-rounded 1-sidebar.svg', active: false },
    { id: 'community', label: 'Community', icon: '/assets/dashboard/icons/ai-cloud-stroke-rounded 1-sidebar.svg', active: true },
    { id: 'favourites', label: 'Favourites', icon: '/assets/dashboard/icons/play-list-favourite-02-stroke-rounded 1-sidebar.svg', active: false },
];

// Mock data generator
function generateMockThumbnails(): Thumbnail[] {
    const prompts = [
        'Epic gaming thumbnail with neon lights',
        'Cooking show intro with fresh ingredients',
        'Tech review thumbnail minimalist style',
        'Fitness motivation energy burst',
        'Travel vlog sunset mountain view',
        'Product unboxing colorful background'
    ];

    const creators = [
        { name: 'Alex Chen', avatar: '/assets/dashboard/template1.png' },
        { name: 'Sarah Miller', avatar: '/assets/dashboard/template2.png' },
        { name: 'Mike Johnson', avatar: '/assets/dashboard/template3.png' },
        { name: 'Emma Davis', avatar: '/assets/dashboard/template4.png' }
    ];

    const models = ['DALL-E 3', 'Midjourney v6', 'Stable Diffusion XL', 'Flux Pro'];

    return Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        imageUrl: `/assets/dashboard/template${(i % 4) + 1}.png`,
        prompt: i % 2 === 0 ? prompts[i % prompts.length] : undefined,
        youtubeUrl: i % 2 === 1 ? 'https://youtube.com/watch?v=dQw4w9WgXcQ' : undefined,
        creator: creators[i % creators.length],
        model: models[i % models.length],
        likes: Math.floor(Math.random() * 1000),
        isLiked: false
    }));
}

const ITEMS_PER_PAGE = 24;

export default function CommunityPage() {
    const router = useRouter();

    // Auth state
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    // UI state
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [selectedThumbnail, setSelectedThumbnail] = useState<Thumbnail | null>(null);
    const [thumbnails, setThumbnails] = useState<Thumbnail[]>(() => generateMockThumbnails());

    // Infinite scroll state
    const [itemsToShow, setItemsToShow] = useState(ITEMS_PER_PAGE);
    const [isLoading, setIsLoading] = useState(false);

    // Computed values
    const visibleThumbnails = thumbnails.slice(0, itemsToShow);
    const hasMore = itemsToShow < thumbnails.length;

    // Theme state
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // User's plan (mock)
    const [isPro] = useState(false);

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
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [checkMobile]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const loadMore = () => {
            if (isLoading || !hasMore) return;

            setIsLoading(true);
            // Simulate loading delay for smooth UX
            setTimeout(() => {
                setItemsToShow(prev => prev + ITEMS_PER_PAGE);
                setIsLoading(false);
            }, 500);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        const sentinel = document.getElementById('scroll-sentinel');
        if (sentinel) {
            observer.observe(sentinel);
        }

        return () => {
            if (sentinel) {
                observer.unobserve(sentinel);
            }
        };
    }, [hasMore, isLoading]);

    const handleNavClick = (id: string) => {
        if (id === 'dashboard') {
            router.push('/dashboard');
        } else if (id === 'projects') {
            router.push('/projects');
        } else if (id === 'favourites') {
            router.push('/favourites');
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

    const handleLike = (thumbnailId: number) => {
        setThumbnails(thumbnails.map(t =>
            t.id === thumbnailId ? { ...t, isLiked: !t.isLiked, likes: t.isLiked ? t.likes - 1 : t.likes + 1 } : t
        ));
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

                <div className={dashboardStyles.userProfile}>
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

                    <h1 className={styles.pageTitle}>Community</h1>

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
                    <div className={styles.pageHeader}>
                        <h2 className={dashboardStyles.sectionTitle}>
                            Discover <span className={dashboardStyles.titleAccent}>Thumbnails</span>
                        </h2>
                        <p className={styles.pageSubtext}>
                            Explore thumbnails created by the community
                        </p>
                    </div>

                    {/* Thumbnails Grid */}
                    <div className={styles.thumbnailsGrid}>
                        {visibleThumbnails.map((thumbnail) => (
                            <div key={thumbnail.id} className={styles.thumbnailCard} onClick={() => setSelectedThumbnail(thumbnail)}>
                                <div className={styles.thumbnailImage}>
                                    <Image
                                        src={thumbnail.imageUrl}
                                        alt="Community thumbnail"
                                        fill
                                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                        style={{ objectFit: 'cover' }}
                                    />
                                    <button
                                        className={styles.likeButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleLike(thumbnail.id);
                                        }}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill={thumbnail.isLiked ? 'currentColor' : 'none'}>
                                            <path d="M10 17.5L8.75 16.375C4.5 12.5 1.66667 10 1.66667 6.875C1.66667 4.375 3.54167 2.5 6.04167 2.5C7.45833 2.5 8.82917 3.14583 10 4.16667C11.1708 3.14583 12.5417 2.5 13.9583 2.5C16.4583 2.5 18.3333 4.375 18.3333 6.875C18.3333 10 15.5 12.5 11.25 16.375L10 17.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                                        </svg>
                                        <span>{thumbnail.likes}</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Infinite Scroll Sentinel & Loading Indicator */}
                    {hasMore && (
                        <div id="scroll-sentinel" className={styles.scrollSentinel}>
                            {isLoading && (
                                <div className={styles.loadingIndicator}>
                                    <div className={styles.spinner} />
                                    <p>Loading more...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Thumbnail Detail Modal */}
            {selectedThumbnail && (
                <div className={styles.modalOverlay} onClick={() => setSelectedThumbnail(null)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.closeButton} onClick={() => setSelectedThumbnail(null)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        <div className={styles.modalContent}>
                            <div className={styles.modalImage}>
                                <Image
                                    src={selectedThumbnail.imageUrl}
                                    alt="Thumbnail"
                                    fill
                                    style={{ objectFit: 'contain' }}
                                />
                            </div>

                            <div className={styles.modalInfo}>
                                <div className={styles.creatorInfo}>
                                    <Image
                                        src={selectedThumbnail.creator.avatar}
                                        alt={selectedThumbnail.creator.name}
                                        width={40}
                                        height={40}
                                        className={styles.creatorAvatar}
                                    />
                                    <span className={styles.creatorName}>{selectedThumbnail.creator.name}</span>
                                </div>

                                {selectedThumbnail.prompt && (
                                    <div className={styles.detailSection}>
                                        <h3 className={styles.detailLabel}>Prompt</h3>
                                        <p className={styles.detailText}>{selectedThumbnail.prompt}</p>
                                    </div>
                                )}

                                {selectedThumbnail.youtubeUrl && (
                                    <div className={styles.detailSection}>
                                        <h3 className={styles.detailLabel}>YouTube URL</h3>
                                        <a href={selectedThumbnail.youtubeUrl} target="_blank" rel="noopener noreferrer" className={styles.youtubeLink}>
                                            {selectedThumbnail.youtubeUrl}
                                        </a>
                                    </div>
                                )}

                                <div className={styles.detailSection}>
                                    <h3 className={styles.detailLabel}>Model</h3>
                                    <p className={styles.detailText}>{selectedThumbnail.model}</p>
                                </div>

                                {!isPro && (
                                    <button className={styles.upgradeButton}>
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M10 2.5L12.5 7.5L17.5 8.33333L13.75 12.0833L14.5833 17.0833L10 14.5L5.41667 17.0833L6.25 12.0833L2.5 8.33333L7.5 7.5L10 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                                        </svg>
                                        <span>Upgrade to Pro</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
