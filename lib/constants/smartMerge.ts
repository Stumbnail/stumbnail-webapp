// Smart Merge Feature Constants
// Content types, emotional tones, text options, and default inference logic

export interface ContentTypeOption {
    id: string;
    label: string;
    icon: string;
    description: string;
}

export interface EmotionalToneOption {
    id: string;
    label: string;
    icon: string;
}

export interface TextPlacementOption {
    id: 'top' | 'center' | 'bottom' | 'auto';
    label: string;
}

export interface TextStyleOption {
    id: 'bold' | 'outlined' | 'shadow' | 'minimal' | '3d' | 'gradient' | 'neon' | 'grunge' | 'comic' | 'handwritten';
    label: string;
    description?: string;
}

export type TextIncludeOption = 'none' | 'ai' | 'custom';

export interface SmartMergeConfig {
    contentType: string;
    customContentDescription: string; // Used when contentType is 'custom'
    focusSubjectIndex: number | null; // null = auto-detect, -1 = balanced
    includeText: TextIncludeOption;
    videoTitle: string; // Used by AI to infer good thumbnail text
    textContent: string;
    textPlacement: TextPlacementOption['id'];
    textStyle: TextStyleOption['id'];
    emotionalTone: string | null; // null = inferred from contentType
}

export interface ContentTypeDefaults {
    includeText: TextIncludeOption;
    textStyle: TextStyleOption['id'];
    emotionalTone: string;
}

// Content Type Options
export const CONTENT_TYPES: ContentTypeOption[] = [
    { id: 'gaming', label: 'Gaming', icon: '', description: 'Bold colors, action poses, dramatic lighting' },
    { id: 'tech', label: 'Tech', icon: '', description: 'Clean layouts, professional, modern' },
    { id: 'vlog', label: 'Vlog', icon: '', description: 'Warm tones, personal, centered' },
    { id: 'reaction', label: 'Reaction', icon: '', description: 'Exaggerated expressions, split layouts' },
    { id: 'comedy', label: 'Comedy', icon: '', description: 'Bright, playful, dynamic' },
    { id: 'educational', label: 'Educational', icon: '', description: 'Clean, authoritative, structured' },
    { id: 'music', label: 'Music', icon: '', description: 'Vibrant, artistic, stylized' },
    { id: 'news', label: 'News', icon: '', description: 'Serious, professional, headline-ready' },
    { id: 'custom', label: 'Custom', icon: '', description: 'Describe your own style' },
];

// Emotional Tone Options
export const EMOTIONAL_TONES: EmotionalToneOption[] = [
    { id: 'intense', label: 'Intense', icon: '' },
    { id: 'friendly', label: 'Friendly', icon: '' },
    { id: 'curiosity', label: 'Curiosity', icon: '' },
    { id: 'shocking', label: 'Shocking', icon: '' },
    { id: 'professional', label: 'Professional', icon: '' },
    { id: 'fun', label: 'Fun', icon: '' },
];

// Text Placement Options
export const TEXT_PLACEMENTS: TextPlacementOption[] = [
    { id: 'top', label: 'Top' },
    { id: 'center', label: 'Center' },
    { id: 'bottom', label: 'Bottom' },
    { id: 'auto', label: 'Auto' },
];

// Text Style Options
export const TEXT_STYLES: TextStyleOption[] = [
    { id: 'bold', label: 'Bold', description: 'Thick, impactful lettering' },
    { id: '3d', label: '3D', description: 'Extruded text with depth' },
    { id: 'gradient', label: 'Gradient', description: 'Color-shifting fills' },
    { id: 'neon', label: 'Neon', description: 'Glowing light effects' },
    { id: 'outlined', label: 'Outlined', description: 'Clean stroke borders' },
    { id: 'shadow', label: 'Shadow', description: 'Drop shadow emphasis' },
    { id: 'grunge', label: 'Grunge', description: 'Distressed texture' },
    { id: 'comic', label: 'Comic', description: 'Action comic style' },
    { id: 'handwritten', label: 'Handwritten', description: 'Casual script look' },
    { id: 'minimal', label: 'Minimal', description: 'Clean and simple' },
];

