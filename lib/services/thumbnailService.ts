/**
 * Thumbnail Service - API functions for thumbnail/canvas management
 */

import { apiGet, apiPost, apiPatch, apiDelete } from '../api';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

/**
 * Reference image for generation
 */
export interface RefImage {
    type: 'youtube' | 'upload' | 'url';
    youtubeVideoId?: string;
    youtubeUrl?: string;
    storageUrl?: string;
    previewUrl: string;
}

/**
 * API Thumbnail type (matches API response)
 */
export interface ApiThumbnail {
    id: string;
    projectId: string;
    ownerId: string;
    thumbnailUrl: string;
    type: 'generated' | 'youtube-thumbnail' | 'uploaded';
    status: 'generating' | 'complete' | 'failed';
    x: number;
    y: number;
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
    aspectRatio: number;
    prompt: string | null;
    systemRefinedPrompt?: string | null;
    model: string | null;
    style: string | null;
    refImages: RefImage[];
    likesCount: number;
    likedBy?: string[];
    isPublic?: boolean;
    createdAt: string;
    updatedAt: string;
}

/**
 * Viewport state
 */
export interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

// ═══════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════

export interface ThumbnailsResponse {
    success: boolean;
    thumbnails: ApiThumbnail[];
    count: number;
}

export interface ThumbnailResponse {
    success: boolean;
    thumbnail: ApiThumbnail;
}

export interface ViewportResponse {
    success: boolean;
    viewport: Viewport;
}

export interface GenerateThumbnailResponse {
    success: boolean;
    image: string;
    projectId: string;
    isNewProject: boolean;
    thumbnail: ApiThumbnail;
    metadata: {
        id: string;
        userId: string;
        createdAt: string;
        category?: string;
        publicFlag: boolean;
    };
}

export interface EnhancePromptResponse {
    success: boolean;
    prompt: string;
}

// ═══════════════════════════════════════════════════════
// REQUEST TYPES
// ═══════════════════════════════════════════════════════

export interface AddThumbnailRequest {
    thumbnailUrl: string;
    type: 'uploaded' | 'youtube-thumbnail';
    x: number;
    y: number;
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
    prompt?: string | null;
    youtubeVideoId?: string;
}

export interface UpdateThumbnailRequest {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

export interface GenerateThumbnailRequest {
    userEmail: string;
    userName?: string;
    prompt: string;
    projectId?: string;  // Optional - auto-creates project if not provided
    gen_model?: string;
    aspectRatio?: string;
    imageInput?: string | string[];
    // Canvas positioning
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    // Model-specific params
    size?: string;
    resolution?: string;
    outputFormat?: string;
    outputQuality?: number;
    safetyTolerance?: number;
    safetyFilterLevel?: string;
    seed?: number;
}

export interface UploadThumbnailRequest {
    imageData: string;  // base64 or URL
    x: number;
    y: number;
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
    fileName?: string;
}

// Model-specific image limits
export const MODEL_IMAGE_LIMITS: Record<string, number> = {
    'nano-banana': 10,
    'nano-banana-pro': 14,
    'flux-2-pro': 8,
    'seedream-4': 10,
};

// ═══════════════════════════════════════════════════════
// THUMBNAIL CRUD FUNCTIONS
// ═══════════════════════════════════════════════════════

/**
 * List all thumbnails in a project
 */
export async function getProjectThumbnails(projectId: string): Promise<ThumbnailsResponse> {
    return apiGet<ThumbnailsResponse>(`/api/projects/${projectId}/thumbnails`);
}

/**
 * Get a specific thumbnail
 */
export async function getThumbnail(projectId: string, thumbnailId: string): Promise<ThumbnailResponse> {
    return apiGet<ThumbnailResponse>(`/api/projects/${projectId}/thumbnails/${thumbnailId}`);
}

/**
 * Add a thumbnail to a project (for uploads/YouTube thumbnails)
 */
export async function addThumbnail(projectId: string, thumbnail: AddThumbnailRequest): Promise<ThumbnailResponse> {
    return apiPost<ThumbnailResponse>(`/api/projects/${projectId}/thumbnails`, thumbnail as unknown as Record<string, unknown>);
}

/**
 * Update thumbnail position/size
 */
export async function updateThumbnail(
    projectId: string,
    thumbnailId: string,
    updates: UpdateThumbnailRequest
): Promise<ThumbnailResponse> {
    return apiPatch<ThumbnailResponse>(
        `/api/projects/${projectId}/thumbnails/${thumbnailId}`,
        updates as Record<string, unknown>
    );
}

/**
 * Delete a thumbnail from a project
 */
export async function deleteThumbnail(projectId: string, thumbnailId: string): Promise<{ success: boolean }> {
    return apiDelete<{ success: boolean }>(`/api/projects/${projectId}/thumbnails/${thumbnailId}`);
}

/**
 * Upload an image to a project (registers with backend)
 */
export async function uploadThumbnail(
    projectId: string,
    request: UploadThumbnailRequest
): Promise<ThumbnailResponse> {
    return apiPost<ThumbnailResponse>(
        `/api/projects/${projectId}/thumbnails/upload`,
        request as unknown as Record<string, unknown>
    );
}

// ═══════════════════════════════════════════════════════
// VIEWPORT FUNCTIONS
// ═══════════════════════════════════════════════════════

/**
 * Update project viewport (canvas pan/zoom state)
 */
export async function updateViewport(
    projectId: string,
    viewport: Partial<Viewport>
): Promise<ViewportResponse> {
    return apiPatch<ViewportResponse>(
        `/api/projects/${projectId}/viewport`,
        viewport as Record<string, unknown>
    );
}

// ═══════════════════════════════════════════════════════
// GENERATION FUNCTIONS
// ═══════════════════════════════════════════════════════

/**
 * Enhance/refine a prompt using AI
 */
export async function enhancePrompt(prompt: string): Promise<EnhancePromptResponse> {
    return apiPost<EnhancePromptResponse>('/api/thumbnail/enhancePrompt', { prompt });
}

/**
 * Generate a thumbnail using AI
 */
export async function generateThumbnail(request: GenerateThumbnailRequest): Promise<GenerateThumbnailResponse> {
    return apiPost<GenerateThumbnailResponse>('/api/thumbnail/generateThumbnail', request as unknown as Record<string, unknown>);
}

// ═══════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════

/**
 * Update multiple thumbnails' positions (for group drag)
 */
export async function updateThumbnailPositions(
    projectId: string,
    updates: { id: string; x: number; y: number; width?: number; height?: number }[]
): Promise<{ success: boolean }> {
    // For now, update one by one - could be optimized with a batch endpoint
    await Promise.all(
        updates.map(({ id, ...position }) =>
            updateThumbnail(projectId, id, position)
        )
    );
    return { success: true };
}
