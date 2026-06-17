# UI Interaction Map & Conflict Analysis

This document maps the layout and stacking context of interactive overlays, fixed elements, and absolute positioning across the R3L:F interface. Updated to reflect current code state.

---

## Navigation Model

The UI follows a four-layer taxonomy:

| Layer | Examples | Behaviour |
|---|---|---|
| **Canvas** | AssociationWeb (D3 graph), NetworkList | Full viewport below header |
| **Sidebar** | Inbox, Connections, GlobalChat, History | Right-edge drawer, `transform: translateX(...)` |
| **Modal** | UploadModal, FilePreviewModal, WorkspacesManager, SettingsPage | Full-screen overlay, `position: fixed`, `z-index: var(--z-modal)` |
| **Full overlay** | CommuniquePage | Route-level page via React Router |

The sidebar uses a single `isSidebarOpen` + `sidebarTab` state pair — opening one tab automatically replaces the previous tab (no stacking).

---

## Current Element Positions

### Bottom-Left (`bottom: ~20px, left: ~20px`)

| Element | File | Position | Notes |
|---|---|---|---|
| Gear (CustomizationSettings) | `CustomizationSettings.tsx` | `position: absolute`, `left: 20px`, `z-index: var(--z-overlay)` | Gear icon; expands upward when opened |
| Legend | `AssociationWeb.tsx` | `position: absolute`, `left: 56px`, `pointer-events: none` | Offset right of gear so they don't overlap |

**Status: resolved.** The legend was previously at `left: 20px`, overlapping the gear. Now at `left: 56px`.

### Bottom-Right (`bottom: ~20px, right: ~20px`)

| Element | File | Position | Notes |
|---|---|---|---|
| Zoom controls (+/−/fit) | `AssociationWeb.tsx` | `position: absolute`, `z-index: var(--z-overlay)` | |
| Toasts | `ToastContext.tsx` | `position: fixed`, `z-index: var(--z-toast)` (4000) | Appears over zoom controls when active; toasts auto-dismiss so it's transient |

### Top-Center

| Element | File | Notes |
|---|---|---|
| Ambient controls (eye/play/mute) | `AmbientBackground.tsx` | `position: fixed`, `top: 12px`, `left: 50%`, `z-index: var(--z-header)`, fades to 40% opacity at rest |

### Header (`z-index: var(--z-header)` = 1000)

| Element | Notes |
|---|---|
| `.header` | `position: fixed`, no `transform` (transform was removed to avoid trapping fixed children in a 60px stacking context) |

---

## Known Issues / Open Items

### CommuniquePage z-index tie with Header

`CommuniquePage.tsx` mounts as a full-page route overlay at `z-index: 1000` (same as the header). If it renders later in the DOM than the header, it can obscure navigation. Proposal: raise header to `z-index: 1100`.

### Toast / Zoom Controls Transient Overlap

When a toast fires while the graph is visible, it briefly covers the bottom-right zoom buttons. Severity: low (toasts auto-dismiss in ~3s). No fix planned.

---

## Resolved Issues (Historical)

- **Bottom-left three-way collision** (Legend + Gear + Ambient audio): Ambient controls moved to top-center; legend offset to `left: 56px`. ✅
- **GlobalChat / GroupChat breaking out of sidebar**: Removed `position: fixed` from both components; they now fill the sidebar container. ✅
- **Search results modal clipped by header**: Removed `transform: translateZ(0)` from `.header` (was creating a stacking context trapping children). ✅
- **Floating drift history panel duplication**: Removed floating panel; history lives exclusively in the sidebar "History" tab. ✅
- **Competing right-edge drawers**: Replaced independent `isInboxOpen`/`isPlanetsOpen` booleans with single `isSidebarOpen + sidebarTab` state. ✅
- **CSS injection via user `custom_css`**: Scoped all user CSS to `#communique-user-{id}` using `scopeCSS()` in `sanitize.ts`. ✅
