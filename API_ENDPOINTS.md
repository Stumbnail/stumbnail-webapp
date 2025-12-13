# Stumbnail API Endpoints

> **Generated:** 2025-12-12  
> **Base URL:** `https://api.stumbnail.com` (Production) | `http://localhost:4050` (Development)

---

## Authentication

Most endpoints require **Firebase Bearer Token** authentication:
```
Authorization: Bearer <firebase_id_token>
```

| Symbol | Meaning |
|--------|---------|
| 🔓 | Public (no auth required) |
| 🔒 | Auth required |
| 🔐 | Admin only |

---

## Response Format

All endpoints return JSON with this standard structure:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message description"
}
```

---

## Thumbnail Generation

### POST `/api/thumbnail/enhancePrompt` 🔒
Refine user prompt via GPT to make it more descriptive for image generation.

**Request:**
```json
{
  "prompt": "gaming thumbnail with fire effects"
}
```

**Response:**
```json
{
  "success": true,
  "prompt": "A dynamic gaming thumbnail featuring explosive orange and red fire effects with dramatic lighting, bold 3D text, and an intense action-packed atmosphere with cinematic depth of field"
}
```

---

### POST `/api/thumbnail/generateThumbnail` 🔒
Generate a thumbnail using Seedream 4 AI model.

**Request:**
```json
{
  "userEmail": "user@example.com",
  "userName": "JohnDoe",
  "prompt": "A cinematic gaming thumbnail with explosive fire effects and dramatic lighting",
  "publicFlag": true,
  "gen_model": "seedream-4",
  "aspectRatio": "16:9"
}
```

**Response:**
```json
{
  "success": true,
  "image": "https://storage.googleapis.com/stumbnail/thumbnails/abc123.jpg",
  "metadata": {
    "id": "thumbnail_abc123",
    "userId": "user_123",
    "createdAt": "2025-12-12T15:30:00.000Z",
    "category": "gaming",
    "publicFlag": true
  }
}
```

---

## Community

### GET `/api/thumbnail/community` 🔓
Fetch public community gallery with pagination.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sort` | string | `newest` | `newest` or `popular` |
| `pageSize` | number | 10 | Items per page (max 50) |
| `pageCursor` | string | - | Pagination cursor |
| `category` | string | - | Filter by category |

**Response:**
```json
{
  "thumbnails": [
    {
      "id": "thumb_123",
      "thumbnailUrl": "https://storage.googleapis.com/...",
      "thumbnailUrlOptimized": "https://storage.googleapis.com/.../optimized",
      "prompt": "Epic gaming moment",
      "userName": "JohnDoe",
      "createdAt": "2025-12-12T10:00:00.000Z",
      "likeCount": 42,
      "category": "gaming",
      "generationType": "generateThumbnail",
      "variations": [],
      "variationsCount": 0,
      "liked": false
    }
  ],
  "nextCursor": "2025-12-12T09:00:00.000Z",
  "hasMore": true
}
```

---

### GET `/api/thumbnail/:thumbnailId/variations` 🔓
Get public variations for a specific thumbnail.

**Response:**
```json
{
  "success": true,
  "baseThumbnail": {
    "id": "thumb_123",
    "thumbnailUrl": "https://...",
    "prompt": "Original prompt",
    "userName": "Creator",
    "createdAt": "2025-12-12T10:00:00.000Z"
  },
  "variations": [
    {
      "id": "var_456",
      "thumbnailUrl": "https://...",
      "prompt": "Modified prompt",
      "userName": "OtherUser",
      "createdAt": "2025-12-12T11:00:00.000Z",
      "likeCount": 5
    }
  ],
  "nextPageCursor": null,
  "totalCount": 1
}
```

---

### POST `/api/thumbnail/:thumbnailId/toggleLike` 🔒
Toggle like on a thumbnail.

**Response:**
```json
{
  "success": true,
  "liked": true,
  "likeCount": 43
}
```

---

## User Thumbnails

