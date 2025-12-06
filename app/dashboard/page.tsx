'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, logOut } from '@/lib/firebase';
import styles from './dashboard.module.css';
import ProjectNameModal from './ProjectNameModal';
import ProjectActionModal from './ProjectActionModal';
import CreateStyleModal from './CreateStyleModal';
import StyleDropdown from './StyleDropdown';
import ModelDropdown from './ModelDropdown';

interface Template {
  id: number;
  title: string;
  description: string;
  image: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  active: boolean;
}

interface Style {
  id: string;
  name: string;
  styleId: string;
  thumbnail: string;
}

interface Model {
  id: string;
  name: string;
  description: string;
  featureTag: string;
  credits: number;
  logo: string;
}

interface Project {
  id: number;
  name: string;
  thumbnail: string;
  createdAt: string;
  isPublic: boolean;
  isFavorite: boolean;
}

// Static data moved outside component to prevent recreation on every render
const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '/assets/dashboard/icons/home-05-stroke-rounded 2-sidebar.svg', active: true },
  { id: 'projects', label: 'Projects', icon: '/assets/dashboard/icons/image-02-stroke-rounded 1-sidebar.svg', active: false },
  { id: 'community', label: 'Community', icon: '/assets/dashboard/icons/ai-cloud-stroke-rounded 1-sidebar.svg', active: false },
  { id: 'favourites', label: 'Favourites', icon: '/assets/dashboard/icons/play-list-favourite-02-stroke-rounded 1-sidebar.svg', active: false },
];

const templates: Template[] = [
  {
    id: 1,
    title: 'Tech Review Template',
    description: 'Generate instantly with AI',
    image: '/assets/dashboard/template1.png'
  },
  {
    id: 2,
    title: 'Travel Vlog Template',
    description: 'Generate instantly with AI',
    image: '/assets/dashboard/template2.png'
  },
  {
    id: 3,
    title: 'Gaming Reaction Template',
    description: 'Generate instantly with AI',
    image: '/assets/dashboard/template3.png'
  },
  {
    id: 4,
    title: 'Cinematic Look',
    description: 'Generate instantly with AI',
    image: '/assets/dashboard/template4.png'
  },
];

// Initial mock project data
const initialMockProjects: Project[] = [
  {
    id: 1,
    name: 'Summer Vlog Thumbnail',
    thumbnail: '/assets/dashboard/template1.png',
    createdAt: '2 days ago',
    isPublic: true,
    isFavorite: false
  },
  {
    id: 2,
    name: 'Gaming Stream Cover',
    thumbnail: '/assets/dashboard/template2.png',
    createdAt: '5 days ago',
    isPublic: false,
    isFavorite: true
  },
  {
    id: 3,
    name: 'Product Review',
    thumbnail: '/assets/dashboard/template3.png',
    createdAt: '1 week ago',
    isPublic: true,
    isFavorite: false
  },
];

// Debounce utility for resize handler
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

