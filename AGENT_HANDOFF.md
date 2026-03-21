# R3L:F — Agent Handoff Document

> You are being delegated full ownership of this codebase. Read this document completely before taking any action.

---

## 1. What This Project Is

**R3L:F (Relational Relativity & Random Ephemerality File-net)** — a serendipitous, anti-algorithmic social file-sharing platform built entirely on the Cloudflare Developer Platform.

- Users share **Artifacts** (any file type) that expire in 7 days by default
- Social graph is visualized with D3.js — **Sym** (mutual), **A-Sym** (one-way), **Drift** (random discovery)
- No algorithmic feed. Discovery is random or intentional
- Real-time via Durable Objects WebSockets
- Optional client-side E2EE (RSA-OAEP + AES-GCM)

**Production URL**: `https://r3l.distorted.work`  
**Deploy command**: `npm run deploy` (builds Vite client → deploys Worker)  
**Dev command**: `npm run dev` (Wrangler local dev on `localhost:8787`)

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, D3.js, GSAP, CodeMirror |
| Backend | Cloudflare Workers, Hono 4.12.8 |
| Database | Cloudflare D1 (SQLite) — binding: `DB` |
| File Storage | Cloudflare R2 — binding: `BUCKET`, public domain: `r3l-r2.distorted.work` |
| Sessions/Rate Limiting | Cloudflare KV — binding: `KV` |
| Real-time | Durable Objects — `RelfDO` (presence/notifications), `DocumentRoom` (Yjs collab), `ChatRoom` |
| Email | Resend API |
| Collab | Yjs CRDT + y-websocket |

**Critical Hono version note**: Hono 4.12.8 requires explicit `'HS256'` as 3rd argument to both `sign()` and `verify()`. Missing this throws `JwtAlgorithmRequired` and breaks all auth.

---

## 3. Project Structure

```
r3l/
├── client/src/
│   ├── App.tsx                  # Root component, all modal state, WebSocket, auth
│   ├── components/
│   │   ├── AssociationWeb.tsx   # D3.js graph — the core UI
│   │   ├── Artifacts.tsx        # File list, expiry countdown, burn-on-read badge
│   │   ├── Inbox.tsx            # Notifications, DMs, sym requests
│   │   ├── GroupChat.tsx        # Group conversations
│   │   ├── FilePreviewModal.tsx # File viewer/editor, remix lineage, visibility
│   │   ├── UploadModal.tsx      # File upload, burn-on-read toggle
│   │   ├── CollectionsManager.tsx
│   │   ├── CustomizationSettings.tsx  # Graph aesthetics panel (bottom-left)
│   │   ├── AdminDashboard.tsx
│   │   ├── NetworkList.tsx      # Text list of graph nodes
│   │   ├── AmbientBackground.tsx
│   │   ├── LandingPage.tsx
│   │   ├── About.tsx
│   │   └── FAQ.tsx
│   ├── pages/
│   │   └── SettingsPage.tsx     # Privacy (Lurker in the Mist), account settings
│   ├── hooks/
│   │   ├── useNetworkData.ts    # Fetches graph nodes/links
│   │   └── useSpatialAudio.ts
│   ├── context/
│   │   ├── CustomizationContext.tsx
│   │   └── ToastContext.tsx
│   ├── utils/
│   │   └── crypto.ts            # RSA + AES E2EE helpers
│   └── styles/global.css
├── src/
│   ├── index.ts                 # All API routes (Hono), cron handler
│   ├── do.ts                    # RelfDO — WebSocket presence + notifications
│   ├── constants.ts
│   └── do/
│       ├── DocumentRoom.ts      # Yjs collaborative editing DO
│       └── ChatRoom.ts          # Group chat DO
├── migrations/                  # 0001–0025 sequential D1 SQL migrations
├── wrangler.jsonc
├── package.json
├── API.md                       # Full API reference
├── CHANGELOG.md                 # History of all changes
└── .amazonq/rules/memory-bank/  # Project memory (guidelines, structure, tech, product)
```

---

## 4. Environment & Secrets

### Wrangler vars (non-secret, in `wrangler.jsonc`)
```
R2_ACCOUNT_ID=829921384c97e0dbbb34430e307d6b52
R2_BUCKET_NAME=rr33ll-bucket
R2_PUBLIC_DOMAIN=r3l-r2.distorted.work
```

