'use client';

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

// Hooks
import { useAuth, useTheme } from '@/hooks';

// Styles
import styles from './projectCanvas.module.css';

// Types
type CreationMode = 'url' | 'image' | 'prompt' | 'sketch';
type ToolMode = 'select' | 'hand';

interface CanvasElement {
  id: string;
  type: 'image' | 'youtube-thumbnail';
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
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
  const youtubeLinkInputRef = useRef<HTMLTextAreaElement>(null);

  // UI State
  const [projectName, setProjectName] = useState('My First Thumbnail');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedMode, setSelectedMode] = useState<CreationMode>('url');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [youtubeLinkError, setYoutubeLinkError] = useState<string | null>(null);

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

  // Add element at viewport center
  const addElementAtViewportCenter = useCallback((
    src: string,
    type: 'image' | 'youtube-thumbnail',
    naturalWidth: number,
    naturalHeight: number
  ) => {
    if (!canvasContainerRef.current) return;

    const containerRect = canvasContainerRef.current.getBoundingClientRect();
    const centerCanvas = screenToCanvas(
      containerRect.left + containerRect.width / 2,
      containerRect.top + containerRect.height / 2
    );

    // Scale image to reasonable size (max 600px width)
    const scale = Math.min(1, 600 / naturalWidth);
    const width = naturalWidth * scale;
    const height = naturalHeight * scale;

    const newElement: CanvasElement = {
      id: crypto.randomUUID(),
      type,
      src,
      x: centerCanvas.x - width / 2,
      y: centerCanvas.y - height / 2,
      width,
      height,
      aspectRatio: naturalWidth / naturalHeight,
    };

    setCanvasElements(prev => [...prev, newElement]);
    setSelectedElementIds([newElement.id]);
  }, [screenToCanvas]);

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
      // Track modifier keys
      if (e.key === 'Shift') setShiftPressed(true);
      if (e.key === 'Control') setCtrlPressed(true);

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
        if (document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA') return;

        setCanvasElements(prev => prev.filter(el => !selectedElementIds.includes(el.id)));
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
        if (document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA') return;

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

      // Escape to deselect
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
        // Regular scroll = pan
        e.preventDefault();
        setViewport(prev => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
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
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading...</p>
      </div>
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
              onClick={() => handleModeSelect('url')}
            >
              <div className={styles.createOptionIcon}>
                <Image src="/assets/project/icons/attachment-02-stroke-rounded 1.svg" alt="" width={34} height={34} />
              </div>
              <span className={styles.createOptionLabel}>Using URL</span>
            </button>

            <button
              className={`${styles.createOption} ${selectedMode === 'image' ? styles.createOptionSelected : ''}`}
              onClick={() => { handleModeSelect('image'); triggerImageUpload(); }}
            >
              <div className={styles.createOptionIcon}>
                <Image src="/assets/project/icons/add-image.svg" alt="" width={34} height={34} />
              </div>
              <span className={styles.createOptionLabel}>Image</span>
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

            <button
              className={`${styles.createOption} ${selectedMode === 'sketch' ? styles.createOptionSelected : ''}`}
              onClick={() => handleModeSelect('sketch')}
            >
              <div className={styles.createOptionIcon}>
                <Image src="/assets/project/icons/magic-wand-01-stroke-rounded 1.svg" alt="" width={34} height={34} />
              </div>
              <span className={styles.createOptionLabel}>Sketch to Thumbnail</span>
            </button>
          </div>
        </div>

        <div className={styles.sidebarSpacer} />

        {selectedMode === 'url' && (
          <div className={styles.youtubeInputSection}>
            <div className={`${styles.youtubeInputContainer} ${youtubeLinkError ? styles.youtubeInputError : ''}`}>
              <textarea
                ref={youtubeLinkInputRef}
                value={youtubeLink}
                onChange={handleYoutubeLinkChange}
                placeholder="Paste a YouTube link to add thumbnail to canvas"
                className={styles.youtubeTextarea}
                rows={3}
              />
              <button
                className={styles.submitButton}
                onClick={handleYoutubeLinkSubmit}
                disabled={!youtubeLink.trim()}
              >
                <Image src="/assets/project/icons/send-prompt.svg" alt="" width={24} height={24} />
              </button>
            </div>
            {youtubeLinkError && <p className={styles.inputError}>{youtubeLinkError}</p>}
          </div>
        )}

        {selectedMode === 'image' && (
          <div className={styles.imageModeHint}>
            <button className={styles.uploadButton} onClick={triggerImageUpload}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 15V16C3 18.2091 4.79086 20 7 20H17C19.2091 20 21 18.2091 21 16V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Upload Image
            </button>
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
                  <img
                    src={element.src}
                    alt=""
                    className={styles.elementImage}
                    draggable={false}
                  />

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

              return (
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

        {/* Shortcuts hint */}
        <div className={styles.shortcutsHint}>
          <span>V: Select</span>
          <span>H: Hand</span>
          <span>Space: Pan</span>
          <span>Ctrl/⌘+Scroll: Zoom</span>
          <span>Shift+Click: Multi-select</span>
        </div>
      </main>
    </div>
  );
}
