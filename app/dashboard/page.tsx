'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Types
import {
  EditProjectModalState,
  ProjectActionModalState,
  Template
} from '@/types';

// Hooks
import { useAuth, useUserData, useTheme, useMobile, useTemplates } from '@/hooks';
import { useProjectsContext } from '@/contexts';

// Constants
import {
  getNavItemsForRoute,
  TEMPLATES_PER_PAGE,
  MAX_PROJECTS_DISPLAY,
  MAX_PROJECTS_DISPLAY_MOBILE
} from '@/lib/constants';

// Services
import { getUserPlan } from '@/lib/services/userService';

// Analytics
import { trackProjectCreate } from '@/lib/analytics';

// Components - Critical path components load normally
import { Sidebar, Header } from '@/components/layout';
import { ProjectsGrid } from '@/components/projects';
import { LoadingSpinner, PricingModal } from '@/components/ui';

// Lazy load modals (only loaded when user opens them)
const ProjectNameModal = dynamic(
  () => import('@/components/modals/ProjectNameModal'),
  { ssr: false }
);
const ProjectActionModal = dynamic(
  () => import('@/components/modals/ProjectActionModal'),
  { ssr: false }
);
const ProfileModal = dynamic(
  () => import('@/components/modals/ProfileModal'),
  { ssr: false }
);
const TemplateCustomizationModal = dynamic(
  () => import('@/components/modals/TemplateCustomizationModal'),
  { ssr: false }
);

