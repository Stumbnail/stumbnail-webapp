'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Types
import {
  Project,
  Style,
  Model,
  AttachedImage,
  EditProjectModalState,
  ProjectActionModalState
} from '@/types';

// Hooks
import { useAuth, useTheme, useMobile } from '@/hooks';

// Constants
import {
  getNavItemsForRoute,
  TEMPLATES,
  TEMPLATES_PER_PAGE,
  DEFAULT_MODEL,
  MAX_PROJECTS_DISPLAY,
  MAX_PROJECTS_DISPLAY_MOBILE
} from '@/lib/constants';

// Components - Critical path components load normally
import { Sidebar, Header } from '@/components/layout';
import { ProjectsGrid } from '@/components/projects';
import { LoadingSpinner } from '@/components/ui';

// Lazy load non-critical components to reduce TBT
const StyleDropdown = dynamic(
  () => import('./StyleDropdown'),
  { ssr: false, loading: () => <div style={{ height: 48 }} /> }
);
const ModelDropdown = dynamic(
  () => import('./ModelDropdown'),
  { ssr: false, loading: () => <div style={{ height: 48 }} /> }
);

// Lazy load modals (only loaded when user opens them)
const ProjectNameModal = dynamic(
  () => import('@/components/modals/ProjectNameModal'),
  { ssr: false }
);
const ProjectActionModal = dynamic(
  () => import('@/components/modals/ProjectActionModal'),
  { ssr: false }
);
const CreateStyleModal = dynamic(
  () => import('@/components/modals/CreateStyleModal'),
  { ssr: false }
);

// Styles
import styles from './dashboard.module.css';

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

