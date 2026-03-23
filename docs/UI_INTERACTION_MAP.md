# UI Interaction Map & Conflict Analysis

This document maps the layout and stacking context of all interactive overlays, fixed elements, and absolute positioning across the R3L:F interface.

## 1. The "Bottom-Left Corner" Collision (High Priority)
*Location:* `bottom: 20px, left: 20px`
* **AssociationWeb.tsx (Legend):** `position: absolute`, `pointerEvents: 'none'`
* **CustomizationSettings.tsx (Open Button):** `position: absolute`, `z-index: var(--z-overlay)` (10)
* **AmbientBackground.tsx (Audio Controls):** `position: fixed`, `zIndex: 50`
* **Conflict:** All three elements are targeting the exact same spatial coordinates. The AssociationWeb legend will be visually occluded. More critically, the Customization Settings button and Ambient Background controls physically overlap, causing click interference depending on DOM render order (currently Ambient Background with `z-index: 50` will block Customization with `z-index: 10`).

## 2. The "Right-Edge Drawer" Stacking (Medium Priority)
*Location:* `top: var(--header-height), right: 10px`
* **Inbox.tsx (`< mail >` panel):** `position: fixed`, `width: min(360px, 95vw)`, `z-index: var(--z-modal)` (3000)
* **App.tsx (`< planets >` panel):** `position: fixed`, `width: min(400px, 95vw)`, `z-index: var(--z-modal)` (3000)
* **Conflict:** Both panels are designed as right-aligned sliding drawers. If a user clicks `< mail >` and then `< planets >` without closing the first, both panels open simultaneously, stacking on top of each other. Because they share the same z-index, the one rendered later in `App.tsx` takes precedence, but the UI underneath remains active and visually messy.
* **Proposed Fix:** Opening one drawer should automatically set the state of the other drawer to `false`.

## 3. The "Bottom-Right Corner" Occlusion (Low Priority)
*Location:* `bottom: 20px, right: 20px`
* **ToastContext.tsx (Toasts):** `position: fixed`, `z-index: var(--z-toast)` (4000)
* **AssociationWeb.tsx (Zoom Controls):** `position: absolute`, `z-index: var(--z-overlay)` (10)
* **Conflict:** When a system toast appears (e.g., "Signal boosted!"), it renders directly over the RRC Graph's zoom controls. While the z-index hierarchy is correct (Toasts > Overlays), the toast physically blocks interaction with the zoom controls until it disappears.

## 4. Full-Screen Z-Index Hierarchies (Medium Priority)
*Location:* `inset: 0` or full viewport coverage
* **Header (`App.css`):** `position: fixed`, `z-index: var(--z-header)` (1000)
* **CommuniquePage.tsx:** `position: fixed`, `z-index: var(--z-header)` (1000)
* **Modals (Archive, Settings, etc.):** `z-index: var(--z-modal)` (3000)
* **FilePreviewModal.tsx:** `z-index: var(--z-modal)` (3000)
* **Conflict:** `CommuniquePage.tsx` and the main `Header` share the exact same `z-index: 1000`. This creates a race condition based on DOM mounting order. If `CommuniquePage` mounts later, it can completely occlude the global navigation header, relying entirely on its own absolute-positioned "Back" button to escape.

## 5. Drift Mode Floating UI (Low Priority)
*Location:* `top: var(--header-height), left: 10px`
* **Drift Session History (`App.tsx`):** `position: fixed`, `z-index: var(--z-overlay)` (10)
* **Conflict:** In mobile views, or narrow desktop views, this panel can stretch up to `240px` wide, potentially overlapping with the main Drift controls in the header or occupying prime interaction real estate in the RRC graph.

## Summary of Recommendations for Next Session
1. **Relocate Ambient Controls:** Move the audio toggles to `bottom: 20px, left: 80px` or integrate them into the header.
2. **Drawer State Management:** Implement a global "active drawer" state rather than independent booleans to prevent the Inbox and Planets panels from opening simultaneously.
3. **Z-Index Audit:** Elevate the Header to `z-index: 1100` or lower the `CommuniquePage` background to ensure navigation is never accidentally trapped.
4. **Toast Relocation:** Consider moving Toasts to `top: calc(var(--header-height) + 20px), right: 20px` to clear the bottom interaction zones.