### GET `/api/user/thumbnails` 🔒
Fetch authenticated user's thumbnails.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `pageSize` | number | 20 | Items per page |
| `pageCursor` | string | - | Pagination cursor |
| `privacy` | string | - | `public` or `private` |
| `category` | string | - | Filter by category |

**Response:**
```json
{
  "thumbnails": [
    {
      "id": "thumb_123",
      "thumbnailUrl": "https://...",
      "prompt": "My thumbnail",
      "createdAt": "2025-12-12T10:00:00.000Z",
      "publicFlag": true,
      "category": "gaming",
      "likeCount": 10
    }
  ],
  "nextPageCursor": "...",
  "hasMore": true
}
```

---

### DELETE `/api/user/thumbnails/:thumbnailId` 🔒
Delete user's own thumbnail.

**Response:**
```json
{
  "success": true,
  "message": "Thumbnail deleted successfully"
}
```

---

### POST `/api/user/thumbnails/:thumbnailId/togglePrivacy` 🔒
Toggle thumbnail between public and private.

**Response:**
```json
{
  "success": true,
  "publicFlag": false
}
```

---

## User Account

### GET `/api/user/credits` 🔒
Get current credit balance.

**Response:**
```json
{
  "success": true,
  "creditsBalance": 150,
  "subscriptionCredits": 100,
  "oneTimeCredits": 50,
  "trialCredits": 0
}
```

---

### GET `/api/user/transactions` 🔒
Get transaction history with pagination.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `pageSize` | number | 10 | Items per page |
| `pageCursor` | string | - | Pagination cursor |

**Response:**
```json
{
  "transactions": [
    {
      "id": "tx_123",
      "type": "deduction",
      "amount": -8,
      "description": "Thumbnail Generation (seedream-4)",
      "timestamp": "2025-12-12T10:00:00.000Z",
      "receiptUrl": null
    }
  ],
  "nextPageCursor": "{\"docId\":\"tx_122\"}"
}
```

---

### GET `/api/user/theme` 🔒
Get saved theme preference.

**Response:**
```json
{
  "theme": "dark"
}
```

---

### POST `/api/user/theme/toggle` 🔒
Toggle theme between light and dark.

**Response:**
```json
{
  "theme": "light"
}
```

---

## Subscription & Billing

### POST `/api/subscription/checkout` 🔒
Create Stripe checkout session.

**Request:**
```json
{
  "priceId": "price_xxx",
  "successUrl": "https://app.stumbnail.com/success",
  "cancelUrl": "https://app.stumbnail.com/cancel"
}
```

**Response:**
```json
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

---

### GET `/api/subscription/status` 🔒
Get subscription status.

**Response:**
```json
{
  "success": true,
  "subscription": {
    "status": "active",
    "plan": "pro",
    "currentPeriodEnd": "2025-01-12T00:00:00.000Z",
    "cancelAtPeriodEnd": false
  }
}
```

---

## Models

### GET `/api/models/available` 🔓
List available generation models.

**Response:**
```json
{
  "success": true,
  "models": [
    {
      "id": "seedream-4",
      "displayName": "Seedream 4",
      "description": "High-resolution 4K image generation",
      "provider": "replicate",
      "supportedFeatures": ["multiReference", "highResolution"]
    }
  ],
  "defaultModel": "seedream-4"
}
```

---

### GET `/api/models/:modelId` 🔓
Get specific model details.

**Response:**
```json
{
  "success": true,
  "model": {
    "id": "seedream-4",
    "displayName": "Seedream 4",
    "description": "High-resolution image generation with multi-reference support",
    "provider": "replicate",
    "supportedFeatures": ["multiReference", "highResolution", "customDimensions"],
    "defaultParams": {
      "size": "4K",
      "aspect_ratio": "16:9"
    }
  }
}
```

---

## LoRAs (Styles & Personas)

### GET `/api/loras/personas` 🔓
Fetch persona LoRAs.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 20 | Items per page (max 100) |
| `page` | number | 1 | Page number |
| `search` | string | - | Search term |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "lora_123",
      "name": "MrBeast Style",
      "type": "persona",
      "triggerWord": "mrbeast_style",
      "thumbnailUrl": "https://...",
      "visibility": "public",
      "status": "active"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 100,
    "hasNextPage": true
  }
}
```

