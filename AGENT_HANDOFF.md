# REL F (R3L:F) Agent Handoff

## 🎯 Current Status

The project has completed two major passes:
1. **Layout & Accessibility** — z-index hierarchy, viewport fixes, header awareness, touch targets
2. **Feature Completion** — collection node navigation, drift collections, icon import fixes

## ✅ What's Done

### Styling & Layout
- All z-index values use CSS variables from `design-tokens.css` (`--z-overlay`, `--z-sticky`, `--z-header`, `--z-dropdown`, `--z-modal`, `--z-toast`)
- `100vw` replaced with `100%` throughout to prevent horizontal scroll drift on mobile
- `.btn-icon` has `min-width/height: 44px` for touch compliance; `.btn-md`/`.btn-lg` have `min-height: 44px`
- `--header-height` (60px) used consistently for padding/offset in full-page components

### Icons
- `AssociationWeb.tsx` uses named imports (`IconPlus`, `IconMinus`, `IconMaximize`) — no more `ReferenceError` on minified builds
- `App.tsx`, `GlobalChat.tsx`, `UserDiscovery.tsx` use `import * as TablerIcons` namespace pattern consistently

### Features
- **Collection node clicks** navigate to the owner's communique (both graph and list view)
- **Drift collections** — `/api/discovery/drift` now returns random public collections; `useNetworkData` was already wired to handle them
- **Sym request file attachment** — fully implemented in `Communique.tsx` (UI + backend)
- **Burn-on-read badge** — shown in `Artifacts.tsx` but backend enforcement is NOT yet implemented (see backlog item #9)

## 🚧 Active Backlog

See **`docs/IMPROVEMENTS.md`** for the full prioritized list with implementation instructions. Top items:

1. **Code splitting** — 5MB bundle, use `React.lazy()` + `manualChunks` in vite config
2. **`crypto.ts` import conflict** — build warning, convert `KeyManager`/`UploadModal` to dynamic imports
3. **Artifact pagination** — no limit on `/api/files`, graph becomes unusable with 50+ files
4. **Drift auto-refresh** — add 60s interval while drifting
5. **Burn-on-read backend** — delete file from R2+D1 after serving to non-owner
6. **`window.innerWidth` in render** — replace with `useWindowSize` hook in `GlobalChat`, `FilePreviewModal`, `CustomizationSettings`

## 🔑 Technical Reminders

- **Styling**: `client/src/styles/design-tokens.css` is the source of truth for all tokens
- **Icons**: Use `TablerIcons.IconName` in `App.tsx`; named imports everywhere else
- **Mobile breakpoint**: 768px
- **Backend routes**: split across `src/routes/` — `social.ts`, `discovery.ts`, `collections.ts`; main `src/index.ts` handles files, auth, users
- **Durable Objects**: `RelfDO` (WebSocket/presence), `DocumentRoom` (Yjs collab), `ChatRoom` (global chat rooms)
- **Rate limits**: drift is 20 req/600s; login/register have their own limits in `src/constants.ts`

---
*Last updated after: z-index token pass, 100vw fixes, touch targets, collection nav fix, drift collections.*
