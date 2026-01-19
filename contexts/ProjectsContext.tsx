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
import { toggleProjectFavorite } from '@/lib/services/firestoreProjectService';

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
    isFavorite: boolean;
}

/**
 * Transform Firestore project to frontend Project type with favorites
 */


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
    // Get authenticated user - DO NOT redirect to login from here
    // Individual pages handle their own auth redirects as needed
    const { user } = useAuth(false);

    // Subscribe to Firestore projects (real-time with caching)
    const { projects: firestoreProjects, loading, error, isStale, cacheHit } = useProjectsFirestore(user);

    // Track optimistically deleted projects (for instant UI removal)
    const [deletedProjectIds, setDeletedProjectIds] = React.useState<Set<string>>(new Set());

    // Filter out optimistically deleted projects for instant UI feedback
    const projects = useMemo(() =>
        firestoreProjects.filter(p => !deletedProjectIds.has(p.id)),
        [firestoreProjects, deletedProjectIds]
    );

    // Clean up deletedProjectIds when Firestore syncs (project actually removed)
    React.useEffect(() => {
        if (deletedProjectIds.size === 0) return;

        const firestoreIds = new Set(firestoreProjects.map(p => p.id));
        const idsToClean = [...deletedProjectIds].filter(id => !firestoreIds.has(id));

        if (idsToClean.length > 0) {
            setDeletedProjectIds(prev => {
                const next = new Set(prev);
                idsToClean.forEach(id => next.delete(id));
                return next;
            });
        }
    }, [firestoreProjects, deletedProjectIds]);

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
            return {
                id: response.project.id,
                name: response.project.name,
                previewImage: response.project.previewImage,
                privacy: response.project.privacy,
                thumbnailsCount: response.project.thumbnailsCount,
                createdAt: response.project.createdAt,
                updatedAt: response.project.updatedAt,
                isFavorite: false,
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create project';
            console.error('Error creating project:', err);
            return null;
        }
    }, []);

    const removeProject = useCallback(async (projectId: string): Promise<boolean> => {
        // Optimistically remove from UI immediately
        setDeletedProjectIds(prev => new Set(prev).add(projectId));

        try {
            // API call deletes the project from Firestore
            await deleteProject(projectId);
            return true;
        } catch (err) {
            // Rollback: restore the project in UI if deletion failed
            setDeletedProjectIds(prev => {
                const next = new Set(prev);
                next.delete(projectId);
                return next;
            });
            const message = err instanceof Error ? err.message : 'Failed to delete project';
            console.error('Error deleting project:', err);
            return false;
        }
    }, []);

    const toggleFavorite = useCallback(async (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        try {
            await toggleProjectFavorite(projectId, !project.isFavorite);
        } catch (err) {
            console.error('Error toggling favorite:', err);
        }
    }, [projects]);

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