export default function DashboardPage() {
  const router = useRouter();

  // Custom hooks
  const { user, loading: authLoading, signOut } = useAuth();
  const { theme, setTheme } = useTheme({ userId: user?.uid });
  const { isMobile, sidebarOpen, toggleSidebar, closeSidebar } = useMobile();

  // Navigation
  const navItems = useMemo(() => getNavItemsForRoute('dashboard'), []);

  // UI state
  const [promptText, setPromptText] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateStyleModalOpen, setIsCreateStyleModalOpen] = useState(false);
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
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model>(DEFAULT_MODEL);
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
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);

  // YouTube link validation state
  const [youtubeLinkError, setYoutubeLinkError] = useState<string | null>(null);

  // Refs
  const promptInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const youtubeLinkInputRef = useRef<HTMLInputElement>(null);
  const promptInfoRef = useRef<HTMLDivElement>(null);
  const urlInfoRef = useRef<HTMLDivElement>(null);

  // Memoized values
  const totalPages = Math.ceil(TEMPLATES.length / TEMPLATES_PER_PAGE);

  const displayedTemplates = useMemo(() =>
    viewingAllTemplates
      ? TEMPLATES.slice((currentPage - 1) * TEMPLATES_PER_PAGE, currentPage * TEMPLATES_PER_PAGE)
      : TEMPLATES,
    [viewingAllTemplates, currentPage]
  );

  const filteredProjects = useMemo(() =>
    projects.filter(project =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [projects, searchQuery]
  );

  const maxProjectsToShow = isMobile ? MAX_PROJECTS_DISPLAY_MOBILE : MAX_PROJECTS_DISPLAY;

  const displayedProjects = useMemo(() =>
    filteredProjects.slice(0, maxProjectsToShow),
    [filteredProjects, maxProjectsToShow]
  );

  const hasMoreProjects = filteredProjects.length > maxProjectsToShow;

  // Click outside handling for menus and tooltips
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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

    if (promptInfoOpen || urlInfoOpen || projectMenuOpen !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [projectMenuOpen, promptInfoOpen, urlInfoOpen]);

  // Cleanup image previews on unmount
  useEffect(() => {
    return () => {
      attachedImages.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, []);

  // Handlers
  const handlePromptSubmit = useCallback(() => {
    if (!promptText.trim()) return;
    console.log('Generating with prompt:', promptText);
  }, [promptText]);

  const handlePromptKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePromptSubmit();
    }
  }, [handlePromptSubmit]);

  const validateYoutubeLink = (url: string): boolean => {
    if (!url.trim()) {
      setYoutubeLinkError('Please enter a YouTube link');
      return false;
    }

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

  const handleYoutubeLinkChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setYoutubeLink(e.target.value);
    if (youtubeLinkError) {
      setYoutubeLinkError(null);
    }
  }, [youtubeLinkError]);

  const handleYoutubeLinkSubmit = useCallback(() => {
    if (validateYoutubeLink(youtubeLink)) {
      console.log('Generating from YouTube:', youtubeLink);
    }
  }, [youtubeLink]);

  const handleYoutubeLinkKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleYoutubeLinkSubmit();
    }
  }, [handleYoutubeLinkSubmit]);

  const handleCreateProject = useCallback((name: string, isPublic: boolean) => {
    console.log('Creating project:', { name, isPublic });
  }, []);

  const handleSelectStyle = useCallback((style: Style | null) => {
    setSelectedStyle(style);
    console.log('Selected style:', style);
  }, []);

  const handleCreateNewStyle = useCallback(() => {
    setIsCreateStyleModalOpen(true);
  }, []);

  const handleCreateStyleConfirm = useCallback((name: string, images: File[]) => {
    console.log('Creating style:', name, 'with', images.length, 'images');
    setIsCreateStyleModalOpen(false);
  }, []);

  const handleSelectModel = useCallback((model: Model) => {
    setSelectedModel(model);
    console.log('Selected model:', model);
  }, []);

  const handleSeeAllClick = useCallback(() => {
    setViewingAllTemplates(prev => !prev);
    setCurrentPage(1);
  }, []);

  const handleTemplateClick = useCallback((templateId: number) => {
    console.log('Selected template:', templateId);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

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
      setEditProjectModal({
        isOpen: true,
        projectId,
        projectName: project.name,
        isPublic: project.isPublic
      });
    }
    setProjectMenuOpen(null);
  }, [projects]);

  const handleSaveProjectName = useCallback((projectId: number) => {
    if (editingProjectName.trim()) {
      setProjects(prev => prev.map(project =>
        project.id === projectId
          ? { ...project, name: editingProjectName.trim() }
          : project
      ));
    }
    setEditingProjectId(null);
    setEditingProjectName('');
  }, [editingProjectName]);

  const handleCancelEdit = useCallback(() => {
    setEditingProjectId(null);
    setEditingProjectName('');
  }, []);

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

  const handleProjectActionConfirm = useCallback(() => {
    if (projectActionModal.projectId === null) return;

    const projectId = projectActionModal.projectId;

    switch (projectActionModal.type) {
      case 'delete':
        setProjects(prev => prev.filter(project => project.id !== projectId));
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
          setProjects(prev => [newProject, ...prev]);
        }
        break;
    }

    setProjectActionModal({
      isOpen: false,
      type: 'delete',
      projectId: null,
      projectName: ''
    });
  }, [projectActionModal, projects]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleImageAttach = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file)
    }));

    setAttachedImages(prev => [...prev, ...newImages]);

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }, []);

  const handleRemoveImage = useCallback((imageId: string) => {
    setAttachedImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  }, []);

  // Show loading state
  if (authLoading) {
    return (
      <LoadingSpinner theme={theme} text="Loading..." fullScreen />
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : styles.lightTheme}`}>
      {/* Decorative blur elements - only render on desktop */}
      {!isMobile && (
        <>
          <div className={styles.blurTopRight} />
          <div className={styles.blurSidebarBottom} />
        </>
      )}

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={closeSidebar}
          aria-hidden="true"
        />
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
      <main className={styles.main}>
        {/* Header */}
        <Header
          isMobile={isMobile}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onToggleSidebar={toggleSidebar}
          onCreateProject={() => setIsModalOpen(true)}
        />

        {/* Content */}
        <div className={styles.content}>
          {/* My Projects Section */}
          <section className={styles.projectsSection}>
            <h2 className={styles.sectionTitle}>
              My <span className={styles.titleAccent}>Projects</span>
            </h2>

            <ProjectsGrid
              projects={projects}
              filteredProjects={filteredProjects}
              displayedProjects={displayedProjects}
              hasMoreProjects={hasMoreProjects}
              searchQuery={searchQuery}
              projectMenuOpen={projectMenuOpen}
              editingProjectId={editingProjectId}
              editingProjectName={editingProjectName}
              onCreateProject={() => setIsModalOpen(true)}
              onProjectMenuClick={handleProjectMenuClick}
              onEditProject={handleEditProject}
              onEditNameChange={setEditingProjectName}
              onEditSave={handleSaveProjectName}
              onEditCancel={handleCancelEdit}
              onToggleFavorite={handleToggleFavorite}
              onOpenProject={handleOpenProject}
              onDeleteProject={handleDeleteProject}
            />
          </section>

          {/* Quick Create Section */}
          <section className={styles.createSection}>
            <div className={styles.quickCreateHeader}>
              <h2 className={styles.sectionTitle}>
                Create
              </h2>
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
                        Prompt
                      </h2>
                      <div className={styles.infoButtonWrapper} ref={promptInfoRef}>
                        <button
                          className={styles.infoButton}
                          onClick={() => setPromptInfoOpen(prev => !prev)}
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
                    <div className={styles.verticalDivider} />
                  </div>

                  <div className={styles.youtubeInputWrapper}>
                    <div className={styles.sectionTitleWithInfo}>
                      <h2 className={styles.sectionTitle}>
                        YouTube Link
                      </h2>
                      <div className={styles.infoButtonWrapper} ref={urlInfoRef}>
                        <button
                          className={styles.infoButton}
                          onClick={() => setUrlInfoOpen(prev => !prev)}
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
                        placeholder="Paste a YouTube link"
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

          {/* Decorative Blur */}
          {!isMobile && <div className={styles.blurBottom} />}

          {/* Templates Section */}
          <section className={`${styles.templatesSection} ${viewingAllTemplates ? styles.viewingAll : ''}`}>
            <div className={styles.templatesHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Templates</h2>
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
                      priority={index < 4}
                      loading={index < 4 ? undefined : 'lazy'}
                      fetchPriority={index < 2 ? 'high' : 'auto'}
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

      {/* Modals */}
      <ProjectNameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateProject={handleCreateProject}
        theme={theme}
      />

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
        type={projectActionModal.type}
        projectName={projectActionModal.projectName}
        theme={theme}
      />

      <CreateStyleModal
        isOpen={isCreateStyleModalOpen}
        onClose={() => setIsCreateStyleModalOpen(false)}
        onCreateStyle={handleCreateStyleConfirm}
        theme={theme}
      />

      {/* Mobile Floating Action Button */}
      {isMobile && (
        <button
          className={styles.fab}
          onClick={() => setIsModalOpen(true)}
          aria-label="Create new project"
        >
          <Image
            src="/assets/dashboard/icons/create-new-project-icon.svg"
            alt=""
            width={24}
            height={24}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}
