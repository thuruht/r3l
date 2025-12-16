# Revised Roadmap: Rel F (Relational Ephemeral Filenet)

Based on the [r3l repository](https://github.com/thuruht/r3l) analysis, we are expanding the roadmap to emphasize **serendipity**, **randomness**, and **real-time presence**.

## Phase 4: Social & Inbox (Current - Near Complete)
- [x] **Inbox UI:** Notification list, Read status, Accept/Decline actions.
- [x] **Badge System:** Real-time polling for unread counts.
- [x] **File Sharing:** Direct sharing with mutual connections.
- [x] **Vitality:** "Vote" mechanic to extend file lifespan.
- [ ] **Verification:** Robust testing of the full social loop (Request -> Accept -> Share -> Notification).

## Phase 5: The Drift (Discovery & Randomness)
*Goal: Implement "Anti-algorithmic" discovery.*
- [ ] **"Drift" Endpoint:** `GET /api/drift` - Returns a random set of users/artifacts outside the user's current graph.
- [ ] **Visualizer Update:** Add a "Drift" mode to the Association Web to float unconnected nodes into view.
- [ ] **Geo-Cues (Optional):** Add rough location metadata (e.g., "Signal from [Region]") to artifacts to ground them in reality without doxxing.

## Phase 6: The Pulse (Real-time Presence)
*Goal: Make the network feel alive.*
- [ ] **Durable Object WebSocket:** Fully utilize `RelfDO` to track connected users.
- [ ] **Live Indicators:** Show "Online" status (glowing nodes) in the Association Web.
- [ ] **Signal Propagation:** When a user updates their Communique or uploads a file, send a visual "pulse" wave through the graph to their neighbors via WebSocket.

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