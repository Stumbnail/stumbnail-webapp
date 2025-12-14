/**
 * Project Service - API functions for project management
 */

import { apiGet, apiPost, apiDelete, apiPatch } from '../api';

/**
 * API Project type (matches API response)
 */
export interface ApiProject {
    id: string;
    ownerId: string;
    ownerEmail: string;
    name: string;
    privacy: 'public' | 'private';
    viewport: {
        x: number;
        y: number;
        zoom: number;
    };
    thumbnailsCount: number;
    previewImage: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Response types
 */
export interface ProjectsResponse {
    success: boolean;
    projects: ApiProject[];
    nextPageCursor: string | null;
    hasMore: boolean;
}

export interface ProjectResponse {
    success: boolean;
    project: ApiProject;
}

export interface DeleteProjectResponse {
    success: boolean;
    message: string;
}

/**
 * Update project request body
 */
export interface UpdateProjectRequest {
    name?: string;
    privacy?: 'public' | 'private';
}

/**
 * List user's projects with optional pagination
 */
export async function getProjects(
    pageSize: number = 20,
    pageCursor?: string
): Promise<ProjectsResponse> {
    return apiGet<ProjectsResponse>('/api/projects', {
        pageSize,
        pageCursor,
    });
}

/**
 * Get a specific project by ID
 */
export async function getProject(projectId: string): Promise<ProjectResponse> {
    return apiGet<ProjectResponse>(`/api/projects/${projectId}`);
}

/**
 * Create a new project
 */
export async function createProject(
    name: string,
    privacy: 'public' | 'private' = 'private'
): Promise<ProjectResponse> {
    return apiPost<ProjectResponse>('/api/projects', {
        name,
        privacy,
    });
}

/**
 * Update a project (name and/or privacy)
 */
export async function updateProject(
    projectId: string,
    updates: UpdateProjectRequest
): Promise<ProjectResponse> {
    return apiPatch<ProjectResponse>(`/api/projects/${projectId}`, updates as Record<string, unknown>);
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<DeleteProjectResponse> {
    return apiDelete<DeleteProjectResponse>(`/api/projects/${projectId}`);
}

