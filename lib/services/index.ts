/**
 * Services barrel export
 */

export * from './projectService';
export * from './thumbnailService';
export * from './templateService';
export * from './userService';

// Firestore services - use named exports to avoid conflicts
export {
  subscribeToUserProjects,
  subscribeToProject,
  updateProjectViewport,
  type Project as FirestoreProject,
  type ViewportUpdate,
} from './firestoreProjectService';

export {
  subscribeToProjectThumbnails,
  subscribeToThumbnail,
  updateThumbnailPosition,
  batchUpdateThumbnailPositions,
  type Thumbnail as FirestoreThumbnail,
  type ThumbnailPositionUpdate,
  type BatchPositionUpdate,
  type RefImage as FirestoreRefImage, // Renamed to avoid conflict
} from './firestoreThumbnailService';
