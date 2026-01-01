# API Documentation

## Base URL
- Development: `http://localhost:8787`
- Production: `https://r3l.distorted.work`

## Authentication
All authenticated endpoints require a valid JWT token stored in an httpOnly cookie named `auth_token`.

---

## Auth Endpoints

### POST /api/register
Register a new user account.

**Request Body**:
```json
{
  "username": "string",
  "password": "string",
  "email": "string"
}
```

**Response**: `200 OK`
```json
{
  "message": "User created successfully. Please check your email to verify."
}
```

---

### POST /api/login
Authenticate and receive session cookie.

**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response**: `200 OK`
```json
{
  "user": {
    "id": 1,
    "username": "string",
    "avatar_url": "string"
  }
}
```

---

### POST /api/logout
Invalidate session.

**Response**: `200 OK`

---

### GET /api/users/me
Get current authenticated user.

**Response**: `200 OK`
```json
{
  "user": {
    "id": 1,
    "username": "string",
    "avatar_url": "string",
    "public_key": "string",
    "encrypted_private_key": "string"
  }
}
```

---

## User Endpoints

### GET /api/users/search?q={query}
Search users by username.

**Response**: `200 OK`
```json
{
  "users": [
    {
      "id": 1,
      "username": "string",
      "avatar_url": "string"
    }
  ]
}
```

---

### GET /api/users/random
Get a random user.

**Response**: `200 OK`
```json
{
  "user": {
    "id": 1,
    "username": "string",
    "avatar_url": "string"
  }
}
```

---

### GET /api/users/:id
Get public user profile.

**Response**: `200 OK`

---

### POST /api/users/me/avatar
Upload user avatar.

**Request**: `multipart/form-data`
- `avatar`: File

**Response**: `200 OK`
```json
{
  "message": "Avatar uploaded successfully",
  "avatar_url": "string"
}
```

---

## Relationship Endpoints

### GET /api/relationships
List all relationships for authenticated user.

**Response**: `200 OK`
```json
{
  "outgoing": [],
  "incoming": [],
  "mutual": []
}
```

---

### POST /api/relationships/follow
Follow a user (asym).

**Request Body**:
```json
{
  "target_user_id": 1
}
```

---

### POST /api/relationships/sym-request
Request symmetric connection.

**Request Body**:
```json
{
  "target_user_id": 1
}
```

---

### POST /api/relationships/accept-sym-request
Accept a sym request.

**Request Body**:
```json
{
  "source_user_id": 1
}
```

---

### DELETE /api/relationships/:target_user_id
Remove relationship.

---

## File Endpoints

### GET /api/files
List authenticated user's files.

**Response**: `200 OK`
```json
{
  "files": [
    {
      "id": 1,
      "filename": "string",
      "size": 1024,
      "mime_type": "string",
      "visibility": "public|sym|me",
      "vitality": 0,
      "expires_at": "ISO8601",
      "created_at": "ISO8601"
    }
  ]
}
```

---

### POST /api/files
Upload a file.

**Request**: `multipart/form-data`
- `file`: File
- `visibility`: "public" | "sym" | "private"
- `parent_id`: number (optional, for remix)
- `encrypt`: "true" | "false"
- `burn_on_read`: "true" | "false"

**Response**: `200 OK`
```json
{
  "message": "File uploaded successfully",
  "r2_key": "string",
  "expires_at": "ISO8601"
}
```

---

### GET /api/files/:id/content
Download file content.

**Response**: File stream with appropriate headers

---

### GET /api/files/:id/metadata
Get file metadata.

**Response**: `200 OK`

---

### PUT /api/files/:id/content
Update text file content.

**Request Body**:
```json
{
  "content": "string"
}
```

---

### PUT /api/files/:id/metadata
Update file metadata.

**Request Body**:
```json
{
  "visibility": "public|sym|me"
}
```

---

### DELETE /api/files/:id
Delete a file.

---

### POST /api/files/:id/refresh
Reset expiration timer to 7 days.

