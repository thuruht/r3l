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

## Phase 7: Deep Customization (The "Advanced" Cue)
- [ ] **Theme Engine:** Allow users to tweak the "Mist" parameters (color shifts, density) in their local client.
- [ ] **Profile aesthetics:** Allow custom hex codes for node colors (beyond the fixed theme).

---

# LLM Prompt for Next Developer

```text
You are continuing development on **Rel F (r3l.distorted.work)**, a serendipitous social file-sharing platform on Cloudflare Workers.

**Context:**
- **Stack:** Cloudflare Workers, D1, R2, KV, Durable Objects, React (Vite).
- **Current State:** Phase 4 (Social/Inbox) is deployed. Users can friend, share files, and view notifications.
- **Theme:** "Mist & Glow" (Dark, Ephemeral, Tabler Icons).

**Objective: Phase 5 - The Drift (Discovery)**
Your goal is to implement the "Anti-algorithmic" discovery features inferred from the source inspiration (r3l).

**Tasks:**
1.  **Backend - Randomness:**
    - Create `GET /api/drift`: Efficiently fetch a random sample of public profiles or artifacts from D1.
    - Ensure it excludes current friends to promote *new* connections.
    
2.  **Frontend - Visualization:**
    - Add a "Drift" control to the UI (e.g., a radar button).
    - When active, inject these "Drift" nodes into the D3 Association Web as "ghost" nodes (fainter, drifting).
    
3.  **Refinement:**
    - Ensure the "Vitality" mechanic (voting on files) is visible in the UI (e.g., show vitality count, add a "Boost" button).

**Constraints:**
- Maintain the #RRGGBBAA hex-only styling.
- Use `checkRateLimit` for any new public endpoints.
- Keep the "Mist" aesthetic—Drift nodes should feel like they are emerging from the fog.
```
1