# Firestore Migration Guide

## Overview

This guide explains how to migrate from backend API calls to direct Firestore access for projects and thumbnails. This migration reduces latency from ~200-500ms to ~50-100ms and enables real-time collaboration.

## What's Changed

### Projects (✅ COMPLETED)

The `ProjectsContext` has been migrated to use Firestore real-time sync:

- **Reading projects**: Now uses `useProjectsFirestore` hook for real-time updates
- **Creating projects**: Still uses API (backend handles Firestore write)
- **Deleting projects**: Still uses API (backend handles Firestore delete)
- **Updating name/privacy**: Still uses API (backend handles Firestore write)

### Thumbnails (⚠️ IN PROGRESS)

The project canvas needs to be updated to use Firestore for:

- **Reading thumbnails**: Use `useThumbnailsFirestore` hook for real-time updates
- **Updating positions**: Use debounced Firestore writes
- **Creating/uploading**: Still use API (backend handles Firestore write)
- **Deleting**: Still use API (backend handles Firestore delete)
- **Generating**: Still use API (backend handles generation + Firestore write)

### Viewport State (⚠️ TODO)

Project viewport (pan/zoom) should be synced to Firestore:

- Use debounced updates when panning/zooming
- Allows collaborative viewing of the same canvas

## How to Migrate the Project Canvas

### Step 1: Import Firestore Services and Hooks

```typescript
// Replace this:
import { getProjectThumbnails, updateThumbnailPositions, ... } from '@/lib/services/thumbnailService';

// With this (keep API services for create/delete/generate):
import {
  generateThumbnail,
  addThumbnail,
  deleteThumbnail,
  uploadThumbnail,
  GenerateThumbnailRequest,
} from '@/lib/services/thumbnailService';

// Add Firestore imports:
import { useThumbnailsFirestore } from '@/hooks';
import {
  updateThumbnailPosition,
  batchUpdateThumbnailPositions,
  type Thumbnail,
} from '@/lib/services/firestoreThumbnailService';
import { useDebouncedBatchUpdate } from '@/hooks/useDebouncedFirestoreUpdate';
import { updateProjectViewport } from '@/lib/services/firestoreProjectService';
```

### Step 2: Replace Thumbnail Fetching with Firestore Hook

```typescript
// BEFORE:
const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    const thumbnailsResponse = await getProjectThumbnails(projectId);
    const elements = thumbnailsResponse.thumbnails.map(transformThumbnailToCanvasElement);
    setCanvasElements(elements);
    setIsLoadingThumbnails(false);
  };
  fetchData();
}, [projectId]);

// AFTER:
const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);

// Real-time Firestore subscription
const { thumbnails, loading: isLoadingThumbnails } = useThumbnailsFirestore(projectId);

// Transform Firestore thumbnails to canvas elements
useEffect(() => {
  const elements = thumbnails.map(transformThumbnailToCanvasElement);
  setCanvasElements(elements);
}, [thumbnails]);

// Helper function to transform Firestore thumbnail to canvas element
function transformThumbnailToCanvasElement(thumbnail: Thumbnail): CanvasElement {
  return {
    id: thumbnail.id,
    type: thumbnail.type === 'generated' ? 'generated' :
          thumbnail.type === 'youtube-thumbnail' ? 'youtube-thumbnail' : 'image',
    src: thumbnail.thumbnailUrl,
    x: thumbnail.x,
    y: thumbnail.y,
    width: thumbnail.width,
    height: thumbnail.height,
    naturalWidth: thumbnail.naturalWidth,
    naturalHeight: thumbnail.naturalHeight,
    aspectRatio: thumbnail.aspectRatio,
    status: thumbnail.status,
  };
}
```

### Step 3: Use Debounced Position Updates

