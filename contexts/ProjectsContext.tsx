'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Project } from '@/types';
import {
    getProjects,
    createProject,
    deleteProject,
    updateProject as updateProjectApi,
    ApiProject,
    ProjectsResponse,
} from '@/lib/services/projectService';

/**
 * Transform API project to frontend Project type
 */
function transformProject(apiProject: ApiProject, favorites: Set<string>): Project {
    return {
        id: apiProject.id,
        name: apiProject.name,
        previewImage: apiProject.previewImage,
        privacy: apiProject.privacy,
        thumbnailsCount: apiProject.thumbnailsCount,
        createdAt: apiProject.createdAt,
        updatedAt: apiProject.updatedAt,
        isFavorite: favorites.has(apiProject.id),
    };
}

interface ProjectsContextValue {
    projects: Project[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
    hasFetched: boolean;
    refetch: () => Promise<void>;
    loadMore: () => Promise<void>;
    createNewProject: (name: string, isPublic: boolean) => Promise<Project | null>;
    removeProject: (projectId: string) => Promise<boolean>;
    toggleFavorite: (projectId: string) => void;
    updateProject: (projectId: string, updates: { name?: string; privacy?: 'public' | 'private' }) => Promise<boolean>;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

interface ProjectsProviderProps {
    children: ReactNode;
}

export function ProjectsProvider({ children }: ProjectsProviderProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    // Track favorites in localStorage
    const [favorites, setFavorites] = useState<Set<string>>(() => {
        if (typeof window === 'undefined') return new Set();
        try {
            const stored = localStorage.getItem('project_favorites');
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch {
            return new Set();
        }
    });

    // Save favorites to localStorage
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('project_favorites', JSON.stringify([...favorites]));
        } catch {
            // Ignore
        }
    }, [favorites]);

    // Fetch projects
    const fetchProjects = useCallback(async (cursor?: string) => {
        setLoading(true);
        setError(null);

        try {
            const response: ProjectsResponse = await getProjects(20, cursor);

            const transformedProjects = response.projects.map((p) =>
                transformProject(p, favorites)
            );

            if (cursor) {
                setProjects((prev) => [...prev, ...transformedProjects]);
            } else {
                setProjects(transformedProjects);
            }

            setHasMore(response.hasMore);
            setNextCursor(response.nextPageCursor);
            setHasFetched(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch projects';
            setError(message);
            console.error('Error fetching projects:', err);
        } finally {
            setLoading(false);
        }
    }, [favorites]);

    // Initial fetch - only once
    useEffect(() => {
        if (!hasFetched) {
            fetchProjects();
        }
    }, [hasFetched, fetchProjects]);

    const refetch = useCallback(async () => {
        await fetchProjects();
    }, [fetchProjects]);

    const loadMore = useCallback(async () => {
        if (!hasMore || !nextCursor || loading) return;
        await fetchProjects(nextCursor);
    }, [hasMore, nextCursor, loading, fetchProjects]);

    const createNewProject = useCallback(async (
        name: string,
        isPublic: boolean
    ): Promise<Project | null> => {
        try {
            const response = await createProject(name, isPublic ? 'public' : 'private');
            const newProject = transformProject(response.project, favorites);
            setProjects((prev) => [newProject, ...prev]);
            return newProject;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create project';
            setError(message);
            console.error('Error creating project:', err);
            return null;
        }
    }, [favorites]);

    const removeProject = useCallback(async (projectId: string): Promise<boolean> => {
        try {
            await deleteProject(projectId);
            setProjects((prev) => prev.filter((p) => p.id !== projectId));
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

    const updateProject = useCallback(async (
        projectId: string,
        updates: { name?: string; privacy?: 'public' | 'private' }
    ): Promise<boolean> => {
        try {
            const response = await updateProjectApi(projectId, updates);
            const updatedProject = transformProject(response.project, favorites);
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
    }, [favorites]);

    return (
        <ProjectsContext.Provider
            value={{
                projects,
                loading,
                error,
                hasMore,
                hasFetched,
                refetch,
                loadMore,
                createNewProject,
                removeProject,
                toggleFavorite,
                updateProject,
            }}
        >
            {children}
        </ProjectsContext.Provider>
    );
}

/**
 * Hook to use projects context - must be used within ProjectsProvider
 */
export function useProjectsContext(): ProjectsContextValue {
    const context = useContext(ProjectsContext);
    if (!context) {
        throw new Error('useProjectsContext must be used within a ProjectsProvider');
    }
    return context;
}
