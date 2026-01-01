# Revised Roadmap: Rel F (Relational Ephemeral Filenet)

Based on the [r3l repository](https://github.com/thuruht/r3l) analysis, we are expanding the roadmap to emphasize **serendipity**, **randomness**, and **real-time presence**.

## Phase 4: Social Loop & Notifications (Completed)

- [x] **Relationships**
    - [x] `relationships` table (`asym_follow`, `sym_request`, `sym_accepted`).
    - [x] `mutual_connections` table for optimized graph queries.
    - [x] Backend API for Follow/Unfollow/Request/Accept/Decline.
- [x] **Notifications**
    - [x] `notifications` table (types: `sym_request`, `sym_accepted`, `file_shared`, `system_alert`).
    - [x] Backend API to list, mark as read.
    - [x] Real-time delivery via Durable Object WebSocket (`RelfDO`).
- [x] **Inbox UI**
    - [x] `Inbox.tsx` overlay component.
    - [x] Real-time updates (toast + badge count).
    - [x] Action buttons (Accept/Decline Sym Request).

## Phase 5: The Drift (Discovery) (Completed)

- [x] **Backend - Randomness**
    - [x] `GET /api/drift`: Efficiently fetch a random sample of public profiles or artifacts from D1.
    - [x] Ensure it excludes current friends to promote *new* connections.
- [x] **Frontend - Visualization**
    - [x] Add a "Drift" control to the UI (e.g., a radar button).
    - [x] When active, inject these "Drift" nodes into the D3 Association Web as "ghost" nodes (fainter, drifting).
- [x] **Refinement**
    - [x] Ensure the "Vitality" mechanic (voting on files) is visible in the UI (e.g., show vitality count, add a "Boost" button).

## Phase 6: The Pulse (Real-time Presence) (Completed)
*Goal: Make the network feel alive.*
- [x] **Durable Object WebSocket:** Fully utilize `RelfDO` to track connected users.
- [x] **Live Indicators:** Show "Online" status (glowing nodes) in the Association Web.
- [x] **Signal Propagation:** When a user updates their Communique or uploads a file, send a visual "pulse" wave through the graph to their neighbors via WebSocket.

## Phase 7: Synapse (Real-Time Collaboration) (Completed)
*Goal: Simultaneous reality. Multiple users editing the same artifact.*
- [x] **Backend - Durable Object:** Implement `DocumentRoom` with:
    - [x] Yjs Sync Protocol (handling `sync-step-1`, `sync-step-2`, `update`).
    - [x] **State Hibernation:** Use Cloudflare's WebSocket hibernation API for cost efficiency.
    - [x] **Persistence:** Store Yjs updates in DO Storage (merging periodically to avoid fragmentation).
- [x] **Frontend - Integration:**
    - [x] Update `CodeEditor.tsx` to utilize `y-websocket` provider.
    - [x] Handle connection states (offline/online) gracefully.
    - [x] **Presence UI:** Visual avatars in FilePreviewModal and Yjs remote cursors styled.

## Phase 8: Deep Customization (The "Advanced" Cue) (Completed)
- [x] **Theme Engine:** Allow users to tweak the "Mist" parameters (color shifts, density) in their local client.
- [x] **Profile aesthetics:** Allow custom hex codes for node colors (beyond the fixed theme).

## Phase 9: Collections (Curated Chaos) (Functional)
*Goal: Allow users to organize the ephemeral stream into permanent or semi-permanent sets.*
- [x] **Backend - Core Logic**
    - [x] API: `CRUD /api/collections` (Name, Description, Visibility).
    - [x] API: `POST/DELETE /api/collections/:id/files` (Manage contents).
    - [x] Database: Ensure `0010_create_collections.sql` is applied.
- [x] **Frontend - Management**
    - [x] **Collection Manager:** A dedicated view (or modal) to create/edit collections.
    - [x] **Add to Collection:** Context menu on Files to "Add to [Collection Name]".
- [x] **Visualization**
    - [x] Represent Collections in the Association Web (Visualized as convex hulls around file nodes).

## Future / Polish
- [ ] **Mobile Optimization:**
    - [ ] Swipe Gestures for Inbox.
    - [ ] PWA improvements (Service Worker caching).
- [x] **Audio Experience:**
    - [x] Spatial Audio Graph (Web Audio API panners for Drift nodes).

---

# LLM Prompt for Next Developer

```text
You are continuing development on **Rel F (r3l.distorted.work)**, a serendipitous social file-sharing platform on Cloudflare Workers.

**Context:**
- **Stack:** Cloudflare Workers, D1, R2, KV, Durable Objects, React (Vite).
- **Current State:** Phases 1-6 are deployed, including Social, Artifact, Discovery (Drift), and Real-time (Pulse) systems.
- **Theme:** "Mist & Glow" (Dark, Ephemeral, Tabler Icons).

**Objective: Phase 7 - Deep Customization**
Your goal is to implement advanced theming and profile aesthetics features.

**Tasks:**
1.  **Theme Engine:** Allow users to tweak the "Mist" parameters (color shifts, density) in their local client.
2.  **Profile aesthetics:** Allow custom hex codes for node colors (beyond the fixed theme).

**Constraints:**
- Maintain the #RRGGBBAA hex-only styling.
- Use `checkRateLimit` for any new public endpoints.
- Keep the "Mist" aesthetic—Drift nodes should feel like they are emerging from the fog.
```
1