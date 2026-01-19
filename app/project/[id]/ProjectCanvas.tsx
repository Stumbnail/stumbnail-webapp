'use client';

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Hooks
import { useAuth, useUserData, useTheme } from '@/hooks';

// Types
import { Model } from '@/types';

// Constants
import { DEFAULT_MODEL } from '@/lib/constants';
import { AVAILABLE_MODELS } from '@/lib/constants/models';
import {
    CONTENT_TYPES,
    EMOTIONAL_TONES,
    TEXT_PLACEMENTS,
    TEXT_STYLES,
    getContentTypeDefaults,
    createDefaultSmartMergeConfig,
    SmartMergeConfig as SmartMergeConfigType,
    TextIncludeOption,
} from '@/lib/constants/smartMerge';

// Services
import { addThumbnail, getProjectThumbnails, deleteThumbnail, updateThumbnail, updateThumbnailPositions, uploadThumbnail, trackThumbnailDownload, startGenerationJob, pollGenerationJob, startSmartMergeJob, pollSmartMergeJob, GenerateThumbnailRequest, ApiThumbnail, SmartMergeRequest } from '@/lib/services/thumbnailService';
import { getProject, deleteProject, ApiProject } from '@/lib/services/projectService';
import { calculateTotalCredits, getUserPlan } from '@/lib/services/userService';
import { signInWithGoogle } from '@/lib/firebase'; // Added for inline login

// Analytics
import {
    trackGenerationStart,
    trackGenerationSuccess,
    trackGenerationFailure,
    trackAssetUpload,
    trackCanvasExport,
    trackCreditsExhausted,
    trackPromptEditorOpen,
    trackCategorySelect,
    trackBatchCountChange,
    trackVisibilityToggle,
    trackErrorDisplayed
} from '@/lib/analytics';

// Lazy load dropdowns
const ModelDropdown = dynamic(
    () => import('@/app/dashboard/ModelDropdown'),
    { ssr: false }
);

// Styles
import styles from './projectCanvas.module.css';

// UI Components
import { LoadingSpinner, AnimatedBorder, PricingModal } from '@/components/ui';
import { ModelOptionsBar } from '@/components/generation';
import { HighlightedPromptEditor } from '@/components/prompt';

// Props interface for when used as a shared component
interface ProjectCanvasPageProps {
    projectId?: string;  // Can be passed as prop from share page
    viewMode?: boolean;  // View-only mode for shared projects
    user?: any;  // Can be passed from SharePage to avoid duplicate useAuth calls
    authLoading?: boolean;  // Loading state from SharePage
    params?: { id: string };  // Next.js page params
    searchParams?: Record<string, string | string[] | undefined>;  // Next.js search params
}

// Types
type CreationMode = 'url' | 'prompt';
type ToolMode = 'select' | 'hand';

interface CanvasElement {
    id: string;
    type: 'image' | 'youtube-thumbnail' | 'generated' | 'uploaded' | 'smart-merge' | 'edit';
    src: string;
    x: number;
    y: number;
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
    aspectRatio: number;
    status?: 'generating' | 'complete' | 'uploading';
    statusText?: string;  // Human-readable status message (e.g., "Analyzing your images...")
    progress?: number;    // Progress percentage (0-100)
    prompt?: string;
}

interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

