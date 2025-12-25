// Centralized type definitions for the Stumbnail webapp

import { User } from 'firebase/auth';

// Navigation types
export interface NavItem {
    id: string;
    label: string;
    icon: string;
    active: boolean;
}

// Project types (matches API response)
export interface Project {
    id: string;
    name: string;
    previewImage: string | null;
    privacy: 'public' | 'private';
    thumbnailsCount: number;
    createdAt: string;
    updatedAt: string;
    isFavorite: boolean; // Persisted in Firestore
}

// Legacy project type for backwards compatibility during migration
export interface LegacyProject {
    id: number;
    name: string;
    thumbnail: string;
    createdAt: string;
    isPublic: boolean;
    isFavorite: boolean;
}

// Template types
export interface Template {
    id: number;
    title: string;
    description: string;
    image: string;
}

// Style types
export interface Style {
    id: string;
    name: string;
    styleId: string;
    thumbnail: string;
}

// Model parameter options (model-specific capabilities)
export interface ModelOptions {
    aspectRatios: string[];
    resolutions?: string[];           // nano-banana-pro: '1K' | '2K' | '4K'
    sizes?: string[];                 // seedream-4: '1K' | '2K' | '4K'
    megapixels?: string[];            // flux-2-pro: '0.25 MP' | '0.5 MP' | '1 MP' | '2 MP'
    outputFormats?: string[];
}

// Model types
export interface Model {
    id: string;
    name: string;
    description: string;
    featureTag: string;
    credits: number;
    logo: string;
    maxImages?: number;                   // Max reference images for generation
    resolution?: '1K' | '2K' | '4K';      // Selected resolution for models with options
    baseModel?: string;                   // Actual API model name
    hasResolutionOptions?: boolean;       // True if model supports 2K/4K toggle
    isPro?: boolean;                      // Show PRO badge
    isSecondary?: boolean;                // Hidden under "More Models"
    options?: ModelOptions;               // Model-specific parameter options
    defaultAspectRatio?: string;          // Default aspect ratio
    defaultResolution?: string;           // Default resolution (nano-banana-pro)
    defaultSize?: string;                 // Default size (seedream-4)
    defaultMegapixels?: string;           // Default megapixels (flux-2-pro)
}

// Community/Thumbnail types
export interface Thumbnail {
    id: number;
    imageUrl: string;
    prompt?: string;
    youtubeUrl?: string;
    creator: {
        name: string;
        avatar: string;
    };
    name: string;
    avatar: string;
    model: string;
    likes: number;
    isLiked: boolean;
}

// Modal state types
export interface EditProjectModalState {
    isOpen: boolean;
    projectId: string | null;
    projectName: string;
    isPublic: boolean;
}

export interface ProjectActionModalState {
    isOpen: boolean;
    type: 'delete' | 'duplicate';
    projectId: string | null;
    projectName: string;
}

// Attached image type
export interface AttachedImage {
    id: string;
    file: File;
    preview: string;
}

// Theme type
export type Theme = 'light' | 'dark';

// Auth state type
export interface AuthState {
    user: User | null;
    loading: boolean;
}

// User data from Firestore (matches Firestore document structure)
export interface UserData {
    uid: string;
    email: string;
    displayName: string;
    subscriptionCredits: number;
    toppedUpBalance: number;
    trialCredits: number;
    hasTakenTour: boolean;
    createdAt: string;
    updatedAt: string;
}

// User data hook state
export interface UserDataState {
    userData: UserData | null;
    totalCredits: number;
    loading: boolean;
    error: string | null;
}

// Plan types
export type PlanType = 'free' | 'creator' | 'automation';

export interface PlanInfo {
    type: PlanType;
    name: string;
    monthlyCredits: number;
}
