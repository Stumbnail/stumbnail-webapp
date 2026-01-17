'use client';

import { useState, useEffect, useCallback } from 'react';
import { Template } from '@/types';
import { getTemplates, ApiTemplate } from '@/lib/services/templateService';

/**
 * Transform API template to frontend Template type
 */
function transformTemplate(apiTemplate: ApiTemplate): Template {
    return {
        id: apiTemplate.id,
        title: apiTemplate.title,
        description: apiTemplate.description || 'Generate instantly with AI',
        image: apiTemplate.imageURL,
        prompt: apiTemplate.prompt,
        type: apiTemplate.type,
        category: apiTemplate.category,
        tone: apiTemplate.tone,
        variables: apiTemplate.variables || undefined,
    };
}

interface UseTemplatesReturn {
    templates: Template[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Hook for fetching templates from API
 */
export function useTemplates(): UseTemplatesReturn {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await getTemplates();
            const transformedTemplates = response.templates.map(transformTemplate);
            setTemplates(transformedTemplates);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch templates';
            setError(message);
            console.error('Error fetching templates:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    return {
        templates,
        loading,
        error,
        refetch: fetchTemplates,
    };
}
