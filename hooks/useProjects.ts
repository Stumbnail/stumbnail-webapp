'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Project } from '@/types';
import {
    getProjects,
    createProject,
    deleteProject,
    updateProject as updateProjectApi,
    ApiProject,
    ProjectsResponse,
    UpdateProjectRequest,
} from '@/lib/services/projectService';

/**
 * Transform API project to frontend Project type
 */
function transformProject(apiProject: ApiProject): Project {
    return {
        id: apiProject.id,
        name: apiProject.name,
        previewImage: apiProject.previewImage,
        privacy: apiProject.privacy,
        thumbnailsCount: apiProject.thumbnailsCount,
        createdAt: apiProject.createdAt,
        updatedAt: apiProject.updatedAt,
        isFavorite: false, // Client-side state, not from API
    };
}

interface UseProjectsOptions {
    pageSize?: number;
    autoFetch?: boolean;
}

interface UseProjectsReturn {
    projects: Project[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
    nextCursor: string | null;
    refetch: () => Promise<void>;
    loadMore: () => Promise<void>;
    createNewProject: (name: string, isPublic: boolean) => Promise<Project | null>;
    removeProject: (projectId: string) => Promise<boolean>;
    toggleFavorite: (projectId: string) => void;
    updateProject: (projectId: string, updates: { name?: string; privacy?: 'public' | 'private' }) => Promise<boolean>;
}

/**
 * Hook for managing projects with API integration
 */
export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
    const { pageSize = 20, autoFetch = true } = options;

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);

    // Track which projects are favorites (persisted in localStorage)
    const [favorites, setFavorites] = useState<Set<string>>(() => {
        if (typeof window === 'undefined') return new Set();
        try {
            const stored = localStorage.getItem('project_favorites');
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch {
            return new Set();
        }
    });

    // Save favorites to localStorage when they change
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('project_favorites', JSON.stringify([...favorites]));
        } catch {
            // Ignore localStorage errors
        }
    }, [favorites]);

    /**
     * Fetch projects from API
     */
    const fetchProjects = useCallback(async (cursor?: string) => {
        setLoading(true);
        setError(null);

        try {
            const response: ProjectsResponse = await getProjects(pageSize, cursor);

            const transformedProjects = response.projects.map((p) => ({
                ...transformProject(p),
                isFavorite: favorites.has(p.id),
            }));

            if (cursor) {
                // Append to existing projects (pagination)
                setProjects((prev) => [...prev, ...transformedProjects]);
            } else {
                // Replace projects (initial fetch or refetch)
                setProjects(transformedProjects);
            }

            setHasMore(response.hasMore);
            setNextCursor(response.nextPageCursor);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch projects';
            setError(message);
            console.error('Error fetching projects:', err);
        } finally {
            setLoading(false);
        }
    }, [pageSize, favorites]);

    /**
     * Initial fetch on mount
     */
    useEffect(() => {
        if (autoFetch) {
            fetchProjects();
        }
    }, [autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * Refetch all projects
     */
    const refetch = useCallback(async () => {
        await fetchProjects();
    }, [fetchProjects]);

    /**
     * Load more projects (pagination)
     */
    const loadMore = useCallback(async () => {
        if (!hasMore || !nextCursor || loading) return;
        await fetchProjects(nextCursor);
    }, [hasMore, nextCursor, loading, fetchProjects]);

    /**
     * Create a new project
     */
    const createNewProject = useCallback(async (
        name: string,
        isPublic: boolean
    ): Promise<Project | null> => {
        try {
            const response = await createProject(name, isPublic ? 'public' : 'private');
            const newProject = transformProject(response.project);

            // Add to the beginning of the list
            setProjects((prev) => [newProject, ...prev]);

            return newProject;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create project';
            setError(message);
            console.error('Error creating project:', err);
            return null;
        }
    }, []);

    /**
     * Delete a project
     */
    const removeProject = useCallback(async (projectId: string): Promise<boolean> => {
        try {
            await deleteProject(projectId);

            // Remove from local state
            setProjects((prev) => prev.filter((p) => p.id !== projectId));

            // Remove from favorites if present
            setFavorites((prev) => {
                const next = new Set(prev);
                next.delete(projectId);
                return next;
            });

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete project';
            setError(message);
            console.error('Error deleting project:', err);
            return false;
        }
    }, []);

    /**
     * Toggle favorite status (client-side only)
     */
    const toggleFavorite = useCallback((projectId: string) => {
        setFavorites((prev) => {
            const next = new Set(prev);
            if (next.has(projectId)) {
                next.delete(projectId);
            } else {
                next.add(projectId);
            }
            return next;
        });

        setProjects((prev) =>
            prev.map((p) =>
                p.id === projectId ? { ...p, isFavorite: !p.isFavorite } : p
            )
        );
    }, []);

    /**
     * Update a project via API (name and/or privacy)
     */
    const updateProject = useCallback(async (
        projectId: string,
        updates: { name?: string; privacy?: 'public' | 'private' }
    ): Promise<boolean> => {
        try {
            const response = await updateProjectApi(projectId, updates);

            // Update local state with the response
            const updatedProject = transformProject(response.project);
            setProjects((prev) =>
                prev.map((p) =>
                    p.id === projectId ? { ...updatedProject, isFavorite: p.isFavorite } : p
                )
            );

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update project';
            setError(message);
            console.error('Error updating project:', err);
            return false;
        }
    }, []);

    return {
        projects,
        loading,
        error,
        hasMore,
        nextCursor,
        refetch,
        loadMore,
        createNewProject,
        removeProject,
        toggleFavorite,
        updateProject,
    };
}
