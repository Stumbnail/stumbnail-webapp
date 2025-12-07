import { Model } from '@/types';

// Default model for thumbnail generation
export const DEFAULT_MODEL: Model = {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    description: 'Artistic style with custom text placement',
    featureTag: 'Text Placement',
    credits: 10,
    logo: '/assets/dashboard/icons/nano-banana-model.webp'
};

// Available models for thumbnail generation
export const AVAILABLE_MODELS: Model[] = [
    DEFAULT_MODEL,
    // Add more models as they become available
];
