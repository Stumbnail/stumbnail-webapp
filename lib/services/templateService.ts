/**
 * Template Service - API functions for template management
 */

import { apiGet } from '../api';

/**
 * API Template type (matches API response)
 */
export interface ApiTemplate {
    id: string;
    title: string;
    imageURL: string;
    owner?: string;
    prompt?: string;
    description?: string;
    category?: string;
    tone?: string;
    type?: 'prompt' | 'prompt_based' | 'youtube_thumbnail';
    createdAt?: string;
    variables?: {
        id: string;
        label: string;
        type: 'text' | 'image';
        placeholder?: string;
        required: boolean;
        description?: string;
    }[] | null;
}

/**
 * Response types
 */
export interface TemplatesResponse {
    success: boolean;
    templates: ApiTemplate[];
    count: number;
    nextPageCursor: string | null;
    hasMore: boolean;
}

export interface TemplateResponse {
    success: boolean;
    template: ApiTemplate;
}

/**
 * Fetch all templates with optional pagination
 */
export async function getTemplates(
    pageSize: number = 20,
    pageCursor?: string
): Promise<TemplatesResponse> {
    return apiGet<TemplatesResponse>('/api/templates', {
        pageSize,
        pageCursor,
    });
}

/**
 * Get a specific template by ID
 */
export async function getTemplate(templateId: string): Promise<TemplateResponse> {
    return apiGet<TemplateResponse>(`/api/templates/${templateId}`);
}

