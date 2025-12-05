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
    isPublic: true
  },
  {
    id: 2,
    name: 'Gaming Stream Cover',
    thumbnail: '/assets/dashboard/template2.png',
    createdAt: '5 days ago',
    isPublic: false
  },
  {
    id: 3,
    name: 'Product Review',
    thumbnail: '/assets/dashboard/template3.png',
    createdAt: '1 week ago',
    isPublic: true
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
    console.log('Generating with prompt:', promptText);
  };

  const handleYoutubeLinkSubmit = () => {
    console.log('Generating from YouTube:', youtubeLink);
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

  const handleDuplicateProject = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setProjectActionModal({
        isOpen: true,
        type: 'duplicate',
        projectId,
        projectName: project.name
      });
    }
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
    <div className={styles.container}>
      {/* Decorative blur elements - only render on desktop to reduce DOM nodes on mobile */}
      {!isMobile && (
        <>
          <div className={styles.blurTopRight} />
          <div className={styles.blurBottom} />
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
              <button className={styles.profileMenuItem} onClick={handleSignOut}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M6.75 15.75H3.75C3.35218 15.75 2.97064 15.592 2.68934 15.3107C2.40804 15.0294 2.25 14.6478 2.25 14.25V3.75C2.25 3.35218 2.40804 2.97064 2.68934 2.68934C2.97064 2.40804 3.35218 2.25 3.75 2.25H6.75M12 12.75L15.75 9M15.75 9L12 5.25M15.75 9H6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
        <button className={styles.upgradeButton}>
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
                <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
          <button className={styles.createButton} onClick={() => setIsModalOpen(true)}>
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
                  <button className={styles.startButton} onClick={() => setIsModalOpen(true)}>
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
                              <circle cx="10" cy="4" r="1.5" fill="currentColor"/>
                              <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
                              <circle cx="10" cy="16" r="1.5" fill="currentColor"/>
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
                                onClick={() => handleDuplicateProject(project.id)}
                              >
                                <Image
                                  src="/assets/dashboard/icons/copy-01-stroke-rounded 1.svg"
                                  alt=""
                                  width={18}
                                  height={18}
                                  aria-hidden="true"
                                />
                                Duplicate
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
                              <path d="M1.33331 8C1.33331 8 3.33331 3.33334 7.99998 3.33334C12.6666 3.33334 14.6666 8 14.6666 8C14.6666 8 12.6666 12.6667 7.99998 12.6667C3.33331 12.6667 1.33331 8 1.33331 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M11.96 11.96C10.8204 12.8286 9.43255 13.305 8.00004 13.3133C3.33337 13.3133 1.33337 8.64666 1.33337 8.64666C2.12568 7.06819 3.24126 5.66931 4.60671 4.53332M6.60004 3.42666C7.05891 3.29806 7.52858 3.23294 8.00004 3.23332C12.6667 3.23332 14.6667 7.89999 14.6667 7.89999C14.2474 8.75709 13.7458 9.56973 13.1694 10.3233M9.41337 9.41332C9.23022 9.61117 9.00942 9.76969 8.76424 9.87911C8.51905 9.98852 8.25445 10.0467 7.98614 10.0496C7.71783 10.0526 7.45199 9.99998 7.20453 9.89552C6.95707 9.79107 6.73296 9.63697 6.54532 9.44267C6.35768 9.24838 6.21019 9.01773 6.11291 8.76451C6.01563 8.51129 5.97061 8.24113 5.9804 7.97027C5.99019 7.69941 6.05458 7.43349 6.17002 7.18801C6.28545 6.94252 6.44968 6.72294 6.65337 6.54332" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M1.33337 1.33334L14.6667 14.6667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
                <button className={styles.viewAllProjectsButton} onClick={() => console.log('Navigate to Projects page')}>
                  Go to Projects to see all ({filteredProjects.length})
                </button>
              )}
              </>
            )}
          </section>

          {/* Create With Prompt Section */}
          <section className={styles.createSection}>
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
                            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M8 11V8M8 5H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
                        placeholder="Describe your thumbnail"
                        className={styles.promptInput}
                        aria-label="Describe your thumbnail"
                      />

                      <div className={styles.promptOptions}>
                        <StyleDropdown
                          selectedStyle={selectedStyle}
                          onSelectStyle={handleSelectStyle}
                          onCreateNew={handleCreateNewStyle}
                        />

                        <ModelDropdown
                          selectedModel={selectedModel}
                          onSelectModel={handleSelectModel}
                        />

                        <button 
                          className={styles.addButton} 
                          aria-label="Add image reference"
                          onClick={handleImageAttach}
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
                        aria-label="Generate thumbnail from prompt"
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
                                <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
                            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M8 11V8M8 5H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                        {urlInfoOpen && (
                          <div className={styles.infoTooltip}>
                            <p>If you find a thumbnail on YouTube and really like it, just paste the link of the video and make the thumbnail yours by editing it directly.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.youtubeInput} onClick={() => youtubeLinkInputRef.current?.focus()}>
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
                        type="text"
                        value={youtubeLink}
                        onChange={(e) => setYoutubeLink(e.target.value)}
                        placeholder="Paste a YouTube link to generate thumbnail"
                        className={styles.linkInput}
                        aria-label="Paste YouTube link"
                      />
                      <button
                        className={styles.generateButton}
                        onClick={handleYoutubeLinkSubmit}
                        aria-label="Generate thumbnail from YouTube link"
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
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Templates Section */}
          <section className={`${styles.templatesSection} ${viewingAllTemplates ? styles.viewingAll : ''}`}>
            <div className={styles.templatesHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Jumpstart your creativity</h2>
                <p className={styles.templatesSubtitle}>YouTube&apos;s &quot;Recommended</p>
              </div>
              <button onClick={handleSeeAllClick} className={styles.seeAll}>
                {viewingAllTemplates ? 'Show less' : 'See all'}
              </button>
            </div>

            <div className={styles.templatesGrid}>
              {displayedTemplates.map((template, index) => (
                <div key={template.id} className={styles.templateCard}>
                  <div className={styles.templateImage}>
                    <Image
                      src={template.image}
                      alt={template.title}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 192px"
                      priority={index === 0}
                      style={{ objectFit: 'cover' }}
                    />
                    <button className={styles.favoriteButton} aria-label={`Add ${template.title} to favourites`}>
                      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <circle cx="15.719" cy="15.719" r="15.219" fill="white" fillOpacity="0.7" stroke="white"/>
                        <path d="M10.1198 8.40026C9.29655 8.68744 8.59773 9.14694 8.05207 9.75004C6.11834 11.904 6.44382 15.2736 8.90406 18.5284C9.50716 19.323 11.393 21.228 12.3886 22.0417C12.8768 22.4438 13.815 23.1713 14.4947 23.6595L15.7104 24.5498L16.3422 24.1094C20.0661 21.4673 22.5551 18.9496 23.7038 16.6521C25.3025 13.4739 24.8239 10.5446 22.4498 8.96506C21.5499 8.36196 20.7554 8.16093 19.5109 8.2088C18.5632 8.24709 18.41 8.27581 17.7399 8.60129C17.2229 8.84061 16.7922 9.14694 16.3518 9.57773L15.7104 10.1904L15.1456 9.61602C14.7436 9.21395 14.3319 8.91719 13.7671 8.63958C12.9726 8.24709 12.9343 8.23751 11.8525 8.2088C10.9048 8.18965 10.6559 8.21837 10.1198 8.40026Z" fill="#FF6F61" stroke="#141414" strokeWidth="0.8"/>
                      </svg>
                    </button>
                  </div>
                  <h3 className={styles.templateTitle}>{template.title}</h3>
                  <p className={styles.templateDescription}>{template.description}</p>
                </div>
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
                    <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
      />

      {/* Project Name Modal - Edit */}
      <ProjectNameModal
        isOpen={editProjectModal.isOpen}
        onClose={() => setEditProjectModal({ ...editProjectModal, isOpen: false })}
        onCreateProject={handleEditProjectConfirm}
        editMode={true}
        initialName={editProjectModal.projectName}
        initialIsPublic={editProjectModal.isPublic}
      />

      {/* Project Action Modal - Delete/Duplicate */}
      <ProjectActionModal
        isOpen={projectActionModal.isOpen}
        onClose={() => setProjectActionModal({ ...projectActionModal, isOpen: false })}
        onConfirm={handleProjectActionConfirm}
        type={projectActionModal.type}
        projectName={projectActionModal.projectName}
      />

      {/* Create Style Modal */}
      <CreateStyleModal
        isOpen={isCreateStyleModalOpen}
        onClose={() => setIsCreateStyleModalOpen(false)}
        onCreateStyle={handleCreateStyleConfirm}
      />
    </div>
  );
}