### Secrets (set via `wrangler secret put`)
| Secret | Status | Notes |
|--------|--------|-------|
| `JWT_SECRET` | ✅ Set | Signs/verifies auth cookies |
| `RESEND_API_KEY` | ✅ Set | Email delivery |
| `ENCRYPTION_SECRET` | ❌ NOT SET | Server-side AES-GCM encryption — features using it will fail silently |
| `ORCID_CLIENT_ID` | ✅ Set | Leftover — ORCID OAuth not implemented yet |
| `ORCID_CLIENT_SECRET` | ✅ Set | Leftover |
| `GITHUB_CLIENT_ID` | ✅ Set | Leftover — GitHub OAuth not implemented yet |
| `GITHUB_CLIENT_SECRET` | ✅ Set | Leftover |
| `R3L_AI_CONTEXT_LIMIT` | ✅ Set | AI feature config |
| `R3L_AI_MAX_TOKENS` | ✅ Set | AI feature config |

**Action required**: Set `ENCRYPTION_SECRET` before enabling server-side encryption features.

### Auth
- JWT stored in httpOnly cookie `auth_token`, `sameSite: 'Lax'`, `secure: true`
- Admin user: ID `1`, username `lowlyserf`
- Admin check: `user_id === parseInt(c.env.ADMIN_USER_ID)`

---

## 5. Database

25 migrations applied. Key tables:

| Table | Purpose |
|-------|---------|
| `users` | Auth, profile, public_key, encrypted_private_key |
| `relationships` | Sym/A-Sym connections |
| `mutual_connections` | Normalized bidirectional sym pairs (user_a_id < user_b_id) |
| `files` | Artifact metadata, expiry, vitality, burn_on_read, last_chance_notified |
| `collections` | Artifact grouping |
| `collection_files` | Many-to-many with file_order |
| `notifications` | Inbox — sym_request, sym_accepted, file_shared, system_alert |
| `messages` | Direct messages (Whispers), is_request flag |
| `groups` | Group chat |
| `group_members` | Membership + role |
| `group_messages` | Group conversation history |
| `group_files` | Files shared with groups |
| `communiques` | User profiles/manifestos |
| `vitality_votes` | One vote per user per file (prevents duplicate boosts) |

**DB commands**:
```bash
wrangler d1 migrations apply relf-db --remote   # production
wrangler d1 migrations apply relf-db --local    # local dev
```

---

## 6. Key Architectural Patterns

### API Route Pattern (backend)
```typescript
app.post('/api/endpoint', authMiddleware, async (c) => {
  const user_id = c.get('user_id');
  const { param } = await c.req.json();
  if (!param) return c.json({ error: 'Missing param' }, 400);
  try {
    // DB ops, side effects
    return c.json({ message: 'Success' });
  } catch (e) {
    console.error('Error:', e);
    return c.json({ error: 'Failed' }, 500);
  }
});
```

### R2 Key Format
- Files: `{user_id}/{uuid}-{filename}`
- Avatars: `avatars/{user_id}/{uuid}-{filename}`
- Public URL: `https://r3l-r2.distorted.work/{r2_key}`

### Visibility Modes
- `public` — anyone (appears in Drift)
- `sym` — mutual connections only
- `me` / `private` — owner only

### Relationship Types
- `sym_request` — pending
- `sym_accepted` — mutual
- `asym_follow` — one-way

### WebSocket Message Types
- `new_notification` — inbox item
- `new_message` — direct message (includes `sender_name`)
- `new_group_message` — group chat
- `signal_artifact` — new public file uploaded
- `signal_communique` — profile updated
- `presence_update` — user online/offline
- `presence_sync` — initial online users list

### Notification Creation
```typescript
await createNotification(c.env, c.env.DB, target_user_id, 'sym_request', source_user_id, { payload });
```

### Cron (hourly `0 * * * *`)
- Deletes expired files from R2 + D1
- Sends last-chance notifications for files expiring within 24h (`last_chance_notified = 0`)

---

## 7. Known Issues from Code Review

The automated code review found **30+ issues**. Categories to investigate and fix:

### Security (Priority: Critical/High)
- [ ] **`ENCRYPTION_SECRET` not set** — server-side encryption will fail; set the secret
- [ ] **Input sanitization** — verify `sanitize.ts` allowlist covers all XSS vectors in communique HTML
- [ ] **File type validation** — confirm MIME type is validated server-side on upload, not just client-side
- [ ] **R2 key traversal** — ensure user-supplied filenames cannot escape the `{user_id}/` prefix
- [ ] **JWT expiry** — confirm tokens have a reasonable expiry (e.g. 7 days) and are not indefinite
- [ ] **Rate limiting on file upload** — `POST /api/files` may lack rate limiting; check and add if missing
- [ ] **Admin endpoint hardening** — admin routes check `user_id === ADMIN_USER_ID`; confirm this is parsed as integer consistently

