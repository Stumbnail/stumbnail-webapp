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

/**
 * Generation job start response (returns immediately with jobId)
 */
export interface GenerateJobStartResponse {
    success: boolean;
    jobId: string;
    message: string;
    pollUrl: string;
}

/**
 * Final generate thumbnail result (from job completion)
 */
export interface GenerateThumbnailResponse {
    success: boolean;
    image: string;
    projectId: string;
    isNewProject: boolean;
    thumbnail: ApiThumbnail;
    thumbnailId?: string;
    metadata?: {
        id: string;
        userId: string;
        createdAt: string;
        category?: string;
        publicFlag: boolean;
    };
    timing?: {
        totalMs: number;
    };
}

export interface EnhancePromptResponse {
    success: boolean;
    prompt: string;
}

/**
 * Smart Merge text suggestion from AI
 */
export interface SmartMergeTextSuggestion {
    text: string;
    reasoning: string;
}

/**
 * Smart Merge thumbnail text from AI
 */
export interface SmartMergeThumbnailText {
    content: string;
    placement: 'top' | 'center' | 'bottom' | 'auto';
    style: 'bold' | 'outlined' | 'shadow' | 'minimal' | '3d' | 'gradient' | 'neon' | 'grunge' | 'comic' | 'handwritten';
}

/**
 * Smart Merge intelligence response
 */
export interface SmartMergeIntelligence {
    usedFallback: boolean;
    inferredGenre: string;
    textSuggestions?: SmartMergeTextSuggestion[];
    thumbnailText?: SmartMergeThumbnailText | null;
}

/**
 * Smart Merge job start response (returns immediately with jobId)
 */
export interface SmartMergeStartResponse {
    success: boolean;
    jobId: string;
    message: string;
    pollUrl: string;
}

/**
 * Job status response from polling endpoint
 */
export interface JobStatusResponse {
    success: boolean;
    jobId?: string;
    id?: string;  // API returns 'id' not 'jobId'
    statusCode: 'QUEUED' | 'ANALYZING' | 'ENHANCING' | 'GENERATING' | 'UPLOADING' | 'COMPLETE' | 'FAILED';
    status: string;  // Human-readable status message
    progress: number;  // 0-100
    isComplete: boolean;
    isFailed: boolean;
    error?: string;
    errorDetails?: {
        code?: string;
        suggestion?: string;
        originalError?: string;
    };
    // Result can be either SmartMerge or regular generation result
    result?: SmartMergeResponse | GenerateThumbnailResponse | null;
}

/**
 * Smart Merge API response (final result from job completion)
 */
export interface SmartMergeResponse {
    success: boolean;
    status: string;
    image: string;
    projectId: string;
    thumbnail: ApiThumbnail & {
        smartMergeConfig?: {
            content_type: string;
            inferredGenre: string;
            textSuggestions?: SmartMergeTextSuggestion[];
        };
    };
    intelligence: SmartMergeIntelligence;
    timing?: {
        totalMs: number;
    };
}

/**
 * Smart Merge config from API
 */