interface SelectionBox {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

interface DragState {
    isDragging: boolean;
    elementIds: string[];
    startX: number;
    startY: number;
    elementStarts: { id: string; x: number; y: number }[];
}

interface ResizeState {
    isResizing: boolean;
    elementIds: string[];  // Changed to array for group resize
    handle: string;
    startX: number;
    startY: number;
    // Group bounding box at start
    groupStartX: number;
    groupStartY: number;
    groupStartWidth: number;
    groupStartHeight: number;
    // Individual element positions at start (for proportional scaling)
    elementStarts: { id: string; x: number; y: number; width: number; height: number }[];
}

// Category chips for optional generation hints
const CATEGORY_OPTIONS = [
    { id: 'gaming', label: 'Gaming' },
    { id: 'tech', label: 'Tech' },
    { id: 'vlog', label: 'Vlog' },
    { id: 'reaction', label: 'Reaction' },
    { id: 'comedy', label: 'Comedy' },
    { id: 'educational', label: 'Educational' },
];

// Tone chips for optional generation hints
const TONE_OPTIONS = [
    { id: 'intense', label: 'Intense' },
    { id: 'calm', label: 'Calm' },
    { id: 'professional', label: 'Pro' },
    { id: 'fun', label: 'Fun' },
];

// Helper component for individual canvas elements to handle loading state independently
const CanvasItem = ({
    element,
    isSelected,
    onMouseDown,
    theme
}: {
    element: CanvasElement;
    isSelected: boolean;
    onMouseDown: (e: React.MouseEvent, elementId: string) => void;
    theme: 'light' | 'dark';
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Check if the src is valid (not empty, not just whitespace)
    const hasValidSrc = element.src && element.src.trim().length > 0;

    // Reset loaded state when src changes (e.g. from placeholder to generated image)
    useEffect(() => {
        setIsLoaded(false);
        setHasError(false);
    }, [element.src]);

    // Reset error state when element starts generating
    useEffect(() => {
        if (element.status === 'generating') {
            setHasError(false);
            setIsLoaded(false);
        }
    }, [element.status]);

    // If src is empty or invalid AND not generating, show error
    useEffect(() => {
        if (!hasValidSrc && element.status !== 'generating') {
            setHasError(true);
            setIsLoaded(true);
        }
    }, [hasValidSrc, element.status]);

    return (
        <div
            className={`${styles.canvasElement} ${isSelected ? styles.canvasElementSelected : ''}`}
            style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
            }}
            onMouseDown={(e) => onMouseDown(e, element.id)}
        >
            {element.status === 'generating' ? (
                <div className={styles.generatingPlaceholder}>
                    <LoadingSpinner theme={theme} size="medium" />
                    <div className={styles.generatingStatus}>
                        <span className={styles.generatingStatusText}>
                            {element.statusText || 'Generating...'}
                        </span>
                        {typeof element.progress === 'number' && (
                            <div className={styles.progressContainer}>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${element.progress}%` }}
                                    />
                                </div>
                                <span className={styles.progressPercent}>{element.progress}%</span>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* Show loading placeholder until image is fully loaded */}
                    {!isLoaded && !hasError && (
                        <div className={styles.loadingPlaceholder}>
                            <LoadingSpinner theme={theme} />
                        </div>
                    )}
                    {hasValidSrc && (
                        <img
                            src={element.src}
                            alt={element.prompt || "Thumbnail"}
                            className={styles.elementImage}
                            draggable={false}
                            onLoad={() => setIsLoaded(true)}
                            onError={() => {
                                console.error('Image failed to load:', element.src?.substring(0, 100));
                                setHasError(true);
                                setIsLoaded(true);
                            }}
                            style={{
                                opacity: isLoaded ? 1 : 0,
                                transition: 'opacity 0.3s ease'
                            }}
                        />
                    )}
                    {hasError && (
                        <div className={styles.errorPlaceholder}>
                            <span>Failed to load image</span>
                        </div>
                    )}
                </>
            )}

            {/* Uploading Indicator */}
            {element.status === 'uploading' && (
                <div className={styles.uploadingOverlay} title="Syncing...">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={styles.uploadingSpinner}
                    >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                </div>
            )}

            {/* Selection overlay (no handles on individual elements) */}
            {isSelected && (
                <div className={styles.selectionOverlay} />
            )}
        </div>
    );
};

export function ProjectCanvas(props: ProjectCanvasPageProps) {
    const {
        projectId: propProjectId,
        viewMode = false,
        user: propUser,
        authLoading: propAuthLoading
    } = props || {};

    const router = useRouter();
    const params = useParams();
    const projectId = propProjectId || (params?.id as string);

    // Custom hooks
    // Only call useAuth if user wasn't passed as prop (prevents duplicate listeners)
    // This avoids race conditions when SharePage already called useAuth
    const shouldRedirect = propUser === undefined ? !viewMode : false;
    const { user: hookUser, loading: hookLoading } = useAuth(
        shouldRedirect,
        shouldRedirect ? "To view this project, you need to log in first." : undefined
    );
    const user = propUser ?? hookUser;
    const authLoading = propAuthLoading ?? hookLoading;

    const { userData } = useUserData(user);
    const { theme } = useTheme({ userId: user?.uid });

    const [showSidebarTooltip, setShowSidebarTooltip] = useState(false);

    // Refs
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const canvasMainRef = useRef<HTMLElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const youtubeLinkInputRef = useRef<HTMLInputElement>(null);
    const promptImageInputRef = useRef<HTMLInputElement>(null);
    const hasPerformedInitialFit = useRef(false);
    const pendingTemplateRef = useRef<{ type: string; prompt?: string; imageURL?: string; category?: string; tone?: string } | null>(null);
    const pendingAutoGenerateRef = useRef(false); // Track if we need to auto-generate after template load

    // Resolution Constants
    const RESOLUTION_MAP: Record<string, number> = {
        '1K': 1024,
        '2K': 1440,
        '4K': 2160,
        '0.25 MP': 512, // approx
        '0.5 MP': 768, // approx
        '1 MP': 1024,
        '2 MP': 1440,
        '4 MP': 2048
    };

    const getDimensionsFromAspectRatio = (ratio: string, resolutionKey: string = '2K'): { width: number; height: number } => {
        // Default base height based on resolution
        let baseHeight = RESOLUTION_MAP[resolutionKey] || 1080;

        // Default base width (usually 16:9 equivalent)
        if (!RESOLUTION_MAP[resolutionKey]) {
            // Fallback logic if resolution key not found
            if (resolutionKey.includes('4K')) baseHeight = 2160;
            else if (resolutionKey.includes('2K')) baseHeight = 1440;
            else baseHeight = 1080;
        }

        if (ratio === '1:1') return { width: baseHeight, height: baseHeight };

        const [w, h] = ratio.split(':').map(Number);
        if (!w || !h) return { width: 1920, height: 1080 }; // Default 16:9

        // Calculate dimensions
        let width, height;

        if (w > h) {
            // Landscape (e.g., 16:9)
            // Maintain height as base resolution height (e.g. 1080p -> 1080 height)
            height = baseHeight;
            width = Math.round(height * (w / h));
        } else {
            // Portrait or Vertical (e.g., 9:16)
            // If we kept height=1080, width would be ~600, which is low res for a "2K" vertical image
            // Usually "2K" vertical means the SHORTER side is 1440, or LONGER is 2560? 
            // Let's assume input resolution refers to the shortest side for consistency with film standards,
            // OR adhering to max dimension.

            // Let's use the resolution value as the WIDTH for vertical images to ensure high quality
            width = baseHeight;
            height = Math.round(width * (h / w));
        }

        return { width, height };
    };

    // UI State
    const [projectName, setProjectName] = useState('My First Thumbnail');
    const [isPublic, setIsPublic] = useState(true);
    const [isLoadingProject, setIsLoadingProject] = useState(true);
    const [selectedMode, setSelectedMode] = useState<CreationMode>('prompt');
    const [youtubeLink, setYoutubeLink] = useState('');
    const [youtubeLinkError, setYoutubeLinkError] = useState<string | null>(null);
    const [showUrlPopup, setShowUrlPopup] = useState(false);
    const [pricingModalOpen, setPricingModalOpen] = useState(false);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [projectError, setProjectError] = useState<'not-found' | 'access-denied' | null>(null);

    // Prompt mode state
    const [promptText, setPromptText] = useState('');
    const [promptModel, setPromptModel] = useState<Model | null>(DEFAULT_MODEL);
    const [thumbnailCount, setThumbnailCount] = useState(1);
    const [attachedImages, setAttachedImages] = useState<{ id: string; file: File; preview: string }[]>([]);

    // Optional generation hints (for intelligence layer)
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedTone, setSelectedTone] = useState<string | null>(null);
    const [customCategory, setCustomCategory] = useState('');
    const [customTone, setCustomTone] = useState('');

    // Modify prompt state - stores prompts per element ID
    const [elementPrompts, setElementPrompts] = useState<Record<string, string>>({});
    const [elementModels, setElementModels] = useState<Record<string, Model>>({});
    const [modifyAttachedImages, setModifyAttachedImages] = useState<Record<string, { id: string; file: File; preview: string }[]>>({});
    const modifyImageInputRef = useRef<HTMLInputElement>(null);
    const [activeModifyElementId, setActiveModifyElementId] = useState<string | null>(null);

    // Model-specific options state
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [resolution, setResolution] = useState<string | undefined>();
    const [size, setSize] = useState<string | undefined>();
    const [megapixels, setMegapixels] = useState<string | undefined>();

    // Per-element options for floating panel
    const [elementAspectRatios, setElementAspectRatios] = useState<Record<string, string>>({});
    const [elementResolutions, setElementResolutions] = useState<Record<string, string>>({});
    const [elementSizes, setElementSizes] = useState<Record<string, string>>({});
    const [elementMegapixels, setElementMegapixels] = useState<Record<string, string>>({});

    // Smart Merge state (multi-select conversion)
    const [showSmartMergePanel, setShowSmartMergePanel] = useState(false);
    const [smartMergeConfig, setSmartMergeConfig] = useState<SmartMergeConfigType>(
        createDefaultSmartMergeConfig('gaming')
    );
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [smartMergePanelPosition, setSmartMergePanelPosition] = useState<{ x: number; y: number } | null>(null);
    const [isSmartMergeDragging, setIsSmartMergeDragging] = useState(false);

    const [isSmartMergeGenerating, setIsSmartMergeGenerating] = useState(false);
    // Smart Merge model state - default to Pro (19 credits)
    const [smartMergeModel, setSmartMergeModel] = useState<string>('nano-banana-pro');

    // Tool State
    const [toolMode, setToolMode] = useState<ToolMode>('select');
    const [isHandToolActive, setIsHandToolActive] = useState(false);

    // Canvas State
    const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
    const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

    // Mobile sidebar state
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);

    // Interaction State
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        elementIds: [],
        startX: 0,
        startY: 0,
        elementStarts: [],
    });
    const [resizeState, setResizeState] = useState<ResizeState>({
        isResizing: false,
        elementIds: [],
        handle: '',
        startX: 0,
        startY: 0,
        groupStartX: 0,
        groupStartY: 0,
        groupStartWidth: 0,
        groupStartHeight: 0,
        elementStarts: [],
    });

    // Rubberband selection
    const [isRubberbanding, setIsRubberbanding] = useState(false);
    const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

    // Key states
    const [shiftPressed, setShiftPressed] = useState(false);
    const [ctrlPressed, setCtrlPressed] = useState(false);

    // Snap alignment
    const [snapLines, setSnapLines] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
    const SNAP_THRESHOLD = 8;

    // Track if project started empty (for auto-cleanup)
    const wasProjectInitiallyEmpty = useRef<boolean | null>(null);
    const canvasElementsRef = useRef<CanvasElement[]>([]);

    // Keep ref in sync with state for cleanup
    useEffect(() => {
        canvasElementsRef.current = canvasElements;
    }, [canvasElements]);

    // Auto-delete empty abandoned projects on page leave
    useEffect(() => {
        const cleanupEmptyProject = async () => {
            // Only cleanup if project was initially empty and still has no content
            if (wasProjectInitiallyEmpty.current === true &&
                canvasElementsRef.current.length === 0 &&
                projectId) {
                try {
                    console.log('[Project Cleanup] Deleting empty abandoned project:', projectId);
                    await deleteProject(projectId);
                } catch (error) {
                    console.error('[Project Cleanup] Failed to delete empty project:', error);
                }
            }
        };

        // Handle browser close/navigation
        const handleBeforeUnload = () => {
            // Use sendBeacon for reliable cleanup on page unload
            if (wasProjectInitiallyEmpty.current === true &&
                canvasElementsRef.current.length === 0 &&
                projectId) {
                // Note: We can't make async calls in beforeunload, 
                // so we rely on the cleanup happening in the useEffect return
                console.log('[Project Cleanup] Page unloading with empty project');
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup function runs when component unmounts (including navigation)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            cleanupEmptyProject();
        };
    }, [projectId]);

    // Fetch project data and thumbnails on mount
    useEffect(() => {
        const fetchProjectData = async () => {
            // In view mode, allow fetching without user authentication
            if (!projectId) return;
            if (!viewMode && !user) return;

            setIsLoadingProject(true);
            try {
                // Fetch project details
                let projectResponse;

                // In view mode, fetch directly from Firestore
                if (viewMode) {
                    try {
                        const { getDoc, doc } = await import('firebase/firestore');
                        const { getFirestore } = await import('@/lib/firebase');

                        const db = await getFirestore();

                        const projectDoc = await getDoc(doc(db, 'projects', projectId));
                        if (projectDoc.exists()) {
                            const data = projectDoc.data();
                            projectResponse = {
                                success: true,
                                project: {
                                    id: projectDoc.id,
                                    ownerId: data.ownerId,
                                    name: data.name,
                                    privacy: data.privacy,
                                    viewport: data.viewport,
                                    thumbnailsCount: data.thumbnailsCount,
                                    previewImage: data.previewImage,
                                    createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
                                    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
                                } as ApiProject
                            };
                        } else {
                            projectResponse = { success: false };
                        }
                    } catch (error: any) {
                        console.error('Error fetching project from Firestore:', error);
                        projectResponse = { success: false };
                        if (error.code === 'permission-denied') {
                            setProjectError('access-denied');
                        } else {
                            setProjectError('not-found');
                        }
                    }
                } else {
                    // In edit mode, use API as normal
                    projectResponse = await getProject(projectId);
                    if (!projectResponse.success) {
                        setProjectError('not-found');
                    }
                }
                if (projectResponse.success && projectResponse.project) {
                    // In view mode, check if user is the owner and redirect to edit mode
                    if (viewMode && user && projectResponse.project.ownerId === user.uid) {
                        router.push(`/project/${projectId}`);
                        return;
                    }

                    setProjectName(projectResponse.project.name);
                    setIsPublic(projectResponse.project.privacy === 'public');

                    // Restore viewport if saved - handled after loading thumbnails to prioritize content fit
                    // if (projectResponse.project.viewport) {
                    //   setViewport(projectResponse.project.viewport);
                    // }
                }

                // Fetch thumbnails
                let thumbnailsResponse;

                // In view mode, fetch directly from Firestore to avoid API permission issues
                if (viewMode) {
                    try {
                        const { collection, getDocs, getDoc, doc } = await import('firebase/firestore');
                        const { getFirestore } = await import('@/lib/firebase');

                        const db = await getFirestore();

                        // Verify project is public
                        const projectDoc = await getDoc(doc(db, 'projects', projectId));
                        if (!projectDoc.exists() || projectDoc.data()?.privacy !== 'public') {
                            throw new Error('Project is not public');
                        }

                        // Fetch thumbnails from Firestore
                        const thumbnailsCol = collection(db, 'projects', projectId, 'thumbnails');
                        const thumbnailsSnapshot = await getDocs(thumbnailsCol);

                        const thumbnails = thumbnailsSnapshot.docs.map(doc => {
                            const data = doc.data();
                            return {
                                id: doc.id,
                                thumbnailUrl: data.thumbnailUrl,
                                type: data.type,
                                x: data.x,
                                y: data.y,
                                width: data.width,
                                height: data.height,
                                naturalWidth: data.naturalWidth,
                                naturalHeight: data.naturalHeight,
                                aspectRatio: data.aspectRatio,
                                prompt: data.prompt,
                                createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
                                updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
                            } as ApiThumbnail;
                        });

                        thumbnailsResponse = { success: true, thumbnails };
                    } catch (error) {
                        console.error('Error fetching thumbnails from Firestore:', error);
                        thumbnailsResponse = { success: false, thumbnails: [] };
                    }
                } else {
                    // In edit mode, use API as normal
                    thumbnailsResponse = await getProjectThumbnails(projectId);
                }

                if (thumbnailsResponse.success && thumbnailsResponse.thumbnails) {
                    // Convert API thumbnails to canvas elements
                    // Use exact stored dimensions to preserve positions correctly
                    const elements: CanvasElement[] = thumbnailsResponse.thumbnails
                        .filter((thumb: ApiThumbnail) => {
                            // Filter out thumbnails with missing critical data
                            if (!thumb.thumbnailUrl) {
                                console.warn('Thumbnail missing URL:', thumb.id);
                                return false;
                            }
                            return true;
                        })
                        .map((thumb: ApiThumbnail) => {
                            // Provide sensible defaults for missing dimensions
                            const naturalWidth = thumb.naturalWidth || 1920;
                            const naturalHeight = thumb.naturalHeight || 1080;
                            const aspectRatio = thumb.aspectRatio || (naturalWidth / naturalHeight) || (16 / 9);

                            // Calculate display dimensions if missing
                            let width = thumb.width;
                            let height = thumb.height;

                            if (!width || !height || width <= 0 || height <= 0) {
                                // Default display size based on natural dimensions
                                const maxDisplayWidth = 600;
                                const scale = Math.min(1, maxDisplayWidth / naturalWidth);
                                width = naturalWidth * scale;
                                height = naturalHeight * scale;
                            }

                            return {
                                id: thumb.id,
                                type: thumb.type === 'uploaded' ? 'image' : thumb.type,
                                src: thumb.thumbnailUrl,
                                x: thumb.x || 0,
                                y: thumb.y || 0,
                                width,
                                height,
                                naturalWidth,
                                naturalHeight,
                                aspectRatio,
                                status: thumb.status === 'generating' ? 'generating' : 'complete',
                                prompt: thumb.prompt || undefined,
                            };
                        });
                    setCanvasElements(elements);

                    // Track if project started empty (for cleanup on abandon)
                    if (wasProjectInitiallyEmpty.current === null) {
                        wasProjectInitiallyEmpty.current = elements.length === 0;
                    }

                    // Note: Initial viewport fitting is now handled by a dedicated useEffect
                    // that waits for the canvas DOM to be ready.

                } else if (projectResponse.project?.viewport) {
                    // No thumbnails, restore saved viewport
                    setViewport(projectResponse.project.viewport);

                    // Project has no thumbnails - mark as initially empty
                    if (wasProjectInitiallyEmpty.current === null) {
                        wasProjectInitiallyEmpty.current = true;
                    }
                } else {
                    // No thumbnails and no saved viewport - mark as initially empty
                    if (wasProjectInitiallyEmpty.current === null) {
                        wasProjectInitiallyEmpty.current = true;
                    }
                }
            } catch (error) {
                console.error('Error fetching project data:', error);
            } finally {
                setIsLoadingProject(false);
            }
        };

        fetchProjectData();
    }, [projectId, user, viewMode]);

    // Handle initial viewport fitting
    useEffect(() => {
        // Run only once when loading is done and we have elements
        if (!isLoadingProject && !hasPerformedInitialFit.current && canvasContainerRef.current) {
            // If no elements, we don't need to fit (saved viewport might have been set)
            if (canvasElements.length === 0) {
                hasPerformedInitialFit.current = true;
                return;
            }

            const containerRect = canvasContainerRef.current.getBoundingClientRect();

            // Calculate bounding box of all elements
            const minX = Math.min(...canvasElements.map(el => el.x));
            const minY = Math.min(...canvasElements.map(el => el.y));
            const maxX = Math.max(...canvasElements.map(el => el.x + el.width));
            const maxY = Math.max(...canvasElements.map(el => el.y + el.height));

            const contentWidth = maxX - minX;
            const contentHeight = maxY - minY;
            const centerX = minX + contentWidth / 2;
            const centerY = minY + contentHeight / 2;

            // Calculate zoom to fit with comfortable padding (e.g. 100px)
            const padding = 100;

            // Ensure we don't divide by zero
            const safeContentWidth = Math.max(contentWidth, 1);
            const safeContentHeight = Math.max(contentHeight, 1);

            const zoomX = (containerRect.width - padding) / safeContentWidth;
            const zoomY = (containerRect.height - padding) / safeContentHeight;

            // Fit to screen, but don't zoom in too much (max 1.0)
            // Also ensures we don't zoom out too aggressively (min 0.1)
            let finalZoom = Math.min(Math.min(zoomX, zoomY), 1.0);
            finalZoom = Math.max(finalZoom, 0.1);

            // Center the content
            const targetX = -(centerX * finalZoom - containerRect.width / 2);
            const targetY = -(centerY * finalZoom - containerRect.height / 2);

            console.log("Auto-fitting viewport:", { targetX, targetY, finalZoom, contentWidth, contentHeight });

            setViewport({
                x: targetX,
                y: targetY,
                zoom: finalZoom
            });

            hasPerformedInitialFit.current = true;
        }
    }, [isLoadingProject, canvasElements]);

    // Handle template data from sessionStorage (when creating from a template)
    // Prompt-based templates are handled immediately; YouTube templates stored in ref for later
    useEffect(() => {
        if (isLoadingProject || !projectId) return;

        const templateKey = `template_${projectId}`;
        const templateData = sessionStorage.getItem(templateKey);

        if (!templateData) return;

        // Clean up sessionStorage immediately
        sessionStorage.removeItem(templateKey);

        try {
            const template = JSON.parse(templateData);
            console.log('[Template] Loading template data:', template);

            if (template.type === 'youtube_thumbnail' && template.imageURL) {
                // Store for later processing once addElementAtViewportCenter is available
                pendingTemplateRef.current = template;
            } else {
                // Prompt-based template: Preload prompt and options immediately
                if (template.prompt) {
                    setPromptText(template.prompt);
                }
                // Handle category - check if it matches a preset or should be custom
                if (template.category) {
                    const categoryLower = template.category.toLowerCase();
                    const matchesPreset = CATEGORY_OPTIONS.some(opt => opt.id === categoryLower);
                    if (matchesPreset) {
                        setSelectedCategory(categoryLower);
                    } else {
                        setSelectedCategory('custom');
                        setCustomCategory(template.category);
                    }
                }
                // Handle tone - check if it matches a preset or should be custom
                if (template.tone) {
                    const toneLower = template.tone.toLowerCase();
                    const matchesPreset = TONE_OPTIONS.some(opt => opt.id === toneLower);
                    if (matchesPreset) {
                        setSelectedTone(toneLower);
                    } else {
                        setSelectedTone('custom');
                        setCustomTone(template.tone);
                    }
                }

                // Handle attached images from template customization
                if (template.attachedImages && Array.isArray(template.attachedImages)) {
                    const loadedImages: { id: string; file: File; preview: string }[] = [];

                    template.attachedImages.forEach((imgData: { id: string; preview: string; name: string; type: string }) => {
                        try {
                            // Convert base64 preview back to File object
                            const base64Data = imgData.preview.split(',')[1];
                            if (base64Data) {
                                const byteString = atob(base64Data);
                                const ab = new ArrayBuffer(byteString.length);
                                const ia = new Uint8Array(ab);
                                for (let i = 0; i < byteString.length; i++) {
                                    ia[i] = byteString.charCodeAt(i);
                                }
                                const blob = new Blob([ab], { type: imgData.type || 'image/jpeg' });
                                const file = new File([blob], imgData.name || 'template-image.jpg', {
                                    type: imgData.type || 'image/jpeg'
                                });

                                loadedImages.push({
                                    id: imgData.id,
                                    file,
                                    preview: imgData.preview
                                });
                            }
                        } catch (err) {
                            console.error('[Template] Failed to convert image:', err);
                        }
                    });

                    if (loadedImages.length > 0) {
                        console.log('[Template] Loaded', loadedImages.length, 'attached images');
                        setAttachedImages(loadedImages);
                    }
                }

                // Check if auto-generation is requested
                if (template.autoGenerate && template.prompt) {
                    console.log('[Template] Auto-generate requested, will trigger after state settles');
                    pendingAutoGenerateRef.current = true;
                }
            }
        } catch (error) {
            console.error('[Template] Failed to parse template data:', error);
        }
    }, [isLoadingProject, projectId]);

    // Handlers
    const handleBack = useCallback(() => {
        router.push('/dashboard');
    }, [router]);

    const handleTogglePublic = useCallback(() => {
        // If trying to make private (isPublic is true, going to false) and user is not paid
        if (isPublic && getUserPlan(userData).type === 'free') {
            setPricingModalOpen(true);
            return;
        }
        const newVisibility = !isPublic;
        setIsPublic(newVisibility);
        trackVisibilityToggle(newVisibility ? 'public' : 'private', 'free');
    }, [isPublic, userData]);

    const handleModeSelect = useCallback((mode: CreationMode) => {
        setSelectedMode(mode);
    }, []);

    // YouTube URL validation and video ID extraction
    const extractVideoId = (url: string): string | null => {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    };

    const validateYoutubeLink = (url: string): boolean => {
        if (!url.trim()) {
            setYoutubeLinkError('Please enter a YouTube link');
            return false;
        }
        const videoId = extractVideoId(url.trim());
        if (!videoId) {
            setYoutubeLinkError('Please enter a valid YouTube link');
            return false;
        }
        setYoutubeLinkError(null);
        return true;
    };

    const handleYoutubeLinkChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setYoutubeLink(e.target.value);
        if (youtubeLinkError) {
            setYoutubeLinkError(null);
        }
    }, [youtubeLinkError]);

    // Convert screen coordinates to canvas coordinates
    const screenToCanvas = useCallback((screenX: number, screenY: number) => {
        if (!canvasContainerRef.current) return { x: 0, y: 0 };
        const rect = canvasContainerRef.current.getBoundingClientRect();
        return {
            x: (screenX - rect.left - viewport.x) / viewport.zoom,
            y: (screenY - rect.top - viewport.y) / viewport.zoom,
        };
    }, [viewport]);

    // Animate viewport to target position with easing
    const animateViewportTo = useCallback((targetX: number, targetY: number, targetZoom: number, duration = 400) => {
        const startTime = performance.now();
        const startX = viewport.x;
        const startY = viewport.y;
        const startZoom = viewport.zoom;

        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);

            setViewport({
                x: startX + (targetX - startX) * eased,
                y: startY + (targetY - startY) * eased,
                zoom: startZoom + (targetZoom - startZoom) * eased,
            });

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [viewport]);

    // Gap between auto-placed elements (DB-persistable: this is just a constant)
    const ELEMENT_GAP = 20;

    // Find a non-overlapping position for a new element
    const findNonOverlappingPosition = useCallback((
        width: number,
        height: number,
        existingElements: CanvasElement[],
        preferredX: number,
        preferredY: number
    ): { x: number; y: number } => {
        // Check if position overlaps with any existing element
        const doesOverlap = (x: number, y: number): boolean => {
            return existingElements.some(el => {
                return !(x + width + ELEMENT_GAP <= el.x ||
                    x >= el.x + el.width + ELEMENT_GAP ||
                    y + height + ELEMENT_GAP <= el.y ||
                    y >= el.y + el.height + ELEMENT_GAP);
            });
        };

        // If no overlap at preferred position, use it
        if (!doesOverlap(preferredX, preferredY)) {
            return { x: preferredX, y: preferredY };
        }

        // Try positions to the right of existing elements
        let bestX = preferredX;
        let bestY = preferredY;

        // Find rightmost element edge and place next to it
        if (existingElements.length > 0) {
            const maxRight = Math.max(...existingElements.map(el => el.x + el.width));
            bestX = maxRight + ELEMENT_GAP;
            bestY = preferredY;

            // If that overlaps, try below
            if (doesOverlap(bestX, bestY)) {
                const maxBottom = Math.max(...existingElements.map(el => el.y + el.height));
                bestX = preferredX;
                bestY = maxBottom + ELEMENT_GAP;
            }
        }

        return { x: bestX, y: bestY };
    }, []);

    // Animate viewport to fit a bounding box of elements
    const fitElementsInView = useCallback((elementIds: string[]) => {
        if (!canvasContainerRef.current || elementIds.length === 0) return;

        const containerRect = canvasContainerRef.current.getBoundingClientRect();

        setCanvasElements(prev => {
            const elements = prev.filter(el => elementIds.includes(el.id));
            if (elements.length === 0) return prev;

            // Calculate bounding box of all elements
            const minX = Math.min(...elements.map(el => el.x));
            const minY = Math.min(...elements.map(el => el.y));
            const maxX = Math.max(...elements.map(el => el.x + el.width));
            const maxY = Math.max(...elements.map(el => el.y + el.height));

            const boundingWidth = maxX - minX;
            const boundingHeight = maxY - minY;
            const centerX = minX + boundingWidth / 2;
            const centerY = minY + boundingHeight / 2;

            // Calculate zoom to fit all elements with padding
            const padding = 50; // Reduced for closer zoom
            const zoomX = (containerRect.width - padding * 2) / boundingWidth;
            const zoomY = (containerRect.height - padding * 2) / boundingHeight;
            const targetZoom = Math.min(Math.min(zoomX, zoomY), 0.8); // Allow up to 80% zoom for closer view

            // Calculate viewport position to center the bounding box
            const targetX = -(centerX * targetZoom - containerRect.width / 2);
            const targetY = -(centerY * targetZoom - containerRect.height / 2);

            // Animate to fit all elements
            animateViewportTo(targetX, targetY, targetZoom);

            return prev;
        });
    }, [viewport, animateViewportTo]);

    // Add element at viewport center with non-overlapping logic
    const addElementAtViewportCenter = useCallback((
        src: string,
        type: 'image' | 'youtube-thumbnail' | 'generated' | 'uploaded',
        naturalWidth: number,
        naturalHeight: number,
        status?: 'generating' | 'complete' | 'uploading',
        skipAnimation = false,
        prompt?: string,
        overrideX?: number,
        overrideY?: number
    ): string => {
        if (!canvasContainerRef.current) return '';

        const containerRect = canvasContainerRef.current.getBoundingClientRect();
        const centerCanvas = screenToCanvas(
            containerRect.left + containerRect.width / 2,
            containerRect.top + containerRect.height / 2
        );

        // Scale image to fit reasonable display size on canvas
        // Max 600px width to fit multiple thumbnails on screen
        // Preserves aspect ratio - actual quality stored in naturalWidth/naturalHeight
        const maxDisplayWidth = 600;
        const scale = Math.min(1, maxDisplayWidth / naturalWidth);
        const width = naturalWidth * scale;
        const height = naturalHeight * scale;

        const preferredX = centerCanvas.x - width / 2;
        const preferredY = centerCanvas.y - height / 2;

        // Generate ID upfront so we can return it
        const newElementId = crypto.randomUUID();

        // Find non-overlapping position
        let finalPosition = { x: preferredX, y: preferredY };

        setCanvasElements(prev => {
            // Use override position if provided, otherwise find a non-overlapping spot
            if (overrideX !== undefined && overrideY !== undefined) {
                finalPosition = { x: overrideX, y: overrideY };
            } else {
                finalPosition = findNonOverlappingPosition(width, height, prev, preferredX, preferredY);
            }

            const newElement: CanvasElement = {
                id: newElementId,
                type,
                src,
                x: finalPosition.x,
                y: finalPosition.y,
                width,
                height,
                naturalWidth,
                naturalHeight,
                aspectRatio: naturalWidth / naturalHeight,
                status,
                prompt,
            };

            setSelectedElementIds(ids => [...ids, newElement.id]);

            // Skip animation for batch operations - they'll handle it themselves
            if (!skipAnimation) {
                // Adjust viewport to show the new element if it's outside current view
                const elementCenterX = finalPosition.x + width / 2;
                const elementCenterY = finalPosition.y + height / 2;

                // Calculate visible area boundaries in canvas coordinates
                const visibleLeft = -viewport.x / viewport.zoom;
                const visibleTop = -viewport.y / viewport.zoom;
                const visibleRight = visibleLeft + containerRect.width / viewport.zoom;
                const visibleBottom = visibleTop + containerRect.height / viewport.zoom;

                // Check if element center is outside visible area (with some padding)
                const padding = 50;
                const needsPan =
                    elementCenterX < visibleLeft + padding ||
                    elementCenterX > visibleRight - padding ||
                    elementCenterY < visibleTop + padding ||
                    elementCenterY > visibleBottom - padding;

                if (needsPan) {
                    // Calculate target position to center the new element
                    const targetX = -(elementCenterX * viewport.zoom - containerRect.width / 2);
                    const targetY = -(elementCenterY * viewport.zoom - containerRect.height / 2);

                    // Check if we need to zoom out to see more elements
                    // Calculate how far outside the view the element is
                    const distanceOutside = Math.max(
                        Math.max(visibleLeft + padding - elementCenterX, 0),
                        Math.max(elementCenterX - (visibleRight - padding), 0),
                        Math.max(visibleTop + padding - elementCenterY, 0),
                        Math.max(elementCenterY - (visibleBottom - padding), 0)
                    );

                    // Zoom out slightly if element is far outside (more than 200px in canvas coords)
                    let targetZoom = viewport.zoom;
                    if (distanceOutside > 200) {
                        targetZoom = Math.max(0.5, viewport.zoom * 0.85); // Zoom out by 15%, min 50%
                    }

                    // Recalculate target position with new zoom
                    const finalTargetX = -(elementCenterX * targetZoom - containerRect.width / 2);
                    const finalTargetY = -(elementCenterY * targetZoom - containerRect.height / 2);

                    // Animate to new viewport position
                    animateViewportTo(finalTargetX, finalTargetY, targetZoom);
                }
            }

            return [...prev, newElement];
        });

        return newElementId;
    }, [screenToCanvas, findNonOverlappingPosition, viewport, animateViewportTo]);

    // Process pending YouTube thumbnail template (after addElementAtViewportCenter is defined)
    useEffect(() => {
        const template = pendingTemplateRef.current;
        if (!template || !template.imageURL || isLoadingProject) return;

        // Clear the ref immediately to prevent re-processing
        pendingTemplateRef.current = null;

        console.log('[Template] Processing pending YouTube template:', template);

        const extractVideoIdFromUrl = (url: string): string | null => {
            // Try to extract from YouTube image URL
            const ytImgMatch = url.match(/img\.youtube\.com\/vi\/([^/]+)/);
            if (ytImgMatch) return ytImgMatch[1];

            // Try standard YouTube URL patterns
            const patterns = [
                /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
            ];
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) return match[1];
            }
            return null;
        };

        const videoId = extractVideoIdFromUrl(template.imageURL);
        const thumbnailUrl = videoId
            ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            : template.imageURL;

        // Load the YouTube thumbnail onto canvas
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = async () => {
            if (!canvasContainerRef.current) return;

            const newElementId = addElementAtViewportCenter(
                thumbnailUrl,
                'youtube-thumbnail',
                img.naturalWidth,
                img.naturalHeight,
                'complete',
                false
            );

            // Select the new element to show the edit panel
            setSelectedElementIds([newElementId]);

            // Persist to backend
            if (projectId) {
                try {
                    const maxDisplayWidth = 600;
                    const scale = Math.min(1, maxDisplayWidth / img.naturalWidth);

                    const response = await addThumbnail(projectId, {
                        thumbnailUrl,
                        type: 'youtube-thumbnail',
                        x: 0, // Position is calculated in addElementAtViewportCenter
                        y: 0,
                        width: img.naturalWidth * scale,
                        height: img.naturalHeight * scale,
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight,
                        youtubeVideoId: videoId || undefined
                    });

                    if (response.success && response.thumbnail) {
                        setCanvasElements(prev => prev.map(el =>
                            el.id === newElementId ? { ...el, id: response.thumbnail.id } : el
                        ));
                        setSelectedElementIds([response.thumbnail.id]);
                    }
                } catch (error) {
                    console.error('Failed to save template thumbnail:', error);
                }
            }
        };
        img.onerror = () => {
            console.error('Failed to load YouTube thumbnail from template');
        };
        img.src = thumbnailUrl;
    }, [isLoadingProject, projectId, addElementAtViewportCenter]);

    const handleYoutubeLinkSubmit = useCallback(() => {
        if (!validateYoutubeLink(youtubeLink)) return;

        const videoId = extractVideoId(youtubeLink.trim());
        if (!videoId) return;

        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

        const img = new window.Image();
        img.onload = async () => {
            if (!canvasContainerRef.current) return;

            // Calculate position explicitly to ensure backend and frontend match
            const maxDisplayWidth = 600;
            const scale = Math.min(1, maxDisplayWidth / img.naturalWidth);
            const width = img.naturalWidth * scale;
            const height = img.naturalHeight * scale;

            const containerRect = canvasContainerRef.current.getBoundingClientRect();
            const centerCanvas = screenToCanvas(
                containerRect.left + containerRect.width / 2,
                containerRect.top + containerRect.height / 2
            );

            const preferredX = centerCanvas.x - width / 2;
            const preferredY = centerCanvas.y - height / 2;

            // Find position using current state
            const pos = findNonOverlappingPosition(width, height, canvasElements, preferredX, preferredY);

            // Add locally with explicit position
            const tempId = addElementAtViewportCenter(
                thumbnailUrl,
                'youtube-thumbnail',
                img.naturalWidth,
                img.naturalHeight,
                'complete',
                false,
                undefined,
                pos.x,
                pos.y
            );

            setYoutubeLink('');

            // Add to backend
            if (projectId) {
                try {
                    const response = await addThumbnail(projectId, {
                        thumbnailUrl,
                        type: 'youtube-thumbnail',
                        x: pos.x,
                        y: pos.y,
                        width,
                        height,
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight,
                        youtubeVideoId: videoId
                    });

                    if (response.success && response.thumbnail) {
                        // Update local ID with real backend ID
                        setCanvasElements(prev => prev.map(el =>
                            el.id === tempId ? { ...el, id: response.thumbnail.id } : el
                        ));
                    }
                } catch (error) {
                    console.error('Failed to save YouTube thumbnail:', error);
                }
            }
        };
        img.onerror = () => {
            const fallbackUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            const fallbackImg = new window.Image();
            fallbackImg.onload = async () => {
                if (!canvasContainerRef.current) return;

                // Calculate position explicitly
                const maxDisplayWidth = 600;
                const scale = Math.min(1, maxDisplayWidth / fallbackImg.naturalWidth);
                const width = fallbackImg.naturalWidth * scale;
                const height = fallbackImg.naturalHeight * scale;

                const containerRect = canvasContainerRef.current.getBoundingClientRect();
                const centerCanvas = screenToCanvas(
                    containerRect.left + containerRect.width / 2,
                    containerRect.top + containerRect.height / 2
                );

                const preferredX = centerCanvas.x - width / 2;
                const preferredY = centerCanvas.y - height / 2;

                const pos = findNonOverlappingPosition(width, height, canvasElements, preferredX, preferredY);

                // Add locally
                const tempId = addElementAtViewportCenter(
                    fallbackUrl,
                    'youtube-thumbnail',
                    fallbackImg.naturalWidth,
                    fallbackImg.naturalHeight,
                    'complete',
                    false,
                    undefined,
                    pos.x,
                    pos.y
                );

                setYoutubeLink('');

                // Add to backend
                if (projectId) {
                    try {
                        const response = await addThumbnail(projectId, {
                            thumbnailUrl: fallbackUrl,
                            type: 'youtube-thumbnail',
                            x: pos.x,
                            y: pos.y,
                            width,
                            height,
                            naturalWidth: fallbackImg.naturalWidth,
                            naturalHeight: fallbackImg.naturalHeight,
                            youtubeVideoId: videoId
                        });

                        if (response.success && response.thumbnail) {
                            setCanvasElements(prev => prev.map(el =>
                                el.id === tempId ? { ...el, id: response.thumbnail.id } : el
                            ));
                        }
                    } catch (error) {
                        console.error('Failed to save YouTube thumbnail:', error);
                    }
                }
            };
            fallbackImg.src = fallbackUrl;
        };
        img.src = thumbnailUrl;
    }, [youtubeLink, addElementAtViewportCenter]);

    // Calculate generation credits based on model and selected options
    // Only Nano Banana Pro credits change based on resolution (2K/4K)
    const getGenerationCredits = useCallback((model: Model | null, res?: string) => {
        if (!model) return 0;

        // Only Nano Banana Pro - resolution affects credits
        if (model.id === 'nano-banana-pro' || model.baseModel === 'nano-banana-pro') {
            const r = res || model.defaultResolution || '2K';
            if (r === '4K') return 47;
            // 1K and 2K both cost 24 credits
            return 24;
        }

        // All other models have fixed credits
        return model.credits;
    }, []);

    // Memoized credits for sidebar (only pass resolution for nano-banana-pro)
    const sidebarCredits = getGenerationCredits(promptModel, resolution);

    // Prompt mode handlers
    const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPromptText(e.target.value);
    }, []);

    const handlePromptSubmit = useCallback(async () => {
        if (!promptText.trim() || !user?.email) return;
        if (isGenerating) return; // Prevent double submission

        setIsGenerating(true);
        setGenerationError(null);
        // Collapse sidebar on mobile when generation starts
        setIsMobileSidebarOpen(false);

        // Track generation start
        const startTime = Date.now();
        trackGenerationStart(
            'prompt',
            promptModel?.id || 'nano-banana-pro',
            isPromptModalOpen ? 'expanded' : 'sidebar',
            thumbnailCount,
            'free' // TODO: Get actual user plan
        );

        // Create placeholder elements for each thumbnail being generated
        // Default thumbnail size: 1920x1080 (16:9 aspect ratio)
        const defaultWidth = 1920;
        const defaultHeight = 1080;

        // Clear selection first, then add all elements with skipAnimation
        setSelectedElementIds([]);
        const newElementIds: string[] = [];

        for (let i = 0; i < thumbnailCount; i++) {
            const id = addElementAtViewportCenter('', 'generated', defaultWidth, defaultHeight, 'generating', true, promptText);
            if (id) newElementIds.push(id);
        }

        // Update placeholders with initial status
        setCanvasElements(prev => prev.map(el =>
            newElementIds.includes(el.id)
                ? { ...el, statusText: 'Queued...', progress: 0 }
                : el
        ));

        // After a short delay to let state update, fit all new elements in view with animation
        setTimeout(() => {
            if (newElementIds.length > 0) {
                fitElementsInView(newElementIds);
            }
        }, 50);

        // Convert attached images to base64 for backend (blob URLs are browser-local and can't be accessed by the server)
        const imageInputs: string[] = await Promise.all(
            attachedImages.map(img => new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(img.file);
            }))
        );

        // Track success for prompt clearing
        let hasError = false;

        // Generate thumbnails via API
        try {
            // Generate each thumbnail
            for (let i = 0; i < thumbnailCount; i++) {
                const elementId = newElementIds[i];
                if (!elementId) continue;

                const request: GenerateThumbnailRequest = {
                    userEmail: user.email || '',
                    userName: user.displayName || undefined,
                    prompt: promptText,
                    projectId: projectId,
                    gen_model: promptModel?.baseModel || promptModel?.id || 'nano-banana-pro',
                    aspectRatio: aspectRatio,
                    // Model-specific options
                    ...(promptModel?.options?.resolutions && resolution && { resolution }),
                    ...(promptModel?.options?.sizes && size && { size }),
                    ...(promptModel?.options?.megapixels && megapixels && { resolution: megapixels }), // Flux uses resolution field for MP
                    // Optional hints for intelligence layer
                    ...(selectedCategory && {
                        category: selectedCategory === 'custom' ? customCategory.trim() : selectedCategory
                    }),
                    ...(selectedTone && {
                        tone: selectedTone === 'custom' ? customTone.trim() : selectedTone
                    }),
                };

                // Add reference images if available (respect model limit)
                const modelLimit = promptModel?.maxImages || 10;
                if (imageInputs.length > 0) {
                    request.imageInput = imageInputs.slice(0, modelLimit);
                }

                // Start the generation job
                const startResponse = await startGenerationJob(request);

                if (!startResponse.success) {
                    throw new Error('Failed to start generation job');
                }

                console.log('Generation job started:', startResponse.jobId);

                // Poll for job completion with progress updates
                const result = await pollGenerationJob(
                    startResponse.jobId,
                    (status, progress) => {
                        // Update the placeholder element with current status and progress
                        setCanvasElements(prev => prev.map(el =>
                            el.id === elementId
                                ? { ...el, statusText: status, progress }
                                : el
                        ));
                    }
                );

                if (result.success && result.result.image) {
                    // Track successful generation
                    const durationMs = Date.now() - startTime;
                    trackGenerationSuccess('prompt', promptModel?.id || 'nano-banana-pro', durationMs, 'free');

                    // Update the element with the generated image
                    setCanvasElements(prev => prev.map(el =>
                        el.id === elementId
                            ? {
                                ...el,
                                id: result.result.thumbnail?.id || el.id, // Update ID to match backend
                                src: result.result.image,
                                status: 'complete' as const,
                                statusText: undefined,
                                progress: undefined,
                                naturalWidth: result.result.thumbnail?.naturalWidth || el.naturalWidth,
                                naturalHeight: result.result.thumbnail?.naturalHeight || el.naturalHeight,
                                prompt: result.result.thumbnail?.prompt || el.prompt || promptText,
                            }
                            : el
                    ));
                } else {
                    // Remove failed placeholder element and clear from selection
                    hasError = true;
                    const errorMsg = !result.success ? result.error : 'Failed to generate thumbnail';
                    trackGenerationFailure('prompt', errorMsg, 'free');
                    setCanvasElements(prev => prev.filter(el => el.id !== elementId));
                    setSelectedElementIds(prev => prev.filter(id => id !== elementId));
                    setToast({ message: errorMsg, type: 'error' });
                }
            }
        } catch (error) {
            console.error('Generation error:', error);
            hasError = true;

            const errorMessage = error instanceof Error ? error.message : 'Generation failed';

            // Check for insufficient credits error and show pricing modal
            if (errorMessage.toLowerCase().includes('insufficient credits')) {
                trackCreditsExhausted('free', 'generation');
                setPricingModalOpen(true);
            } else {
                trackGenerationFailure('prompt', errorMessage, 'free');
                setToast({ message: errorMessage, type: 'error' });
            }

            // Remove placeholder elements on error and clear from selection
            setCanvasElements(prev => prev.filter(el => !newElementIds.includes(el.id)));
            setSelectedElementIds(prev => prev.filter(id => !newElementIds.includes(id)));

        } finally {
            setIsGenerating(false);
            // Only clear input if there were no errors
            if (!hasError) {
                setPromptText('');
                setAttachedImages([]);
            }
        }
    }, [promptText, promptModel, thumbnailCount, addElementAtViewportCenter, fitElementsInView, user, projectId, isPublic, attachedImages, isGenerating, aspectRatio, resolution, size, megapixels]);

    const handleThumbnailCountChange = useCallback((count: number) => {
        setThumbnailCount(count);
        trackBatchCountChange(count, 'free');
    }, []);

    // Auto-trigger generation when template with autoGenerate flag is loaded
    useEffect(() => {
        if (pendingAutoGenerateRef.current && promptText && user?.email && !isGenerating && !isLoadingProject) {
            console.log('[Template] Auto-triggering generation for template');
            pendingAutoGenerateRef.current = false;
            // Small delay to ensure all state is settled
            const timer = setTimeout(() => {
                handlePromptSubmit();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [promptText, user?.email, isGenerating, isLoadingProject, handlePromptSubmit]);

    const handleCreateNewStyle = useCallback(() => {
        console.log('Create new style clicked');
        // TODO: Implement style creation logic
    }, []);

    // Inline Login Handler for Private Projects
    const handleInlineLogin = useCallback(async () => {
        try {
            // Set loading state just for the interaction if needed, 
            // but the main auth state change will trigger re-renders via useAuth
            const user = await signInWithGoogle();
            if (user) {
                // Clear error so we attempt to fetch again
                setProjectError(null);
                // Trigger a re-fetch effectively by resetting loading state or depending on user change
                setIsLoadingProject(true);
            }
        } catch (error) {
            console.error('Inline login failed:', error);
            setToast({ message: 'Login failed. Please try again.', type: 'error' });
        }
    }, []);

    // Image upload handler - registers with backend
    const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !projectId) return;

        // Track asset upload
        trackAssetUpload('image');

        // File upload restrictions
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
        const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total per batch
        const MAX_FILES = 20; // Max files per batch

        // Validate number of files
        if (files.length > MAX_FILES) {
            setToast({ message: `Maximum ${MAX_FILES} files allowed per upload`, type: 'error' });
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Validate file sizes
        let totalSize = 0;
        const oversizedFiles: string[] = [];

        for (const file of Array.from(files)) {
            totalSize += file.size;
            if (file.size > MAX_FILE_SIZE) {
                oversizedFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
            }
        }

        if (oversizedFiles.length > 0) {
            setToast({
                message: `File(s) too large (max 10MB each): ${oversizedFiles.slice(0, 2).join(', ')}${oversizedFiles.length > 2 ? '...' : ''}`,
                type: 'error'
            });
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        if (totalSize > MAX_TOTAL_SIZE) {
            setToast({
                message: `Total upload size too large (${(totalSize / 1024 / 1024).toFixed(1)}MB, max 50MB)`,
                type: 'error'
            });
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Use a local copy of elements to track position for concurrent uploads
        const runningElements = [...canvasElements];

        Array.from(files).forEach(async (file) => {
            // Use URL.createObjectURL for instant optimistic display (0ms latency)
            const objectUrl = URL.createObjectURL(file);

            // Convert to base64 in background for the actual upload
            const toBase64 = (f: File): Promise<string> => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(f);
            });

            // Start conversion immediately in background
            const base64Promise = toBase64(file);

            try {
                const img = new window.Image();

                img.onload = async () => {
                    if (!canvasContainerRef.current) return;

                    // Scale image
                    const scale = Math.min(1, 600 / img.naturalWidth);
                    const width = img.naturalWidth * scale;
                    const height = img.naturalHeight * scale;

                    const containerRect = canvasContainerRef.current.getBoundingClientRect();
                    const centerCanvas = screenToCanvas(
                        containerRect.left + containerRect.width / 2,
                        containerRect.top + containerRect.height / 2
                    );

                    const preferredX = centerCanvas.x - width / 2;
                    const preferredY = centerCanvas.y - height / 2;

                    // Find non-overlapping position using RUNNING list to avoid stacking
                    const pos = findNonOverlappingPosition(width, height, runningElements, preferredX, preferredY);

                    // Reserve this spot for next images in this batch
                    runningElements.push({
                        id: 'temp-' + Math.random(),
                        type: 'uploaded',
                        src: objectUrl,
                        x: pos.x,
                        y: pos.y,
                        width,
                        height,
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight,
                        aspectRatio: img.naturalWidth / img.naturalHeight,
                    } as CanvasElement);

                    // Add to canvas INSTANTLY with objectUrl and EXPLICIT position
                    const newId = addElementAtViewportCenter(
                        objectUrl,
                        'uploaded',
                        img.naturalWidth,
                        img.naturalHeight,
                        'uploading',
                        false,
                        undefined,
                        pos.x,
                        pos.y
                    );

                    // Register with backend
                    try {
                        const base64 = await base64Promise; // Wait for base64 conversion

                        const response = await uploadThumbnail(projectId, {
                            imageData: base64,
                            x: pos.x,
                            y: pos.y,
                            width,
                            height,
                            naturalWidth: img.naturalWidth,
                            naturalHeight: img.naturalHeight,
                            fileName: file.name,
                        });

                        if (response.success && response.thumbnail) {
                            setCanvasElements(prev => prev.map(el =>
                                el.id === newId ? {
                                    ...el,
                                    id: response.thumbnail.id,
                                    src: response.thumbnail.thumbnailUrl || base64,
                                    status: 'complete',
                                    statusText: undefined
                                } : el
                            ));
                            // Clean up object URL to avoid memory leaks
                            URL.revokeObjectURL(objectUrl);
                        }
                    } catch (error) {
                        console.error('Failed to upload thumbnail:', error);
                        const errorMsg = error instanceof Error ? error.message : 'Upload failed';
                        setToast({ message: errorMsg, type: 'error' });
                        setCanvasElements(prev => prev.filter(el => el.id !== newId));
                        URL.revokeObjectURL(objectUrl);
                    }
                };

                img.src = objectUrl;

            } catch (err) {
                console.error('Failed to process image:', err);
                URL.revokeObjectURL(objectUrl);
            }
        });

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [projectId, addElementAtViewportCenter, canvasElements, findNonOverlappingPosition, screenToCanvas]);



    const triggerImageUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Check if element is inside selection box
    const isElementInSelectionBox = useCallback((element: CanvasElement, box: SelectionBox) => {
        const minX = Math.min(box.startX, box.endX);
        const maxX = Math.max(box.startX, box.endX);
        const minY = Math.min(box.startY, box.endY);
        const maxY = Math.max(box.startY, box.endY);

        return (
            element.x < maxX &&
            element.x + element.width > minX &&
            element.y < maxY &&
            element.y + element.height > minY
        );
    }, []);

    // Mouse handlers
    const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isOnElement = target.closest(`.${styles.canvasElement}`);

        // Middle click or hand tool - start panning
        if (e.button === 1 || (e.button === 0 && (toolMode === 'hand' || isHandToolActive))) {
            setIsPanning(true);
            setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
            e.preventDefault();
            return;
        }

        // Left click on empty canvas - start rubberband selection
        if (e.button === 0 && !isOnElement && toolMode === 'select') {
            const canvasPos = screenToCanvas(e.clientX, e.clientY);

            if (!shiftPressed) {
                setSelectedElementIds([]);
            }

            setIsRubberbanding(true);
            setSelectionBox({
                startX: canvasPos.x,
                startY: canvasPos.y,
                endX: canvasPos.x,
                endY: canvasPos.y,
            });
            e.preventDefault();
        }
    }, [viewport, toolMode, isHandToolActive, screenToCanvas, shiftPressed]);

    const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
        // Panning
        if (isPanning) {
            setViewport(prev => ({
                ...prev,
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y,
            }));
            return;
        }

        // Rubberband selection
        if (isRubberbanding && selectionBox) {
            const canvasPos = screenToCanvas(e.clientX, e.clientY);
            setSelectionBox(prev => prev ? { ...prev, endX: canvasPos.x, endY: canvasPos.y } : null);
            return;
        }

        // Dragging elements with snap alignment
        if (dragState.isDragging && dragState.elementIds.length > 0) {
            const dx = (e.clientX - dragState.startX) / viewport.zoom;
            const dy = (e.clientY - dragState.startY) / viewport.zoom;

            // Calculate snap guides from other elements
            const otherElements = canvasElements.filter(el => !dragState.elementIds.includes(el.id));
            const snapXPositions: number[] = [];
            const snapYPositions: number[] = [];

            otherElements.forEach(el => {
                // Element edges and center
                snapXPositions.push(el.x, el.x + el.width / 2, el.x + el.width);
                snapYPositions.push(el.y, el.y + el.height / 2, el.y + el.height);
            });

            // Track active snap lines
            const activeSnapX: number[] = [];
            const activeSnapY: number[] = [];

            setCanvasElements(prev => prev.map(el => {
                const start = dragState.elementStarts.find(s => s.id === el.id);
                if (start) {
                    let newX = start.x + dx;
                    let newY = start.y + dy;

                    // Snap to other elements
                    const elLeft = newX;
                    const elCenterX = newX + el.width / 2;
                    const elRight = newX + el.width;
                    const elTop = newY;
                    const elCenterY = newY + el.height / 2;
                    const elBottom = newY + el.height;

                    // Check horizontal snapping
                    for (const sx of snapXPositions) {
                        if (Math.abs(elLeft - sx) < SNAP_THRESHOLD) {
                            newX = sx;
                            activeSnapX.push(sx);
                            break;
                        }
                        if (Math.abs(elCenterX - sx) < SNAP_THRESHOLD) {
                            newX = sx - el.width / 2;
                            activeSnapX.push(sx);
                            break;
                        }
                        if (Math.abs(elRight - sx) < SNAP_THRESHOLD) {
                            newX = sx - el.width;
                            activeSnapX.push(sx);
                            break;
                        }
                    }

                    // Check vertical snapping
                    for (const sy of snapYPositions) {
                        if (Math.abs(elTop - sy) < SNAP_THRESHOLD) {
                            newY = sy;
                            activeSnapY.push(sy);
                            break;
                        }
                        if (Math.abs(elCenterY - sy) < SNAP_THRESHOLD) {
                            newY = sy - el.height / 2;
                            activeSnapY.push(sy);
                            break;
                        }
                        if (Math.abs(elBottom - sy) < SNAP_THRESHOLD) {
                            newY = sy - el.height;
                            activeSnapY.push(sy);
                            break;
                        }
                    }

                    return { ...el, x: newX, y: newY };
                }
                return el;
            }));

            // Update snap lines for rendering
            setSnapLines({ x: activeSnapX, y: activeSnapY });
            return;
        }

        // Resizing elements (group resize)
        if (resizeState.isResizing && resizeState.elementIds.length > 0) {
            const dx = (e.clientX - resizeState.startX) / viewport.zoom;
            const dy = (e.clientY - resizeState.startY) / viewport.zoom;

            const handle = resizeState.handle;

            // Calculate new group bounding box based on handle
            let newGroupWidth = resizeState.groupStartWidth;
            let newGroupHeight = resizeState.groupStartHeight;
            let newGroupX = resizeState.groupStartX;
            let newGroupY = resizeState.groupStartY;

            // Maintain aspect ratio for the group
            const groupAspectRatio = resizeState.groupStartWidth / resizeState.groupStartHeight;

            if (handle === 'se') {
                newGroupWidth = Math.max(50, resizeState.groupStartWidth + dx);
                newGroupHeight = newGroupWidth / groupAspectRatio;
            } else if (handle === 'sw') {
                newGroupWidth = Math.max(50, resizeState.groupStartWidth - dx);
                newGroupHeight = newGroupWidth / groupAspectRatio;
                newGroupX = resizeState.groupStartX + (resizeState.groupStartWidth - newGroupWidth);
            } else if (handle === 'ne') {
                newGroupWidth = Math.max(50, resizeState.groupStartWidth + dx);
                newGroupHeight = newGroupWidth / groupAspectRatio;
                newGroupY = resizeState.groupStartY + (resizeState.groupStartHeight - newGroupHeight);
            } else if (handle === 'nw') {
                newGroupWidth = Math.max(50, resizeState.groupStartWidth - dx);
                newGroupHeight = newGroupWidth / groupAspectRatio;
                newGroupX = resizeState.groupStartX + (resizeState.groupStartWidth - newGroupWidth);
                newGroupY = resizeState.groupStartY + (resizeState.groupStartHeight - newGroupHeight);
            }

            // Calculate scale factors
            const scaleX = newGroupWidth / resizeState.groupStartWidth;
            const scaleY = newGroupHeight / resizeState.groupStartHeight;

            // Apply proportional scaling to all elements in the group
            setCanvasElements(prev => prev.map(el => {
                const elStart = resizeState.elementStarts.find(s => s.id === el.id);
                if (elStart) {
                    // Calculate relative position within the original group
                    const relX = elStart.x - resizeState.groupStartX;
                    const relY = elStart.y - resizeState.groupStartY;

                    // Apply scale and new group position
                    return {
                        ...el,
                        x: newGroupX + relX * scaleX,
                        y: newGroupY + relY * scaleY,
                        width: elStart.width * scaleX,
                        height: elStart.height * scaleY,
                    };
                }
                return el;
            }));
        }
    }, [isPanning, panStart, viewport.zoom, dragState, resizeState, canvasElements, isRubberbanding, selectionBox, screenToCanvas]);

    const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
        // Complete rubberband selection
        if (isRubberbanding && selectionBox) {
            const selectedIds = canvasElements
                .filter(el => isElementInSelectionBox(el, selectionBox))
                .map(el => el.id);

            if (shiftPressed) {
                setSelectedElementIds(prev => [...new Set([...prev, ...selectedIds])]);
            } else {
                setSelectedElementIds(selectedIds);
            }
        }

        // Persist position/size changes after drag or resize
        if (dragState.isDragging && dragState.elementIds.length > 0) {
            // Get current positions of dragged elements (exclude generating placeholders)
            const updates = canvasElements
                .filter(el => dragState.elementIds.includes(el.id) && el.status !== 'generating')
                .map(el => ({ id: el.id, x: el.x, y: el.y }));

            // Persist to backend (fire and forget) if there are any non-generating elements
            if (updates.length > 0) {
                updateThumbnailPositions(projectId, updates).catch(err => {
                    console.error('Failed to persist drag positions:', err);
                });
            }
        }

        if (resizeState.isResizing && resizeState.elementIds.length > 0) {
            // Get current positions and sizes of resized elements (exclude generating placeholders)
            const updates = canvasElements
                .filter(el => resizeState.elementIds.includes(el.id) && el.status !== 'generating')
                .map(el => ({ id: el.id, x: el.x, y: el.y, width: el.width, height: el.height }));

            // Persist to backend (fire and forget) if there are any non-generating elements
            if (updates.length > 0) {
                updateThumbnailPositions(projectId, updates).catch(err => {
                    console.error('Failed to persist resize positions:', err);
                });
            }
        }

        setIsPanning(false);
        setIsRubberbanding(false);
        setSelectionBox(null);
        setDragState(prev => ({ ...prev, isDragging: false, elementIds: [], elementStarts: [] }));
        setResizeState(prev => ({ ...prev, isResizing: false, elementIds: [], elementStarts: [] }));
        setSnapLines({ x: [], y: [] }); // Clear snap lines
    }, [isRubberbanding, selectionBox, canvasElements, isElementInSelectionBox, shiftPressed, dragState, resizeState, projectId]);

    // Element interaction handlers
    const handleElementMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
        // Block middle mouse button - only use it for panning
        if (e.button === 1) return;
        if (toolMode === 'hand' || isHandToolActive) return;
        e.stopPropagation();

        const isSelected = selectedElementIds.includes(elementId);
        let newSelectedIds: string[];

        if (shiftPressed) {
            // Toggle selection with shift
            if (isSelected) {
                newSelectedIds = selectedElementIds.filter(id => id !== elementId);
            } else {
                newSelectedIds = [...selectedElementIds, elementId];
            }
        } else if (!isSelected) {
            // Select only this element
            newSelectedIds = [elementId];
        } else {
            // Keep current selection for dragging
            newSelectedIds = selectedElementIds;
        }

        setSelectedElementIds(newSelectedIds);

        // In view mode, allow selection but not dragging
        if (viewMode) return;

        // Start dragging all selected elements
        const elementsToDrag = newSelectedIds.length > 0 ? newSelectedIds : [elementId];
        const elementStarts = canvasElements
            .filter(el => elementsToDrag.includes(el.id))
            .map(el => ({ id: el.id, x: el.x, y: el.y }));

        setDragState({
            isDragging: true,
            elementIds: elementsToDrag,
            startX: e.clientX,
            startY: e.clientY,
            elementStarts,
        });
    }, [canvasElements, selectedElementIds, shiftPressed, toolMode, isHandToolActive, viewMode]);

    const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
        e.stopPropagation();

        // Prevent resizing in view mode
        if (viewMode) return;

        // Get all selected elements
        const selectedElements = canvasElements.filter(el => selectedElementIds.includes(el.id));
        if (selectedElements.length === 0) return;

        // Calculate group bounding box
        const minX = Math.min(...selectedElements.map(el => el.x));
        const minY = Math.min(...selectedElements.map(el => el.y));
        const maxX = Math.max(...selectedElements.map(el => el.x + el.width));
        const maxY = Math.max(...selectedElements.map(el => el.y + el.height));

        const groupWidth = maxX - minX;
        const groupHeight = maxY - minY;

        // Store starting positions for all elements
        const elementStarts = selectedElements.map(el => ({
            id: el.id,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
        }));

        setResizeState({
            isResizing: true,
            elementIds: selectedElementIds,
            handle,
            startX: e.clientX,
            startY: e.clientY,
            groupStartX: minX,
            groupStartY: minY,
            groupStartWidth: groupWidth,
            groupStartHeight: groupHeight,
            elementStarts,
        });
    }, [canvasElements, selectedElementIds, viewMode]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if user is typing in an input field
            const isTyping = document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA';

            // Track modifier keys (always track these)
            if (e.key === 'Shift') setShiftPressed(true);
            if (e.key === 'Control') setCtrlPressed(true);

            // Skip canvas shortcuts if typing in input field
            if (isTyping) {
                // Only allow Escape to work while typing
                if (e.key === 'Escape') {
                    setSelectedElementIds([]);
                    setToolMode('select');
                    (document.activeElement as HTMLElement)?.blur();
                }
                return;
            }

            // H for hand tool
            if (e.key === 'h' || e.key === 'H') {
                setToolMode('hand');
                e.preventDefault();
            }

            // V for select tool
            if (e.key === 'v' || e.key === 'V') {
                setToolMode('select');
                e.preventDefault();
            }

            // Space for temporary hand tool
            if (e.code === 'Space' && !e.repeat) {
                setIsHandToolActive(true);
                e.preventDefault();
            }

            // Delete selected elements (only in edit mode)
            if (!viewMode && (e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.length > 0) {
                // Delete from backend (fire and forget)
                selectedElementIds.forEach(id => {
                    deleteThumbnail(projectId, id).catch(err => {
                        console.error('Failed to delete thumbnail:', err);
                    });
                });

                // Delete from local state
                setCanvasElements(prev => prev.filter(el => !selectedElementIds.includes(el.id)));

                // Clean up prompts and models for deleted elements
                setElementPrompts(prev => {
                    const newPrompts = { ...prev };
                    selectedElementIds.forEach(id => delete newPrompts[id]);
                    return newPrompts;
                });
                setElementModels(prev => {
                    const newModels = { ...prev };
                    selectedElementIds.forEach(id => delete newModels[id]);
                    return newModels;
                });

                setSelectedElementIds([]);
                e.preventDefault();
            }

            // Duplicate (Ctrl+D)
            if (e.ctrlKey && e.key === 'd' && selectedElementIds.length > 0) {
                e.preventDefault();
                const newElements: CanvasElement[] = [];

                canvasElements
                    .filter(el => selectedElementIds.includes(el.id))
                    .forEach(element => {
                        const newElement: CanvasElement = {
                            ...element,
                            id: crypto.randomUUID(),
                            x: element.x + 30,
                            y: element.y + 30,
                        };
                        newElements.push(newElement);
                    });

                setCanvasElements(prev => [...prev, ...newElements]);
                setSelectedElementIds(newElements.map(el => el.id));
            }

            // Select all (Ctrl+A)
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                setSelectedElementIds(canvasElements.map(el => el.id));
            }

            // Arrow keys to nudge
            if (selectedElementIds.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                const nudge = e.shiftKey ? 10 : 1;
                let dx = 0, dy = 0;
                if (e.key === 'ArrowUp') dy = -nudge;
                if (e.key === 'ArrowDown') dy = nudge;
                if (e.key === 'ArrowLeft') dx = -nudge;
                if (e.key === 'ArrowRight') dx = nudge;

                setCanvasElements(prev => {
                    const newElements = prev.map(el =>
                        selectedElementIds.includes(el.id)
                            ? { ...el, x: el.x + dx, y: el.y + dy }
                            : el
                    );

                    // Persist nudged positions (debounced via timeout, exclude generating placeholders)
                    const updates = newElements
                        .filter(el => selectedElementIds.includes(el.id) && el.status !== 'generating')
                        .map(el => ({ id: el.id, x: el.x, y: el.y }));

                    // Use a small delay to batch rapid arrow key presses
                    if (updates.length > 0) {
                        setTimeout(() => {
                            updateThumbnailPositions(projectId, updates).catch(err => {
                                console.error('Failed to persist nudge positions:', err);
                            });
                        }, 300);
                    }

                    return newElements;
                });
                e.preventDefault();
            }

            // Escape to deselect (only when not typing - already handled above)
            if (e.key === 'Escape') {
                setSelectedElementIds([]);
                setToolMode('select');
            }

            // Zoom shortcuts
            if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
                e.preventDefault();
                setViewport(prev => ({ ...prev, zoom: Math.min(10, prev.zoom * 1.2) }));
            }
            if (e.ctrlKey && e.key === '-') {
                e.preventDefault();
                setViewport(prev => ({ ...prev, zoom: Math.max(0.05, prev.zoom / 1.2) }));
            }
            if (e.ctrlKey && e.key === '0') {
                e.preventDefault();
                setViewport({ x: 0, y: 0, zoom: 1 });
            }
            if (e.ctrlKey && e.key === '1') {
                e.preventDefault();
                setViewport(prev => ({ ...prev, zoom: 1 }));
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') setShiftPressed(false);
            if (e.key === 'Control') setCtrlPressed(false);
            if (e.code === 'Space') setIsHandToolActive(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [selectedElementIds, canvasElements, projectId]);

    // Prevent browser zoom with Ctrl+scroll AND handle canvas zoom directly
    // Must handle zoom here because stopImmediatePropagation blocks React's onWheel
    useLayoutEffect(() => {
        // Store ref to check canvas bounds
        const checkIsInCanvas = (e: WheelEvent): boolean => {
            const mainCanvas = canvasMainRef.current;
            if (!mainCanvas) return false;

            const rect = mainCanvas.getBoundingClientRect();
            return e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom;
        };

        // The wheel event handler - prevent browser zoom AND handle canvas zoom
        const handleWheelZoom = (e: WheelEvent) => {
            // Skip wheel handling if event is inside a modal or any overlay
            const target = e.target as HTMLElement;
            if (target.closest('[class*="Modal"]') || target.closest('[class*="Overlay"]') || target.tagName === 'TEXTAREA') {
                return; // Allow native scroll behavior in modals and textareas
            }

            const isInCanvas = checkIsInCanvas(e);

            // Only act if mouse is over canvas
            if (!isInCanvas) return;

            // Ctrl/Meta + scroll = zoom
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                // Perform zoom
                const container = canvasContainerRef.current;
                if (!container) return;

                const rect = container.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

                setViewport(prev => {
                    const newZoom = Math.min(10, Math.max(0.05, prev.zoom * zoomFactor));
                    // Zoom centered on mouse position
                    const newX = mouseX - (mouseX - prev.x) * (newZoom / prev.zoom);
                    const newY = mouseY - (mouseY - prev.y) * (newZoom / prev.zoom);
                    return { x: newX, y: newY, zoom: newZoom };
                });
            } else {
                // Regular scroll = pan (slowed down by 0.4x for smoother control)
                e.preventDefault();
                setViewport(prev => ({
                    ...prev,
                    x: prev.x - e.deltaX * 0.4,
                    y: prev.y - e.deltaY * 0.4,
                }));
            }
        };

        // Attach to multiple targets in capture phase for maximum coverage
        const options = { passive: false, capture: true } as AddEventListenerOptions;

        document.addEventListener('wheel', handleWheelZoom, options);
        document.body.addEventListener('wheel', handleWheelZoom, options);
        window.addEventListener('wheel', handleWheelZoom, options);

        // Also prevent via keyboard event for Ctrl key press + scroll
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                document.body.style.touchAction = 'none';
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (!e.ctrlKey && !e.metaKey) {
                document.body.style.touchAction = '';
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('wheel', handleWheelZoom, { capture: true });
            document.body.removeEventListener('wheel', handleWheelZoom, { capture: true });
            window.removeEventListener('wheel', handleWheelZoom, { capture: true });
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            document.body.style.touchAction = '';
        };
    }, []);

    // Zoom controls
    const handleZoomIn = useCallback(() => {
        setViewport(prev => ({ ...prev, zoom: Math.min(10, prev.zoom * 1.2) }));
    }, []);

    const handleZoomOut = useCallback(() => {
        setViewport(prev => ({ ...prev, zoom: Math.max(0.05, prev.zoom / 1.2) }));
    }, []);

    const handleResetView = useCallback(() => {
        setViewport({ x: 0, y: 0, zoom: 1 });
    }, []);

    // Modify prompt handlers
    const handleModifyPromptChange = useCallback((elementId: string, value: string) => {
        setElementPrompts(prev => ({
            ...prev,
            [elementId]: value,
        }));
    }, []);

    const handleModifyPromptSubmit = useCallback(async (elementId: string) => {
        const prompt = elementPrompts[elementId];
        const model = elementModels[elementId] || DEFAULT_MODEL;
        const attachedImgs = modifyAttachedImages[elementId] || [];
        const sourceElement = canvasElements.find(el => el.id === elementId);

        // Get per-element options or use defaults
        const elAspectRatio = elementAspectRatios[elementId] || model.defaultAspectRatio || '16:9';
        const elResolution = elementResolutions[elementId] || model.defaultResolution;
        const elSize = elementSizes[elementId] || model.defaultSize;
        const elMegapixels = elementMegapixels[elementId] || model.defaultMegapixels;

        if (!prompt?.trim() || !user || isGenerating) return;

        setIsGenerating(true);
        setGenerationError(null);
        let hasError = false;

        let newId: string = '';

        try {
            // Calculate dimensions based on selected options
            const dims = getDimensionsFromAspectRatio(elAspectRatio, elResolution || elMegapixels || '2K');

            let displayWidth = dims.width;
            let displayHeight = dims.height;

            // If modifying an existing element, preserve the visual scale/width
            // This ensures the new variation doesn't look tiny or huge compared to the original
            if (sourceElement) {
                displayWidth = sourceElement.width;
                // Adjust height to match the new aspect ratio while keeping width fixed
                displayHeight = displayWidth * (dims.height / dims.width);
            }

            newId = addElementAtViewportCenter('', 'generated', displayWidth, displayHeight, 'generating', true, prompt);

            // Update placeholder with initial status
            if (newId) {
                setCanvasElements(prev => prev.map(el =>
                    el.id === newId
                        ? { ...el, statusText: 'Queued...', progress: 0 }
                        : el
                ));
            }

            // Animate to show the new placeholder
            if (newId) {
                setTimeout(() => {
                    fitElementsInView([newId]);
                }, 50);
            }

            // Prepare image inputs (include source element as reference if it has an image)
            const imageInputs: string[] = [];

            // Add the source element's image as a reference if available
            if (sourceElement?.src) {
                imageInputs.push(sourceElement.src);
            }

            // Add any attached reference images
            for (const img of attachedImgs) {
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(img.file);
                });
                imageInputs.push(base64);
            }

            // Build request
            const request: GenerateThumbnailRequest = {
                userEmail: user.email || '',
                userName: user.displayName || undefined,
                prompt: prompt,
                projectId: projectId,
                gen_model: model?.baseModel || model?.id || 'nano-banana-pro',
                aspectRatio: elAspectRatio,
                // Edit mode parameters
                type: 'edit',
                enable_intelligence: false, // Skip enhancement for faster editing
                refImages: sourceElement ? [{
                    type: sourceElement.type === 'youtube-thumbnail' ? 'youtube' : (sourceElement.type as any),
                    thumbnailId: sourceElement.id,
                    url: sourceElement.src
                }] : undefined,

                // Model-specific options
                ...(model?.options?.resolutions && elResolution && { resolution: elResolution }),
                ...(model?.options?.sizes && elSize && { size: elSize }),
                ...(model?.options?.megapixels && elMegapixels && { resolution: elMegapixels }),
            };

            // Add reference images if available (respect model limit)
            const modelLimit = model?.maxImages || 10;
            if (imageInputs.length > 0) {
                request.imageInput = imageInputs.slice(0, modelLimit);
            }

            // Start the generation job
            const startResponse = await startGenerationJob(request);

            if (!startResponse.success) {
                throw new Error('Failed to start generation job');
            }

            console.log('Modify generation job started:', startResponse.jobId);

            // Poll for job completion with progress updates
            const result = await pollGenerationJob(
                startResponse.jobId,
                (status, progress) => {
                    // Update the placeholder element with current status and progress
                    setCanvasElements(prev => prev.map(el =>
                        el.id === newId
                            ? { ...el, statusText: status, progress }
                            : el
                    ));
                }
            );

            if (result.success && result.result.image) {
                // Update the placeholder with the generated image
                setCanvasElements(prev => prev.map(el =>
                    el.id === newId
                        ? {
                            ...el,
                            id: result.result.thumbnail?.id || el.id, // Update ID to match backend
                            src: result.result.image,
                            status: 'complete' as const,
                            statusText: undefined,
                            progress: undefined,
                            prompt: result.result.thumbnail?.prompt || prompt,
                        }
                        : el
                ));
            } else {
                // Remove failed placeholder element and clear from selection
                hasError = true;
                const errorMsg = !result.success ? result.error : 'Failed to generate thumbnail';
                setCanvasElements(prev => prev.filter(el => el.id !== newId));
                setSelectedElementIds(prev => prev.filter(id => id !== newId));
                setToast({ message: errorMsg, type: 'error' });
            }
        } catch (error) {
            console.error('Modify generation error:', error);
            hasError = true;

            const errorMessage = error instanceof Error ? error.message : 'Generation failed';

            // Check for insufficient credits error and show pricing modal
            if (errorMessage.toLowerCase().includes('insufficient credits')) {
                setPricingModalOpen(true);
            } else {
                setToast({ message: errorMessage, type: 'error' });
            }

            // Remove placeholder on error and clear from selection
            setCanvasElements(prev => prev.filter(el => el.id !== newId));
            setSelectedElementIds(prev => prev.filter(id => id !== newId));
        } finally {
            setIsGenerating(false);

            // Only clear if no errors
            if (!hasError) {
                // Clear the prompt and attached images after submission
                setElementPrompts(prev => ({
                    ...prev,
                    [elementId]: '',
                }));
                setModifyAttachedImages(prev => ({
                    ...prev,
                    [elementId]: [],
                }));
            }
        }
    }, [elementPrompts, elementModels, modifyAttachedImages, canvasElements, user, isGenerating, projectId, isPublic, addElementAtViewportCenter, fitElementsInView, elementAspectRatios, elementResolutions, elementSizes, elementMegapixels]);

    const handleModifyPromptKeyDown = useCallback((elementId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleModifyPromptSubmit(elementId);
        }
    }, [handleModifyPromptSubmit]);

    const handleSelectModifyModel = useCallback((elementId: string, model: Model) => {
        setElementModels(prev => ({
            ...prev,
            [elementId]: model,
        }));
    }, []);

    // Smart Merge panel handlers
    const handleOpenSmartMerge = useCallback(() => {
        setShowSmartMergePanel(true);
        setSmartMergePanelPosition(null); // Reset position when opening
        setSmartMergeModel('nano-banana-pro'); // Default to Pro
    }, []);

    const handleCloseSmartMerge = useCallback(() => {
        setShowSmartMergePanel(false);
        setSmartMergeConfig(createDefaultSmartMergeConfig('gaming'));
        setShowAdvancedOptions(false);
        setSmartMergePanelPosition(null);
    }, []);

    // Smart Merge config update helpers
    const updateSmartMergeConfig = useCallback((updates: Partial<SmartMergeConfigType>) => {
        setSmartMergeConfig(prev => ({ ...prev, ...updates }));
    }, []);

    const handleContentTypeChange = useCallback((contentTypeId: string) => {
        // Only update content type and reset emotional tone to match new type
        // Preserve user's text preferences (includeText, textContent, textStyle, textPlacement)
        setSmartMergeConfig(prev => ({
            ...prev,
            contentType: contentTypeId,
            // Reset emotional tone to null so it uses the new content type's default
            emotionalTone: null,
        }));
    }, []);

    // Smart Merge panel drag handlers - store initial offset from panel position
    const [smartMergeDragOffset, setSmartMergeDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const handleSmartMergeDragStart = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        // Get current panel position to calculate offset
        const selectedElements = canvasElements.filter(el => selectedElementIds.includes(el.id));
        if (selectedElements.length === 0) return;

        const maxY = Math.max(...selectedElements.map(el => el.y + el.height));
        const minX = Math.min(...selectedElements.map(el => el.x));
        const maxX = Math.max(...selectedElements.map(el => el.x + el.width));
        const centerX = (minX + maxX) / 2;
        const formScale = Math.max(1, 1 / viewport.zoom);

        const currentPanelX = smartMergePanelPosition?.x ?? centerX;
        const currentPanelY = smartMergePanelPosition?.y ?? (maxY + (24 * formScale));

        // Store offset from mouse to panel center
        setSmartMergeDragOffset({
            x: e.clientX - currentPanelX * viewport.zoom - viewport.x,
            y: e.clientY - currentPanelY * viewport.zoom - viewport.y
        });

        setIsSmartMergeDragging(true);
    }, [canvasElements, selectedElementIds, viewport, smartMergePanelPosition]);

    const handleSmartMergeDragEnd = useCallback(() => {
        setIsSmartMergeDragging(false);
    }, []);

    // Handle drag move at document level
    useEffect(() => {
        if (!isSmartMergeDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            e.preventDefault();

            // Convert client coords to canvas coords and apply offset
            const newX = (e.clientX - smartMergeDragOffset.x - viewport.x) / viewport.zoom;
            const newY = (e.clientY - smartMergeDragOffset.y - viewport.y) / viewport.zoom;

            setSmartMergePanelPosition({ x: newX, y: newY });
        };

        const handleMouseUp = (e: MouseEvent) => {
            e.preventDefault();
            setIsSmartMergeDragging(false);
        };

        const preventTextSelection = (e: Event) => {
            e.preventDefault();
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('selectstart', preventTextSelection);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('selectstart', preventTextSelection);
        };
    }, [isSmartMergeDragging, smartMergeDragOffset, viewport]);

    const handleSmartMergeSubmit = useCallback(async () => {
        if (!smartMergeConfig.contentType || !projectId) {
            return;
        }

        setIsSmartMergeGenerating(true);
        setGenerationError(null);

        try {
            // Get selected asset URLs
            const selectedElements = canvasElements.filter(el => selectedElementIds.includes(el.id));
            const assetUrls = selectedElements.map(el => el.src);

            // Get resolution from model options
            const targetModel = AVAILABLE_MODELS.find(m => m.id === promptModel?.id) || AVAILABLE_MODELS[0];
            const dims = getDimensionsFromAspectRatio(aspectRatio || '16:9', resolution || (targetModel.options?.resolutions?.[0] || '2K'));
            const defaultWidth = dims.width;
            const defaultHeight = dims.height;

            // Create placeholder element with initial status
            setSelectedElementIds([]);
            const newId = addElementAtViewportCenter('', 'generated', defaultWidth, defaultHeight, 'generating', true);

            // Update placeholder with initial status text
            setCanvasElements(prev => prev.map(el =>
                el.id === newId
                    ? { ...el, statusText: 'Queued...', progress: 0 }
                    : el
            ));

            // Build Smart Merge request
            const request: SmartMergeRequest = {
                project_id: projectId,
                config: {
                    content_type: smartMergeConfig.contentType,
                    custom_content_description: smartMergeConfig.customContentDescription || undefined,
                    focus_subject_index: smartMergeConfig.focusSubjectIndex,
                    include_text: smartMergeConfig.includeText,
                    video_title: smartMergeConfig.videoTitle || undefined,
                    text_content: smartMergeConfig.textContent || undefined,
                    text_placement: smartMergeConfig.textPlacement,
                    text_style: smartMergeConfig.textStyle,
                    emotional_tone: smartMergeConfig.emotionalTone || undefined,
                },
                reference_images: assetUrls,
                aspect_ratio: aspectRatio || '16:9',
                resolution: resolution || '2K',
                model: smartMergeModel,
                width: defaultWidth,
                height: defaultHeight,
            };

            console.log('Smart Merge request:', request);

            // Animate to show the placeholder
            if (newId) {
                setTimeout(() => fitElementsInView([newId]), 50);
            }

            // Start the Smart Merge job
            const startResponse = await startSmartMergeJob(request);

            if (!startResponse.success) {
                throw new Error('Failed to start Smart Merge job');
            }

            console.log('Smart Merge job started:', startResponse.jobId);

            // Poll for job completion with progress updates
            const result = await pollSmartMergeJob(
                startResponse.jobId,
                (status, progress) => {
                    // Update the placeholder element with current status and progress
                    setCanvasElements(prev => prev.map(el =>
                        el.id === newId
                            ? { ...el, statusText: status, progress }
                            : el
                    ));
                }
            );

            if (result.success && result.result.thumbnail) {
                // Update placeholder with actual thumbnail
                setCanvasElements(prev => prev.map(el => {
                    if (el.id === newId) {
                        return {
                            ...el,
                            id: result.result.thumbnail.id,
                            src: result.result.thumbnail.thumbnailUrl,
                            status: 'complete' as const,
                            statusText: undefined,
                            progress: undefined,
                            prompt: result.result.thumbnail.prompt || undefined,
                        };
                    }
                    return el;
                }));

                console.log('Smart Merge success:', {
                    intelligence: result.result.intelligence,
                    thumbnail: result.result.thumbnail,
                });
            } else if (!result.success) {
                // Show error message with suggestion if available
                let errorMessage = result.error;
                if (result.suggestion) {
                    errorMessage += ` Suggestion: ${result.suggestion}`;
                }
                throw new Error(errorMessage);
            }

            handleCloseSmartMerge();
        } catch (error) {
            console.error('Smart Merge error:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to generate thumbnail';

            // Check for insufficient credits error and show pricing modal
            if (errorMessage.toLowerCase().includes('insufficient credits')) {
                setPricingModalOpen(true);
            } else {
                setToast({ message: errorMessage, type: 'error' });
            }

            // Remove placeholder on error and clear from selection
            setCanvasElements(prev => {
                const generatingIds = prev.filter(el => el.status === 'generating').map(el => el.id);
                // Clear these IDs from selection
                setSelectedElementIds(ids => ids.filter(id => !generatingIds.includes(id)));
                return prev.filter(el => el.status !== 'generating');
            });
        } finally {
            setIsSmartMergeGenerating(false);
        }
    }, [smartMergeConfig, canvasElements, selectedElementIds, projectId, promptModel, aspectRatio, resolution, addElementAtViewportCenter, fitElementsInView, handleCloseSmartMerge]);

    // Compute cursor style
    const getCursorStyle = () => {
        if (isPanning) return 'grabbing';
        if (toolMode === 'hand' || isHandToolActive) return 'grab';
        if (isRubberbanding) return 'crosshair';
        return 'default';
    };

    // Show loading state
    if (authLoading) {
        return (
            <LoadingSpinner theme={theme} text="Loading..." fullScreen />
        );
    }

    // In edit mode (not view mode), require authentication
    if (!user && !viewMode && !authLoading) {
        return null; // Will trigger redirect in useAuth
    }

    // Show loading state while fetching project data
    if (isLoadingProject) {
        return (
            <LoadingSpinner theme={theme} text="Loading project..." fullScreen />
        );
    }

    // Show error state (Private Project)
    if (projectError === 'access-denied') {
        return (
            <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : styles.lightTheme}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V10C20 8.89543 19.1046 8 18 8H6C4.89543 8 4 8.89543 4 10V19C4 20.1046 4.89543 21 6 21ZM16 8V6C16 3.79086 14.2091 2 12 2C9.79086 2 8 3.79086 8 6V8H16Z" stroke={theme === 'dark' ? '#fff' : '#000'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>Private Project</h1>
                    <p style={{ marginBottom: '32px', opacity: 0.7, lineHeight: 1.5 }}>
                        This project is private. Please log in with an authorized account to view it.
                    </p>
                    <button
                        onClick={handleInlineLogin}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            backgroundColor: theme === 'dark' ? '#fff' : '#000',
                            color: theme === 'dark' ? '#000' : '#fff',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            transition: 'transform 0.2s',
                        }}
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                            <path
                                fill={theme === 'dark' ? '#4285F4' : '#fff'} // Use Google colors or simple specific
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill={theme === 'dark' ? '#34A853' : '#fff'}
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill={theme === 'dark' ? '#FBBC05' : '#fff'}
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill={theme === 'dark' ? '#EA4335' : '#fff'}
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        <span>Sign in with Google</span>
                    </button>
                </div>
            </div>
        );
    }

    // Show error state (Not Found)
    if (projectError === 'not-found') {
        return (
            <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : styles.lightTheme}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>Project Not Found</h1>
                    <p style={{ marginBottom: '32px', opacity: 0.7 }}>
                        The project you're looking for doesn't exist or has been deleted.
                    </p>
                    <Link
                        href={user ? "/dashboard" : "/"}
                        style={{
                            display: 'inline-block',
                            backgroundColor: theme === 'dark' ? '#333' : '#eee',
                            color: theme === 'dark' ? '#fff' : '#000',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            textDecoration: 'none'
                        }}
                    >
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : styles.lightTheme}`}>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                multiple
                accept=".jpg,.jpeg,.png,.webp"
                type="file"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                aria-hidden="true"
            />

            {/* Hidden file input for modify prompt attachments */}
            <input
                ref={modifyImageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                    const files = e.target.files;
                    if (!files || !activeModifyElementId) return;

                    // File size validation (max 10MB per file)
                    const MAX_REF_FILE_SIZE = 10 * 1024 * 1024;
                    const oversizedFiles = Array.from(files).filter(f => f.size > MAX_REF_FILE_SIZE);
                    if (oversizedFiles.length > 0) {
                        setToast({ message: 'Reference images must be under 10MB each', type: 'error' });
                        if (modifyImageInputRef.current) modifyImageInputRef.current.value = '';
                        return;
                    }

                    const newImages = Array.from(files).map(file => ({
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        file,
                        preview: URL.createObjectURL(file)
                    }));
                    setModifyAttachedImages(prev => ({
                        ...prev,
                        [activeModifyElementId]: [...(prev[activeModifyElementId] || []), ...newImages]
                    }));
                    setActiveModifyElementId(null);
                    if (modifyImageInputRef.current) {
                        modifyImageInputRef.current.value = '';
                    }
                }}
                style={{ display: 'none' }}
                aria-hidden="true"
            />

            {/* Mobile Sidebar Toggle Button */}
            <button
                className={styles.mobileSidebarToggle}
                onClick={() => setIsMobileSidebarOpen(prev => !prev)}
                aria-label={isMobileSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
                {isMobileSidebarOpen ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </button>

            {/* Left Sidebar */}
            <aside className={`${styles.sidebar} ${isMobileSidebarOpen ? styles.sidebarOpen : ''}`}>
                <div className={styles.sidebarHeader}>
                    <button
                        className={styles.backButton}
                        onClick={handleBack}
                        aria-label="Go back to dashboard"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 19L8 12L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <h1 className={styles.projectTitle}>{projectName}</h1>
                </div>

                {viewMode && (
                    <div className={styles.viewModeCta}>
                        <div className={styles.viewModeCtaHeader}>
                            <div className={styles.viewModeCtaIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            </div>
                            <h2 className={styles.viewModeCtaTitle}>Viewing Shared Project</h2>
                        </div>

                        <p className={styles.viewModeCtaDescription}>
                            {!user
                                ? "Like what you see? Create stunning YouTube thumbnails with AI - no design skills needed."
                                : "You're viewing someone else's creation. Ready to make your own?"
                            }
                        </p>

                        {!user && (
                            <>
                                <div className={styles.viewModeCtaFeatures}>
                                    <div className={styles.viewModeCtaFeature}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span>AI-powered thumbnail generation</span>
                                    </div>
                                    <div className={styles.viewModeCtaFeature}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span>Smart merge multiple images</span>
                                    </div>
                                    <div className={styles.viewModeCtaFeature}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span>Free credits to get started</span>
                                    </div>
                                </div>

                                <button
                                    className={styles.viewModeCtaButton}
                                    onClick={async () => {
                                        try {
                                            await signInWithGoogle();
                                            router.push('/dashboard');
                                        } catch (err: unknown) {
                                            const firebaseError = err as { code?: string };
                                            if (firebaseError.code !== 'auth/popup-closed-by-user' &&
                                                firebaseError.code !== 'auth/cancelled-popup-request') {
                                                console.error('Sign in error:', err);
                                            }
                                        }
                                    }}
                                >
                                    <svg className={styles.viewModeCtaButtonIcon} viewBox="0 0 24 24" aria-hidden="true">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Sign in with Google
                                </button>

                                <p className={styles.viewModeCtaHint}>Free to start - no credit card required</p>
                            </>
                        )}

                        {user && (
                            <>
                                <button
                                    className={`${styles.viewModeCtaButton} ${styles.viewModeCtaButtonPrimary}`}
                                    onClick={() => router.push('/dashboard')}
                                >
                                    <svg className={styles.viewModeCtaButtonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    Create Your Own Project
                                </button>

                                <div className={styles.viewModeCtaDivider}>
                                    <span className={styles.viewModeCtaDividerLine} />
                                    <span className={styles.viewModeCtaDividerText}>or</span>
                                    <span className={styles.viewModeCtaDividerLine} />
                                </div>

                                <p className={styles.viewModeCtaHint}>
                                    Continue exploring - you can zoom, pan, and export thumbnails
                                </p>
                            </>
                        )}
                    </div>
                )}

                {!viewMode && (
                    <>
                        <div className={styles.publicToggleContainer}>
                            <span className={styles.publicToggleLabel}>Make project public</span>
                            <button
                                className={`${styles.toggleSwitch} ${isPublic ? styles.toggleActive : ''}`}
                                onClick={handleTogglePublic}
                                role="switch"
                                aria-checked={isPublic}
                            >
                                <span className={styles.toggleKnob} />
                            </button>
                        </div>

                        <div className={styles.createNewSection}>
                            <h2 className={styles.createNewTitle}>Create New</h2>
                            <div className={styles.createOptionsGrid}>
                                <button
                                    className={`${styles.createOption} ${selectedMode === 'prompt' ? styles.createOptionSelected : ''}`}
                                    onClick={() => handleModeSelect('prompt')}
                                >
                                    <div className={styles.createOptionIcon}>
                                        <Image src="/assets/project/icons/prompt.svg" alt="" width={34} height={34} />
                                    </div>
                                    <span className={styles.createOptionLabel}>Prompt</span>
                                </button>

                                <button
                                    className={`${styles.createOption} ${selectedMode === 'url' ? styles.createOptionSelected : ''}`}
                                    onClick={() => {
                                        handleModeSelect('url');
                                        if (selectedMode !== 'url') {
                                            setShowUrlPopup(true);
                                        } else {
                                            setShowUrlPopup(!showUrlPopup);
                                        }
                                    }}
                                >
                                    <div className={styles.createOptionIcon}>
                                        <Image src="/assets/project/icons/attachment-02-stroke-rounded 1.svg" alt="" width={34} height={34} />
                                    </div>
                                    <span className={styles.createOptionLabel}>Using URL</span>
                                </button>
                            </div>

                            {/* URL Input - appears below tiles when URL mode is selected */}
                            {selectedMode === 'url' && showUrlPopup && (
                                <div className={styles.urlInputSection}>
                                    <div className={`${styles.urlPopupInput} ${youtubeLinkError ? styles.urlPopupInputError : ''}`}>
                                        <input
                                            ref={youtubeLinkInputRef}
                                            type="text"
                                            value={youtubeLink}
                                            onChange={(e) => {
                                                setYoutubeLink(e.target.value);
                                                setYoutubeLinkError(null);
                                            }}
                                            placeholder="Paste YouTube URL"
                                            className={styles.urlInput}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleYoutubeLinkSubmit();
                                                }
                                            }}
                                        />
                                        <button
                                            className={styles.urlSubmitButton}
                                            onClick={handleYoutubeLinkSubmit}
                                            disabled={!youtubeLink.trim()}
                                        >
                                            <Image src="/assets/project/icons/send-prompt.svg" alt="" width={16} height={16} />
                                        </button>
                                    </div>
                                    {youtubeLinkError && <p className={styles.urlPopupError}>{youtubeLinkError}</p>}
                                </div>
                            )}
                        </div>

                        {selectedMode === 'prompt' && (
                            <div className={styles.promptInputSection}>
                                {/* Prompt Container */}
                                <div className={styles.promptInputContainer}>
                                    {/* Expand Button */}
                                    <button
                                        className={styles.expandPromptButton}
                                        onClick={() => {
                                            setIsPromptModalOpen(true);
                                            trackPromptEditorOpen('expanded');
                                        }}
                                        title="Expand prompt editor"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M15 3H21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M9 21H3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M21 3L14 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M3 21L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                    <HighlightedPromptEditor
                                        value={promptText}
                                        onChange={handlePromptChange}
                                        placeholder="Describe your thumbnail"
                                        className={styles.promptTextarea}
                                        theme={theme}
                                        rows={1}
                                    />

                                    <div className={styles.promptButtonsRow}>
                                        {/* Left side actions: Add Image & Model Selector */}
                                        <div className={styles.promptActionsLeft}>
                                            <button
                                                className={styles.addButton}
                                                title="Add reference image"
                                                onClick={() => promptImageInputRef.current?.click()}
                                            >
                                                <Image src="/assets/project/icons/add-image.svg" alt="" width={24} height={24} />
                                            </button>
                                            <input
                                                ref={promptImageInputRef}
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={(e) => {
                                                    const files = e.target.files;
                                                    if (!files) return;

                                                    // File size validation (max 10MB per file)
                                                    const MAX_REF_FILE_SIZE = 10 * 1024 * 1024;
                                                    const oversizedFiles = Array.from(files).filter(f => f.size > MAX_REF_FILE_SIZE);
                                                    if (oversizedFiles.length > 0) {
                                                        setToast({ message: 'Reference images must be under 10MB each', type: 'error' });
                                                        if (promptImageInputRef.current) promptImageInputRef.current.value = '';
                                                        return;
                                                    }

                                                    const newImages = Array.from(files).map(file => ({
                                                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                                        file,
                                                        preview: URL.createObjectURL(file)
                                                    }));
                                                    setAttachedImages(prev => [...prev, ...newImages]);
                                                    if (promptImageInputRef.current) {
                                                        promptImageInputRef.current.value = '';
                                                    }
                                                }}
                                                style={{ display: 'none' }}
                                                aria-label="Upload reference image"
                                            />
                                            <div className={styles.promptDropdownWrapper}>
                                                <ModelDropdown
                                                    selectedModel={promptModel}
                                                    onSelectModel={setPromptModel}
                                                    theme={theme}
                                                    openUpward
                                                    showLabel
                                                    className={styles.ghostTrigger}
                                                />
                                            </div>
                                        </div>

                                        {/* Right side actions: Cost & Submit */}
                                        <div className={styles.promptActionsRight}>
                                            <div className={styles.costDisplay} title="Cost in credits">
                                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                    <circle cx="7" cy="7" r="6.5" fill="#DA9A28" stroke="#DA9A28" />
                                                    <path d="M7 3.5V10.5M4.5 7H9.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                                                </svg>
                                                <span>{sidebarCredits}</span>
                                            </div>
                                            <button
                                                className={styles.submitButton}
                                                onClick={handlePromptSubmit}
                                                disabled={!promptText.trim()}
                                                title="Generate Thumbnail"
                                            >
                                                <Image src="/assets/project/icons/send-prompt.svg" alt="" width={20} height={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Model-specific options */}
                                {promptModel?.options && (
                                    <ModelOptionsBar
                                        model={promptModel}
                                        aspectRatio={aspectRatio}
                                        resolution={resolution}
                                        size={size}
                                        megapixels={megapixels}
                                        onAspectRatioChange={setAspectRatio}
                                        onResolutionChange={setResolution}
                                        onSizeChange={setSize}
                                        onMegapixelsChange={setMegapixels}
                                        theme={theme}
                                        showMatchInput={attachedImages.length > 0}
                                    />
                                )}

                                {/* Attached Images Preview */}
                                {attachedImages.length > 0 && (
                                    <div className={styles.attachedImagesSection}>
                                        <div className={styles.attachedImagesHeader}>
                                            <span className={styles.attachedImagesLabel}>Reference Images</span>
                                            <div className={styles.attachedImagesHintWrapper}>
                                                <button
                                                    className={styles.attachedImagesHint}
                                                    onClick={() => setShowSidebarTooltip(!showSidebarTooltip)}
                                                    onBlur={() => setTimeout(() => setShowSidebarTooltip(false), 200)}
                                                >
                                                    💡 Tip
                                                </button>
                                                {showSidebarTooltip && (
                                                    <div className={styles.sidebarTooltip}>
                                                        Reference images in prompts: 'Use the face from Image 1 with the style of Image 2'
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles.attachedImagesContainer}>
                                            {attachedImages.map((img, index) => (
                                                <div key={img.id} className={styles.attachedImageWrapper}>
                                                    <div className={styles.attachedImageIndex}>{index + 1}</div>
                                                    <Image
                                                        src={img.preview}
                                                        alt={`Image ${index + 1}: ${img.file.name}`}
                                                        width={60}
                                                        height={60}
                                                        className={styles.attachedImagePreview}
                                                    />
                                                    <button
                                                        className={styles.removeImageButton}
                                                        onClick={() => {
                                                            setAttachedImages(prev => {
                                                                const imageToRemove = prev.find(i => i.id === img.id);
                                                                if (imageToRemove) {
                                                                    URL.revokeObjectURL(imageToRemove.preview);
                                                                }
                                                                return prev.filter(i => i.id !== img.id);
                                                            });
                                                        }}
                                                        aria-label={`Remove ${img.file.name}`}
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </button>
                                                    <span className={styles.attachedImageName}>{img.file.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Optional Category & Tone Hints */}
                                <div className={styles.optionalHintsSection}>
                                    <span className={styles.optionalHintsLabel}>Category</span>
                                    <div
                                        className={styles.chipsContainer}
                                        onMouseDown={(e) => {
                                            const container = e.currentTarget;
                                            const startX = e.pageX - container.offsetLeft;
                                            const scrollLeft = container.scrollLeft;
                                            const onMouseMove = (e: MouseEvent) => {
                                                const x = e.pageX - container.offsetLeft;
                                                container.scrollLeft = scrollLeft - (x - startX);
                                            };
                                            const onMouseUp = () => {
                                                document.removeEventListener('mousemove', onMouseMove);
                                                document.removeEventListener('mouseup', onMouseUp);
                                            };
                                            document.addEventListener('mousemove', onMouseMove);
                                            document.addEventListener('mouseup', onMouseUp);
                                        }}
                                    >
                                        {CATEGORY_OPTIONS.map((cat) => (
                                            <button
                                                key={cat.id}
                                                className={`${styles.hintChip} ${selectedCategory === cat.id ? styles.hintChipActive : ''}`}
                                                onClick={() => {
                                                    setSelectedCategory(prev => prev === cat.id ? null : cat.id);
                                                    if (selectedCategory !== cat.id) setCustomCategory('');
                                                }}
                                                type="button"
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                        <button
                                            className={`${styles.hintChip} ${selectedCategory === 'custom' ? styles.hintChipActive : ''}`}
                                            onClick={() => setSelectedCategory(prev => prev === 'custom' ? null : 'custom')}
                                            type="button"
                                        >
                                            Custom
                                        </button>
                                    </div>
                                    {selectedCategory === 'custom' && (
                                        <div className={styles.customHintInputWrapper}>
                                            <input
                                                type="text"
                                                className={`${styles.customHintInput} ${customCategory.trim() ? styles.customHintInputFilled : ''}`}
                                                placeholder="e.g. Fitness, Music, ASMR..."
                                                value={customCategory}
                                                onChange={(e) => setCustomCategory(e.target.value.slice(0, 50))}
                                                maxLength={50}
                                            />
                                            {customCategory.trim() && (
                                                <span className={styles.customHintCheck}>✓</span>
                                            )}
                                        </div>
                                    )}
                                    <span className={styles.optionalHintsLabel}>Tone</span>
                                    <div
                                        className={styles.chipsContainer}
                                        onMouseDown={(e) => {
                                            const container = e.currentTarget;
                                            const startX = e.pageX - container.offsetLeft;
                                            const scrollLeft = container.scrollLeft;
                                            const onMouseMove = (e: MouseEvent) => {
                                                const x = e.pageX - container.offsetLeft;
                                                container.scrollLeft = scrollLeft - (x - startX);
                                            };
                                            const onMouseUp = () => {
                                                document.removeEventListener('mousemove', onMouseMove);
                                                document.removeEventListener('mouseup', onMouseUp);
                                            };
                                            document.addEventListener('mousemove', onMouseMove);
                                            document.addEventListener('mouseup', onMouseUp);
                                        }}
                                    >
                                        {TONE_OPTIONS.map((tone) => (
                                            <button
                                                key={tone.id}
                                                className={`${styles.hintChip} ${selectedTone === tone.id ? styles.hintChipActive : ''}`}
                                                onClick={() => {
                                                    setSelectedTone(prev => prev === tone.id ? null : tone.id);
                                                    if (selectedTone !== tone.id) setCustomTone('');
                                                }}
                                                type="button"
                                            >
                                                {tone.label}
                                            </button>
                                        ))}
                                        <button
                                            className={`${styles.hintChip} ${selectedTone === 'custom' ? styles.hintChipActive : ''}`}
                                            onClick={() => setSelectedTone(prev => prev === 'custom' ? null : 'custom')}
                                            type="button"
                                        >
                                            Custom
                                        </button>
                                    </div>
                                    {selectedTone === 'custom' && (
                                        <div className={styles.customHintInputWrapper}>
                                            <input
                                                type="text"
                                                className={`${styles.customHintInput} ${customTone.trim() ? styles.customHintInputFilled : ''}`}
                                                placeholder="e.g. Mysterious, Exciting, Cozy..."
                                                value={customTone}
                                                onChange={(e) => setCustomTone(e.target.value.slice(0, 50))}
                                                maxLength={50}
                                            />
                                            {customTone.trim() && (
                                                <span className={styles.customHintCheck}>✓</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Thumbnail Count Selector */}
                                <div className={styles.thumbnailCountSection}>
                                    <span className={styles.thumbnailCountLabel}>Thumbnails to generate</span>
                                    <div className={styles.thumbnailCountButtons}>
                                        {[1, 2, 3, 4].map((count) => (
                                            <button
                                                key={count}
                                                className={`${styles.countButton} ${thumbnailCount === count ? styles.countButtonActive : ''}`}
                                                onClick={() => handleThumbnailCountChange(count)}
                                            >
                                                {count}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Sidebar Bottom Stats */}
                <div className={styles.sidebarBottomStats}>
                    <span className={styles.sidebarStatItem}>
                        {canvasElements.filter(el =>
                            (el.type === 'generated' || el.type === 'smart-merge' || el.type === 'edit') &&
                            el.status === 'complete'
                        ).length} generated
                    </span>
                    <span className={styles.sidebarStatDot}>•</span>
                    <span className={styles.sidebarStatItem}>
                        {canvasElements.filter(el => el.type === 'image' || el.type === 'youtube-thumbnail').length} uploaded
                    </span>
                </div>
            </aside>

            {/* Main Canvas Area */}
            <main
                ref={canvasMainRef}
                className={styles.canvas}
                style={{ cursor: getCursorStyle() }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onContextMenu={(e) => e.preventDefault()}
            >
                {/* Top Right Controls (Credits + Export) */}
                <div className={styles.topRightControls}>
                    {/* Credits Badge */}
                    {userData && (
                        <div className={styles.creditsBadge}>
                            <Image
                                src="/assets/dashboard/icons/credits.svg"
                                alt=""
                                width={16}
                                height={16}
                                className={styles.creditsBadgeIcon}
                                aria-hidden="true"
                            />
                            <span className={styles.creditsBadgeText}>{calculateTotalCredits(userData).toLocaleString()}</span>
                        </div>
                    )}

                    {/* Export button - visible when elements are selected */}
                    {selectedElementIds.length > 0 && (
                        <AnimatedBorder radius={10} borderWidth={1.5} gap={2} borderColor="#ff6f61" className={styles.exportButtonWrapper}>
                            <button
                                className={styles.exportButton}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    e.preventDefault();

                                    // Get selected elements
                                    const selectedElements = canvasElements.filter(el => selectedElementIds.includes(el.id));

                                    if (selectedElements.length === 0) {
                                        alert('No thumbnails selected');
                                        return;
                                    }

                                    console.log('Exporting', selectedElements.length, 'thumbnails');

                                    for (let i = 0; i < selectedElements.length; i++) {
                                        const element = selectedElements[i];

                                        // Name file with prompt if available
                                        let fileName = `thumbnail-${i + 1}`;
                                        if (element.prompt) {
                                            // Sanitize prompt to be safe for filenames
                                            const safePrompt = element.prompt
                                                .replace(/[^a-z0-9\s-]/gi, '') // Remove special chars
                                                .trim()
                                                .replace(/\s+/g, '-') // Replace spaces with hyphens
                                                .substring(0, 50); // Limit length

                                            if (safePrompt) {
                                                fileName = safePrompt;
                                            }
                                        }
                                        // Handle duplicates by appending index if generating multiple
                                        if (selectedElements.length > 1) {
                                            fileName += `-${i + 1}`;
                                        }
                                        const filename = `${fileName}.png`;

                                        console.log('Downloading:', element.src.substring(0, 100) + '...');

                                        try {
                                            // Fetch the image
                                            const response = await fetch(element.src);

                                            if (!response.ok) {
                                                throw new Error(`HTTP ${response.status}`);
                                            }

                                            const blob = await response.blob();
                                            console.log('Got blob:', blob.size, 'bytes, type:', blob.type);

                                            // Create download link
                                            const url = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = filename;
                                            link.click();

                                            // Cleanup
                                            window.URL.revokeObjectURL(url);

                                            console.log('Download triggered for:', filename);

                                            // Track download and export
                                            trackThumbnailDownload(projectId, element.id).catch(console.error);
                                            trackCanvasExport('png', 'original', 'free');

                                            // Small delay between downloads
                                            if (i < selectedElements.length - 1) {
                                                await new Promise(r => setTimeout(r, 500));
                                            }
                                        } catch (err) {
                                            console.error('Download failed:', err);
                                            // Fallback: open in new tab
                                            window.open(element.src, '_blank');
                                        }
                                    }
                                }}
                                title="Export selected thumbnails"
                            >
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Export
                            </button>
                        </AnimatedBorder>
                    )}
                </div>

                <div ref={canvasContainerRef} className={styles.canvasViewport}>
                    {/* Infinite canvas workspace */}
                    <div
                        className={styles.canvasWorkspace}
                        style={{
                            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                        }}
                    >
                        {/* Canvas elements */}
                        {canvasElements.map(element => (
                            <CanvasItem
                                key={element.id}
                                element={element}
                                isSelected={selectedElementIds.includes(element.id)}
                                onMouseDown={handleElementMouseDown}
                                theme={theme}
                            />
                        ))}

                        {/* Unified group bounding box with resize handles */}
                        {selectedElementIds.length > 0 && (() => {
                            const selectedElements = canvasElements.filter(el => selectedElementIds.includes(el.id));
                            if (selectedElements.length === 0) return null;

                            const minX = Math.min(...selectedElements.map(el => el.x));
                            const minY = Math.min(...selectedElements.map(el => el.y));
                            const maxX = Math.max(...selectedElements.map(el => el.x + el.width));
                            const maxY = Math.max(...selectedElements.map(el => el.y + el.height));

                            // Use natural dimensions for display (original image size, not scaled canvas size)
                            // For single element, use its natural dims; for multiple, sum up or use first element
                            let displayWidth: number;
                            let displayHeight: number;

                            if (selectedElements.length === 1) {
                                // Single element - show its natural dimensions
                                displayWidth = selectedElements[0].naturalWidth || selectedElements[0].width || 1920;
                                displayHeight = selectedElements[0].naturalHeight || selectedElements[0].height || 1080;
                            } else {
                                // Multiple elements - show first element's natural dimensions
                                displayWidth = selectedElements[0].naturalWidth || selectedElements[0].width || 1920;
                                displayHeight = selectedElements[0].naturalHeight || selectedElements[0].height || 1080;
                            }

                            // Ensure we never show 0 dimensions
                            if (!displayWidth || displayWidth <= 0) displayWidth = 1920;
                            if (!displayHeight || displayHeight <= 0) displayHeight = 1080;

                            // Calculate fuzzy aspect ratio for display
                            const getApproxRatio = (w: number, h: number) => {
                                // Defensive: prevent NaN
                                if (!w || !h || w <= 0 || h <= 0) return '16:9';

                                const r = w / h;
                                const tolerance = 0.05;
                                const standardRatios = [
                                    { w: 16, h: 9, val: 16 / 9 },
                                    { w: 9, h: 16, val: 9 / 16 },
                                    { w: 4, h: 3, val: 4 / 3 },
                                    { w: 3, h: 4, val: 3 / 4 },
                                    { w: 1, h: 1, val: 1 },
                                    { w: 3, h: 2, val: 3 / 2 },
                                    { w: 2, h: 3, val: 2 / 3 },
                                    { w: 21, h: 9, val: 21 / 9 },
                                    { w: 5, h: 4, val: 5 / 4 },
                                    { w: 4, h: 5, val: 4 / 5 },
                                ];

                                for (const ratio of standardRatios) {
                                    if (Math.abs(r - ratio.val) < tolerance) {
                                        return `${ratio.w}:${ratio.h}`;
                                    }
                                }

                                // Fallback to simplified GCD if no standard match
                                const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
                                const divisor = gcd(Math.round(w), Math.round(h));
                                return `${Math.round(w) / divisor}:${Math.round(h) / divisor}`;
                            };

                            const aspectRatioStr = getApproxRatio(displayWidth, displayHeight);

                            // Calculate zoom-aware scale for dimensions display (same approach as button)
                            const MAX_DIMS_SCALE = 1 / 0.36; // ~2.78 max at 36% zoom
                            const MIN_DIMS_SCALE = 1;
                            const dimsScale = Math.min(Math.max(1 / viewport.zoom, MIN_DIMS_SCALE), MAX_DIMS_SCALE);

                            return (
                                <>
                                    {/* Dimensions display above top-left - only for single element */}
                                    {selectedElements.length === 1 && (
                                        <div
                                            className={styles.elementDimensionsDisplay}
                                            style={{
                                                left: minX,
                                                top: minY - 28,
                                                transform: `scale(${dimsScale})`,
                                                transformOrigin: 'bottom left',
                                            }}
                                        >
                                            <span className={styles.dimensionsRatio}>{aspectRatioStr}</span>
                                        </div>
                                    )}

                                    <div
                                        className={styles.groupBoundingBox}
                                        style={{
                                            left: minX - 2,
                                            top: minY - 2,
                                            width: maxX - minX + 4,
                                            height: maxY - minY + 4,
                                        }}
                                    >
                                        {/* Corner resize handles */}
                                        <div className={`${styles.resizeHandle} ${styles.handleNW}`} onMouseDown={(e) => handleResizeMouseDown(e, 'nw')} />
                                        <div className={`${styles.resizeHandle} ${styles.handleNE}`} onMouseDown={(e) => handleResizeMouseDown(e, 'ne')} />
                                        <div className={`${styles.resizeHandle} ${styles.handleSW}`} onMouseDown={(e) => handleResizeMouseDown(e, 'sw')} />
                                        <div className={`${styles.resizeHandle} ${styles.handleSE}`} onMouseDown={(e) => handleResizeMouseDown(e, 'se')} />
                                    </div>
                                </>
                            );
                        })()}

                        {/* Rubberband selection box */}
                        {isRubberbanding && selectionBox && (
                            <div
                                className={styles.selectionRubberband}
                                style={{
                                    left: Math.min(selectionBox.startX, selectionBox.endX),
                                    top: Math.min(selectionBox.startY, selectionBox.endY),
                                    width: Math.abs(selectionBox.endX - selectionBox.startX),
                                    height: Math.abs(selectionBox.endY - selectionBox.startY),
                                }}
                            />
                        )}

                        {/* Snap alignment lines */}
                        {snapLines.x.map((x, i) => (
                            <div
                                key={`snap-x-${i}`}
                                className={styles.snapLineVertical}
                                style={{ left: x }}
                            />
                        ))}
                        {snapLines.y.map((y, i) => (
                            <div
                                key={`snap-y-${i}`}
                                className={styles.snapLineHorizontal}
                                style={{ top: y }}
                            />
                        ))}

                        {/* Multi-select: Smart Merge panel or Single-select: Individual prompts */}
                        {!viewMode && selectedElementIds.length > 1 ? (
                            // Multiple elements selected - show Smart Merge
                            (() => {
                                const selectedElements = canvasElements.filter(el => selectedElementIds.includes(el.id));

                                // Guard: Skip rendering if no actual elements match (removed during generation)
                                if (selectedElements.length === 0) return null;
                                // If only one element remains, don't show multi-select UI
                                if (selectedElements.length === 1) return null;

                                const maxY = Math.max(...selectedElements.map(el => el.y + el.height));
                                const minX = Math.min(...selectedElements.map(el => el.x));
                                const maxX = Math.max(...selectedElements.map(el => el.x + el.width));
                                const centerX = (minX + maxX) / 2;

                                // Calculate inverse scale to maintain visibility when zoomed out
                                // Scale inversely with zoom but cap at maximum
                                // At 36% zoom (0.36), scale would be 1/0.36 ≈ 2.78 - cap here
                                const MAX_BUTTON_SCALE = 1 / 0.36; // ~2.78 - maximum scale at 36% zoom
                                const MIN_SCALE = 1; // Don't shrink below normal size

                                // Button: only zoom-based scaling with limits (not selection-size dependent)
                                const buttonScale = Math.min(Math.max(1 / viewport.zoom, MIN_SCALE), MAX_BUTTON_SCALE);

                                // Panel: more conservative scaling - smaller max to keep it usable
                                const PANEL_MAX_SCALE = 1.5; // Panel shouldn't grow as much
                                const formScale = Math.min(Math.max(1 / viewport.zoom, MIN_SCALE), PANEL_MAX_SCALE);

                                return showSmartMergePanel ? (
                                    <div
                                        className={styles.conversionFormPanel}
                                        style={{
                                            left: smartMergePanelPosition?.x ?? centerX,
                                            top: smartMergePanelPosition?.y ?? (maxY + (24 * formScale)),
                                            transform: `translateX(-50%) scale(${formScale})`,
                                            transformOrigin: 'top center',
                                            cursor: isSmartMergeDragging ? 'grabbing' : 'default',
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                        onDoubleClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Header */}
                                        <div
                                            className={styles.formPanelHeader}
                                            onMouseDown={handleSmartMergeDragStart}
                                            onDragStart={(e) => e.preventDefault()}
                                            style={{ cursor: isSmartMergeDragging ? 'grabbing' : 'grab' }}
                                        >
                                            <h3 className={styles.formPanelTitle}>Smart Merge</h3>
                                            <button
                                                className={styles.formPanelClose}
                                                onClick={handleCloseSmartMerge}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        </div>

                                        <div className={styles.formPanelContent}>
                                            {/* Content Type Chips */}
                                            <div className={styles.formField}>
                                                <label className={styles.formLabel}>Content Type</label>
                                                <div className={styles.contentTypeChipsContainer}>
                                                    {CONTENT_TYPES.map((ct) => (
                                                        <button
                                                            key={ct.id}
                                                            className={`${styles.contentTypeChip} ${smartMergeConfig.contentType === ct.id ? styles.contentTypeChipActive : ''}`}
                                                            onClick={() => handleContentTypeChange(ct.id)}
                                                            title={ct.description}
                                                        >
                                                            {ct.icon && <span className={styles.contentTypeChipIcon}>{ct.icon}</span>}
                                                            <span>{ct.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Custom Content Description - show when Custom is selected */}
                                            {smartMergeConfig.contentType === 'custom' && (
                                                <div className={styles.formField}>
                                                    <label className={styles.formLabel}>Describe Your Style</label>
                                                    <input
                                                        type="text"
                                                        value={smartMergeConfig.customContentDescription}
                                                        onChange={(e) => updateSmartMergeConfig({ customContentDescription: e.target.value })}
                                                        placeholder="e.g., Minimalist tech review, aesthetic travel vlog..."
                                                        className={styles.formInput}
                                                    />
                                                </div>
                                            )}

                                            {/* Focus Subject */}
                                            <div className={styles.formField}>
                                                <label className={styles.formLabel}>Focus Subject</label>
                                                <div className={styles.focusSubjectRow}>
                                                    <div className={styles.focusSubjectThumbnails}>
                                                        {selectedElements.map((el, idx) => (
                                                            <button
                                                                key={el.id}
                                                                className={`${styles.focusSubjectThumb} ${smartMergeConfig.focusSubjectIndex === idx ? styles.focusSubjectThumbActive : ''}`}
                                                                onClick={() => updateSmartMergeConfig({ focusSubjectIndex: idx })}
                                                                title={`Set as primary focus`}
                                                            >
                                                                <img src={el.src} alt={`Asset ${idx + 1}`} className={styles.focusSubjectThumbImage} />
                                                                <span className={styles.focusSubjectThumbIndex}>{idx + 1}</span>
                                                                {smartMergeConfig.focusSubjectIndex === idx && (
                                                                    <span className={styles.focusSubjectThumbBadge}>★</span>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <label className={styles.focusSubjectBalanced}>
                                                        <input
                                                            type="checkbox"
                                                            className={styles.focusSubjectBalancedCheckbox}
                                                            checked={smartMergeConfig.focusSubjectIndex === -1}
                                                            onChange={(e) => updateSmartMergeConfig({ focusSubjectIndex: e.target.checked ? -1 : null })}
                                                        />
                                                        <span className={styles.focusSubjectBalancedLabel}>Balanced</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Text Options */}
                                            <div className={styles.formField}>
                                                <label className={styles.formLabel}>Text</label>
                                                <div className={styles.textOptionsToggle}>
                                                    <button
                                                        className={`${styles.textOptionButton} ${smartMergeConfig.includeText === 'none' ? styles.textOptionButtonActive : ''}`}
                                                        onClick={() => updateSmartMergeConfig({ includeText: 'none' })}
                                                    >
                                                        No Text
                                                    </button>
                                                    <button
                                                        className={`${styles.textOptionButton} ${smartMergeConfig.includeText === 'ai' ? styles.textOptionButtonActive : ''}`}
                                                        onClick={() => updateSmartMergeConfig({ includeText: 'ai' })}
                                                    >
                                                        AI Generated
                                                    </button>
                                                    <button
                                                        className={`${styles.textOptionButton} ${smartMergeConfig.includeText === 'custom' ? styles.textOptionButtonActive : ''}`}
                                                        onClick={() => updateSmartMergeConfig({ includeText: 'custom' })}
                                                    >
                                                        Custom
                                                    </button>
                                                </div>
                                            </div>

                                            {/* AI Text - Video Title Input for context */}
                                            {smartMergeConfig.includeText === 'ai' && (
                                                <div className={styles.customTextSection}>
                                                    <label className={styles.textOptionGroupLabel}>Video Title (for AI context)</label>
                                                    <input
                                                        type="text"
                                                        value={smartMergeConfig.videoTitle}
                                                        onChange={(e) => updateSmartMergeConfig({ videoTitle: e.target.value })}
                                                        placeholder="e.g., I Built the ULTIMATE Gaming Setup..."
                                                        className={styles.customTextInput}
                                                    />
                                                    <p className={styles.formHint}>
                                                        AI will analyze your title and images to suggest impactful thumbnail text
                                                    </p>
                                                </div>
                                            )}

                                            {/* Custom Text Input Section */}
                                            {smartMergeConfig.includeText === 'custom' && (
                                                <div className={styles.customTextSection}>
                                                    <input
                                                        type="text"
                                                        value={smartMergeConfig.textContent}
                                                        onChange={(e) => updateSmartMergeConfig({ textContent: e.target.value })}
                                                        placeholder="Enter your thumbnail text"
                                                        className={styles.customTextInput}
                                                        maxLength={50}
                                                    />
                                                    <span className={styles.customTextCharCount}>
                                                        {smartMergeConfig.textContent.length}/50
                                                    </span>
                                                    <div className={styles.textPlacementStyleRow}>
                                                        <div className={styles.textOptionGroup}>
                                                            <span className={styles.textOptionGroupLabel}>Placement</span>
                                                            <div className={styles.textOptionChips}>
                                                                {TEXT_PLACEMENTS.map((tp) => (
                                                                    <button
                                                                        key={tp.id}
                                                                        className={`${styles.textOptionChip} ${smartMergeConfig.textPlacement === tp.id ? styles.textOptionChipActive : ''}`}
                                                                        onClick={() => updateSmartMergeConfig({ textPlacement: tp.id })}
                                                                    >
                                                                        {tp.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className={styles.textOptionGroup}>
                                                            <span className={styles.textOptionGroupLabel}>Style</span>
                                                            <div className={styles.textOptionChips}>
                                                                {TEXT_STYLES.map((ts) => (
                                                                    <button
                                                                        key={ts.id}
                                                                        className={`${styles.textOptionChip} ${smartMergeConfig.textStyle === ts.id ? styles.textOptionChipActive : ''}`}
                                                                        onClick={() => updateSmartMergeConfig({ textStyle: ts.id })}
                                                                    >
                                                                        {ts.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Advanced Options Toggle */}
                                            <button
                                                className={styles.advancedOptionsToggle}
                                                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                                            >
                                                <svg
                                                    className={`${styles.advancedOptionsToggleIcon} ${showAdvancedOptions ? styles.advancedOptionsToggleIconOpen : ''}`}
                                                    width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                Advanced Options
                                            </button>

                                            {/* Advanced Options Content */}
                                            {showAdvancedOptions && (
                                                <div className={styles.advancedOptionsContent}>
                                                    <div className={styles.formField}>
                                                        <label className={styles.formLabel}>Emotional Tone</label>
                                                        <div className={styles.emotionalToneChips}>
                                                            {EMOTIONAL_TONES.map((tone) => (
                                                                <button
                                                                    key={tone.id}
                                                                    className={`${styles.emotionalToneChip} ${smartMergeConfig.emotionalTone === tone.id ? styles.emotionalToneChipActive : ''}`}
                                                                    onClick={() => updateSmartMergeConfig({ emotionalTone: tone.id })}
                                                                >
                                                                    {tone.icon && <span className={styles.emotionalToneChipIcon}>{tone.icon}</span>}
                                                                    <span>{tone.label}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Model Selection */}
                                                    <div className={styles.formField}>
                                                        <label className={styles.formLabel}>Model Quality</label>
                                                        <div className={styles.textOptionsToggle}>
                                                            <button
                                                                className={`${styles.textOptionButton} ${smartMergeModel === 'nano-banana' ? styles.textOptionButtonActive : ''}`}
                                                                onClick={() => setSmartMergeModel('nano-banana')}
                                                                title="Standard quality (10 credits)"
                                                            >
                                                                Standard
                                                                <div className={styles.inlineCreditsIcon}>
                                                                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                                        <circle cx="7" cy="7" r="6.5" fill="#DA9A28" stroke="#DA9A28" />
                                                                        <path d="M7 3.5V10.5M4.5 7H9.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                                                                    </svg>
                                                                    10
                                                                </div>
                                                            </button>
                                                            <button
                                                                className={`${styles.textOptionButton} ${smartMergeModel === 'nano-banana-pro' ? styles.textOptionButtonActive : ''}`}
                                                                onClick={() => setSmartMergeModel('nano-banana-pro')}
                                                                title="Pro quality (19 credits)"
                                                            >
                                                                Pro
                                                                <div className={styles.inlineCreditsIcon}>
                                                                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                                        <circle cx="7" cy="7" r="6.5" fill="#DA9A28" stroke="#DA9A28" />
                                                                        <path d="M7 3.5V10.5M4.5 7H9.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                                                                    </svg>
                                                                    19
                                                                </div>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Submit Button */}
                                            <button
                                                className={styles.formSubmitButton}
                                                onClick={handleSmartMergeSubmit}
                                                disabled={!smartMergeConfig.contentType || isSmartMergeGenerating}
                                            >
                                                {isSmartMergeGenerating ? (
                                                    <span>Generating...</span>
                                                ) : (
                                                    <>
                                                        <span>Generate Thumbnail</span>
                                                        <div className={styles.smartMergeCredits}>
                                                            <svg className={styles.smartMergeCreditsIcon} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <circle cx="7" cy="7" r="6.5" fill="#DA9A28" stroke="#DA9A28" />
                                                                <path d="M7 3.5V10.5M4.5 7H9.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                                                            </svg>
                                                            {smartMergeModel === 'nano-banana' ? 10 : 37}
                                                        </div>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: centerX,
                                            top: maxY + (24 * buttonScale),
                                            transform: `translateX(-50%) scale(${buttonScale})`,
                                            transformOrigin: 'top center',
                                            zIndex: 100,
                                            pointerEvents: 'none', // Allow clicks to pass through the wrapper
                                        }}
                                    >
                                        <div style={{ pointerEvents: 'auto' }}>
                                            <AnimatedBorder
                                                radius={14}
                                                borderWidth={1.5}
                                                gap={2}
                                                borderColor="#ff6f61"
                                                className={styles.convertButtonWrapper}
                                            >
                                                <button
                                                    className={styles.convertButton}
                                                    onClick={handleOpenSmartMerge}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                >
                                                    Smart Merge
                                                </button>
                                            </AnimatedBorder>
                                        </div>
                                    </div>
                                );
                            })()
                        ) : !viewMode && selectedElementIds.length > 0 ? (
                            // Single element selected - show individual prompt panels
                            selectedElementIds.map(elementId => {
                                const element = canvasElements.find(el => el.id === elementId);
                                if (!element) return null;

                                const elementPrompt = elementPrompts[elementId] || '';
                                // Default to Nano Banana (Simple) for editing/floating prompt as per user preference
                                const elementModel = elementModels[elementId] || AVAILABLE_MODELS.find(m => m.id === 'nano-banana') || DEFAULT_MODEL;
                                const elementAttachedImages = modifyAttachedImages[elementId] || [];

                                // Calculate credits for this element (only resolution matters for nano-banana-pro)
                                const elementCredits = getGenerationCredits(
                                    elementModel,
                                    elementResolutions[elementId]
                                );

                                // Calculate scale to maintain visibility (inverse zoom) AND scale up for larger images
                                const scaleFromZoom = 1 / viewport.zoom;
                                // Scale up if image is large (reference width ~800px) so panel feels proportional
                                const scaleFromSize = element.width / 800;

                                const panelScale = Math.max(scaleFromZoom, scaleFromSize);

                                return (
                                    <div
                                        key={`prompt-${elementId}`}
                                        className={styles.modifyPromptPanelWrapper}
                                        style={{
                                            position: 'absolute',
                                            left: element.x + element.width / 2,
                                            top: element.y + element.height + (40 * panelScale),
                                            transform: `translateX(-50%) scale(${panelScale})`,
                                            transformOrigin: 'top center',
                                            zIndex: 1001,
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Focus the input when clicking anywhere on the panel
                                            const input = e.currentTarget.querySelector('input');
                                            if (input) input.focus();
                                        }}
                                        onDoubleClick={(e) => e.stopPropagation()}
                                    >
                                        <div className={styles.modifyPromptPanel}>
                                            <div className={styles.promptPanelIcon}>
                                                <Image
                                                    src="/assets/project/icons/star.svg"
                                                    alt=""
                                                    width={27}
                                                    height={27}
                                                    aria-hidden="true"
                                                />
                                            </div>

                                            <input
                                                type="text"
                                                value={elementPrompt}
                                                onChange={(e) => handleModifyPromptChange(elementId, e.target.value)}
                                                onKeyDown={(e) => handleModifyPromptKeyDown(elementId, e)}
                                                placeholder="Add here your prompt to modify this thumbnail"
                                                className={styles.promptPanelInput}
                                            />

                                            {/* Image attachment button */}
                                            <button
                                                className={styles.modifyPromptAttachButton}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveModifyElementId(elementId);
                                                    modifyImageInputRef.current?.click();
                                                }}
                                                title="Attach reference image"
                                            >
                                                <Image
                                                    src="/assets/project/icons/add-image.svg"
                                                    alt=""
                                                    width={20}
                                                    height={20}
                                                />
                                            </button>

                                            <div className={styles.promptPanelModelWrapper}>
                                                <ModelDropdown
                                                    selectedModel={elementModel}
                                                    onSelectModel={(model) => handleSelectModifyModel(elementId, model)}
                                                    theme={theme}
                                                />
                                            </div>


                                            <button
                                                className={styles.promptPanelSubmit}
                                                onClick={() => handleModifyPromptSubmit(elementId)}
                                                disabled={!elementPrompt.trim()}
                                                title={`Generate (${elementCredits} credits)`}
                                            >
                                                <span className={styles.promptPanelCredits}>
                                                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                        <circle cx="7" cy="7" r="6.5" fill="#DA9A28" stroke="#DA9A28" />
                                                        <path d="M7 3.5V10.5M4.5 7H9.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                                                    </svg>
                                                    {elementCredits}
                                                </span>
                                                <Image
                                                    src="/assets/project/icons/send-prompt.svg"
                                                    alt=""
                                                    width={18}
                                                    height={18}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        </div>

                                        {/* Compact model options row */}
                                        {elementModel?.options && (
                                            <div className={styles.modifyPromptOptionsRow}>
                                                <ModelOptionsBar
                                                    model={elementModel}
                                                    aspectRatio={elementAspectRatios[elementId] || 'match_input_image'}
                                                    resolution={elementResolutions[elementId]}
                                                    size={elementSizes[elementId]}
                                                    megapixels={elementMegapixels[elementId]}
                                                    onAspectRatioChange={(val) => setElementAspectRatios(prev => ({ ...prev, [elementId]: val }))}
                                                    onResolutionChange={(val) => setElementResolutions(prev => ({ ...prev, [elementId]: val }))}
                                                    onSizeChange={(val) => setElementSizes(prev => ({ ...prev, [elementId]: val }))}
                                                    onMegapixelsChange={(val) => setElementMegapixels(prev => ({ ...prev, [elementId]: val }))}
                                                    theme={theme}
                                                    compact
                                                    showMatchInput={true}
                                                />
                                            </div>
                                        )}

                                        {/* Attached images strip */}
                                        {elementAttachedImages.length > 0 && (
                                            <div className={styles.modifyPromptAttachedImages}>
                                                {elementAttachedImages.map((img, index) => (
                                                    <div key={img.id} className={styles.modifyPromptAttachedImage}>
                                                        <div className={styles.modifyPromptImageIndex}>{index + 1}</div>
                                                        <img src={img.preview} alt={`Image ${index + 1}`} />
                                                        <button
                                                            className={styles.modifyPromptRemoveImage}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setModifyAttachedImages(prev => {
                                                                    const current = prev[elementId] || [];
                                                                    const imgToRemove = current.find(i => i.id === img.id);
                                                                    if (imgToRemove) {
                                                                        URL.revokeObjectURL(imgToRemove.preview);
                                                                    }
                                                                    return {
                                                                        ...prev,
                                                                        [elementId]: current.filter(i => i.id !== img.id)
                                                                    };
                                                                });
                                                            }}
                                                        >
                                                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M6 2L2 6M2 2L6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : null}
                    </div>
                </div>

                {/* Tool palette */}
                <div className={styles.toolPalette}>
                    <button
                        className={`${styles.toolButton} ${toolMode === 'select' ? styles.toolButtonActive : ''}`}
                        onClick={() => setToolMode('select')}
                        title="Select tool (V)"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M4 4L10.5 20L13 13L20 10.5L4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <button
                        className={`${styles.toolButton} ${toolMode === 'hand' ? styles.toolButtonActive : ''}`}
                        onClick={() => setToolMode('hand')}
                        title="Hand tool (H)"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M18 11V6C18 5.44772 17.5523 5 17 5C16.4477 5 16 5.44772 16 6V11M16 11V4C16 3.44772 15.5523 3 15 3C14.4477 3 14 3.44772 14 4V11M16 11H14M14 11V3.5C14 2.94772 13.5523 2.5 13 2.5C12.4477 2.5 12 2.94772 12 3.5V11M14 11H12M12 11H10.5C9.67157 11 9 11.6716 9 12.5V12.5C9 13.3284 9.67157 14 10.5 14H12M12 11V5C12 4.44772 11.5523 4 11 4C10.4477 4 10 4.44772 10 5V12M10 12L8.5 10.5C8.10218 10.1022 7.44781 10.1022 7.05 10.5C6.65218 10.8978 6.65218 11.5522 7.05 11.95L10.5 15.4C11.2807 16.1807 12.3393 16.6072 13.44 16.58L15.5 16.5C17.433 16.5 19 14.933 19 13V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    {/* Divider */}
                    <div className={styles.toolDivider} />

                    {/* Image upload button */}
                    <button
                        className={styles.toolButton}
                        onClick={triggerImageUpload}
                        title="Add image"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M3 16L8 11L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M13 14L16 11L21 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* Zoom controls */}
                <div className={styles.zoomControls}>
                    <button className={styles.zoomButton} onClick={handleZoomOut} title="Zoom out (Ctrl+-)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                    <span className={styles.zoomLevel}>{Math.round(viewport.zoom * 100)}%</span>
                    <button className={styles.zoomButton} onClick={handleZoomIn} title="Zoom in (Ctrl++)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                    <div className={styles.zoomDivider} />
                    <button className={styles.zoomButton} onClick={handleResetView} title="Reset view (Ctrl+0)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M9 3V21M15 3V21M3 9H21M3 15H21" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
                        </svg>
                    </button>
                </div>



            </main >
            {/* Toast Notification */}
            {toast && (
                <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
                    <div className={styles.toastIcon}>
                        {toast.type === 'error' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#FF4D4F" fillOpacity="0.2" stroke="#FF4D4F" strokeWidth="2" />
                                <path d="M12 8V12" stroke="#FF4D4F" strokeWidth="2" strokeLinecap="round" />
                                <path d="M12 16H12.01" stroke="#FF4D4F" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#52C41A" fillOpacity="0.2" stroke="#52C41A" strokeWidth="2" />
                                <path d="M8 12L11 15L16 9" stroke="#52C41A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </div>
                    <span className={styles.toastMessage}>{toast.message}</span>
                    <button className={styles.toastClose} onClick={() => setToast(null)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Expandable Prompt Modal */}
            {isPromptModalOpen && (
                <div
                    className={styles.promptModalOverlay}
                    onClick={() => setIsPromptModalOpen(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            setIsPromptModalOpen(false);
                        }
                    }}
                >
                    <div className={styles.promptModalContent} onClick={(e) => e.stopPropagation()}>
                        {/* Collapse Button */}
                        <button
                            className={styles.collapsePromptButton}
                            onClick={() => setIsPromptModalOpen(false)}
                            title="Collapse"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 14H10V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M20 10H14V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M14 10L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M3 21L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        {/* Full-screen Textarea with Highlighting */}
                        <HighlightedPromptEditor
                            value={promptText}
                            onChange={handlePromptChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setIsPromptModalOpen(false);
                                }
                            }}
                            placeholder="Describe your thumbnail in detail..."
                            className={styles.promptModalTextarea}
                            theme={theme}
                            autoFocus
                        />

                        {/* Footer with actions */}
                        <div className={styles.promptModalFooter}>
                            {/* Left side: Add Image & Model */}
                            <div className={styles.promptActionsLeft}>
                                <button
                                    className={styles.addButton}
                                    title="Add reference image"
                                    onClick={() => promptImageInputRef.current?.click()}
                                >
                                    <Image src="/assets/project/icons/add-image.svg" alt="" width={24} height={24} />
                                </button>
                                <div className={styles.promptDropdownWrapper}>
                                    <ModelDropdown
                                        selectedModel={promptModel}
                                        onSelectModel={setPromptModel}
                                        theme={theme}
                                        openUpward
                                        showLabel
                                        className={styles.ghostTrigger}
                                    />
                                </div>
                            </div>

                            {/* Right side: Credits & Submit */}
                            <div className={styles.promptActionsRight}>
                                <div className={styles.costDisplay} title="Cost in credits">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <circle cx="7" cy="7" r="6.5" fill="#DA9A28" stroke="#DA9A28" />
                                        <path d="M7 3.5V10.5M4.5 7H9.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                                    </svg>
                                    <span>{sidebarCredits}</span>
                                </div>
                                <button
                                    className={styles.submitButton}
                                    onClick={() => {
                                        handlePromptSubmit();
                                        setIsPromptModalOpen(false);
                                    }}
                                    disabled={!promptText.trim()}
                                    title="Generate Thumbnail"
                                >
                                    <Image src="/assets/project/icons/send-prompt.svg" alt="" width={20} height={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pricing Modal */}
            <PricingModal
                open={pricingModalOpen}
                onClose={() => setPricingModalOpen(false)}
                theme={theme}
                userEmail={user?.email || undefined}
            />
        </div>
    );
}
