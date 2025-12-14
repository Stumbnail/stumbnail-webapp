import { Model } from '@/types';

// Common aspect ratios
export const COMMON_ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16', '21:9'];
export const EXTENDED_ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];

// Default model for thumbnail generation
export const DEFAULT_MODEL: Model = {
    id: 'nano-banana-pro',
    name: 'Nano Banana',
    description: '2K and 4K resolution output with text placement',
    featureTag: 'Text Placement',
    credits: 19,  // Base credits (2K), 4K is 38
    logo: '/assets/dashboard/icons/nano-banana-model.webp',
    maxImages: 14,
    hasResolutionOptions: true,
    baseModel: 'nano-banana-pro',
    resolution: '2K',
    defaultAspectRatio: '16:9',
    defaultResolution: '2K',
    options: {
        aspectRatios: [...EXTENDED_ASPECT_RATIOS, 'match_input_image'],
        resolutions: ['1K', '2K', '4K'],
        outputFormats: ['jpg', 'png']
    }
};

// Available models for thumbnail generation
export const AVAILABLE_MODELS: Model[] = [
    {
        id: 'nano-banana',
        name: 'Nano Banana',
        description: 'Artistic style thumbnail generation',
        featureTag: 'Artistic',
        credits: 10,
        logo: '/assets/dashboard/icons/nano-banana-model.webp',
        maxImages: 10,
        defaultAspectRatio: '16:9',
        options: {
            aspectRatios: EXTENDED_ASPECT_RATIOS,
            outputFormats: ['jpg', 'png']
        }
    },
    DEFAULT_MODEL,
    {
        id: 'seedream-4',
        name: 'Seedream 4',
        description: 'Character reference support and text rendering',
        featureTag: 'Character Reference',
        credits: 8,
        logo: '/assets/dashboard/icons/seedream-4-model.webp',
        maxImages: 10,
        isSecondary: true,
        defaultAspectRatio: '16:9',
        defaultSize: '4K',
        options: {
            aspectRatios: EXTENDED_ASPECT_RATIOS,
            sizes: ['1K', '2K', '4K']
        }
    },
    {
        id: 'flux-2-pro',
        name: 'Flux 2',
        description: 'Latest model with premium quality',
        featureTag: 'High Quality Designs',
        credits: 7,
        logo: '/assets/dashboard/icons/flux-2-model.svg',
        maxImages: 8,
        isPro: true,
        isSecondary: true,
        defaultAspectRatio: '16:9',
        defaultMegapixels: '1 MP',
        options: {
            aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '21:9', '9:21'],
            megapixels: ['0.25 MP', '0.5 MP', '1 MP', '2 MP', '4 MP'],
            outputFormats: ['jpg', 'png', 'webp']
        }
    }
];
