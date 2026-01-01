# Rel F: Comprehensive Enhancement Roadmap

## Phase 1: Deferred Bug Fixes (Priority: Critical)

### 1.1 CSRF Protection
**Status**: Not Implemented  
**Priority**: High  
**Effort**: Medium

**Implementation Plan**:
1. Generate CSRF token on login, store in httpOnly cookie
2. Add `X-CSRF-Token` header requirement for all state-changing requests
3. Validate token in middleware before processing POST/PUT/DELETE
4. Rotate token on sensitive operations

**Files to Modify**:
- `src/index.ts` - Add CSRF middleware
- `client/src/utils/api.ts` - Create API wrapper with CSRF header
- All components - Use API wrapper instead of raw fetch

**Estimated Time**: 4-6 hours

---

### 1.2 Drift Query Optimization
**Status**: Uses ORDER BY RANDOM()  
**Priority**: Medium  
**Effort**: Low

**Implementation Plan**:
1. Get total count of eligible records
2. Generate random offset: `Math.floor(Math.random() * count)`
3. Use `LIMIT 10 OFFSET random_offset` instead of ORDER BY RANDOM()
4. For multiple results, generate multiple random offsets

**Files to Modify**:
- `src/index.ts` - GET /api/drift endpoint

**Code Change**:
```typescript
// Replace ORDER BY RANDOM() LIMIT 10 with:
const count = await db.prepare('SELECT COUNT(*) FROM ...').first();
const offset = Math.floor(Math.random() * count);
const results = await db.prepare('SELECT ... LIMIT 10 OFFSET ?').bind(offset).all();
```

**Estimated Time**: 1-2 hours

---

### 1.3 Conversations Query Optimization
**Status**: Potential N+1 issue  
**Priority**: Low  
**Effort**: Medium

**Implementation Plan**:
1. Rewrite query to use window functions for latest message per conversation
2. Add index on `messages(sender_id, receiver_id, created_at)`
3. Use single query with proper JOINs instead of subqueries

**Files to Modify**:
- `src/index.ts` - GET /api/messages/conversations
- `migrations/0018_optimize_conversations.sql` - New migration

**Estimated Time**: 2-3 hours

---

## Phase 2: UX Enhancements (Priority: High)

### 2.1 Improved File Preview
**Features**:
- Native audio/video players with custom controls
- PDF viewer (iframe or react-pdf)
- Image gallery with zoom/pan
- Code syntax highlighting for text files

**Files to Create**:
- `client/src/components/MediaPlayer.tsx`
- `client/src/components/PDFViewer.tsx`
- `client/src/components/ImageGallery.tsx`

**Estimated Time**: 8-10 hours

---

### 2.2 Enhanced Drift Experience
**Features**:
- Visual "tuner" UI (radio dial aesthetic)
- Drift history (recently discovered items)
- Bookmark drift discoveries
- Drift notifications (new public content alert)

**Files to Modify**:
- `client/src/components/UserDiscovery.tsx`
- `client/src/App.tsx`

**Estimated Time**: 6-8 hours

---

### 2.3 Mobile Optimizations
**Features**:
- Bottom navigation bar for mobile
- Pull-to-refresh on graph view
- Haptic feedback for interactions
- Improved touch targets (min 44x44px)
- Gesture-based navigation

**Files to Modify**:
- `client/src/App.tsx`
- `client/src/components/AssociationWeb.tsx`
- `client/src/styles/global.css`

**Estimated Time**: 10-12 hours

---

### 2.4 Onboarding Flow
**Features**:
- Interactive tutorial on first login
- Sample artifacts for new users
- Guided tour of graph interface
- Tips system with dismissible hints

**Files to Create**:
- `client/src/components/Onboarding.tsx`
- `client/src/components/TourGuide.tsx`

**Estimated Time**: 8-10 hours

---

### 2.5 Notification Improvements
**Features**:
- Group similar notifications
- Notification preferences (mute types)
- Desktop notifications (Web Notifications API)
- Notification sound customization
- Undo for swipe actions (toast with undo button)

**Files to Modify**:
- `client/src/components/Inbox.tsx`
- `client/src/context/ToastContext.tsx`

**Estimated Time**: 6-8 hours

---

## Phase 3: Feature Enhancements (Priority: Medium)

### 3.1 Advanced Search
**Features**:
- Search artifacts by filename, type, tags
- Search within file content (full-text search)
- Filter by date range, vitality, visibility
- Saved searches

**Backend Changes**:
- Add FTS5 virtual table for file content
- New endpoint: GET /api/search

**Estimated Time**: 12-15 hours

---

### 3.2 Artifact Versioning
**Features**:
- Track edit history for text artifacts
- Diff view between versions
- Restore previous versions
- Version branches (experimental)

**Database Changes**:
- New table: `file_versions`
- Store diffs instead of full copies

**Estimated Time**: 15-20 hours

---

### 3.3 Collaborative Playlists
**Features**:
- Shared audio/video playlists
- Real-time playback sync (watch together)
- Queue management
- Voting on next track

**New Durable Object**:
- `PlaylistRoom` for sync state

**Estimated Time**: 20-25 hours

---

### 3.4 Spatial Audio Enhancement
**Features**:
- 3D audio positioning based on graph coordinates
- Distance-based volume attenuation
- Ambient soundscapes for different areas
- Audio mixing for multiple sources

**Files to Modify**:
- `client/src/hooks/useSpatialAudio.ts`
- `client/src/components/AssociationWeb.tsx`

**Estimated Time**: 10-12 hours

---

