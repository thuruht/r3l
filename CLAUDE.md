# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Rel F (R3L:F)** is a Cloudflare-native social networking experiment centered on ephemeral file sharing and serendipitous discovery. The primary interaction unit is the **Artifact** (file), which expires in 7 days unless refreshed via "Vitality" voting. The **Association Web** (D3.js force graph) is the main navigation metaphor. Social connections are either **Sym** (mutual) or **A-Sym** (one-way).

## Commands

```bash
# Install dependencies
npm install

# Local development (Wrangler dev server serves both worker and frontend via Vite)
npm run dev

# Build frontend only (output: client/dist/)
npm run build:client

# Deploy (builds frontend then deploys worker + assets to Cloudflare)
npm run deploy

# Apply D1 migrations locally
npx wrangler d1 migrations apply relf-db --local

# Apply D1 migrations to production
npx wrangler d1 migrations apply relf-db --remote
```

There is no test suite. Local secrets go in `.dev.vars` (already present with development placeholders for `JWT_SECRET` and `ENCRYPTION_SECRET`).

## Architecture

### Two-tier: Cloudflare Worker + React SPA

**Backend** (`src/`) — Hono router running as a Cloudflare Worker (`src/index.ts` is the entry point). All API routes are under `/api/*`. The worker also serves the built React app via the `ASSETS` binding for any non-API path.

**Frontend** (`client/src/`) — React 18 + Vite PWA. Vite root is `client/`, build output goes to `client/dist/`. The `@` alias resolves to `client/src/`.

### Cloudflare Bindings (all declared in `wrangler.jsonc`)

| Binding | Type | Purpose |
|---|---|---|
| `DB` | D1 | Relational data (users, files, messages, relationships) |
| `BUCKET` | R2 | File content storage; served via `R2_PUBLIC_DOMAIN` |
| `KV` | KV | Sessions, rate limiting, drift history (keyed `history:{userId}`) |
| `DO_NAMESPACE` (`RelfDO`) | Durable Object | Global WebSocket presence & real-time notifications |
| `DOCUMENT_ROOM` (`DocumentRoom`) | Durable Object | Yjs collaborative editing over WebSocket |
| `CHAT_ROOM` (`ChatRoom`) | Durable Object | Group/global chat with persisted message history |

### Route Modules (`src/routes/`)

Each module exports a Hono app mounted in `src/index.ts`:

- `auth.ts` → `/api` (login, register, verify-email, forgot/reset-password)
- `social.ts` → `/api` (follow, connections, profile)
- `artifacts.ts` → `/api/files` (CRUD, upload to R2, streaming content)
- `discovery.ts` → `/api/discovery` (drift, random users/files)
- `messages.ts` → `/api/messages` (E2EE whispers)
- `communiques.ts` → `/api/communiques` (public user profile posts)
- `collections.ts` → `/api/collections`
- `workspaces.ts` → `/api/workspaces`
- `admin.ts` → `/api/admin`
- `misc.ts` → `/api` (feedback, notifications)

History (recently drifted) and WebSocket upgrade routes live directly in `src/index.ts`.

### Auth

JWT stored as an HttpOnly cookie (`auth_token`). The worker middleware in `src/index.ts` skips auth for `PUBLIC_PATHS` and for `GET /api/users/:id` (numeric). The Hono context variable `user_id` (number) is set by the middleware and available in all protected routes via `c.get('user_id')`.

### Durable Objects

All three DOs use the **Hibernation API** (`state.acceptWebSocket` + `webSocketMessage`/`webSocketClose` handlers). Session metadata is stored via `ws.serializeAttachment()` so it survives hibernation.

- **`RelfDO`**: One global instance (`idFromName('relf-do-instance')`). Exposes RPC methods `notify(userId, msg)` and `broadcastSignal(signal)` called directly from route handlers via DO stub.
- **`DocumentRoom`**: One instance per file ID. Syncs a Yjs document and persists state to DO storage as `Uint8Array` under the key `"content"`.
- **`ChatRoom`**: One instance per room name. Persists up to 100 messages in DO storage; runs a storage-cleanup alarm hourly.

### Cron Job

Runs hourly (`0 * * * *`). Decrements Vitality on all live files, sends "< 24h" expiry notifications, deletes expired files (R2 object + D1 row), and detects "organic resonance" (users who boosted the same file within 24h without being connected).

### E2EE (Whispers)

Private messages use client-side RSA-OAEP (2048-bit) + AES-GCM (256-bit). The public key is stored in the `users` table; the private key is wrapped with the user's password and stored in `localStorage` via `client/src/utils/crypto.ts`. The server never sees plaintext message content or the private key.

## Frontend Patterns

### State & Data Flow

`App.tsx` owns global auth state, WebSocket connection, drift state, and unread counts. It uses `useNetworkData` hook to derive D3 graph nodes/links from API data. The `AssociationWeb` component renders the D3 force graph; `NetworkList` renders the same data as a list. `CommuniquePage` is the per-user profile view.

Heavy components (GroupChat, AdminDashboard, CollectionsManager, etc.) are lazy-loaded via `React.lazy`.

### Design System

Defined in `client/src/styles/design-tokens.css`. All values must come from CSS variables:

- Spacing: `var(--spacing-xs/sm/md/lg/xl/2xl)` (4px base unit)
- Colors: `var(--accent-sym)` (neon green, primary action), `var(--accent-alert)` (red), `var(--text-primary/secondary)`, `var(--bg-color)`, `var(--drawer-bg)`
- Z-index: `var(--z-dropdown/modal/toast/tooltip)`
- Themes: "Mist" (default dark blue-black) and "Verdant" (dark green-black); toggled via `ThemeContext`

Use `ICON_SIZES` from `client/src/constants/iconSizes.ts` for all `@tabler/icons-react` sizes. Prefer CSS classes (`.btn-primary`, `.modal-panel`, `.glass-panel`, `.flex-between`, etc.) over inline styles.

### Sanitization

- **Client**: `client/src/utils/sanitize.ts` — `sanitizeHTML()` uses `DOMParser` allowlist; must be applied before rendering any user-provided HTML (e.g., Communique bodies).
- **Server**: `src/utils/security.ts` — `sanitizeHTML()` uses Cloudflare `HTMLRewriter` (streaming, safe against encoding tricks).

### Security Utilities (`src/utils/security.ts`)

Passwords: PBKDF2-SHA-256, 100k iterations, per-user salt. File encryption: AES-GCM via `encryptData`/`decryptData`. Rate limiting: KV-backed per-IP counters via `checkRateLimit` in `src/utils/helpers.ts`.

## Database

28 sequential SQL migrations in `migrations/`. Key tables: `users`, `files` (artifacts), `relationships` / `mutual_connections`, `messages`, `collections`, `workspaces`, `communiques`, `notifications`, `vitality_votes`, `archive_votes`.

Files have `expires_at`, `vitality` (decrements hourly), `is_archived`, `is_community_archived`, `last_chance_notified` columns. The `r2_key` column stores the R2 object key; served publicly via `R2_PUBLIC_DOMAIN`.
