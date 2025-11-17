# R3L:F - Relational Ephemeral Filenet

Decentralized, ephemeral, anti-algorithmic social file-sharing platform with geo-location, real-time collaboration, and advanced customization.

## Quick Start

```bash
npm install
wrangler login
wrangler deploy
```

## API Endpoints

### Public
- `POST /api/register` - Register (username, password, displayName)
- `POST /api/login` - Login (username, password) - sets HttpOnly cookie
- `POST /api/logout` - Logout - clears cookie
- `GET /api/content/:id` - Get content details
- `GET /api/content/:id/comments` - Get comments

### Protected (requires session cookie)

#### User Management
- `GET /api/profile` - Get user profile
- `PATCH /api/user/profile` - Update profile (displayName, bio, avatarKey)
- `PATCH /api/user/preferences` - Update preferences
- `GET /api/user/files` - Get user files
- `GET /api/user/stats` - Get user stats
- `GET /api/user/visibility` - Get visibility settings
- `PATCH /api/user/visibility` - Update visibility settings
- `POST /api/user/connections` - Follow user
- `DELETE /api/user/connections/:id` - Unfollow user
- `GET /api/users/search` - Search users
- `GET /api/users/:id` - Get user profile
- `GET /api/users/:id/content` - Get user's content

#### Content Management
- `GET /api/feed` - Get content feed from followed users
- `POST /api/content` - Upload content (returns presigned URL)
- `GET /api/content/:id/download` - Download content
- `POST /api/content/:id/vote` - Vote on content archiving
- `POST /api/content/:id/react` - React to content
- `POST /api/content/:id/comments` - Add comment
- `POST /api/content/:id/tags` - Add tags to content
- `GET /api/content/:id/tags` - Get content tags
- `GET /api/tags/popular` - Get popular tags

#### Bookmarks
- `GET /api/bookmarks` - Get bookmarks
- `POST /api/content/:id/bookmark` - Bookmark content
- `DELETE /api/content/:id/bookmark` - Remove bookmark

#### Messaging
- `GET /api/messages/conversations` - Get conversations
- `GET /api/messages/user/:id` - Get messages with user
- `POST /api/messages/send` - Send message
- `POST /api/messages/typing` - Send typing indicator
- `GET /api/messages/typing/:userId` - Check if user is typing
- `POST /api/messages/:id/read` - Mark message as read