// Styles
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const router = useRouter();

  // Custom hooks
  const { user, loading: authLoading, signOut } = useAuth();
  const { userData } = useUserData(user);
  const { theme, setTheme } = useTheme({ userId: user?.uid });
  const { isMobile, sidebarOpen, toggleSidebar, closeSidebar } = useMobile();
  const { templates, loading: _templatesLoading } = useTemplates(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const {
    projects,
    loading: _projectsLoading, // eslint-disable-line @typescript-eslint/no-unused-vars
    isStale,
    cacheHit: _cacheHit, // eslint-disable-line @typescript-eslint/no-unused-vars
    createNewProject,
    removeProject,
    toggleFavorite,
    updateProject,
  } = useProjectsContext();

  // Navigation
  const navItems = useMemo(() => getNavItemsForRoute('dashboard'), []);

  // UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const [viewingAllTemplates, setViewingAllTemplates] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Edit project state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');

  // Memoized values
  const totalPages = Math.ceil(templates.length / TEMPLATES_PER_PAGE);

  const displayedTemplates = useMemo(() =>
    viewingAllTemplates
      ? templates.slice((currentPage - 1) * TEMPLATES_PER_PAGE, currentPage * TEMPLATES_PER_PAGE)
      : templates,
    [viewingAllTemplates, currentPage, templates]
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

  // Click outside handling for project menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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

    if (projectMenuOpen !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [projectMenuOpen]);

  // Handlers
  const handleCreateProject = useCallback(async (name: string, isPublic: boolean) => {
    const newProject = await createNewProject(name, isPublic);
    if (newProject) {
      // Track empty project creation
      trackProjectCreate('empty', null, 'free');
      setIsModalOpen(false);
      router.push(`/project/${newProject.id}`);
    }
  }, [createNewProject, router]);

  const handleSeeAllClick = useCallback(() => {
    setViewingAllTemplates(prev => !prev);
    setCurrentPage(1);
  }, []);

  // Direct create without customization (for templates without variables)
  const handleTemplateDirectCreate = useCallback(async (template: Template) => {
    const newProject = await createNewProject('untitled', true);
    if (!newProject) return;

    trackProjectCreate('template', template.title, 'free');

    // Store template data for project page to consume
    sessionStorage.setItem(`template_${newProject.id}`, JSON.stringify({
      type: template.type || 'prompt',
      prompt: template.prompt || '',
      imageURL: template.image,
      category: template.category || null,
      tone: template.tone || null,
    }));

    router.push(`/project/${newProject.id}`);
  }, [createNewProject, router]);

  const handleTemplateClick = useCallback((template: Template) => {
    // If template has variables, show customization modal
    if (template.variables && template.variables.length > 0) {
      setSelectedTemplate(template);
      setTemplateModalOpen(true);
    } else {
      // No variables - create project directly with original flow
      handleTemplateDirectCreate(template);
    }
  }, [handleTemplateDirectCreate]);

  // Handle customization modal submission
  const handleTemplateCustomizationSubmit = useCallback(async (
    customizedPrompt: string,
    attachedImages: { id: string; file: File; preview: string }[],
    category: string | null,
    tone: string | null
  ) => {
    if (!selectedTemplate) return;

    const newProject = await createNewProject('untitled', true);
    if (!newProject) return;

    trackProjectCreate('template', selectedTemplate.title, 'free');

    // Store the customized prompt and images for project page
    // Images will be stored as base64 in sessionStorage (for small images)
    // or as file references that the project page can access
    const imageData = attachedImages.map(img => ({
      id: img.id,
      preview: img.preview, // base64 preview
      name: img.file.name,
      type: img.file.type
    }));

    sessionStorage.setItem(`template_${newProject.id}`, JSON.stringify({
      type: 'prompt',
      prompt: customizedPrompt,
      imageURL: selectedTemplate.image,
      category: category,
      tone: tone,
      attachedImages: imageData,
      autoGenerate: true // Trigger generation immediately on project load
    }));

    // Close modal and navigate
    setTemplateModalOpen(false);
    setSelectedTemplate(null);
    router.push(`/project/${newProject.id}`);
  }, [selectedTemplate, createNewProject, router]);

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

  const handleProjectMenuClick = useCallback((projectId: string) => {
    setProjectMenuOpen(prev => prev === projectId ? null : projectId);
  }, []);

  const handleEditProject = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setEditProjectModal({
        isOpen: true,
        projectId,
        projectName: project.name,
        isPublic: project.privacy === 'public'
      });
    }
    setProjectMenuOpen(null);
  }, [projects]);

  const handleSaveProjectName = useCallback((projectId: string) => {
    if (editingProjectName.trim()) {
      updateProject(projectId, { name: editingProjectName.trim() });
    }
    setEditingProjectId(null);
    setEditingProjectName('');
  }, [editingProjectName, updateProject]);

  const handleCancelEdit = useCallback(() => {
    setEditingProjectId(null);
    setEditingProjectName('');
  }, []);

  const handleToggleFavorite = useCallback((projectId: string) => {
    toggleFavorite(projectId);
    setProjectMenuOpen(null);
  }, [toggleFavorite]);

  const handleOpenProject = useCallback((projectId: string) => {
    router.push(`/project/${projectId}`);
    setProjectMenuOpen(null);
  }, [router]);

  const handleDeleteProject = useCallback((projectId: string) => {
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

    updateProject(editProjectModal.projectId, {
      name,
      privacy: isPublic ? 'public' : 'private'
    });

    setEditProjectModal({
      isOpen: false,
      projectId: null,
      projectName: '',
      isPublic: true
    });
  }, [editProjectModal.projectId, updateProject]);

  const [isDeleting, setIsDeleting] = useState(false);

  const handleProjectActionConfirm = useCallback(async () => {
    if (projectActionModal.projectId === null) return;

    const projectId = projectActionModal.projectId;

    if (projectActionModal.type === 'delete') {
      setIsDeleting(true);
      try {
        const success = await removeProject(projectId);
        if (!success) {
          alert('Failed to delete project. Please check if the backend server is running correctly.');
          return;
        }
      } finally {
        setIsDeleting(false);
      }
    }

    setProjectActionModal({
      isOpen: false,
      type: 'delete',
      projectId: null,
      projectName: ''
    });
  }, [projectActionModal, removeProject]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
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
        onProfileClick={() => setProfileModalOpen(true)}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 className={styles.sectionTitle}>
                My <span className={styles.titleAccent}>Projects</span>
              </h2>
              {isStale && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    background: 'var(--background-secondary)',
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray="31.4 31.4"
                      strokeLinecap="round"
                      opacity="0.5"
                    />
                  </svg>
                  <span>Syncing...</span>
                </div>
              )}
            </div>

            <ProjectsGrid
              filteredProjects={filteredProjects}
              displayedProjects={displayedProjects}
              hasMoreProjects={hasMoreProjects}
              searchQuery={searchQuery}
              projectMenuOpen={projectMenuOpen}
              editingProjectId={editingProjectId}
              editingProjectName={editingProjectName}
              theme={theme}
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


          {/* Templates Section */}
          <section className={`${styles.templatesSection} ${viewingAllTemplates ? styles.viewingAll : ''}`}>
            <div className={styles.templatesHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Templates</h2>
                <span className={styles.templatesBadge}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 4.5L6.5 11.5L2.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Proven for CTR
                </span>
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
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTemplateClick(template);
                    }
                  }}
                  aria-label={`Use ${template.title} template`}
                >
                  <div className={styles.templateImage}>
                    {template.image ? (
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
                    ) : (
                      <div className={styles.templatePlaceholder} />
                    )}
                    {/* Hover overlay with action button */}
                    <div className={styles.templateOverlay}>
                      <button
                        className={styles.templateActionButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateClick(template);
                        }}
                      >
                        Create from this
                      </button>
                    </div>
                  </div>
                  {/* Template Info Row */}
                  <div className={styles.templateInfoRow}>
                    <h3 className={styles.templateTitle}>{template.title}</h3>
                    {/* Template Type Badge */}
                    <span
                      className={`${styles.templateTypeBadge} ${template.type === 'youtube_thumbnail'
                        ? styles.templateTypeBadgeYouTube
                        : styles.templateTypeBadgePrompt
                        }`}
                    >
                      {template.type === 'youtube_thumbnail' ? (
                        <>
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                          </svg>
                          Edit
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
                          </svg>
                          Prompt
                        </>
                      )}
                    </span>
                  </div>
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
      </main >

      {/* Modals */}
      < ProjectNameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)
        }
        onCreateProject={handleCreateProject}
        theme={theme}
        isPaidUser={getUserPlan(userData).type !== 'free'}
        onUpgradeClick={() => setPricingModalOpen(true)}
      />

      < ProjectNameModal
        isOpen={editProjectModal.isOpen}
        onClose={() => setEditProjectModal(prev => ({ ...prev, isOpen: false }))}
        onCreateProject={handleEditProjectConfirm}
        editMode={true}
        initialName={editProjectModal.projectName}
        initialIsPublic={editProjectModal.isPublic}
        theme={theme}
        isPaidUser={getUserPlan(userData).type !== 'free'}
        onUpgradeClick={() => setPricingModalOpen(true)}
      />

      < ProjectActionModal
        isOpen={projectActionModal.isOpen}
        onClose={() => setProjectActionModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleProjectActionConfirm}
        type={projectActionModal.type}
        projectName={projectActionModal.projectName}
        theme={theme}
        isLoading={isDeleting}
      />

      {/* Pricing Modal */}
      < PricingModal
        open={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
        theme={theme}
        userEmail={user?.email || undefined}
      />

      < ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        userData={userData}
        theme={theme}
        onUpgradeClick={() => setPricingModalOpen(true)}
      />

      {/* Template Customization Modal */}
      < TemplateCustomizationModal
        isOpen={templateModalOpen}
        onClose={() => {
          setTemplateModalOpen(false);
          setSelectedTemplate(null);
        }}
        onSubmit={handleTemplateCustomizationSubmit}
        template={selectedTemplate}
        theme={theme}
      />

      {/* Mobile Floating Action Button */}
      {
        isMobile && (
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
        )
      }
    </div >
  );
}
