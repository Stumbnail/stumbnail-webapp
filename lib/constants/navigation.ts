import { NavItem } from '@/types';

// Navigation items configuration
// The 'active' property should be overridden based on the current route
export const NAV_ITEMS: NavItem[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: '/assets/dashboard/icons/home-05-stroke-rounded 2-sidebar.svg',
        active: false
    },
    {
        id: 'projects',
        label: 'Projects',
        icon: '/assets/dashboard/icons/image-02-stroke-rounded 1-sidebar.svg',
        active: false
    },
    {
        id: 'community',
        label: 'Community',
        icon: '/assets/dashboard/icons/ai-cloud-stroke-rounded 1-sidebar.svg',
        active: false
    },
    {
        id: 'favourites',
        label: 'Favourites',
        icon: '/assets/dashboard/icons/play-list-favourite-02-stroke-rounded 1-sidebar.svg',
        active: false
    },
];

// Route mapping for navigation
export const NAV_ROUTES: Record<string, string> = {
    dashboard: '/dashboard',
    projects: '/projects',
    community: '/community',
    favourites: '/favourites',
};

/**
 * Get navigation items with the active state set for the current route
 */
export function getNavItemsForRoute(currentRoute: 'dashboard' | 'projects' | 'community' | 'favourites'): NavItem[] {
    return NAV_ITEMS.map(item => ({
        ...item,
        active: item.id === currentRoute,
    }));
}
