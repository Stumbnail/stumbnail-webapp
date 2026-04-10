'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamicImport from 'next/dynamic';

// Types
import {
  EditProjectModalState,
  ProjectActionModalState
} from '@/types';

// Hooks
import { useAuth, useUserData, useTheme, useMobile } from '@/hooks';
import { useProjectsContext } from '@/contexts';

// Constants
import {
  getNavItemsForRoute,
  MAX_PROJECTS_DISPLAY,
  MAX_PROJECTS_DISPLAY_MOBILE
} from '@/lib/constants';

// Services
import { getUserPlan } from '@/lib/services/userService';

// Analytics
import { trackProjectCreate } from '@/lib/analytics';
import { needsIntentPrompt, submitIntentAnswer, trackAppOpen, setAnalyticsUserContext } from '@/lib/services/analyticsService';

// Components - Critical path components load normally
import { Sidebar, Header } from '@/components/layout';
import { ProjectsGrid } from '@/components/projects';
import { LoadingSpinner, PricingModal } from '@/components/ui';

// Lazy load modals (only loaded when user opens them)
const ProjectNameModal = dynamicImport(
  () => import('@/components/modals/ProjectNameModal'),
  { ssr: false }
);
const ProjectActionModal = dynamicImport(
  () => import('@/components/modals/ProjectActionModal'),
  { ssr: false }
);
const ProfileModal = dynamicImport(
  () => import('@/components/modals/ProfileModal'),
  { ssr: false }
);
const ShareModal = dynamicImport(
  () => import('@/components/modals/ShareModal'),
  { ssr: false }
);
const IntentPromptModal = dynamicImport(
  () => import('@/components/modals/IntentPromptModal'),
  { ssr: false }
);

// Styles
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const router = useRouter();

  // Custom hooks
  const { user, loading: authLoading, signOut } = useAuth();
  const { userData, loading: userDataLoading } = useUserData(user);
  const { theme, setTheme } = useTheme({ userId: user?.uid });
  const { isMobile, sidebarOpen, toggleSidebar, closeSidebar } = useMobile();
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
  const userPlan = useMemo(() => getUserPlan(userData), [userData]);
  const isPaidUser = userPlan.type !== 'free';
  const isHardPaywallActive = Boolean(user) && !authLoading && !userDataLoading && !isPaidUser;

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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [shareModalState, setShareModalState] = useState<{
    isOpen: boolean;
    projectId: string;
    projectName: string;
    privacy: 'public' | 'private';
  }>({
    isOpen: false,
    projectId: '',
    projectName: '',
    privacy: 'private'
  });

  // Intent prompt state (for first-time users)
  const [intentModalOpen, setIntentModalOpen] = useState(false);
  const [intentChecked, setIntentChecked] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Edit project state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');

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

  // Check if user needs to see intent prompt and track app_open
  useEffect(() => {
    if (!user || authLoading || intentChecked) return;

    const checkIntentPrompt = async () => {
      try {
        // Track app open event
        const isReturning = localStorage.getItem('stumbnail_has_visited') === 'true';
        trackAppOpen(isReturning);
        if (!isReturning) {
          localStorage.setItem('stumbnail_has_visited', 'true');
        }

        // Check if intent prompt is needed
        const needsPrompt = await needsIntentPrompt();
        if (needsPrompt) {
          setIntentModalOpen(true);
        }
      } catch (error) {
        console.warn('[Dashboard] Error checking intent prompt:', error);
      } finally {
        setIntentChecked(true);
      }
    };

    checkIntentPrompt();
  }, [user, authLoading, intentChecked]);

  // Set analytics user context when user data is available
  useEffect(() => {
    if (userData) {
      setAnalyticsUserContext({
        creditsRemaining: userData.subscriptionCredits + userData.toppedUpBalance + userData.trialCredits,
        planTier: userPlan.type,
      });
    }
  }, [userData, userPlan.type]);

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
      trackProjectCreate(userPlan.type);
      setIsModalOpen(false);
      router.push(`/project/${newProject.id}`);
    }
  }, [createNewProject, router, userPlan.type]);

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

  const handleShareProject = useCallback((projectId: string, projectName: string, privacy: 'public' | 'private') => {
    setShareModalState({
      isOpen: true,
      projectId,
      projectName,
      privacy
    });
    setProjectMenuOpen(null);
  }, []);

  const handleMakePublic = useCallback(async () => {
    if (!shareModalState.projectId) return;

    await updateProject(shareModalState.projectId, {
      privacy: 'public'
    });

    // Update the modal state to reflect the new privacy
    setShareModalState(prev => ({
      ...prev,
      privacy: 'public'
    }));
  }, [shareModalState.projectId, updateProject]);

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

  const handleIntentSubmit = useCallback(async (answer: string) => {
    try {
      await submitIntentAnswer(answer);
      setIntentModalOpen(false);
    } catch (error) {
      console.error('[Dashboard] Error submitting intent:', error);
      // Still close the modal on error to not block the user
      setIntentModalOpen(false);
    }
  }, []);

  // Show loading state
  if (authLoading || (user && userDataLoading)) {
    return (
      <LoadingSpinner theme={theme} text="Loading..." fullScreen />
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  if (isHardPaywallActive) {
    return (
      <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : styles.lightTheme}`}>
        {!isMobile && (
          <>
            <div className={styles.blurTopRight} />
            <div className={styles.blurSidebarBottom} />
          </>
        )}

        <PricingModal
          open={true}
          onClose={handleSignOut}
          theme={theme}
          userEmail={user.email || undefined}
          source="dashboard"
          currentPlan={userPlan.type}
          hardPaywall
        />
      </div>
    );
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
              onShareProject={handleShareProject}
            />
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
        isPaidUser={isPaidUser}
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
        isPaidUser={isPaidUser}
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
        currentPlan={userPlan.type}
      />

      < ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        userData={userData}
        theme={theme}
        onUpgradeClick={() => setPricingModalOpen(true)}
      />

      {/* Share Modal */}
      < ShareModal
        isOpen={shareModalState.isOpen}
        onClose={() => setShareModalState(prev => ({ ...prev, isOpen: false }))}
        projectId={shareModalState.projectId}
        projectName={shareModalState.projectName}
        privacy={shareModalState.privacy}
        onMakePublic={handleMakePublic}
        theme={theme}
      />

      {/* Intent Prompt Modal (first-time users) */}
      <IntentPromptModal
        open={intentModalOpen}
        onSubmit={handleIntentSubmit}
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