export default function DashboardPage() {
  const router = useRouter();

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // UI state
  const [promptText, setPromptText] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateStyleModalOpen, setIsCreateStyleModalOpen] = useState(false);
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
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model>({
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    description: 'Artistic style with custom text placement',
    featureTag: 'Text Placement',
    credits: 10,
    logo: '/assets/dashboard/icons/nano-banana-model.webp'
  });
  const [viewingAllTemplates, setViewingAllTemplates] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [promptInfoOpen, setPromptInfoOpen] = useState(false);
  const [urlInfoOpen, setUrlInfoOpen] = useState(false);
  const [creationContainerFocused, setCreationContainerFocused] = useState(false);
  const [projects, setProjects] = useState<Project[]>(initialMockProjects);
  const [projectMenuOpen, setProjectMenuOpen] = useState<number | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Edit project state
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');

  // Image attachment state
  const [attachedImages, setAttachedImages] = useState<{ id: string; file: File; preview: string }[]>([]);

  // YouTube link validation state
  const [youtubeLinkError, setYoutubeLinkError] = useState<string | null>(null);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const promptInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const youtubeLinkInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const promptInfoRef = useRef<HTMLDivElement>(null);
  const urlInfoRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const TEMPLATES_PER_PAGE = 8;
  const totalPages = Math.ceil(templates.length / TEMPLATES_PER_PAGE);

  const displayedTemplates = viewingAllTemplates
    ? templates.slice((currentPage - 1) * TEMPLATES_PER_PAGE, currentPage * TEMPLATES_PER_PAGE)
    : templates;

  // Filter projects based on search query
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate max projects to show (2 rows based on grid - typically 4 per row on desktop)
  const MAX_PROJECTS_DISPLAY = 8;
  const displayedProjects = filteredProjects.slice(0, MAX_PROJECTS_DISPLAY);
  const hasMoreProjects = filteredProjects.length > MAX_PROJECTS_DISPLAY;

  const checkMobile = useCallback(() => {
    setIsMobile(window.innerWidth <= 768);
    if (window.innerWidth > 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Theme initialization - fetch from database or fallback to localStorage/system preference
  useEffect(() => {
    const initializeTheme = async () => {
      // First, check localStorage for immediate UI update
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      }

      // Then fetch from database if user is authenticated
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
        // Redirect to login if not authenticated
        router.push('/login');
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    // Initial check
    checkMobile();

    // Debounced resize handler (150ms delay) for better performance
    const debouncedCheckMobile = debounce(checkMobile, 150);

    // Use passive event listener for better scroll/resize performance
    window.addEventListener('resize', debouncedCheckMobile, { passive: true });
    return () => window.removeEventListener('resize', debouncedCheckMobile);
  }, [checkMobile]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingProjectId !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingProjectId]);

  const handlePromptSubmit = () => {
    if (!promptText.trim()) return;
    console.log('Generating with prompt:', promptText);
  };

  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePromptSubmit();
    }
  };

  const validateYoutubeLink = (url: string): boolean => {
    if (!url.trim()) {
      setYoutubeLinkError('Please enter a YouTube link');
      return false;
    }

    // YouTube URL patterns
    const youtubePatterns = [
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/v\/[\w-]+/,
      /^(https?:\/\/)?youtu\.be\/[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/,
    ];

    const isValid = youtubePatterns.some(pattern => pattern.test(url.trim()));

    if (!isValid) {
      setYoutubeLinkError('Please enter a valid YouTube link');
      return false;
    }

    setYoutubeLinkError(null);
    return true;
  };

  const handleYoutubeLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYoutubeLink(e.target.value);
    // Clear error when user starts typing
    if (youtubeLinkError) {
      setYoutubeLinkError(null);
    }
  };

  const handleYoutubeLinkSubmit = () => {
    if (validateYoutubeLink(youtubeLink)) {
      console.log('Generating from YouTube:', youtubeLink);
      // TODO: Implement actual YouTube thumbnail generation
    }
  };

  const handleYoutubeLinkKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleYoutubeLinkSubmit();
    }
  };

  const handleCreateProject = (name: string, isPublic: boolean) => {
    console.log('Creating project:', { name, isPublic });
    // TODO: Implement actual project creation logic
  };

  const handleSelectStyle = (style: Style | null) => {
    setSelectedStyle(style);
    console.log('Selected style:', style);
  };

  const handleCreateNewStyle = () => {
    setIsCreateStyleModalOpen(true);
  };

  const handleCreateStyleConfirm = (name: string, images: File[]) => {
    console.log('Creating style:', name, 'with', images.length, 'images');
    // TODO: Implement actual style creation logic with API call
    setIsCreateStyleModalOpen(false);
  };

  const handleSelectModel = (model: Model) => {
    setSelectedModel(model);
    console.log('Selected model:', model);
  };

  const handleSeeAllClick = () => {
    setViewingAllTemplates(!viewingAllTemplates);
    setCurrentPage(1);
  };

  const handleTemplateClick = (templateId: number) => {
    console.log('Selected template:', templateId);
    // TODO: Navigate to editor with this template or open template preview
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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

    // Persist theme to database for cross-device sync
    if (user) {
      try {
        const response = await fetch('/api/user/theme', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            theme: newTheme,
          }),
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

  const handleSaveProjectName = (projectId: number) => {
    if (editingProjectName.trim()) {
      setProjects(projects.map(project =>
        project.id === projectId
          ? { ...project, name: editingProjectName.trim() }
          : project
      ));
    }
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, projectId: number) => {
    if (e.key === 'Enter') {
      handleSaveProjectName(projectId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
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
    // TODO: Navigate to project editor when implemented
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

  const handleImageAttach = () => {
    imageInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file)
    }));

    setAttachedImages(prev => [...prev, ...newImages]);

    // Reset input so same file can be selected again
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setAttachedImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  // Cleanup image previews on unmount
  useEffect(() => {
    return () => {
      attachedImages.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (promptInfoRef.current && !promptInfoRef.current.contains(event.target as Node)) {
        setPromptInfoOpen(false);
      }
      if (urlInfoRef.current && !urlInfoRef.current.contains(event.target as Node)) {
        setUrlInfoOpen(false);
      }
      // Close project menu when clicking outside
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

    if (profileMenuOpen || promptInfoOpen || urlInfoOpen || projectMenuOpen !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen, promptInfoOpen, urlInfoOpen, projectMenuOpen]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading...</p>
      </div>
    );
  }

  // Don't render dashboard if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : styles.lightTheme}`}>
      {/* Decorative blur elements - only render on desktop to reduce DOM nodes on mobile */}
      {!isMobile && (
        <>
          <div className={styles.blurTopRight} />
          <div className={styles.blurSidebarBottom} />
        </>
      )}

      {/* Mobile Overlay - only renders when sidebar is open on mobile */}
      {isMobile && sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
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
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
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
                    className={`${styles.themeButton} ${theme === 'dark' ? styles.themeButtonActive : ''}`}
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
              <div className={styles.profileMenuDivider} />
              <button className={styles.profileMenuItem} onClick={handleSignOut}>
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
              onClick={() => {
                if (item.id === 'projects') {
                  router.push('/projects');
                } else if (item.id === 'community') {
                  router.push('/community');
                } else if (item.id === 'favourites') {
                  router.push('/favourites');
                }
              }}
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
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <Image
              src="/assets/dashboard/icons/credits.svg"
              alt=""
              width={24}
              height={24}
              className={styles.progressIcon}
              aria-hidden="true"
            />
            <p className={styles.progressText}>
              <span className={styles.progressCurrent}>7</span> / 10
            </p>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: '70%' }} />
          </div>
        </div>

        {/* Upgrade Plan Button */}
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
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          {/* Mobile Menu Button */}
          {isMobile && (
            <button
              className={styles.menuButton}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* Search Bar */}
          <div
            className={styles.searchBar}
            onClick={() => searchInputRef.current?.focus()}
          >
            <Image
              src="/assets/dashboard/icons/search.svg"
              alt=""
              width={18}
              height={18}
              className={styles.searchIcon}
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search projects or templates..."
              className={styles.searchInput}
              aria-label="Search projects or templates"
            />
          </div>

          {/* Create New Project Button */}
          <button
            className={styles.createButton}
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
        <div className={styles.content}>
          {/* My Projects Section */}
          <section className={styles.projectsSection}>
            <h2 className={styles.sectionTitle}>
              My <span className={styles.titleAccent}>Projects</span>
            </h2>

            {filteredProjects.length === 0 ? (
              /* Empty State */
              <div className={styles.emptyState}>
                <div className={styles.emptyIconWrapper}>
                  <Image
                    src="/assets/dashboard/icons/project-section-youtube-with-sparkles.svg"
                    alt="No projects illustration"
                    width={80}
                    height={80}
                  />
                </div>
                <p className={styles.emptyText}>
                  {searchQuery
                    ? `No projects found for "${searchQuery}"`
                    : "No projects yet — let's create your first one!"}
                </p>
                {!searchQuery && (
                  <button
                    className={styles.startButton}
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
              /* Projects Grid */
              <>
                <div className={styles.projectsGrid}>
                  {/* Create Project Placeholder Card */}
                  {filteredProjects.length > 0 && (
                    <button
                      className={styles.createProjectCard}
                      onClick={() => setIsModalOpen(true)}
                      aria-label="Create new project"
                    >
                      <div className={styles.createProjectIcon}>
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16 8V24M8 16H24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className={styles.createProjectText}>New Project</span>
                    </button>
                  )}
                  {displayedProjects.map((project) => (
                    <div key={project.id} className={styles.projectCard}>
                      <div className={styles.projectThumbnail}>
                        <Image
                          src={project.thumbnail}
                          alt={project.name}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                          style={{ objectFit: 'cover' }}
                        />
                      </div>
                      <div className={styles.projectInfo}>
                        <div className={styles.projectHeader}>
                          {editingProjectId === project.id ? (
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editingProjectName}
                              onChange={(e) => setEditingProjectName(e.target.value)}
                              onBlur={() => handleSaveProjectName(project.id)}
                              onKeyDown={(e) => handleEditKeyDown(e, project.id)}
                              className={styles.projectNameInput}
                              aria-label="Edit project name"
                            />
                          ) : (
                            <h3 className={styles.projectName}>{project.name}</h3>
                          )}
                          <div className={styles.projectMenu} data-project-menu>
                            <button
                              className={styles.projectMenuButton}
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
                              <div className={styles.projectDropdown}>
                                <button
                                  className={styles.projectDropdownItem}
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
                                  className={styles.projectDropdownItem}
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
                                  className={styles.projectDropdownItem}
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
                                  className={`${styles.projectDropdownItem} ${styles.projectDropdownItemDanger}`}
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
                        <div className={styles.projectMeta}>
                          <span className={styles.projectDate}>{project.createdAt}</span>
                          <span className={styles.projectVisibility}>
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
                {hasMoreProjects && (
                  <button className={styles.viewAllProjectsButton} onClick={() => router.push('/projects')}>
                    Go to Projects to see all ({filteredProjects.length})
                  </button>
                )}
              </>
            )}
          </section>

          {/* Quick Create Section */}
          <section className={styles.createSection}>
            {/* Section Header - Outside container */}
            <div className={styles.quickCreateHeader}>
              <h2 className={styles.sectionTitle}>
                Quick <span className={styles.titleAccent}>Create</span>
              </h2>
              <p className={styles.quickCreateSubtitle}>
                Start creating instantly
              </p>
            </div>

            <div
              className={`${styles.creationContainer} ${creationContainerFocused ? styles.creationContainerFocused : ''}`}
              onFocus={() => setCreationContainerFocused(true)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setCreationContainerFocused(false);
                }
              }}
            >
              <div className={styles.creationContainerInner}>
                <div className={styles.createRow}>
                  <div className={styles.createPromptWrapper}>
                    <div className={styles.sectionTitleWithInfo}>
                      <h2 className={styles.sectionTitle}>
                        Create With <span className={styles.titleAccent}>Prompt</span>
                      </h2>
                      <div className={styles.infoButtonWrapper} ref={promptInfoRef}>
                        <button
                          className={styles.infoButton}
                          onClick={() => setPromptInfoOpen(!promptInfoOpen)}
                          aria-label="Information about prompt creation"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M8 11V8M8 5H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                        {promptInfoOpen && (
                          <div className={styles.infoTooltip}>
                            <p>Enter a prompt to generate your original thumbnail. If you want your face in there, just attach it, or describe your thumbnail.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.createPrompt} onClick={() => promptInputRef.current?.focus()}>
                      <input
                        ref={promptInputRef}
                        type="text"
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        onKeyDown={handlePromptKeyDown}
                        placeholder="Describe your thumbnail"
                        className={styles.promptInput}
                        aria-label="Describe your thumbnail to generate"
                      />

                      <div className={styles.promptOptions}>
                        <StyleDropdown
                          selectedStyle={selectedStyle}
                          onSelectStyle={handleSelectStyle}
                          onCreateNew={handleCreateNewStyle}
                          theme={theme}
                        />

                        <ModelDropdown
                          selectedModel={selectedModel}
                          onSelectModel={handleSelectModel}
                          theme={theme}
                        />

                        <button
                          className={styles.addButton}
                          aria-label="Attach image references for AI generation"
                          onClick={handleImageAttach}
                          type="button"
                        >
                          <Image
                            src="/assets/dashboard/icons/add-image.svg"
                            alt=""
                            width={20}
                            height={20}
                            aria-hidden="true"
                          />
                        </button>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageChange}
                          className={styles.hiddenInput}
                          aria-label="Upload image"
                        />
                      </div>

                      <button
                        className={styles.generateButton}
                        onClick={handlePromptSubmit}
                        aria-label="Generate thumbnail from description"
                        type="button"
                        disabled={!promptText.trim()}
                      >
                        <Image
                          src="/assets/dashboard/icons/send.svg"
                          alt=""
                          width={20}
                          height={20}
                          aria-hidden="true"
                        />
                      </button>
                    </div>

                    {/* Attached Images Preview */}
                    {attachedImages.length > 0 && (
                      <div className={styles.attachedImagesContainer}>
                        {attachedImages.map((img) => (
                          <div key={img.id} className={styles.attachedImageWrapper}>
                            <Image
                              src={img.preview}
                              alt={`Attached: ${img.file.name}`}
                              width={60}
                              height={60}
                              className={styles.attachedImagePreview}
                            />
                            <button
                              className={styles.removeImageButton}
                              onClick={() => handleRemoveImage(img.id)}
                              aria-label={`Remove ${img.file.name}`}
                            >
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <span className={styles.attachedImageName}>{img.file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.orDividerWrapper}>
                    <p className={styles.orDivider}>OR</p>
                  </div>

                  <div className={styles.youtubeInputWrapper}>
                    <div className={styles.sectionTitleWithInfo}>
                      <h2 className={styles.sectionTitle}>
                        Paste a <span className={styles.titleAccent}>Youtube Link</span>
                      </h2>
                      <div className={styles.infoButtonWrapper} ref={urlInfoRef}>
                        <button
                          className={styles.infoButton}
                          onClick={() => setUrlInfoOpen(!urlInfoOpen)}
                          aria-label="Information about YouTube link"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M8 11V8M8 5H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                        {urlInfoOpen && (
                          <div className={styles.infoTooltip}>
                            <p>If you find a thumbnail on YouTube and really like it, just paste the link of the video and make the thumbnail yours by editing it directly.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className={`${styles.youtubeInput} ${youtubeLinkError ? styles.youtubeInputError : ''}`}
                      onClick={() => youtubeLinkInputRef.current?.focus()}
                    >
                      <div className={styles.youtubeIconWrapper}>
                        <Image
                          src="/assets/dashboard/icons/attachment-02-stroke-rounded 1.svg"
                          alt=""
                          width={18}
                          height={18}
                          className={styles.youtubeIcon}
                          aria-hidden="true"
                        />
                      </div>
                      <input
                        ref={youtubeLinkInputRef}
                        type="url"
                        value={youtubeLink}
                        onChange={handleYoutubeLinkChange}
                        onKeyDown={handleYoutubeLinkKeyDown}
                        placeholder="Paste a YouTube link to generate thumbnail"
                        className={styles.linkInput}
                        aria-label="Paste YouTube video URL to generate thumbnail"
                        aria-invalid={!!youtubeLinkError}
                        aria-describedby={youtubeLinkError ? "youtube-error" : undefined}
                      />
                      <button
                        className={styles.generateButton}
                        onClick={handleYoutubeLinkSubmit}
                        aria-label="Generate thumbnail from YouTube video"
                        type="button"
                        disabled={!youtubeLink.trim()}
                      >
                        <Image
                          src="/assets/dashboard/icons/send.svg"
                          alt=""
                          width={20}
                          height={20}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                    {youtubeLinkError && (
                      <p id="youtube-error" className={styles.inputError}>{youtubeLinkError}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Decorative Blur Below Creation Container */}
          {!isMobile && <div className={styles.blurBottom} />}

          {/* Templates Section */}
          <section className={`${styles.templatesSection} ${viewingAllTemplates ? styles.viewingAll : ''}`}>
            <div className={styles.templatesHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Jumpstart Your Creativity</h2>
                <p className={styles.templatesSubtitle}>Hand-picked templates curated by our team, ready to use</p>
              </div>
              <button
                onClick={handleSeeAllClick}
                className={styles.seeAll}
                aria-label={viewingAllTemplates ? 'Show less templates' : 'See all templates'}
                aria-expanded={viewingAllTemplates}
              >
                {viewingAllTemplates ? 'Show less' : 'See all'}
              </button>
            </div>

            <div className={styles.templatesGrid}>
              {displayedTemplates.map((template, index) => (
                <article
                  key={template.id}
                  className={styles.templateCard}
                  onClick={() => handleTemplateClick(template.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTemplateClick(template.id);
                    }
                  }}
                  aria-label={`Use ${template.title} template`}
                >
                  <div className={styles.templateImage}>
                    <Image
                      src={template.image}
                      alt={template.title}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 192px"
                      priority={index === 0}
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  <h3 className={styles.templateTitle}>{template.title}</h3>
                  <p className={styles.templateDescription}>{template.description}</p>
                </article>
              ))}
            </div>

            {viewingAllTemplates && totalPages > 1 && (
              <div className={styles.paginationControls}>
                <button
                  className={styles.paginationButton}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <span className={styles.paginationInfo}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  className={styles.paginationButton}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
          </section>
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

      {/* Create Style Modal */}
      <CreateStyleModal
        isOpen={isCreateStyleModalOpen}
        onClose={() => setIsCreateStyleModalOpen(false)}
        onCreateStyle={handleCreateStyleConfirm}
        theme={theme}
      />
    </div>
  );
}
