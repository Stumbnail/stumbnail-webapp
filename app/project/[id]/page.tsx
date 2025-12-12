'use client';

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Hooks
import { useAuth, useTheme } from '@/hooks';

// Types
import { Model } from '@/types';

// Constants
import { DEFAULT_MODEL } from '@/lib/constants';

// Lazy load dropdowns
const ModelDropdown = dynamic(
  () => import('@/app/dashboard/ModelDropdown'),
  { ssr: false }
);

const StyleDropdown = dynamic(
  () => import('@/app/dashboard/StyleDropdown'),
  { ssr: false }
);

// Styles
import styles from './projectCanvas.module.css';

// UI Components
import { LoadingSpinner } from '@/components/ui';

// Types
type CreationMode = 'url' | 'prompt';
type ToolMode = 'select' | 'hand';

interface CanvasElement {
  id: string;
  type: 'image' | 'youtube-thumbnail' | 'generated';
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  aspectRatio: number;
  status?: 'generating' | 'complete';
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

export default function ProjectCanvasPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  // Custom hooks
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme({ userId: user?.uid });

  // Refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasMainRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const youtubeLinkInputRef = useRef<HTMLInputElement>(null);
  const promptImageInputRef = useRef<HTMLInputElement>(null);

  // UI State
  const [projectName, setProjectName] = useState('My First Thumbnail');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedMode, setSelectedMode] = useState<CreationMode>('prompt');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [youtubeLinkError, setYoutubeLinkError] = useState<string | null>(null);
  const [showUrlPopup, setShowUrlPopup] = useState(false);

  // Prompt mode state
  const [promptText, setPromptText] = useState('');
  const [promptModel, setPromptModel] = useState<Model | null>(null);
  const [promptStyle, setPromptStyle] = useState<any>(null);
  const [thumbnailCount, setThumbnailCount] = useState(1);
  const [attachedImages, setAttachedImages] = useState<{ id: string; file: File; preview: string }[]>([]);

  // Modify prompt state - stores prompts per element ID
  const [elementPrompts, setElementPrompts] = useState<Record<string, string>>({});
  const [elementModels, setElementModels] = useState<Record<string, Model>>({});
  const [modifyAttachedImages, setModifyAttachedImages] = useState<Record<string, { id: string; file: File; preview: string }[]>>({});
  const modifyImageInputRef = useRef<HTMLInputElement>(null);
  const [activeModifyElementId, setActiveModifyElementId] = useState<string | null>(null);

  // Multi-select conversion form state
  const [showConversionForm, setShowConversionForm] = useState(false);
  const [conversionGenre, setConversionGenre] = useState('');
  const [conversionIncludeText, setConversionIncludeText] = useState<'yes' | 'no' | null>(null);
  const [conversionText, setConversionText] = useState('');

  // Tool State
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [isHandToolActive, setIsHandToolActive] = useState(false);

  // Canvas State
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);

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

  // Handlers
  const handleBack = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleTogglePublic = useCallback(() => {
    setIsPublic(prev => !prev);
  }, []);

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
      const padding = 100;
      const zoomX = (containerRect.width - padding * 2) / boundingWidth;
      const zoomY = (containerRect.height - padding * 2) / boundingHeight;
      const targetZoom = Math.min(Math.min(zoomX, zoomY), viewport.zoom, 1); // Don't zoom in more than current or 100%

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
    type: 'image' | 'youtube-thumbnail' | 'generated',
    naturalWidth: number,
    naturalHeight: number,
    status?: 'generating' | 'complete',
    skipAnimation = false
  ): string => {
    if (!canvasContainerRef.current) return '';

    const containerRect = canvasContainerRef.current.getBoundingClientRect();
    const centerCanvas = screenToCanvas(
      containerRect.left + containerRect.width / 2,
      containerRect.top + containerRect.height / 2
    );

    // Scale image to reasonable size (max 600px width)
    const scale = Math.min(1, 600 / naturalWidth);
    const width = naturalWidth * scale;
    const height = naturalHeight * scale;

    const preferredX = centerCanvas.x - width / 2;
    const preferredY = centerCanvas.y - height / 2;

    // Generate ID upfront so we can return it
    const newElementId = crypto.randomUUID();

    // Find non-overlapping position
    let finalPosition = { x: preferredX, y: preferredY };

    setCanvasElements(prev => {
      finalPosition = findNonOverlappingPosition(width, height, prev, preferredX, preferredY);

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

  const handleYoutubeLinkSubmit = useCallback(() => {
    if (!validateYoutubeLink(youtubeLink)) return;

    const videoId = extractVideoId(youtubeLink.trim());
    if (!videoId) return;

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    const img = new window.Image();
    img.onload = () => {
      addElementAtViewportCenter(thumbnailUrl, 'youtube-thumbnail', img.naturalWidth, img.naturalHeight);
      setYoutubeLink('');
    };
    img.onerror = () => {
      const fallbackUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      const fallbackImg = new window.Image();
      fallbackImg.onload = () => {
        addElementAtViewportCenter(fallbackUrl, 'youtube-thumbnail', fallbackImg.naturalWidth, fallbackImg.naturalHeight);
        setYoutubeLink('');
      };
      fallbackImg.src = fallbackUrl;
    };
    img.src = thumbnailUrl;
  }, [youtubeLink, addElementAtViewportCenter]);

  // Prompt mode handlers
  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptText(e.target.value);
  }, []);

  const handlePromptSubmit = useCallback(() => {
    if (!promptText.trim()) return;

    console.log('Generating thumbnails with prompt:', {
      prompt: promptText,
      model: promptModel,
      style: promptStyle,
      count: thumbnailCount
    });

    // Create placeholder elements for each thumbnail being generated
    // Default thumbnail size: 1920x1080 (16:9 aspect ratio)
    const defaultWidth = 1920;
    const defaultHeight = 1080;

    // Clear selection first, then add all elements with skipAnimation
    setSelectedElementIds([]);
    const newElementIds: string[] = [];

    for (let i = 0; i < thumbnailCount; i++) {
      const id = addElementAtViewportCenter('', 'generated', defaultWidth, defaultHeight, 'generating', true);
      if (id) newElementIds.push(id);
    }

    // After a short delay to let state update, fit all new elements in view with animation
    setTimeout(() => {
      if (newElementIds.length > 0) {
        fitElementsInView(newElementIds);
      }
    }, 50);

    // TODO: Call API endpoint here, then update elements with status: 'complete' and src: imageUrl
    // For now, just clear the prompt
    setPromptText('');
  }, [promptText, promptModel, promptStyle, thumbnailCount, addElementAtViewportCenter, fitElementsInView]);

  const handleThumbnailCountChange = useCallback((count: number) => {
    setThumbnailCount(count);
  }, []);

  const handleCreateNewStyle = useCallback(() => {
    console.log('Create new style clicked');
    // TODO: Implement style creation logic
  }, []);

  // Image upload handler
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      addElementAtViewportCenter(objectUrl, 'image', img.naturalWidth, img.naturalHeight);
    };
    img.src = objectUrl;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addElementAtViewportCenter]);

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

    setIsPanning(false);
    setIsRubberbanding(false);
    setSelectionBox(null);
    setDragState(prev => ({ ...prev, isDragging: false, elementIds: [], elementStarts: [] }));
    setResizeState(prev => ({ ...prev, isResizing: false, elementIds: [], elementStarts: [] }));
    setSnapLines({ x: [], y: [] }); // Clear snap lines
  }, [isRubberbanding, selectionBox, canvasElements, isElementInSelectionBox, shiftPressed]);

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
  }, [canvasElements, selectedElementIds, shiftPressed, toolMode, isHandToolActive]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
    e.stopPropagation();

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
  }, [canvasElements, selectedElementIds]);

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

      // Delete selected elements
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.length > 0) {
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

        setCanvasElements(prev => prev.map(el =>
          selectedElementIds.includes(el.id)
            ? { ...el, x: el.x + dx, y: el.y + dy }
            : el
        ));
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
  }, [selectedElementIds, canvasElements]);

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

  const handleModifyPromptSubmit = useCallback((elementId: string) => {
    const prompt = elementPrompts[elementId];
    const model = elementModels[elementId] || DEFAULT_MODEL;

    if (!prompt?.trim()) return;

    console.log('Modifying element:', elementId, 'with prompt:', prompt, 'using model:', model);

    // Create a NEW placeholder element next to the current one (don't replace it)
    const defaultWidth = 1920;
    const defaultHeight = 1080;

    const newId = addElementAtViewportCenter('', 'generated', defaultWidth, defaultHeight, 'generating', true);

    // Animate to show the new placeholder
    if (newId) {
      setTimeout(() => {
        fitElementsInView([newId]);
      }, 50);
    }

    // TODO: Implement actual API call, then update element with status: 'complete' and new src

    // Clear the prompt after submission
    setElementPrompts(prev => ({
      ...prev,
      [elementId]: '',
    }));
  }, [elementPrompts, elementModels, addElementAtViewportCenter, fitElementsInView]);

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

  // Multi-select conversion handlers
  const handleOpenConversionForm = useCallback(() => {
    setShowConversionForm(true);
  }, []);

  const handleCloseConversionForm = useCallback(() => {
    setShowConversionForm(false);
    setConversionGenre('');
    setConversionIncludeText(null);
    setConversionText('');
  }, []);

  const handleConversionSubmit = useCallback(() => {
    if (!conversionGenre.trim()) {
      alert('Please enter a genre');
      return;
    }

    if (conversionIncludeText === null) {
      alert('Please select whether to include text');
      return;
    }

    if (conversionIncludeText === 'yes' && !conversionText.trim()) {
      alert('Please enter text or select "Let AI decide"');
      return;
    }

    console.log('Converting assets to thumbnails:', {
      elementIds: selectedElementIds,
      genre: conversionGenre,
      includeText: conversionIncludeText,
      text: conversionIncludeText === 'yes' ? conversionText : null,
    });

    // Create ONE generation placeholder for the converted thumbnail (16:9)
    const defaultWidth = 1920;
    const defaultHeight = 1080;

    setSelectedElementIds([]);

    // Only create one thumbnail regardless of how many assets are selected
    const newId = addElementAtViewportCenter('', 'generated', defaultWidth, defaultHeight, 'generating', true);

    // Animate to show the new placeholder
    if (newId) {
      setTimeout(() => {
        fitElementsInView([newId]);
      }, 50);
    }

    // TODO: Implement actual API call, then update element with status: 'complete' and src
    handleCloseConversionForm();
  }, [conversionGenre, conversionIncludeText, conversionText, selectedElementIds, handleCloseConversionForm, addElementAtViewportCenter, fitElementsInView]);

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

  if (!user) {
    return null;
  }

  return (
    <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : styles.lightTheme}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
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

      {/* Left Sidebar */}
      <aside className={styles.sidebar}>
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

            <button
              className={`${styles.createOption} ${selectedMode === 'prompt' ? styles.createOptionSelected : ''}`}
              onClick={() => handleModeSelect('prompt')}
            >
              <div className={styles.createOptionIcon}>
                <Image src="/assets/project/icons/prompt.svg" alt="" width={34} height={34} />
              </div>
              <span className={styles.createOptionLabel}>Prompt</span>
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
              <textarea
                value={promptText}
                onChange={handlePromptChange}
                placeholder="Describe your thumbnail"
                className={styles.promptTextarea}
                rows={1}
              />
              <div className={styles.promptButtonsRow}>
                <button
                  className={styles.submitButton}
                  onClick={handlePromptSubmit}
                  disabled={!promptText.trim()}
                >
                  <Image src="/assets/project/icons/send-prompt.svg" alt="" width={20} height={20} />
                </button>
              </div>
            </div>

            {/* Model, Style Dropdowns and Add Image */}
            <div className={styles.promptDropdownsRow}>
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
                  disabled={!!promptStyle}
                />
              </div>
              <div className={styles.promptDropdownWrapper}>
                <StyleDropdown
                  selectedStyle={promptStyle}
                  onSelectStyle={setPromptStyle}
                  onCreateNew={handleCreateNewStyle}
                  theme={theme}
                  openUpward
                  showLabel
                />
              </div>
            </div>

            {/* Attached Images Preview */}
            {attachedImages.length > 0 && (
              <div className={styles.attachedImagesContainer}>
                {attachedImages.map((img) => (
                  <div key={img.id} className={styles.attachedImageWrapper}>
                    <Image
                      src={img.preview}
                      alt={`Attached: ${img.file.name}`}
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
            )}

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
        <div ref={canvasContainerRef} className={styles.canvasViewport}>
          {/* Infinite canvas workspace */}
          <div
            className={styles.canvasWorkspace}
            style={{
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            }}
          >
            {/* Canvas elements */}
            {canvasElements.map(element => {
              const isSelected = selectedElementIds.includes(element.id);
              return (
                <div
                  key={element.id}
                  className={`${styles.canvasElement} ${isSelected ? styles.canvasElementSelected : ''}`}
                  style={{
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                  }}
                  onMouseDown={(e) => handleElementMouseDown(e, element.id)}
                >
                  {element.status === 'generating' ? (
                    <div className={styles.generatingPlaceholder}>
                      <div className={styles.generatingSpinner}>
                        <div className={styles.generatingSpinnerDot}></div>
                        <div className={styles.generatingSpinnerDot}></div>
                        <div className={styles.generatingSpinnerDot}></div>
                        <div className={styles.generatingSpinnerDot}></div>
                      </div>
                      <span className={styles.generatingText}>Generating</span>
                    </div>
                  ) : (
                    <img
                      src={element.src}
                      alt=""
                      className={styles.elementImage}
                      draggable={false}
                    />
                  )}

                  {/* Selection outline (no handles on individual elements) */}
                  {isSelected && (
                    <div className={styles.selectionOverlay} />
                  )}
                </div>
              );
            })}

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
                displayWidth = selectedElements[0].naturalWidth;
                displayHeight = selectedElements[0].naturalHeight;
              } else {
                // Multiple elements - show first element's natural dimensions
                displayWidth = selectedElements[0].naturalWidth;
                displayHeight = selectedElements[0].naturalHeight;
              }

              // Calculate aspect ratio from natural dimensions
              const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
              const divisor = gcd(displayWidth, displayHeight);
              const ratioW = displayWidth / divisor;
              const ratioH = displayHeight / divisor;
              // Simplify to common ratios
              let ratioDisplay = `${ratioW}:${ratioH}`;
              const ratio = displayWidth / displayHeight;
              if (Math.abs(ratio - 16 / 9) < 0.01) ratioDisplay = '16:9';
              else if (Math.abs(ratio - 4 / 3) < 0.01) ratioDisplay = '4:3';
              else if (Math.abs(ratio - 1) < 0.01) ratioDisplay = '1:1';
              else if (Math.abs(ratio - 9 / 16) < 0.01) ratioDisplay = '9:16';

              return (
                <>
                  {/* Dimensions display above top-left */}
                  <div
                    className={styles.elementDimensionsDisplay}
                    style={{
                      left: minX,
                      top: minY - 28,
                    }}
                  >
                    <span className={styles.dimensionsSize}>{displayWidth}×{displayHeight}</span>
                    <span className={styles.dimensionsRatio}>{ratioDisplay}</span>
                  </div>

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

            {/* Multi-select: Convert form or Single-select: Individual prompts */}
            {selectedElementIds.length > 1 ? (
              // Multiple elements selected - show conversion form
              (() => {
                const selectedElements = canvasElements.filter(el => selectedElementIds.includes(el.id));
                const maxY = Math.max(...selectedElements.map(el => el.y + el.height));
                const minX = Math.min(...selectedElements.map(el => el.x));
                const maxX = Math.max(...selectedElements.map(el => el.x + el.width));
                const centerX = (minX + maxX) / 2;

                // Calculate inverse scale to maintain visibility when zoomed out
                // Form uses full scaling, button uses dampened scaling
                const formScale = Math.max(1, 1 / viewport.zoom);
                const buttonScale = Math.max(1, Math.sqrt(1 / viewport.zoom));

                return showConversionForm ? (
                  <div
                    className={styles.conversionFormPanel}
                    style={{
                      left: centerX,
                      top: maxY + (24 * formScale),
                      transform: `translateX(-50%) scale(${formScale})`,
                      transformOrigin: 'top center',
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >

                    <div className={styles.formPanelHeader}>
                      <h3 className={styles.formPanelTitle}>Convert Assets to Thumbnail</h3>
                      <button className={styles.formPanelClose} onClick={handleCloseConversionForm}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>

                    <div className={styles.formPanelContent}>
                      {/* Genre Input */}
                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Genre of thumbnail</label>
                        <input
                          type="text"
                          value={conversionGenre}
                          onChange={(e) => setConversionGenre(e.target.value)}
                          placeholder="e.g., tech, cinematic, gaming, vlog"
                          className={styles.formInput}
                        />
                      </div>

                      {/* Text Option */}
                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Include text?</label>
                        <div className={styles.radioGroup}>
                          <button
                            className={`${styles.radioButton} ${conversionIncludeText === 'yes' ? styles.radioButtonActive : ''}`}
                            onClick={() => setConversionIncludeText('yes')}
                          >
                            Yes
                          </button>
                          <button
                            className={`${styles.radioButton} ${conversionIncludeText === 'no' ? styles.radioButtonActive : ''}`}
                            onClick={() => setConversionIncludeText('no')}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {/* Text Input - only show if "yes" selected */}
                      {conversionIncludeText === 'yes' && (
                        <div className={styles.formField}>
                          <label className={styles.formLabel}>Text content</label>
                          <input
                            type="text"
                            value={conversionText}
                            onChange={(e) => setConversionText(e.target.value)}
                            placeholder="Enter text or leave empty for AI to decide"
                            className={styles.formInput}
                          />
                          <p className={styles.formHint}>Leave empty to let AI decide the text</p>
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        className={styles.formSubmitButton}
                        onClick={handleConversionSubmit}
                        disabled={!conversionGenre.trim() || conversionIncludeText === null}
                      >
                        <span>Generate Thumbnails</span>
                        <Image
                          src="/assets/project/icons/send-prompt.svg"
                          alt=""
                          width={20}
                          height={20}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className={styles.convertButton}
                    style={{
                      left: centerX,
                      top: maxY + (24 * buttonScale),
                      transform: `translateX(-50%) scale(${buttonScale})`,
                      transformOrigin: 'top center',
                    }}
                    onClick={handleOpenConversionForm}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    Convert assets to thumbnail
                  </button>
                );
              })()
            ) : (
              // Single element selected - show individual prompt panels
              selectedElementIds.map(elementId => {
                const element = canvasElements.find(el => el.id === elementId);
                if (!element) return null;

                const elementPrompt = elementPrompts[elementId] || '';
                const elementModel = elementModels[elementId] || DEFAULT_MODEL;
                const elementAttachedImages = modifyAttachedImages[elementId] || [];

                // Calculate dampened inverse scale to maintain visibility when zoomed out
                const panelScale = Math.max(1, Math.sqrt(1 / viewport.zoom));

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
                      >
                        <Image
                          src="/assets/project/icons/send-prompt.svg"
                          alt=""
                          width={24}
                          height={24}
                          aria-hidden="true"
                        />
                      </button>
                    </div>

                    {/* Attached images strip */}
                    {elementAttachedImages.length > 0 && (
                      <div className={styles.modifyPromptAttachedImages}>
                        {elementAttachedImages.map((img) => (
                          <div key={img.id} className={styles.modifyPromptAttachedImage}>
                            <img src={img.preview} alt="" />
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
            )}
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
        {/* Export button - visible when elements are selected */}
        {selectedElementIds.length > 0 && (
          <button
            className={styles.exportButton}
            onClick={() => console.log('Export thumbnails:', selectedElementIds)}
            title="Export selected thumbnails"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export
          </button>
        )}


      </main>
    </div>
  );
}
