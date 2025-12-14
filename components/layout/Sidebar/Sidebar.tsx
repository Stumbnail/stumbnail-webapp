'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User } from 'firebase/auth';
import { NavItem, Theme, UserData } from '@/types';
import { NAV_ROUTES } from '@/lib/constants';
import { useClickOutsideSingle } from '@/hooks';
import { AnimatedBorder } from '@/components/ui';
import { calculateDisplayCredits, getUserPlan } from '@/lib/services/userService';
import styles from '@/app/dashboard/dashboard.module.css';

interface SidebarProps {
    user: User | null;
    userData: UserData | null;
    navItems: NavItem[];
    theme: Theme;
    sidebarOpen: boolean;
    profileMenuOpen: boolean;
    onProfileMenuToggle: () => void;
    onProfileMenuClose: () => void;
    onThemeToggle: (newTheme: Theme) => void;
    onSignOut: () => void;
    onCloseSidebar: () => void;
}

export default function Sidebar({
    user,
    userData,
    navItems,
    theme,
    sidebarOpen,
    profileMenuOpen,
    onProfileMenuToggle,
    onProfileMenuClose,
    onThemeToggle,
    onSignOut,
    onCloseSidebar,
}: SidebarProps) {
    const router = useRouter();
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const [showCreditBreakdown, setShowCreditBreakdown] = useState(false);

    useClickOutsideSingle(profileMenuRef, onProfileMenuClose, profileMenuOpen);

    const handleNavClick = (id: string) => {
        const route = NAV_ROUTES[id];
        if (route) {
            router.push(route);
            onCloseSidebar();
        }
    };

    // Calculate credits and plan
    const displayCredits = calculateDisplayCredits(userData);
    const plan = getUserPlan(userData);
    const hasTrialCredits = (userData?.trialCredits || 0) > 0;
    const totalCredits = displayCredits + (userData?.trialCredits || 0);

    return (
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
            {/* Logo */}
            <div className={styles.logo}>
                <div className={styles.logoIcon}>
                    <span className={styles.logoText}>Logo</span>
                </div>
                <h1 className={styles.logoTitle}>
                    <span className={styles.logoAccent}>Stumb</span>nail
                </h1>
            </div>

            {/* User Profile */}
            <div className={styles.userProfile} ref={profileMenuRef}>
                {user?.photoURL ? (
                    <Image
                        src={user.photoURL}
                        alt="User avatar"
                        width={51}
                        height={51}
                        className={styles.userAvatar}
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className={styles.userAvatarPlaceholder}>
                        {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
                    </div>
                )}
                <div className={styles.userInfo}>
                    <p className={styles.userName}>{user?.displayName || 'User'}</p>
                    <p className={styles.userEmail}>{user?.email || ''}</p>
                </div>
                <button
                    className={styles.userMenu}
                    aria-label="User menu options"
                    onClick={onProfileMenuToggle}
                    aria-expanded={profileMenuOpen}
                >
                    <span className={styles.userMenuDot} />
                </button>

                {profileMenuOpen && (
                    <div className={styles.profileDropdown}>
                        <div className={styles.themeSection}>
                            <span className={styles.themeSectionLabel}>Theme</span>
                            <div className={styles.themeToggle}>
                                <button
                                    className={`${styles.themeButton} ${theme === 'light' ? styles.themeButtonActive : ''}`}
                                    onClick={() => onThemeToggle('light')}
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
                                    className={`${styles.themeButton} ${theme === 'dark' ? styles.themeButtonActive : ''}`}
                                    onClick={() => onThemeToggle('dark')}
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
                        <div className={styles.profileMenuDivider} />
                        <button className={styles.profileMenuItem} onClick={onSignOut}>
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M6.75 15.75H3.75C3.35218 15.75 2.97064 15.592 2.68934 15.3107C2.40804 15.0294 2.25 14.6478 2.25 14.25V3.75C2.25 3.35218 2.40804 2.97064 2.68934 2.68934C2.97064 2.40804 3.35218 2.25 3.75 2.25H6.75M12 12.75L15.75 9M15.75 9L12 5.25M15.75 9H6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>Sign Out</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className={styles.nav}>
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        className={`${styles.navItem} ${item.active ? styles.navItemActive : ''}`}
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

            {/* Credits Section */}
            <div className={styles.creditsSection}>
                {/* Compact Display */}
                <div
                    className={styles.creditsHeader}
                    onClick={() => setShowCreditBreakdown(!showCreditBreakdown)}
                    role="button"
                    tabIndex={0}
                    aria-label="Toggle credit breakdown"
                    aria-expanded={showCreditBreakdown}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setShowCreditBreakdown(!showCreditBreakdown);
                        }
                    }}
                >
                    <Image
                        src="/assets/dashboard/icons/credits.svg"
                        alt=""
                        width={20}
                        height={20}
                        className={styles.creditsIcon}
                        aria-hidden="true"
                    />
                    <div className={styles.creditsInfo}>
                        <div className={styles.creditsTotal}>{totalCredits.toLocaleString()}</div>
                        <div className={styles.creditsPlan}>{plan.name} Plan</div>
                    </div>
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className={`${styles.creditsArrow} ${showCreditBreakdown ? styles.creditsArrowExpanded : ''}`}
                    >
                        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>

                {/* Expandable Breakdown */}
                {showCreditBreakdown && (
                    <div className={styles.creditsBreakdown}>
                        {plan.type !== 'free' && (
                            <div className={styles.creditRow}>
                                <div className={styles.creditRowLeft}>
                                    <div className={styles.creditDot} style={{ background: '#4CAF50' }}></div>
                                    <span className={styles.creditRowLabel}>Monthly</span>
                                </div>
                                <span className={styles.creditRowValue}>{userData?.subscriptionCredits?.toLocaleString() || 0}</span>
                            </div>
                        )}
                        {(userData?.toppedUpBalance || 0) > 0 && (
                            <div className={styles.creditRow}>
                                <div className={styles.creditRowLeft}>
                                    <div className={styles.creditDot} style={{ background: '#2196F3' }}></div>
                                    <span className={styles.creditRowLabel}>Topped Up</span>
                                </div>
                                <span className={styles.creditRowValue}>{userData?.toppedUpBalance?.toLocaleString() || 0}</span>
                            </div>
                        )}
                        {hasTrialCredits && (
                            <div className={styles.creditRow}>
                                <div className={styles.creditRowLeft}>
                                    <div className={styles.creditDot} style={{ background: '#FF9800' }}></div>
                                    <span className={styles.creditRowLabel}>Trial</span>
                                </div>
                                <span className={styles.creditRowValue}>{userData?.trialCredits?.toLocaleString() || 0}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Upgrade Plan Button - Hidden for Automation plan users */}
            {plan.type !== 'automation' && (
                <AnimatedBorder
                    borderColor="#e8a838"
                    borderWidth={1.5}
                    radius={14}
                    gap={2}
                    duration={0.3}
                    className={styles.upgradeButtonWrapper}
                >
                    <button className={styles.upgradeButton} aria-label="Upgrade to premium plan">
                        <Image
                            src="/assets/dashboard/icons/crown-stroke-rounded 1-sidebar.svg"
                            alt=""
                            width={32}
                            height={32}
                            aria-hidden="true"
                        />
                        <span>Upgrade Plan</span>
                    </button>
                </AnimatedBorder>
            )}
        </aside>
    );
}
