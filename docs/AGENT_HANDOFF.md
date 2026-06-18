# R3L:F Agent Handoff

## 🎯 Current Status

The project has completed:
1. **Layout & Accessibility** — z-index hierarchy, viewport fixes, header awareness, touch targets
2. **Feature Completion** — collection node navigation, drift collections, icon import fixes
3. **Terminology Sweep** — canonical vocabulary (FILES, TTL, SYMTXT, FLARE, RELMAP, COMMUNIQUE)
4. **3SPACE Connection Type** — full backend + frontend implementation
5. **Yjs Collab Fix** — DocumentRoom protocol encoding fixed

## ✅ What's Done

### Terminology & Philosophy
- Canonical glossary at `docs/terminology.md` with register rules (UPPERCASE labels / lowercase prose)
- All UI copy updated: FILES, TTL, SYMTXT, FLARE, RELMAP, COMMUNIQUE, DRIFT, ARCHIVE
- Philosophy statement on landing, About, FAQ
- All docs synced to current terminology

### 3SPACE Connection Type
- DB migrations 0029-0030: relationship types + file visibility
- Backend: request/accept/decline/remove endpoints, SYMTXT gating
- Frontend: Inbox notifications, SYMTXT thread proposals, colour token
- RELMAP: excluded from graph and connection counts

### Styling & Layout
- All z-index values use CSS variables from `design-tokens.css`
- `100vw` replaced with `100%` throughout
- `.btn-icon` has `min-width/height: 44px` for touch compliance
- `--header-height` (60px) used consistently

### Features
- Collection node clicks navigate to owner's communique
- Drift collections via `/api/discovery/drift`
- Sym request file attachment
- FLARE (Burn-on-Read) backend enforcement
- Group chat with file sharing

## 🚧 Active Backlog

See **`docs/IMPROVEMENTS.md`** for the full prioritized list. Top items:

1. **Threaded Comments** — Minimal responses on files
2. **Bookmarks** — Private, untracked saving
3. **Undo Deletion** — 24h grace period
4. **Media Streaming** — R2-native range requests for large media

## 🔑 Technical Reminders

- **Styling**: `client/src/styles/design-tokens.css` is the source of truth for all tokens
- **Terminology**: `docs/terminology.md` — UPPERCASE in labels, lowercase in prose
- **Icons**: Use `@tabler/icons-react` with `ICON_SIZES` from `client/src/constants/iconSizes.ts`
- **Mobile breakpoint**: 768px
- **Backend routes**: `src/routes/` — 10 route modules mounted in `src/index.ts`
- **Durable Objects**: `RelfDO` (WebSocket/presence), `DocumentRoom` (Yjs collab), `ChatRoom` (global chat rooms)
- **Rate limits**: drift is 20 req/600s; login/register have their own limits in `src/constants.ts`
- **No test suite** — verification via `npm run build:client` + manual check in `npm run dev`

---
*Last updated: 2026-06-17 — Terminology sweep + 3SPACE + Yjs fix complete.*
