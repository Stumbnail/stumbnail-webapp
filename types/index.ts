// Centralized type definitions for the Stumbnail webapp

import { User } from 'firebase/auth';

// Navigation types
export interface NavItem {
    id: string;
    label: string;
    icon: string;
    active: boolean;
}

// Project types
export interface Project {
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

// Model types
export interface Model {
    id: string;
    name: string;
    description: string;
    featureTag: string;
    credits: number;
    logo: string;
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
    projectId: number | null;
    projectName: string;
    isPublic: boolean;
}

export interface ProjectActionModalState {
    isOpen: boolean;
    type: 'delete' | 'duplicate';
    projectId: number | null;
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