#### Notifications
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/unread-count` - Get unread count
- `GET /api/notifications/categories` - Get notification categories
- `POST /api/notifications` - Create notification
- `POST /api/notifications/mark-read` - Mark notifications read
- `POST /api/notifications/mark-all-read` - Mark all read
- `DELETE /api/notifications/:id` - Delete notification

#### Geo-Location
- `GET /api/globe/data-points` - Get map points with filtering
- `POST /api/globe/points` - Create map point
- `GET /api/globe/points/:id` - Get specific map point
- `DELETE /api/globe/points/:id` - Delete map point

#### Collaboration
- `GET /api/collaboration/rooms` - List accessible rooms
- `POST /api/collaboration/rooms` - Create collaboration room
- `POST /api/collaboration/rooms/:id/join` - Join room
- `GET /api/collaboration/rooms/:id/members` - Get room members
- `ALL /api/collaboration/:id/*` - Collaboration room operations (Durable Object)

#### Workspaces & Visualization
- `GET /api/workspaces` - Get workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/network` - Get network graph (Durable Object)
- `GET /api/visualization/stats` - Get platform stats (Durable Object)

#### Files
- `POST /api/files/avatar` - Upload avatar
- `GET /api/files/:key` - Get file from R2

## Stack

- **Backend**: Cloudflare Workers + Hono
- **Database**: D1 (SQLite) - flat schema with users table
- **Storage**: R2 for files/avatars
- **Cache**: KV for rate limiting and typing indicators
- **Auth**: HttpOnly cookies with session tokens
- **Real-time**: Durable Objects for collaboration, network viz, stats
- **Maps**: Leaflet.js for interactive geo-visualization
- **Graphs**: D3.js for network visualization

## Structure

- `src/index.js` - Backend API (Hono router + Durable Objects)
- `public/` - Frontend assets (HTML/CSS/JS)
  - `collaborate.html` - Real-time collaboration spaces
  - `messages.html` - Enhanced messaging with typing indicators
  - `notifications.html` - Category-based notifications
  - `map.html` - Interactive geo-location map
  - `network.html` - Network visualization
  - `profile-enhanced.html` - Profile customization
- `db/schema.sql` - Reference schema
- `db/migration_geo_collab.sql` - Latest migration
- `wrangler.jsonc` - Cloudflare Worker configuration

## Authentication

- Username-based (no email required)
- Password hashing with bcryptjs
- HttpOnly secure cookies for sessions
- 30-day session expiration
- Recovery key generated on registration

## Key Features

### Core Features
- Ephemeral content with 30-day expiration
- Community-driven archiving via votes
- User connections (follow/unfollow)
- Content reactions and bookmarks
- Workspaces for organization
- Rate limiting and security

### Messaging & Notifications
- Direct messaging with conversations
- Real-time typing indicators (5-second TTL)
- Read receipts with checkmarks
- Unread message badges
- Category-based notifications (general, social, content, system)
- Bulk notification actions

### Geo-Location & Maps
- Interactive Leaflet map with zoom/pan
- Click-to-place map points
- Draggable markers for position adjustment
- Public/private point visibility
- Filter by data type and time range
- Link points to content

### Real-Time Collaboration
- Multi-user document editing
- Version tracking and conflict resolution
- In-room chat
- Active user presence tracking
- Auto-save with debouncing
- Public/private rooms

### Network Visualization
- D3.js force-directed graph
- Zoom, pan, and drag controls
- Color-coded nodes (users vs content)
- Show/hide labels toggle
- 5-minute caching for performance

### Profile Customization
- Personal communique section
- 6 theme options (default, dark, nature, sunset, ocean, custom)
- Custom color picker
- Profile banner upload
- Bio and links
- Public/private visibility controls

### Content Tagging
- Add multiple tags to content
- Tag-based discovery
- Popular tags tracking
- Tag indexing for fast search

## Database Schema

### Core Tables
- `users` - Flat schema with all user data (id, username, display_name, bio, avatar_key, preferences, passwordHash, created_at, updated_at)
- `auth_sessions` - Session tokens
- `content` - User-uploaded content
- `content_location` - R2 object keys
- `content_lifecycle` - Expiration and archiving
- `connections` - User follow relationships
- `bookmarks` - Saved content
- `comments` - Content comments
- `content_reactions` - Reactions to content
- `community_archive_votes` - Archiving votes
- `messages` - Direct messages
- `notifications` - User notifications
- `workspaces` - Organization spaces
- `user_visibility` - Privacy settings

### New Tables (Latest Migration)
- `geo_locations` - Map points with lat/long
- `collaboration_rooms` - Real-time collaboration spaces
- `collaboration_members` - Room membership
- `content_tags` - Content tagging system

## Development

```bash
# Local development
npm run dev

# Deploy to production
wrangler deploy

# View logs
wrangler tail

# Execute SQL on remote DB
wrangler d1 execute r3l-db --remote --file=./db/migration_geo_collab.sql

# Create individual table
wrangler d1 execute r3l-db --remote --command="CREATE TABLE..."
```

## Configuration

### Environment Variables
- `ALLOWED_ORIGINS` - CORS allowed origins
- `CONTENT_EXPIRATION_DAYS` - Content TTL (default: 30)
- `MAX_UPLOAD_SIZE` - Max file size (default: 10MB)
- `RATE_LIMIT_REQUESTS` - Rate limit (default: 100)
- `RATE_LIMIT_WINDOW` - Rate limit window (default: 60s)

### Bindings
- **Durable Objects**: CollaborationRoom, ConnectionsObject, VisualizationObject
- **D1 Database**: r3l-db
- **R2 Bucket**: r3l-content
- **KV Namespaces**: R3L_KV, R3L_SESSIONS, R3L_USER_EMBEDDINGS, R3L_USERS

## Performance Optimizations

1. **Caching**: Network graph and stats cached for 5 minutes
2. **Polling**: Smart intervals (2-10 seconds) instead of WebSockets
3. **Debouncing**: Document auto-save debounced to 1 second
4. **Indexing**: Database indexes on frequently queried columns
5. **Lazy Loading**: Map points loaded on demand with filters
6. **KV TTL**: Typing indicators expire after 5 seconds

## Security Features

1. **Authentication**: Session-based with HttpOnly cookies
2. **Authorization**: Users can only modify their own data
3. **Validation**: Input validation on all endpoints
4. **Rate Limiting**: 100 requests per 60 seconds per IP
5. **Privacy Controls**: Public/private visibility for content, points, and rooms
6. **CORS**: Configurable allowed origins
7. **Content Size Limits**: 10MB max upload size

## Frontend

The frontend is a Single-Page Application (SPA) built with Vite. The source code is located in the `src/client` directory, and the production build is output to the `dist` directory.

**Note:** The frontend is currently under construction and is not yet functional.

## Notes

- Frontend uses cookie-based auth (credentials: 'include')
- Backend validates session cookies on protected routes
- R2 uses presigned URLs for uploads/downloads
- Durable Objects handle real-time features
- Rate limiting: 100 requests per 60 seconds per IP
- Typing indicators stored in KV with 5-second TTL
- Document versions tracked in Durable Object storage
- Map uses OpenStreetMap tiles (attribution required)

## Recent Updates

### Version d5f63923 (2025-01-03)
- Added geo-location system with interactive maps
- Enhanced collaboration with real-time document editing
- Improved messaging with typing indicators and read receipts
- Category-based notifications with bulk actions
- Content tagging system
- Profile customization with themes and communique
- 4 new database tables
- 20+ new API endpoints
- Enhanced Durable Objects with versioning

## Future Enhancements

- WebSocket support for true real-time updates
- Full-text search across content and tags
- Analytics dashboard
- Mobile app
- Export features
- Advanced filtering
- Browser push notifications
- Collaborative cursors
- Voice/Video calls via WebRTC
- AI-powered recommendations

## License

See LICENSE file for details.

## Support

For issues and feature requests, please open an issue on the repository.