export interface SmartMergeConfigResponse {
    success: boolean;
    config: {
        content_types: { id: string; label: string; icon: string }[];
        text_options: { id: string; label: string }[];
        text_placements: { id: string; label: string }[];
        text_styles: { id: string; label: string }[];
        emotional_tones: { id: string; label: string; icon: string }[];
        credit_cost: number;
        max_reference_images: number;
    };
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
    // Editing parameters
    type?: 'generate' | 'edit';
    enable_intelligence?: boolean;
    refImages?: Array<{
        type: 'generated' | 'uploaded' | 'youtube';
        thumbnailId: string;
        url: string;
    }>;
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
    // Optional hints for intelligence layer
    category?: string;  // gaming, tech, vlog, etc.
    tone?: string;      // intense, calm, professional, fun
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

/**
 * Smart Merge request config
 */
export interface SmartMergeConfig {
    content_type: string;
    custom_content_description?: string;
    focus_subject_index: number | null;
    include_text: 'none' | 'ai' | 'custom';
    video_title?: string;
    text_content?: string;
    text_placement: 'top' | 'center' | 'bottom' | 'auto';
    text_style: 'bold' | 'outlined' | 'shadow' | 'minimal' | '3d' | 'gradient' | 'neon' | 'grunge' | 'comic' | 'handwritten';
    emotional_tone?: string;
}

/**
 * Smart Merge request
 */
export interface SmartMergeRequest {
    project_id: string;
    config: SmartMergeConfig;
    reference_images: string[];
    aspect_ratio?: string;
    resolution?: string;
    model?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
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
 * Start a thumbnail generation job (returns immediately with jobId for polling)
 */
export async function startGenerationJob(request: GenerateThumbnailRequest): Promise<GenerateJobStartResponse> {
    return apiPost<GenerateJobStartResponse>('/api/thumbnail/generateThumbnail', request as unknown as Record<string, unknown>);
}

/**
 * Poll a generation job until completion with progress callbacks
 * @param jobId - The job ID to poll
 * @param onProgress - Callback for progress updates (status message, progress percentage)
 * @param pollInterval - Polling interval in milliseconds (default 2000ms)
 * @returns The final GenerateThumbnailResponse on success
 */
export async function pollGenerationJob(
    jobId: string,
    onProgress?: (status: string, progress: number) => void,
    pollInterval: number = 2000
): Promise<{ success: true; result: GenerateThumbnailResponse } | { success: false; error: string; suggestion?: string; code?: string }> {
    while (true) {
        const statusResponse = await pollJobStatus(jobId);

        // Update progress
        if (onProgress) {
            onProgress(statusResponse.status, statusResponse.progress);
        }

        // Check for completion
        if (statusResponse.isComplete && statusResponse.result) {
            return { success: true, result: statusResponse.result as GenerateThumbnailResponse };
        }

        // Handle failure
        if (statusResponse.isFailed) {
            return {
                success: false,
                error: statusResponse.error || 'Generation failed',
                suggestion: statusResponse.errorDetails?.suggestion,
                code: statusResponse.errorDetails?.code,
            };
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
}

/**
 * Generate a thumbnail using AI with built-in job polling
 * @deprecated Use startGenerationJob + pollGenerationJob for progress tracking
 */
export async function generateThumbnail(request: GenerateThumbnailRequest): Promise<GenerateThumbnailResponse> {
    // Start the job
    const startResponse = await startGenerationJob(request);
    if (!startResponse.success) {
        throw new Error('Failed to start generation job');
    }

    // Poll until completion (no progress callback for legacy usage)
    const result = await pollGenerationJob(startResponse.jobId);
    if (result.success) {
        return result.result;
    } else {
        throw new Error(result.error);
    }
}

/**
 * Start a Smart Merge job (returns immediately with jobId for polling)
 */
export async function startSmartMergeJob(request: SmartMergeRequest): Promise<SmartMergeStartResponse> {
    return apiPost<SmartMergeStartResponse>('/api/smart-merge', request as unknown as Record<string, unknown>);
}

/**
 * Poll job status
 */
export async function pollJobStatus(jobId: string): Promise<JobStatusResponse> {
    return apiGet<JobStatusResponse>(`/api/jobs/${jobId}/status`);
}

/**
 * Poll a Smart Merge job until completion with progress callbacks
 * @param jobId - The job ID to poll
 * @param onProgress - Callback for progress updates (status message, progress percentage)
 * @param pollInterval - Polling interval in milliseconds (default 2000ms)
 * @returns The final SmartMergeResponse on success
 */
export async function pollSmartMergeJob(
    jobId: string,
    onProgress?: (status: string, progress: number) => void,
    pollInterval: number = 2000
): Promise<{ success: true; result: SmartMergeResponse } | { success: false; error: string; suggestion?: string; code?: string }> {
    while (true) {
        const statusResponse = await pollJobStatus(jobId);

        // Update progress
        if (onProgress) {
            onProgress(statusResponse.status, statusResponse.progress);
        }

        // Check for completion
        if (statusResponse.isComplete && statusResponse.result) {
            return { success: true, result: statusResponse.result as SmartMergeResponse };
        }

        // Handle failure
        if (statusResponse.isFailed) {
            return {
                success: false,
                error: statusResponse.error || 'Generation failed',
                suggestion: statusResponse.errorDetails?.suggestion,
                code: statusResponse.errorDetails?.code,
            };
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
}

/**
 * Generate a thumbnail using Smart Merge (AI intelligence layer)
 * @deprecated Use startSmartMergeJob + pollSmartMergeJob for progress tracking
 */
export async function smartMergeThumbnail(request: SmartMergeRequest): Promise<SmartMergeResponse> {
    // Start the job
    const startResponse = await startSmartMergeJob(request);
    if (!startResponse.success) {
        throw new Error('Failed to start Smart Merge job');
    }

    // Poll until completion (no progress callback for legacy usage)
    const result = await pollSmartMergeJob(startResponse.jobId);
    if (result.success) {
        return result.result;
    } else {
        throw new Error(result.error);
    }
}

/**
 * Get Smart Merge configuration options
 */
export async function getSmartMergeConfig(): Promise<SmartMergeConfigResponse> {
    return apiGet<SmartMergeConfigResponse>('/api/smart-merge/config');
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

// ═══════════════════════════════════════════════════════
// COMMUNITY FEED FUNCTIONS
// ═══════════════════════════════════════════════════════

/**
 * Community feed thumbnail (simplified for display)
 */
export interface CommunityFeedThumbnail {
    id: string;
    projectId: string;
    thumbnailUrl: string;
    prompt: string | null;
    model: string | null;
    ownerName: string;
    ownerAvatar: string | null;
    likesCount: number;
    isLiked: boolean;
    createdAt: string;
}

/**
 * Community feed response
 */
export interface CommunityFeedResponse {
    success: boolean;
    thumbnails: CommunityFeedThumbnail[];
    nextCursor: string | null;
    hasMore: boolean;
}

/**
 * Get community feed thumbnails with pagination and sorting
 */
export async function getCommunityFeed(
    limit: number = 24,
    cursor?: string,
    sort: 'recent' | 'trending' | 'popular' = 'recent'
): Promise<CommunityFeedResponse> {
    return apiGet<CommunityFeedResponse>('/api/thumbnail/feed', {
        limit,
        cursor,
        sort,
    });
}

/**
 * Like or unlike a thumbnail
 */
export interface LikeThumbnailResponse {
    success: boolean;
    likesCount: number;
    isLiked: boolean;
}

export async function likeThumbnail(
    projectId: string,
    thumbnailId: string
): Promise<LikeThumbnailResponse> {
    return apiPost<LikeThumbnailResponse>(
        `/api/projects/${projectId}/thumbnails/${thumbnailId}/like`
    );
}

/**
 * Track when a thumbnail is downloaded/exported
 */
export async function trackThumbnailDownload(
    projectId: string,
    thumbnailId: string
): Promise<{ success: boolean }> {
    return apiPost<{ success: boolean }>(
        `/api/projects/${projectId}/thumbnails/${thumbnailId}/download`
    );
}

