# Additional Bugs & Improvements

## Critical Bugs

### 1. **Inbox: Payload Parsing Error**
- **Location**: `client/src/components/Inbox.tsx`
- **Issue**: `payload` is stored as JSON string in DB but accessed as string directly
- **Line**: `payload: string;` should be parsed
- **Impact**: System alerts and file_shared notifications won't display properly

### 2. **Missing currentUser Prop**
- **Location**: `client/src/components/Artifacts.tsx` 
- **Issue**: FilePreviewModal requires `currentUser` prop but it's not passed
- **Impact**: Preview modal will fail to render

### 3. **Remix Upload Logic Incomplete**
- **Location**: `client/src/components/Artifacts.tsx`
- **Issue**: Old upload handler doesn't use UploadModal, remix target not passed correctly
- **Impact**: Remix feature broken

### 4. **Message Decryption Buffer Issue**
- **Location**: `src/index.ts` line ~2850
- **Issue**: `Uint8Array.from(Buffer.from(...))` - Buffer not available in Workers
- **Impact**: Encrypted messages fail to decrypt

## Moderate Issues

### 5. **Missing Error Handling in Broadcast**
- **Location**: `src/index.ts` - `broadcastSignal` function
- **Issue**: No try-catch around DO fetch, errors silently fail
- **Impact**: Admin broadcasts may fail without notification

### 6. **Inconsistent Visibility Handling**
- **Location**: Multiple files endpoints
- **Issue**: Frontend sends 'private', backend maps to 'me', but some checks still use 'private'
- **Impact**: Potential permission bypass

### 7. **Race Condition in WebSocket Reconnect**
- **Location**: `client/src/App.tsx`
- **Issue**: Multiple reconnect attempts can stack if connection flaps
- **Impact**: Memory leak, multiple WS connections

### 8. **Missing Cleanup in Artifacts**
- **Location**: `client/src/components/Artifacts.tsx`
- **Issue**: File input ref not cleared after remix cancel
- **Impact**: Stale file selection

## Performance Improvements

### 9. **N+1 Query in Conversations**
- **Location**: `src/index.ts` - GET /api/messages/conversations
- **Issue**: Query doesn't properly aggregate, may return duplicate rows
- **Impact**: Slow inbox loading with many messages

### 10. **Unoptimized Drift Query**
- **Location**: `src/index.ts` - GET /api/drift
- **Issue**: ORDER BY RANDOM() on large tables is slow
- **Suggestion**: Use LIMIT with random offset instead

### 11. **Missing Index on expires_at**
- **Location**: Database schema
- **Issue**: Cron job queries `WHERE expires_at < ?` without index
- **Impact**: Slow cleanup as files grow

## Security Issues

### 12. **No CSRF Protection**
- **Location**: All POST/PUT/DELETE endpoints
- **Issue**: Cookie-based auth without CSRF tokens
- **Impact**: CSRF vulnerability

### 13. **Weak Admin Check**
- **Location**: Multiple admin endpoints
- **Issue**: `if (user_id !== 1)` - hardcoded admin ID
- **Suggestion**: Use role-based system or env variable

### 14. **No Rate Limit on Vitality Boost**
- **Location**: POST /api/files/:id/vitality
- **Issue**: Users can spam boost requests
- **Impact**: Vitality manipulation

## UX Improvements

### 15. **No Loading State for Boost**
- **Location**: `client/src/components/Artifacts.tsx`
- **Issue**: Uses Set for tracking but no visual feedback during request
- **Fix**: Already has boostingIds but icon doesn't show loading

### 16. **Swipe Gesture Threshold Too High**
- **Location**: `client/src/components/Inbox.tsx`
- **Issue**: 80px swipe threshold may be too much on small screens
- **Suggestion**: Use percentage of screen width

### 17. **No Confirmation for Swipe Actions**
- **Location**: `client/src/components/Inbox.tsx`
- **Issue**: Swipe to delete has no undo
- **Suggestion**: Add toast with undo option

## Code Quality

### 18. **Inconsistent Error Messages**
- **Location**: Throughout backend
- **Issue**: Mix of generic "Failed to..." and specific errors
- **Suggestion**: Standardize error response format

### 19. **Magic Numbers**
- **Location**: Multiple files
- **Issue**: Hardcoded values like 168 hours, 7 days, threshold 10
- **Suggestion**: Extract to constants

### 20. **Missing TypeScript Strict Checks**
- **Location**: `tsconfig.json`
- **Issue**: `strict: true` but many `any` types remain
- **Suggestion**: Enable `noImplicitAny` and fix violations