```typescript
// Set up debounced batch update for thumbnail positions
const { debouncedBatchUpdate: updatePositions, flush: flushPositionUpdates } =
  useDebouncedBatchUpdate(
    (updates) => batchUpdateThumbnailPositions(projectId, updates),
    300 // 300ms debounce
  );

// When dragging ends (replace the existing updateThumbnailPositions call):
const handleDragEnd = useCallback(() => {
  if (!dragState.isDragging) return;

  const updates = dragState.elementIds.map(id => {
    const element = canvasElements.find(el => el.id === id);
    if (!element) return null;

    return {
      id: element.id,
      x: element.x,
      y: element.y,
    };
  }).filter(Boolean);

  // BEFORE: updateThumbnailPositions(projectId, updates).catch(...)
  // AFTER: Use debounced Firestore update
  if (updates.length > 0) {
    updatePositions(updates);
  }

  setDragState({ /* reset state */ });
}, [dragState, canvasElements, updatePositions]);

// Flush updates before unmount
useEffect(() => {
  return () => {
    flushPositionUpdates();
  };
}, [flushPositionUpdates]);
```

### Step 4: Use Debounced Viewport Updates

```typescript
import { useDebouncedFirestoreUpdate } from '@/hooks/useDebouncedFirestoreUpdate';
import { updateProjectViewport } from '@/lib/services/firestoreProjectService';

// Set up debounced viewport update
const { debouncedUpdate: updateViewport, flush: flushViewportUpdate } =
  useDebouncedFirestoreUpdate(
    (viewport) => updateProjectViewport(projectId, viewport),
    500 // 500ms debounce
  );

// When viewport changes (pan or zoom):
const handleViewportChange = useCallback((newViewport: Viewport) => {
  setViewport(newViewport);

  // Debounced write to Firestore
  updateViewport({
    x: newViewport.x,
    y: newViewport.y,
    zoom: newViewport.zoom,
  });
}, [updateViewport]);

// Flush updates before unmount
useEffect(() => {
  return () => {
    flushViewportUpdate();
  };
}, [flushViewportUpdate]);
```

### Step 5: Keep API Calls for Create/Delete/Generate

```typescript
// These operations should still use the API:

// ✅ Generate thumbnail - API handles generation + Firestore write
const handleGenerate = async () => {
  const response = await generateThumbnail({
    projectId,
    prompt: promptText,
    userEmail: user.email,
    // ... other params
  });
  // Real-time listener will automatically add it to the canvas
};

// ✅ Upload thumbnail - API handles upload + Firestore write
const handleUpload = async (file: File) => {
  const response = await uploadThumbnail(projectId, {
    imageData: base64Data,
    x: 100,
    y: 100,
    // ... other params
  });
  // Real-time listener will automatically add it to the canvas
};

// ✅ Delete thumbnail - API handles Firestore delete
const handleDelete = async (thumbnailId: string) => {
  await deleteThumbnail(projectId, thumbnailId);
  // Real-time listener will automatically remove it from the canvas
};
```

## Benefits

1. **Reduced Latency**: ~50-100ms vs ~200-500ms for reads
2. **Real-time Sync**: Changes appear instantly across all clients
3. **Optimistic Updates**: UI updates immediately, syncs in background
4. **Collaborative Editing**: Multiple users can edit the same project
5. **Offline Support**: Firestore caches data for offline access

## Security

- Firestore security rules enforce that users can only:
  - Read their own projects and thumbnails
  - Update only position fields (x, y, width, height)
  - Update only viewport field on projects

- All other operations (create, delete, generate) go through the backend API for validation and business logic

## Performance Considerations

1. **Debouncing**: Position and viewport updates are debounced (300-500ms) to reduce Firestore writes
2. **Batch Updates**: Multiple thumbnail positions are updated in a single Firestore batch
3. **Real-time Listeners**: Automatically clean up on unmount to prevent memory leaks

## Testing

After migration, verify:

1. ✅ Projects load instantly on dashboard
2. ✅ Thumbnails appear in real-time when generated
3. ✅ Dragging updates positions smoothly
4. ✅ Multiple browser windows stay in sync
5. ✅ Offline mode shows cached data