### Code Quality (Priority: Medium)
- [ ] **`App.tsx` size** — the root component is very large; consider extracting WebSocket logic into a custom hook
- [ ] **Error boundaries** — no React error boundaries; uncaught render errors will crash the whole app
- [ ] **`useNetworkData` deps** — verify all `useCallback`/`useEffect` dependency arrays are correct to prevent stale closures or infinite loops
- [ ] **D3 simulation cleanup** — confirm simulation is stopped and SVG selections are cleaned up on unmount in `AssociationWeb.tsx`
- [ ] **Unhandled promise rejections** — audit all `fetch()` calls in frontend for missing `.catch()` or try/catch
- [ ] **`any` types** — search for `as any` and `: any` and replace with proper types

### Performance (Priority: Low/Medium)
- [ ] **D1 query limits** — some queries may lack `LIMIT` clauses; unbounded queries on large tables will be slow
- [ ] **`GROUP_CONCAT` in group list query** — verify it doesn't cause performance issues at scale
- [ ] **Bundle size** — run `vite build --report` to check chunk sizes; CodeMirror + D3 + GSAP + Yjs is heavy

### UX / Bugs (Pending from last session)
- [ ] **NetworkList artifact/collection nodes** — clicking artifact or collection nodes should open `FilePreviewModal`, not navigate to communique route; fix `onNodeClick` dispatch in `NetworkList.tsx`
- [ ] **Nav dropdown outside-click** — clicking anywhere on the graph should close the nav dropdown; add document click listener in `App.tsx` on `menuRef`
- [ ] **Audio waveform player** — render waveform for audio artifacts in `FilePreviewModal.tsx` using Web Audio API (hook `useSpatialAudio` already exists)
- [ ] **Drift for collections** — `/api/drift` already returns collections; add collection nodes to `useNetworkData` and render them in the graph
- [ ] **Sym request with file attachment** — optional `file_id` on `POST /api/relationships/sym-request`; show attached artifact in the notification

---

## 8. Pending Features (Roadmap)

### Near-term
1. **ORCID OAuth** — secrets already set; implement OAuth flow in `src/index.ts` + login UI
2. **GitHub OAuth** — same as above
3. **Audio/Video streaming** — stream large media files from R2 with range requests
4. **Collaborative Workspaces** — extend `DocumentRoom.ts` for multi-file workspaces

### Longer-term
- Mobile PWA polish (service worker, offline support via `vite-plugin-pwa`)
- Community archive browsing UI improvements
- Federated identity / ActivityPub exploration

---

## 9. Development Workflow

```bash
# Install
npm install

# Local dev (Wrangler + Vite)
npm run dev

# Build frontend only
npm run build:client

# Deploy to production
npm run deploy

# Apply DB migrations (production)
wrangler d1 migrations apply relf-db --remote

# Apply DB migrations (local)
wrangler d1 migrations apply relf-db --local

# Rollback deployment
npm run rollback

# Set a secret
wrangler secret put SECRET_NAME
```

---

## 10. Code Style Rules

- **TypeScript strict mode** — no implicit any
- **2-space indentation**, semicolons always, single quotes (double in JSX)
- **camelCase** for variables/functions, **PascalCase** for types/components, **SCREAMING_SNAKE_CASE** for constants, **snake_case** for DB fields
- Parameterized queries always — never string interpolation in SQL
- Try/catch wraps all async ops; `console.error` for server errors, generic message to client
- `c.env.DB.batch()` for atomic multi-table operations
- React: hooks first, derived state, effects, handlers, render helpers, return JSX

---

## 11. Files to Read First

Before making any changes, read these files in order:

1. `src/index.ts` — all backend logic
2. `client/src/App.tsx` — root component, all modal/auth/WS state
3. `client/src/components/AssociationWeb.tsx` — core visualization
4. `client/src/hooks/useNetworkData.ts` — graph data layer
5. `migrations/` — understand the full schema
6. `.amazonq/rules/memory-bank/guidelines.md` — coding standards
7. `API.md` — full API reference

---

## 12. Constraints & Rules

- **Never** add Lurker Mode anywhere except `SettingsPage.tsx` Privacy tab — it already exists there
- **Never** add Privacy/Security settings to `CustomizationSettings.tsx` — that panel is graph aesthetics only
- **Never** hardcode secrets or fallback values for `JWT_SECRET`
- **Always** use `--remote` flag for D1 commands targeting production
- **Always** pass `'HS256'` as 3rd argument to Hono's `sign()` and `verify()`
- **Always** check ownership before mutations (`file.user_id !== user_id → 403`)
- **Always** check group membership before returning group data
- The `SECURITY.md` file contains placeholder content — do not treat it as authoritative

---

*Last updated by Amazon Q — handoff generated from full codebase review + session history.*