---

## Custom LoRA Training

### POST `/api/custom-loras/train` 🔒
Submit LoRA training job (multipart form-data).

**Request (form-data):**
| Field | Type | Description |
|-------|------|-------------|
| `loraName` | string | Name for the LoRA |
| `loraType` | string | `persona` or `style` |
| `visibility` | string | `public` or `private` |
| `images` | files | Exactly 10 image files |

**Response:**
```json
{
  "success": true,
  "data": {
    "trainingJobId": "tj_abc123",
    "status": "submitted",
    "loraName": "My Custom Style",
    "loraType": "style"
  },
  "meta": {
    "timestamp": "2025-12-12T10:00:00.000Z"
  }
}
```

---

### GET `/api/custom-loras/status/:trainingJobId` 🔒
Get training job status.

**Response:**
```json
{
  "success": true,
  "data": {
    "trainingJobId": "tj_abc123",
    "status": "completed",
    "loraId": "lora_xyz",
    "progress": 100,
    "completedAt": "2025-12-12T12:00:00.000Z"
  }
}
```

---

### GET `/api/custom-loras/my-loras` 🔒
Get user's custom LoRAs.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "lora_123",
      "name": "My Style",
      "type": "style",
      "triggerWord": "mystyle_v1",
      "trainingStatus": "active",
      "createdAt": "2025-12-12T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 5
  }
}
```

---

## YouTube Integration

### POST `/api/youtube/channel/thumbnails` 🔒
Get channel video thumbnails.

**Request:**
```json
{
  "channelId": "UC..."
}
```

**Response:**
```json
{
  "success": true,
  "videos": [
    {
      "videoId": "abc123",
      "title": "Video Title",
      "thumbnailUrl": "https://i.ytimg.com/vi/abc123/maxresdefault.jpg",
      "publishedAt": "2025-12-10T10:00:00.000Z"
    }
  ]
}
```

---

### POST `/api/youtube/channel/search` 🔒
Search YouTube channels.

**Request:**
```json
{
  "query": "MrBeast"
}
```

**Response:**
```json
{
  "success": true,
  "channels": [
    {
      "channelId": "UC...",
      "title": "MrBeast",
      "thumbnailUrl": "https://...",
      "subscriberCount": "200M"
    }
  ]
}
```

---

## Projects

### POST `/api/projects` �
Create a new project.

**Request:**
```json
{
  "name": "My Gaming Channel",
  "privacy": "private"
}
```

**Response:**
```json
{
  "success": true,
  "project": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "ownerId": "user_123",
    "ownerEmail": "user@example.com",
    "name": "My Gaming Channel",
    "privacy": "private",
    "thumbnailsCount": 0,
    "previewImage": null,
    "createdAt": "2025-12-12T10:00:00.000Z",
    "updatedAt": "2025-12-12T10:00:00.000Z"
  }
}
```

---

### GET `/api/projects` 🔒
List user's projects with pagination.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `pageSize` | number | 20 | Items per page (max 50) |
| `pageCursor` | string | - | Pagination cursor |

**Response:**
```json
{
  "success": true,
  "projects": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "ownerId": "user_123",
      "ownerEmail": "user@example.com",
      "name": "My Gaming Channel",
      "privacy": "private",
      "thumbnailsCount": 12,
      "previewImage": "https://storage.googleapis.com/stumbnail/thumbnails/first.jpg",
      "createdAt": "2025-12-12T10:00:00.000Z",
      "updatedAt": "2025-12-12T10:00:00.000Z"
    }
  ],
  "nextPageCursor": null,
  "hasMore": false
}
```

---

### GET `/api/projects/:projectId` 🔒
Get a specific project by ID.

**Response:**
```json
{
  "success": true,
  "project": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "ownerId": "user_123",
    "ownerEmail": "user@example.com",
    "name": "My Gaming Channel",
    "privacy": "private",
    "thumbnailsCount": 12,
    "previewImage": "https://storage.googleapis.com/stumbnail/thumbnails/first.jpg",
    "createdAt": "2025-12-12T10:00:00.000Z",
    "updatedAt": "2025-12-12T10:00:00.000Z"
  }
}
```

---

### PATCH `/api/projects/:projectId` 🔒
Update a project's name and/or privacy.

**Request:**
```json
{
  "name": "Updated Project Name",
  "privacy": "public"
}
```

> Both fields are optional, but at least one must be provided.

**Response:**
```json
{
  "success": true,
  "project": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "ownerId": "user_123",
    "ownerEmail": "user@example.com",
    "name": "Updated Project Name",
    "privacy": "public",
    "thumbnailsCount": 12,
    "previewImage": "https://storage.googleapis.com/stumbnail/thumbnails/first.jpg",
    "createdAt": "2025-12-12T10:00:00.000Z",
    "updatedAt": "2025-12-13T13:45:00.000Z"
  }
}
```

---

### DELETE `/api/projects/:projectId` 🔒
Delete a project.

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

---

## Templates (Read-Only)

> Templates are managed via Firebase Console only. No write operations available via API.

### GET `/api/templates` 🔓
Fetch thumbnail templates with pagination.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `pageSize` | number | 20 | Items per page (max 50) |
| `pageCursor` | string | - | Pagination cursor |

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": "rYTl7SMhwSvktPfcyPJG",
      "imageURL": "https://img.youtube.com/vi/lJausFj_Dto/maxresdefault.jpg",
      "owner": "YC",
      "prompt": "none",
      "title": "template 1"
    }
  ],
  "count": 1,
  "nextPageCursor": null,
  "hasMore": false
}
```