### 3.5 Tags & Metadata
**Features**:
- User-defined tags for artifacts
- Auto-tagging based on content analysis
- Tag-based discovery
- Tag clouds on profiles

**Database Changes**:
- New table: `tags`, `file_tags`

**Estimated Time**: 8-10 hours

---

### 3.6 Activity Feed
**Features**:
- Timeline of Sym connections' activities
- Filter by activity type
- Privacy controls (opt-out of feed)
- Ephemeral feed (24h history only)

**New Endpoint**:
- GET /api/feed

**Estimated Time**: 10-12 hours

---

## Phase 4: Performance & Scalability (Priority: Medium)

### 4.1 Caching Strategy
**Improvements**:
- Cache user profiles in KV (5min TTL)
- Cache relationship data in KV
- Implement stale-while-revalidate pattern
- Edge caching for public artifacts

**Estimated Time**: 8-10 hours

---

### 4.2 Lazy Loading & Pagination
**Improvements**:
- Infinite scroll for file lists
- Virtual scrolling for large collections
- Paginated API responses
- Cursor-based pagination for messages

**Estimated Time**: 10-12 hours

---

### 4.3 Image Optimization
**Improvements**:
- Automatic thumbnail generation on upload
- Multiple size variants (thumb, medium, full)
- WebP conversion for supported browsers
- Lazy loading images in graph

**New Worker**:
- Image transformation worker using Cloudflare Images

**Estimated Time**: 12-15 hours

---

### 4.4 Database Optimization
**Improvements**:
- Add missing indexes (see migration 0017)
- Optimize complex queries with CTEs
- Implement read replicas (if D1 supports)
- Archive old data to separate tables

**Estimated Time**: 6-8 hours

---

## Phase 5: Advanced Features (Priority: Low)

### 5.1 Artifact Reactions
**Features**:
- Emoji reactions on files
- Reaction aggregation
- Custom reaction sets
- Reaction notifications

**Estimated Time**: 6-8 hours

---

### 5.2 Artifact Comments
**Features**:
- Threaded comments on artifacts
- Markdown support
- @mentions
- Comment notifications

**Estimated Time**: 12-15 hours

---

### 5.3 Workspaces
**Features**:
- Shared collaborative spaces
- Workspace-specific artifacts
- Role-based permissions (owner, editor, viewer)
- Workspace chat

**Estimated Time**: 25-30 hours

---

### 5.4 Export & Backup
**Features**:
- Export all user data (GDPR compliance)
- Scheduled backups to external storage
- Import from backup
- Data portability (JSON format)

**Estimated Time**: 10-12 hours

---

### 5.5 Analytics Dashboard
**Features**:
- Personal stats (uploads, connections, vitality earned)
- Graph over time
- Most popular artifacts
- Connection growth chart

**Estimated Time**: 8-10 hours

---

### 5.6 Moderation Tools
**Features**:
- Report content/users
- Admin review queue
- Auto-moderation rules
- User blocking
- Content warnings

**Estimated Time**: 15-20 hours

---

## Phase 6: Polish & Refinement (Priority: Ongoing)

### 6.1 Accessibility
**Improvements**:
- ARIA labels on all interactive elements
- Keyboard navigation for graph
- Screen reader support
- High contrast mode
- Focus indicators

**Estimated Time**: 12-15 hours

---

### 6.2 Error Handling
**Improvements**:
- Graceful degradation for offline mode
- Better error messages
- Retry logic for failed requests
- Error boundary components
- Sentry integration for error tracking

**Estimated Time**: 8-10 hours

---

### 6.3 Testing
**Additions**:
- Unit tests for utilities
- Integration tests for API endpoints
- E2E tests with Playwright
- Visual regression tests

**Estimated Time**: 20-25 hours

---

### 6.4 Documentation
**Additions**:
- API documentation (OpenAPI spec)
- Component storybook
- User guide
- Video tutorials
- Developer onboarding guide

**Estimated Time**: 15-20 hours

---

## Implementation Priority Matrix

| Phase | Priority | Effort | Impact | Order |
|-------|----------|--------|--------|-------|
| 1.1 CSRF | High | Medium | High | 1 |
| 1.2 Drift Opt | Medium | Low | Medium | 2 |
| 2.1 File Preview | High | Medium | High | 3 |
| 2.2 Drift UX | High | Medium | High | 4 |
| 2.4 Onboarding | High | Medium | High | 5 |
| 2.3 Mobile | High | High | High | 6 |
| 2.5 Notifications | Medium | Medium | Medium | 7 |
| 4.1 Caching | Medium | Medium | High | 8 |
| 3.1 Search | Medium | High | High | 9 |
| 1.3 Conv Opt | Low | Medium | Low | 10 |

## Total Estimated Time

- **Phase 1 (Critical)**: 7-11 hours
- **Phase 2 (UX)**: 38-48 hours
- **Phase 3 (Features)**: 75-94 hours
- **Phase 4 (Performance)**: 36-45 hours
- **Phase 5 (Advanced)**: 76-95 hours
- **Phase 6 (Polish)**: 55-70 hours

**Grand Total**: 287-363 hours (~7-9 weeks full-time)

## Next Steps

1. Implement Phase 1 (Deferred Fixes) - Week 1
2. Implement Phase 2.1-2.2 (Core UX) - Week 2
3. Implement Phase 2.3-2.4 (Mobile & Onboarding) - Week 3
4. Implement Phase 4.1 (Caching) - Week 4
5. Implement Phase 3.1 (Search) - Week 5
6. Continue with remaining phases based on user feedback
