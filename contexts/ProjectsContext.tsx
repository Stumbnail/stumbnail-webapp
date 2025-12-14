'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectsFirestore } from '@/hooks/useProjectsFirestore';
import { Project as FirestoreProject } from '@/lib/services/firestoreProjectService';
import {
    createProject,
    deleteProject,
    updateProject as updateProjectApi,
} from '@/lib/services/projectService';

/**
 * Frontend Project type (matches existing type definitions)
 */
export interface Project {
    id: string;
    name: string;
    previewImage: string | null;
    privacy: 'public' | 'private';
    thumbnailsCount: number;
    createdAt: string;
    updatedAt: string;
    isFavorite: boolean; // Client-side state
}

/**
 * Transform Firestore project to frontend Project type with favorites
 */
function transformProject(firestoreProject: FirestoreProject, favorites: Set<string>): Project {
    return {
        id: firestoreProject.id,
        name: firestoreProject.name,
        previewImage: firestoreProject.previewImage,
        privacy: firestoreProject.privacy,
        thumbnailsCount: firestoreProject.thumbnailsCount,
        createdAt: firestoreProject.createdAt,
        updatedAt: firestoreProject.updatedAt,
        isFavorite: favorites.has(firestoreProject.id),
    };
}

interface ProjectsContextValue {
    projects: Project[];
    loading: boolean;
    error: string | null;
    isStale: boolean; // true if showing cached data while loading fresh data
    cacheHit: boolean; // true if data was loaded from cache
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
    // Get authenticated user
    const { user } = useAuth();

    // Subscribe to Firestore projects (real-time with caching)
    const { projects: firestoreProjects, loading, error, isStale, cacheHit } = useProjectsFirestore(user);

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

    // Transform Firestore projects with favorites
    const projects = useMemo(() => {
        return firestoreProjects.map((p) => transformProject(p, favorites));
    }, [firestoreProjects, favorites]);

    const createNewProject = useCallback(async (
        name: string,
        isPublic: boolean
    ): Promise<Project | null> => {
        try {
            // API call creates the project in Firestore
            // Real-time listener will automatically pick it up
            const response = await createProject(name, isPublic ? 'public' : 'private');

            // Return a temporary project object for immediate UI update
            // The real-time listener will sync the actual data shortly
            return transformProject({
                id: response.project.id,
                ownerId: response.project.ownerId,
                ownerEmail: response.project.ownerEmail,
                name: response.project.name,
                privacy: response.project.privacy,
                viewport: response.project.viewport,
                thumbnailsCount: response.project.thumbnailsCount,
                previewImage: response.project.previewImage,
                createdAt: response.project.createdAt,
                updatedAt: response.project.updatedAt,
            }, favorites);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create project';
            console.error('Error creating project:', err);
            return null;
        }
    }, [favorites]);

    const removeProject = useCallback(async (projectId: string): Promise<boolean> => {
        try {
            // API call deletes the project from Firestore
            // Real-time listener will automatically remove it from the UI
            await deleteProject(projectId);

            // Remove from favorites
            setFavorites((prev) => {
                const next = new Set(prev);
                next.delete(projectId);
                return next;
            });
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete project';
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
        // The projects memo will automatically update when favorites changes
    }, []);

    const updateProject = useCallback(async (
        projectId: string,
        updates: { name?: string; privacy?: 'public' | 'private' }
    ): Promise<boolean> => {
        try {
            // API call updates the project in Firestore
            // Real-time listener will automatically sync the changes
            await updateProjectApi(projectId, updates);
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update project';
            console.error('Error updating project:', err);
            return false;
        }
    }, []);

    return (
        <ProjectsContext.Provider
            value={{
                projects,
                loading,
                error,
                isStale,
                cacheHit,
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