---

### GET `/api/templates/:templateId` 🔓
Fetch a specific template by ID.

**Response:**
```json
{
  "success": true,
  "template": {
    "id": "rYTl7SMhwSvktPfcyPJG",
    "imageURL": "https://img.youtube.com/vi/lJausFj_Dto/maxresdefault.jpg",
    "owner": "YC",
    "prompt": "none",
    "title": "template 1"
  }
}
```

---

## Feedback

### POST `/api/feedback` 🔓
Submit user feedback.

**Request:**
```json
{
  "type": "bug",
  "message": "Found an issue with...",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feedback submitted successfully"
}
```

---

## Webhooks

### POST `/api/webhooks/replicate-training` 🔓
Handle Replicate training completion (internal).

### GET `/api/webhooks/health` 🔓
Webhook service health check.

**Response:**
```json
{
  "success": true,
  "message": "Webhook service is healthy",
  "timestamp": "2025-12-12T10:00:00.000Z",
  "services": {
    "replicateTraining": "active"
  }
}
```

---

## Admin Endpoints 🔐

### GET `/api/admin/users`
List all users with pagination.

### GET `/api/admin/users/search?q=email@example.com`
Search user by UID or email.

### GET `/api/admin/users/stats`
Get aggregate user statistics.

**Response:**
```json
{
  "totalUsers": 5000,
  "paidUsers": 500,
  "freeUsers": 4500,
  "activeUsers": 1200
}
```

### PATCH `/api/admin/users/:uid`
Update user Firestore document.

### POST `/api/admin/model-loras`
Create model LoRA entry.

### PATCH `/api/admin/model-loras/:id`
Update model LoRA.

### DELETE `/api/admin/model-loras/:id`
Delete model LoRA.

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (invalid parameters) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient credits or permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Summary

| Category | Endpoints |
|----------|-----------|
| Thumbnail Generation | 2 |
| Community | 3 |
| User Thumbnails | 5 |
| User Account | 5 |
| Subscription/Billing | 6 |
| Models | 2 |
| LoRAs | 5 |
| Custom LoRA Training | 5 |
| YouTube | 2 |
| Projects | 5 |
| Templates | 2 |
| Auth | 1 |
| Feedback | 1 |
| Webhooks | 2 |
| Admin | 7 |
| **Total** | **53** |
