'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Types
import { Thumbnail } from '@/types';

// Hooks
import { useAuth, useTheme, useMobile } from '@/hooks';

// Constants
import { getNavItemsForRoute } from '@/lib/constants';

// Components
import { Sidebar } from '@/components/layout';

// Styles
import styles from './community.module.css';
import dashboardStyles from '@/app/dashboard/dashboard.module.css';

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
        name: creators[i % creators.length].name,
        avatar: creators[i % creators.length].avatar,
        model: models[i % models.length],
        likes: Math.floor(Math.random() * 1000),
        isLiked: false
    }));
}

const ITEMS_PER_PAGE = 24;

export default function CommunityPage() {
    const router = useRouter();

    // Custom hooks
    const { user, loading: authLoading, signOut } = useAuth();
    const { theme, setTheme } = useTheme({ userId: user?.uid });
    const { isMobile, sidebarOpen, toggleSidebar, closeSidebar } = useMobile();

    // Navigation
    const navItems = useMemo(() => getNavItemsForRoute('community'), []);

    // UI state
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [selectedThumbnail, setSelectedThumbnail] = useState<Thumbnail | null>(null);
    const [thumbnails, setThumbnails] = useState<Thumbnail[]>(() => generateMockThumbnails());

    // Infinite scroll state
    const [itemsToShow, setItemsToShow] = useState(ITEMS_PER_PAGE);
    const [isLoading, setIsLoading] = useState(false);

    // Computed values
    const visibleThumbnails = useMemo(() =>
        thumbnails.slice(0, itemsToShow),
        [thumbnails, itemsToShow]
    );
    const hasMore = itemsToShow < thumbnails.length;

    // User's plan (mock)
    const [isPro] = useState(false);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const loadMore = () => {
            if (isLoading || !hasMore) return;

            setIsLoading(true);
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

    const handleLike = useCallback((thumbnailId: number) => {
        setThumbnails(prev => prev.map(t =>
            t.id === thumbnailId ? { ...t, isLiked: !t.isLiked, likes: t.isLiked ? t.likes - 1 : t.likes + 1 } : t
        ));
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

                    <h1 className={styles.pageTitle}>Community</h1>

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
