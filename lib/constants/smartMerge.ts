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

export type TextModeOption = 'ai' | 'custom';

export interface SmartMergeConfig {
    contentType: string;
    customContentDescription: string; // Exact user wording (no "custom" prefix)
    focusSubjectIndex: number | null; // null = auto-detect, -1 = balanced
    includeText: boolean; // Toggle: true = include text, false = no text
    textMode: TextModeOption; // When includeText=true: 'ai' or 'custom'
    videoTitle: string; // For AI text inference
    textContent: string; // For custom text
    textPlacement: TextPlacementOption['id'];
    textStyle: TextStyleOption['id'];
    textColor: string; // Any color (words like "red", hex "#FF0000", gradients, etc.)
    textFont: string; // Any font name or description
    emotionalTone: string | null; // null = inferred from contentType, or preset ID, or 'custom'
    customEmotionalTone: string; // Exact user phrase when emotionalTone='custom'
    customInstructions: string; // Custom instructions for composition/context
}

export interface ContentTypeDefaults {
    includeText: boolean;
    textMode: TextModeOption;
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
    { id: 'custom', label: 'Custom', icon: '' },
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
    gaming: { includeText: true, textMode: 'ai', textStyle: 'bold', emotionalTone: 'intense' },
    tech: { includeText: true, textMode: 'ai', textStyle: 'outlined', emotionalTone: 'professional' },
    vlog: { includeText: false, textMode: 'ai', textStyle: 'minimal', emotionalTone: 'friendly' },
    reaction: { includeText: true, textMode: 'ai', textStyle: 'bold', emotionalTone: 'shocking' },
    comedy: { includeText: true, textMode: 'ai', textStyle: 'bold', emotionalTone: 'fun' },
    educational: { includeText: true, textMode: 'ai', textStyle: 'outlined', emotionalTone: 'professional' },
    music: { includeText: false, textMode: 'ai', textStyle: 'shadow', emotionalTone: 'intense' },
    news: { includeText: true, textMode: 'ai', textStyle: 'bold', emotionalTone: 'professional' },
    custom: { includeText: false, textMode: 'ai', textStyle: 'minimal', emotionalTone: 'friendly' },
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
        customContentDescription: '',
        focusSubjectIndex: null, // auto-detect
        includeText: defaults.includeText,
        textMode: defaults.textMode,
        videoTitle: '',
        textContent: '',
        textPlacement: 'auto',
        textStyle: defaults.textStyle,
        textColor: '', // User enters any color/gradient
        textFont: '', // User enters any font name
        emotionalTone: null, // will use inferred default
        customEmotionalTone: '',
        customInstructions: '',
    };
}

// Get the effective content type label for prompts
// If custom, returns the user's description; otherwise returns the preset label
function getEffectiveContentType(config: SmartMergeConfig): string {
    if (config.contentType === 'custom' && config.customContentDescription.trim()) {
        return config.customContentDescription.trim();
    }
    const contentType = CONTENT_TYPES.find(ct => ct.id === config.contentType);
    return contentType?.label || 'professional';
}

// Get the effective emotional tone for prompts
// If custom, returns the user's phrase; otherwise returns the preset label
function getEffectiveEmotionalTone(config: SmartMergeConfig): string | null {
    if (config.emotionalTone === 'custom' && config.customEmotionalTone.trim()) {
        return config.customEmotionalTone.trim();
    }
    if (config.emotionalTone && config.emotionalTone !== 'custom') {
        const tone = EMOTIONAL_TONES.find(et => et.id === config.emotionalTone);
        return tone?.label.toLowerCase() || null;
    }
    // Use default from content type
    const defaults = getContentTypeDefaults(config.contentType);
    const defaultTone = EMOTIONAL_TONES.find(et => et.id === defaults.emotionalTone);
    return defaultTone?.label.toLowerCase() || null;
}

// Get the effective text color for prompts
function getEffectiveTextColor(config: SmartMergeConfig): string | null {
    if (!config.includeText) return null;
    if (!config.textColor || config.textColor.trim() === '') return null; // Let AI decide
    return config.textColor.trim();
}

// Get the effective text font for prompts
function getEffectiveTextFont(config: SmartMergeConfig): string | null {
    if (!config.includeText) return null;
    if (!config.textFont || config.textFont.trim() === '') return null; // Let AI decide
    return config.textFont.trim();
}

// Build a generation prompt from Smart Merge config
export function buildSmartMergePrompt(
    config: SmartMergeConfig,
    assetCount: number
): string {
    const effectiveContentType = getEffectiveContentType(config);
    const effectiveTone = getEffectiveEmotionalTone(config);
    const contentTypeInfo = CONTENT_TYPES.find(ct => ct.id === config.contentType);

    let prompt = `Create a high-quality YouTube thumbnail in ${effectiveContentType} style. `;

    // Add emotional tone
    if (effectiveTone) {
        const description = config.contentType !== 'custom'
            ? contentTypeInfo?.description || 'appealing visuals'
            : 'appealing visuals';
        prompt += `The mood should be ${effectiveTone}, with ${description}. `;
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
    if (!config.includeText) {
        prompt += `Do not include any text or characters in the thumbnail. `;
    } else {
        if (config.textMode === 'ai') {
            prompt += `Add impactful text that matches the ${effectiveContentType} style. `;
        } else if (config.textMode === 'custom' && config.textContent) {
            prompt += `Include the text "${config.textContent}" in the thumbnail. `;
        }

        // Add text placement
        if (config.textPlacement !== 'auto') {
            prompt += `Position the text at the ${config.textPlacement} of the image. `;
        }

        // Add text style
        prompt += `Use a ${config.textStyle} text style. `;

        // Add text color if specified
        const effectiveColor = getEffectiveTextColor(config);
        if (effectiveColor) {
            prompt += `The text color should be ${effectiveColor}. `;
        }

        // Add text font if specified
        const effectiveFont = getEffectiveTextFont(config);
        if (effectiveFont) {
            prompt += `Use ${effectiveFont} font. `;
        }
    }

    prompt += `Ensure the thumbnail is eye-catching, high resolution, and optimized for YouTube's 16:9 aspect ratio. `;
    prompt += `Do not include a YouTube logo unless explicitly requested.`;

    // Add custom instructions at the end (important context from user)
    if (config.customInstructions.trim()) {
        prompt += `\n\nAdditional instructions: ${config.customInstructions.trim()}`;
    }

    return prompt;
}