**Response**: `200 OK`
```json
{
  "message": "File expiration reset to 7 days.",
  "expires_at": "ISO8601"
}
```

---

### POST /api/files/:id/vitality
Boost file vitality.

**Request Body**:
```json
{
  "amount": 1
}
```

**Rate Limit**: 10 per minute per user

---

### POST /api/files/:id/share
Share file with a connection.

**Request Body**:
```json
{
  "target_user_id": 1
}
```

---

## Collection Endpoints

### GET /api/collections
List user's collections.

---

### POST /api/collections
Create a collection.

**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "visibility": "public|sym|private"
}
```

---

### GET /api/collections/:id
Get collection details.

---

### PUT /api/collections/:id
Update collection.

---

### DELETE /api/collections/:id
Delete collection.

---

### GET /api/collections/:id/zip
Download collection as ZIP.

---

### POST /api/collections/:id/files
Add file to collection.

**Request Body**:
```json
{
  "file_id": 1
}
```

---

### DELETE /api/collections/:id/files/:file_id
Remove file from collection.

---

## Notification Endpoints

### GET /api/notifications
List notifications.

**Response**: `200 OK`
```json
{
  "notifications": [
    {
      "id": 1,
      "type": "sym_request|sym_accepted|file_shared|system_alert",
      "actor_name": "string",
      "actor_id": 1,
      "payload": {},
      "is_read": 0,
      "created_at": "ISO8601"
    }
  ]
}
```

---

### PUT /api/notifications/:id/read
Mark notification as read.

---

### PUT /api/notifications/read-all
Mark all notifications as read.

---

### DELETE /api/notifications/:id
Delete notification.

---

## Message Endpoints

### GET /api/messages/conversations
List active conversations.

---

### GET /api/messages/:partner_id
Get message history with a user.

---

### POST /api/messages
Send a message.

**Request Body**:
```json
{
  "receiver_id": 1,
  "content": "string",
  "encrypt": false
}
```

---

### PUT /api/messages/:partner_id/read
Mark conversation as read.

---

## Discovery Endpoints

### GET /api/drift?type={type}
Get random public content.

**Query Parameters**:
- `type`: "image" | "audio" | "text" (optional)

**Response**: `200 OK`
```json
{
  "users": [],
  "files": []
}
```

**Rate Limit**: 20 per 10 minutes

---

## Communique Endpoints

### GET /api/communiques/:user_id
Get user's communique.

---

### PUT /api/communiques
Update own communique.

**Request Body**:
```json
{
  "content": "string (HTML)",
  "theme_prefs": "{\"custom_css\": \"string\"}"
}
```

---

## Customization Endpoints

### GET /api/customization
Get user preferences.

---

### PUT /api/customization
Update preferences.

**Request Body**:
```json
{
  "theme_preferences": {},
  "node_primary_color": "#RRGGBBAA",
  "node_secondary_color": "#RRGGBBAA",
  "node_size": 10
}
```

---

## Admin Endpoints

### GET /api/admin/stats
Get system statistics (Admin only).

---

### GET /api/admin/users
List users (Admin only).

---

### DELETE /api/admin/users/:id
Delete user (Admin only).

---

### POST /api/admin/broadcast
Send system broadcast (Admin only).

**Request Body**:
```json
{
  "message": "string"
}
```

---

## WebSocket Endpoints

### WS /api/do-websocket
Real-time notifications and presence.

**Messages Received**:
- `presence_sync`: Initial online users list
- `presence_update`: User online/offline
- `new_notification`: New notification
- `new_message`: New direct message
- `signal_artifact`: New public artifact

---

### WS /api/collab/:fileId
Real-time collaborative editing (Yjs protocol).

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| /api/register | 5 | 1 hour |
| /api/login | 10 | 10 minutes |
| /api/forgot-password | 3 | 1 hour |
| /api/reset-password | 3 | 1 hour |
| /api/drift | 20 | 10 minutes |
| /api/feedback | 3 | 1 hour |
| /api/files/:id/vitality | 10 | 1 minute |

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message"
}
```

Common status codes:
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error
