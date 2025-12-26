'use client';

// React
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Types
import { CommunityFeedThumbnail } from '@/lib/services/thumbnailService';

// Hooks
import { useAuth, useUserData, useTheme, useMobile } from '@/hooks';

// Services
import { getCommunityFeed, likeThumbnail } from '@/lib/services/thumbnailService';

// Constants
import { getNavItemsForRoute } from '@/lib/constants';

// Components
import { Sidebar } from '@/components/layout';
import { LoadingSpinner, PricingModal } from '@/components/ui';

// Styles
import styles from './community.module.css';
import dashboardStyles from '@/app/dashboard/dashboard.module.css';

const ITEMS_PER_PAGE = 24;

export default function CommunityPage() {
    const router = useRouter();

    // Custom hooks
    const { user, loading: authLoading, signOut } = useAuth();
    const { userData } = useUserData(user);
    const { theme, setTheme } = useTheme({ userId: user?.uid });
    const { isMobile, sidebarOpen, toggleSidebar, closeSidebar } = useMobile();

    // Navigation
    const navItems = useMemo(() => getNavItemsForRoute('community'), []);

    // User's plan (mock for now, should come from userData)
    const [isPro] = useState(false);

    // UI state
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [pricingModalOpen, setPricingModalOpen] = useState(false);
    const [selectedThumbnail, setSelectedThumbnail] = useState<CommunityFeedThumbnail | null>(null);
    const [thumbnails, setThumbnails] = useState<CommunityFeedThumbnail[]>([]);
    const [sortBy, setSortBy] = useState<'recent' | 'trending' | 'popular'>('recent');

    // Infinite scroll state
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [initialLoad, setInitialLoad] = useState(true);

    const observerTarget = useRef(null);

    // Initial fetch (re-fetch when sort changes)
    useEffect(() => {
        const fetchInitial = async () => {
            setInitialLoad(true);
            try {
                const response = await getCommunityFeed(ITEMS_PER_PAGE, undefined, sortBy);
                setThumbnails(response.thumbnails);
                setNextCursor(response.nextCursor);
                setHasMore(response.hasMore);
            } catch (error) {
                console.error('Error fetching community feed:', error);
            } finally {
                setInitialLoad(false);
            }
        };
        fetchInitial();
    }, [sortBy]);

    // Load more handler
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || !nextCursor) return;

        setLoadingMore(true);
        try {
            const response = await getCommunityFeed(ITEMS_PER_PAGE, nextCursor, sortBy);
            setThumbnails(prev => [...prev, ...response.thumbnails]);
            setNextCursor(response.nextCursor);
            setHasMore(response.hasMore);
        } catch (error) {
            console.error('Error loading more thumbnails:', error);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, nextCursor, sortBy]);

    // Intersection Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loadMore]);

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

    const handleLike = useCallback(async (thumbnailId: string, projectId: string) => {
        // Optimistic update
        setThumbnails(prev => prev.map(t =>
            t.id === thumbnailId ? { ...t, isLiked: !t.isLiked, likesCount: t.isLiked ? t.likesCount - 1 : t.likesCount + 1 } : t
        ));

        try {
            // Call backend API to persist like
            const response = await likeThumbnail(projectId, thumbnailId);
            // Update with actual server values
            setThumbnails(prev => prev.map(t =>
                t.id === thumbnailId ? { ...t, isLiked: response.isLiked, likesCount: response.likesCount } : t
            ));
        } catch (error) {
            console.error('Error liking thumbnail:', error);
            // Revert optimistic update on error
            setThumbnails(prev => prev.map(t =>
                t.id === thumbnailId ? { ...t, isLiked: !t.isLiked, likesCount: t.isLiked ? t.likesCount + 1 : t.likesCount - 1 } : t
            ));
        }
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
                <div className={dashboardStyles.overlay} onClick={closeSidebar} />
            )}

            {/* Sidebar */}
            <Sidebar
                user={user}
                userData={userData}
                navItems={navItems}
                theme={theme}
                sidebarOpen={sidebarOpen}
                profileMenuOpen={profileMenuOpen}
                onProfileMenuToggle={() => setProfileMenuOpen(prev => !prev)}
                onProfileMenuClose={() => setProfileMenuOpen(false)}
                onThemeToggle={handleThemeToggle}
                onSignOut={handleSignOut}
                onCloseSidebar={closeSidebar}
                onUpgradeClick={() => setPricingModalOpen(true)}
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
                        <div>
                            <h2 className={dashboardStyles.sectionTitle}>
                                Discover <span className={dashboardStyles.titleAccent}>Thumbnails</span>
                            </h2>
                            <p className={styles.pageSubtext}>
                                Explore thumbnails created by the community
                            </p>
                        </div>
                        <div className={styles.sortButtons}>
                            <button
                                className={`${styles.sortButton} ${sortBy === 'recent' ? styles.sortButtonActive : ''}`}
                                onClick={() => setSortBy('recent')}
                            >
                                Recent
                            </button>
                            <button
                                className={`${styles.sortButton} ${sortBy === 'trending' ? styles.sortButtonActive : ''}`}
                                onClick={() => setSortBy('trending')}
                            >
                                Trending
                            </button>
                            <button
                                className={`${styles.sortButton} ${sortBy === 'popular' ? styles.sortButtonActive : ''}`}
                                onClick={() => setSortBy('popular')}
                            >
                                Popular
                            </button>
                        </div>
                    </div>

                    {/* Thumbnails Grid */}
                    <div className={styles.thumbnailsGrid}>
                        {thumbnails.map((thumbnail) => (
                            <div key={thumbnail.id} className={styles.thumbnailCard} onClick={() => setSelectedThumbnail(thumbnail)}>
                                <div className={styles.thumbnailImage}>
                                    <Image
                                        src={thumbnail.thumbnailUrl}
                                        alt="Community thumbnail"
                                        fill
                                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                        style={{ objectFit: 'cover' }}
                                    />
                                    <button
                                        className={styles.likeButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleLike(thumbnail.id, thumbnail.projectId);
                                        }}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill={thumbnail.isLiked ? 'currentColor' : 'none'}>
                                            <path d="M10 17.5L8.75 16.375C4.5 12.5 1.66667 10 1.66667 6.875C1.66667 4.375 3.54167 2.5 6.04167 2.5C7.45833 2.5 8.82917 3.14583 10 4.16667C11.1708 3.14583 12.5417 2.5 13.9583 2.5C16.4583 2.5 18.3333 4.375 18.3333 6.875C18.3333 10 15.5 12.5 11.25 16.375L10 17.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                                        </svg>
                                        <span>{thumbnail.likesCount}</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Infinite Scroll Sentinel & Loading Indicator */}
                    <div ref={observerTarget} className={styles.scrollSentinel}>
                        {(loadingMore || initialLoad) && (
                            <div className={styles.loadingIndicator}>
                                <div className={styles.spinner} />
                                <p>Loading more...</p>
                            </div>
                        )}
                        {!hasMore && !initialLoad && thumbnails.length > 0 && (
                            <p className={styles.endMessage}>No more thumbnails to load</p>
                        )}
                        {!hasMore && !initialLoad && thumbnails.length === 0 && (
                            <p className={styles.emptyMessage}>No community thumbnails found</p>
                        )}
                    </div>
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
                                    src={selectedThumbnail.thumbnailUrl}
                                    alt="Thumbnail"
                                    fill
                                    style={{ objectFit: 'contain' }}
                                />
                            </div>

                            <div className={styles.modalInfo}>
                                <div className={styles.creatorInfo}>
                                    <div className={styles.creatorAvatarParams}>
                                        {selectedThumbnail.ownerAvatar ? (
                                            <Image
                                                src={selectedThumbnail.ownerAvatar}
                                                alt={selectedThumbnail.ownerName || 'User'}
                                                width={40}
                                                height={40}
                                                className={styles.creatorAvatar}
                                            />
                                        ) : (
                                            <div className={`${styles.creatorAvatar} ${styles.defaultAvatar}`}>
                                                {(selectedThumbnail.ownerName?.[0] || 'U').toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <span className={styles.creatorName}>{selectedThumbnail.ownerName || 'Unknown User'}</span>
                                </div>

                                {selectedThumbnail.prompt && (
                                    <div className={styles.detailSection}>
                                        <h3 className={styles.detailLabel}>Prompt</h3>
                                        <p className={styles.detailText}>{selectedThumbnail.prompt}</p>
                                    </div>
                                )}

                                {selectedThumbnail.model && (
                                    <div className={styles.detailSection}>
                                        <h3 className={styles.detailLabel}>Model</h3>
                                        <p className={styles.detailText}>{selectedThumbnail.model}</p>
                                    </div>
                                )}

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

            {/* Pricing Modal */}
            <PricingModal
                open={pricingModalOpen}
                onClose={() => setPricingModalOpen(false)}
                theme={theme}
                userEmail={user?.email || undefined}
            />
        </div>
    );
}
