# Rel F: Advanced Feature Implementation Plan

This document outlines the strategic roadmap for implementing advanced Collaboration, Media, Security, Discovery, and Mobile features for Rel F.

## 1. Collaboration & Real-Time

### Multiplayer Text Editing
**Objective:** Enable real-time, simultaneous editing of text artifacts by multiple users (e.g., owner and sym-connections).
**Tech Stack:** `yjs` (CRDT library), `y-websocket`, Cloudflare Durable Objects.

**Implementation Strategy:**
1.  **Backend:** Create a new Durable Object class `DocumentRoom`. This DO will maintain the state of a specific file's Yjs document and broadcast updates to connected clients.
2.  **Routing:** Add a specific WebSocket route `/api/collab/:fileId` that binds to the corresponding `DocumentRoom` instance.
3.  **Frontend:** Replace the simple `textarea` in `FilePreviewModal` with a lightweight editor compatible with Yjs (e.g., `Quill` or `Monaco`, or raw binding).
4.  **Sync:** When a user enters "Edit Mode", connect to the WS.

### Presence Indicators
**Objective:** Visual cues showing where users are "located" within the digital space.
**Tech Stack:** Existing `RelfDO` (Durable Object).

**Implementation Strategy:**
1.  **State Tracking:** Extend `RelfDO` to store a `currentLocation` map (User ID -> Node ID / File ID).
2.  **Reporting:** Client sends a heartbeat/location update via the existing notification WebSocket when opening a file or hovering a node.
3.  **Visualization:**
    *   **Graph:** Show "Ghost rings" or small avatars around nodes that other users are currently viewing.
    *   **Files:** "User X is viewing this" banner in `FilePreviewModal`.

**Checklist:**
- [x] Install `yjs`, `y-websocket` client-side.
- [x] Create `DocumentRoom` Durable Object in `src/do_document.ts` (needs new file).
- [x] Register `DocumentRoom` in `wrangler.jsonc`.
- [x] Add `/api/collab/:fileId` route in `src/index.ts`.
- [x] Implement `usePresence` React hook for location reporting.
- [x] Update `AssociationWeb` to render presence markers.

---

## 2. Media & Streaming

### Audio/Video Players
**Objective:** Transform Rel F into a lo-fi streaming platform.
**Tech Stack:** HTML5 `<audio>` / `<video>`, Cloudflare R2 (Range Headers).

**Implementation Strategy:**
1.  **Backend:** Ensure `GET /api/files/:id/content` passes through `Range` headers to R2 to allow seeking/scrubbing.
2.  **Frontend:** Update `FilePreviewModal` to detect MIME types (`audio/mpeg`, `video/mp4`, etc.).
3.  **UI:** Render a custom-styled player (matching the mist aesthetic) instead of the default browser controls if possible, or style the default ones.

### PDF Viewer
**Objective:** In-app reading of Zines and manifests.
**Tech Stack:** `<iframe>` (MVP) or `react-pdf` (Polished).

**Implementation Strategy:**
1.  **MVP:** If `application/pdf`, render an `<iframe src={blobUrl} width="100%" height="100%" />`.
2.  **Security:** Ensure proper CSP headers to prevent PDF scripts from executing efficiently.

**Checklist:**
- [x] Verify `Range` header passthrough in `src/index.ts`.
- [x] Update `FilePreviewModal.tsx` to switch render logic based on `mime_type`.
- [x] Add `AudioPlayer` component (Using HTML5 native).
- [x] Add `VideoPlayer` component (Using HTML5 native).
- [x] Add `PDFViewer` component (Using iframe).

---

## 3. Security & Privacy

### End-to-End Encryption (E2EE)
**Objective:** Zero-knowledge privacy. Server sees only blobs.
**Tech Stack:** Web Crypto API (`AES-GCM` for content, `RSA-OAEP` for key sharing).

**Implementation Strategy:**
1.  **Encryption (Client):** Before upload, generate `symmetricKey`. Encrypt file. Upload encrypted blob.
2.  **Key Management:**
    *   *Self:* Store encrypted `symmetricKey` (wrapped with user's derived master password) in DB metadata.
    *   *Sharing:* When sharing with User B, fetch User B's Public RSA Key, encrypt the file's `symmetricKey` with it, and store that "key share" in the DB.
3.  **Decryption (Client):** Download blob + encrypted key. Decrypt key with Private RSA Key. Decrypt blob.

### Burn-on-Read
**Objective:** Ephemeral messaging.
**Strategy:**
1.  **Schema:** Add `burn_on_read` (boolean) to `files` table.
2.  **Logic:** In `GET /api/files/:id/content`:
    *   Serve the stream.
    *   *After* response initiates (or via a "cleanup" DO alarm), trigger deletion of the R2 object and DB record.

**Checklist:**
- [x] Create `client/src/utils/crypto.ts`.
- [ ] Generate User RSA Keypairs on registration (store Public in DB, Private in LocalStorage/Encrypted in DB).
- [ ] Add `burn_on_read` column to `files`.
- [x] Implement deletion trigger on file access.

---

## 4. Discovery & "The Drift"

### Drift Channels
**Objective:** Targeted serendipity.
**Strategy:**
1.  **Backend:** Modify `GET /api/drift` to accept `type` (audio, image, text) and `tag` filters.
2.  **Frontend:** Add a "Tuner" UI next to the Drift button (e.g., a radio dial interface).

### Spatial Audio Graph
**Objective:** Soundscape navigation.
**Tech Stack:** Web Audio API (`PannerNode`), D3.js.

**Implementation Strategy:**
1.  **Audio Context:** Initialize a global `AudioContext`.
2.  **Nodes:** For every "Drift Audio" node on the graph, attach an audio source.
3.  **Positioning:** In the D3 `tick` function, update the `PannerNode` position of the audio source relative to the "Me" node (Listener).
4.  **Volume:** Distance-based attenuation (farther nodes = quieter).

**Checklist:**
- [x] Update `GET /api/drift` SQL query to support filters.
- [x] Create `DriftTuner` UI component (integrated in App.tsx/UserDiscovery).
- [x] Create `SpatialAudio` manager class (implemented as useSpatialAudio hook).
- [x] Hook D3 coordinates to Audio API in `AssociationWeb.tsx`.

---

## 5. Mobile Experience

### PWA Support
**Objective:** Native app feel.
**Strategy:**
1.  **Manifest:** Create `public/manifest.json`.
2.  **Service Worker:** Use `vite-plugin-pwa` for easy caching and offline fallback generation.

### Gestures
**Objective:** Swipe-based interaction for Inbox.
**Tech Stack:** `react-use-gesture`, `react-spring`.

**Implementation Strategy:**
1.  **Component:** Wrap `Inbox` notifications in a `SwipeableItem` component.
2.  **Logic:**
    *   Swipe Right (> 50px): Trigger "Accept" (Green bg).
    *   Swipe Left (< -50px): Trigger "Delete" (Red bg).

**Checklist:**
- [ ] Install `vite-plugin-pwa`.
- [ ] Configure PWA in `vite.config.ts`.
- [ ] Create `manifest.json`.
- [ ] Install `react-use-gesture` `react-spring`.
- [ ] Refactor `Inbox.tsx` items to be swipeable.
