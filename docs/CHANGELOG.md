# Changelog

## [Unreleased] — Terminology Sweep, 3SPACE & Yjs Fix

### Features
- **3SPACE as full connection type**: New DB migration (0029, 0030) adds `3space_request` / `3space_accepted` relationship types. Backend endpoints for request, accept, decline, remove. Frontend notifications in Inbox, proposal from SYMTXT thread, `--accent-3space` colour token. 3SPACE connections are excluded from RELMAP and connection counts. SYMTXT gated on SYM or 3SPACE connection.
- **Canonical terminology sweep**: Applied register rules (UPPERCASE labels / lowercase prose) across all UI components. FILES replaces Artifacts, TTL replaces Vitality badges, FLARE replaces Burn-on-Read, SYMTXT replaces Whispers, RELMAP replaces RRC, COMMUNIQUE replaces RCC. Philosophy statement applied to landing/About/FAQ.

### Bug Fixes
- **Yjs collaborative editing broken (`DocumentRoom.ts`)**: `constructSyncMessage` used raw 2-byte headers `[0, type, ...data]` instead of proper lib0 `writeVarUint8Array` encoding. Client received malformed sync messages → "Unexpected end of array" in yjs decoder. Fixed read side too: `webSocketMessage` now uses `decoding.readVarUint` / `decoding.readVarUint8Array` instead of raw `uint8Message.subarray(2)` which included the varUint length prefix as Yjs data, corrupting both the in-memory doc and persisted DO storage.

### Security
- Auth cookie changed from `SameSite=Lax` to `SameSite=Strict` — prevents CSRF via cross-site requests
- Vitality boost now enforces one vote per user per file via `vitality_votes` table (migration 0023); 409 returned on duplicate

### Bug Fixes
- `connectWebSocket` stacked multiple reconnect timers on flapping connections — now guarded by `wsRef.readyState` check and a single `reconnectTimerRef` that is cleared before rescheduling
- WebSocket not cleaned up on component unmount — `useEffect` cleanup now closes socket and clears timer
- Group messages not delivered in real-time — backend now broadcasts `new_group_message` to all members via DO after insert; `GroupChat.tsx` listens on the `ws` prop
- Encrypted message decryption failure was silent — now surfaces `[Encrypted — key unavailable]` text with `⚠ decryption failed` indicator; successful encrypted messages show `🔒 encrypted` badge

### Code Quality
- `connectWebSocket` converted to `useCallback` with stable deps; defined before the `useEffect` that depends on it
- `ws` state restored in `App.tsx` and passed to `GroupChat` as prop
- Vitality endpoint uses `DB.batch()` for atomic vote insert + file update

---

## [Previous] — Security & Bug Fix Pass

### Security Fixes
- **Critical**: Removed hardcoded JWT fallback secret (`fallback_dev_secret_do_not_use_in_prod`) from `GET /api/users/me` — now returns 401 if `JWT_SECRET` is unset
- **Critical**: All group API routes (`/api/groups`, `/api/groups/:id/messages`, `/api/groups/:id/members`, `/api/groups/:id/files`) were missing membership authorization checks — all now verify the requesting user is a member before returning data
- **Critical**: `POST /api/files/:id/refresh` had no ownership check — any authenticated user could reset any file's expiration timer; now owner-only
- **Moderate**: `POST /api/files/:id/vitality` had no rate limiting — now enforces 10 boosts/minute per IP
- **Moderate**: `sanitize.ts` regex-based sanitizer was bypassable via attribute injection, case variants, and SVG/MathML vectors — replaced with DOM-parser allowlist approach

### Bug Fixes
- **Group API field mismatch**: `POST /api/groups` expected `members` but frontend sends `member_ids` — aligned to `member_ids`
- **Group API response mismatch**: `POST /api/groups` returned `group_id` but `GroupChat.tsx` expected `data.group.id` — fixed response shape
- **Group list missing fields**: `GET /api/groups` didn't return `member_count`, `last_message_snippet`, or `unread_count` that the frontend renders — query now includes these via subqueries
- **Group message field mismatch**: `GET /api/groups/:id/messages` returned `sender_username` but frontend expected `sender_name` — aligned column alias
- **Group message response**: `POST /api/groups/:id/messages` returned `data.message` (string) but `GroupChat.tsx` expected `data.data` (object) — fixed
- **Missing group file routes**: `GET/POST/DELETE /api/groups/:id/files` were not implemented despite frontend calling them — all three now implemented with proper auth
- **Missing community archive endpoint**: `ArchiveVote.tsx` called `GET /api/files/community-archived` which didn't exist — endpoint added
- **Missing crypto functions**: `Inbox.tsx` called `encryptMessageForUser`, `decryptMessageWithKey`, and `importPrivateKey` which didn't exist in `crypto.ts` — all three implemented
- **Missing `currentUserId` prop**: `App.tsx` rendered `<GroupChat>` without the required `currentUserId` prop — fixed
- **`broadcastSignal` type too narrow**: `system_alert` type was missing from the union — added
- **`constants.ts` used `process.env`**: Cloudflare Workers has no `process.env` — removed, `ADMIN_USER_ID` is resolved at runtime from `c.env`
- **Admin self-removal**: `DELETE /api/groups/:id/members/:userId` now prevents an admin from removing themselves

### Code Quality
- Extracted `checkGroupMember()` helper to eliminate repeated membership query boilerplate across group routes
- Consolidated `b64ToBytes` / `bytesToB64` helpers in `crypto.ts` to eliminate repeated inline conversions
- Removed stale session-artifact docs from root and `docs/` (BUGFIXES.md, ADDITIONAL_BUGS.md, FIXES_APPLIED.md, IMPLEMENTATION_PLAN.md, REVISED_ROADMAP.md, ROADMAP.md, migrations.md, project_master.md, and others)

---

## Previous Sessions

### Group Chat & Documentation (prior session)
- Implemented `GroupChat.tsx` component
- Added `encryptText` / `decryptText` to `crypto.ts` (now superseded by full E2EE helpers)
- Added message request system (migration 0018)
- Added group chat infrastructure (migration 0019)
- Added group file sharing (migration 0020)
- Rewrote `PrivacyPolicy.tsx` with honest, comprehensive content
- Updated `FAQ.tsx` and `About.tsx`

### Initial Build
- Auth: JWT, email verification, password reset
- Graph: D3.js Association Web with Drift pulse
- Files: Upload, expiration, vitality, burn-on-read, encryption
- Social: Sym/A-SYM relationships, inbox, sharing
- Collections: ZIP export, drag-and-drop reorder
- Real-time: Durable Objects WebSocket (RelfDO, DocumentRoom, ChatRoom)