// Default configurations per content type
export const CONTENT_TYPE_DEFAULTS: Record<string, ContentTypeDefaults> = {
    gaming: { includeText: 'ai', textStyle: 'bold', emotionalTone: 'intense' },
    tech: { includeText: 'ai', textStyle: 'outlined', emotionalTone: 'professional' },
    vlog: { includeText: 'none', textStyle: 'minimal', emotionalTone: 'friendly' },
    reaction: { includeText: 'ai', textStyle: 'bold', emotionalTone: 'shocking' },
    comedy: { includeText: 'ai', textStyle: 'bold', emotionalTone: 'fun' },
    educational: { includeText: 'ai', textStyle: 'outlined', emotionalTone: 'professional' },
    music: { includeText: 'none', textStyle: 'shadow', emotionalTone: 'intense' },
    news: { includeText: 'ai', textStyle: 'bold', emotionalTone: 'professional' },
    custom: { includeText: 'none', textStyle: 'minimal', emotionalTone: 'friendly' },
};

// Get defaults for a content type
export function getContentTypeDefaults(contentTypeId: string): ContentTypeDefaults {
    return CONTENT_TYPE_DEFAULTS[contentTypeId] || CONTENT_TYPE_DEFAULTS.custom;
}

// Create initial Smart Merge config with defaults
export function createDefaultSmartMergeConfig(contentType: string = 'gaming'): SmartMergeConfig {
    const defaults = getContentTypeDefaults(contentType);
    return {
        contentType,
        customContentDescription: '', // For custom content type
        focusSubjectIndex: null, // auto-detect
        includeText: defaults.includeText,
        videoTitle: '', // For AI text inference
        textContent: '',
        textPlacement: 'auto',
        textStyle: defaults.textStyle,
        emotionalTone: null, // will use inferred default
    };
}

// Build a generation prompt from Smart Merge config
export function buildSmartMergePrompt(
    config: SmartMergeConfig,
    assetCount: number
): string {
    const contentType = CONTENT_TYPES.find(ct => ct.id === config.contentType);
    const emotionalTone = config.emotionalTone
        ? EMOTIONAL_TONES.find(et => et.id === config.emotionalTone)
        : EMOTIONAL_TONES.find(et => et.id === getContentTypeDefaults(config.contentType).emotionalTone);

    let prompt = `Create a high-quality YouTube thumbnail in ${contentType?.label || 'professional'} style. `;

    // Add emotional tone
    if (emotionalTone) {
        prompt += `The mood should be ${emotionalTone.label.toLowerCase()}, with ${contentType?.description || 'appealing visuals'}. `;
    }

    // Add focus subject instruction
    if (config.focusSubjectIndex === -1) {
        prompt += `Create a balanced composition using all ${assetCount} reference images equally. `;
    } else if (config.focusSubjectIndex !== null && config.focusSubjectIndex >= 0) {
        prompt += `Make image ${config.focusSubjectIndex + 1} the primary focus, with other elements supporting the composition. `;
    } else {
        prompt += `Use the reference images to compose a compelling thumbnail. `;
    }

    // Add text instructions
    if (config.includeText === 'none') {
        prompt += `Do not include any text in the thumbnail. `;
    } else if (config.includeText === 'ai') {
        prompt += `Add impactful text that matches the ${contentType?.label || 'content'} style. `;
        if (config.textPlacement !== 'auto') {
            prompt += `Position the text at the ${config.textPlacement} of the image. `;
        }
        prompt += `Use a ${config.textStyle} text style. `;
    } else if (config.includeText === 'custom' && config.textContent) {
        prompt += `Include the text "${config.textContent}" in the thumbnail. `;
        if (config.textPlacement !== 'auto') {
            prompt += `Position it at the ${config.textPlacement}. `;
        }
        prompt += `Use a ${config.textStyle} text style. `;
    }

    prompt += `Ensure the thumbnail is eye-catching, high resolution, and optimized for YouTube's 16:9 aspect ratio.`;

    return prompt;
}
