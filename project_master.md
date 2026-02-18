# Rel F Master Project Document

## Project Identity
**Domain:** r3l.distorted.work
**Theme:** Mist, Glow, Ephemeral, Dark Mode (#RRGGBBAA only)
**Stack:** Cloudflare Workers, D1, R2, KV, React (Vite)

## Database Schema (D1)

### Users
- **Table:** `users`
- **Columns:** `id`, `username`, `password`, `salt`, `avatar_url`, `created_at`
- **Migration:** 0001 (Applied)

### Relationships
- **Table:** `relationships`
- **Columns:** `id`, `source_user_id`, `target_user_id`, `type`, `status`, `created_at`, `updated_at`
- **Types:** `asym_follow`, `sym_request`, `sym_accepted`
- **Migration:** 0002 (Applied)

### Mutual Connections
- **Table:** `mutual_connections`
- **Columns:** `id`, `user_a_id`, `user_b_id`
- **Migration:** 0002 (Applied)

### Communiques
- **Table:** `communiques`
- **Columns:** `user_id`, `content`, `theme_prefs`, `updated_at`
- **Migration:** 0003 (Applied)

### Files (Planned)
- **Table:** `files`
- **Columns:** `id`, `user_id`, `r2_key`, `filename`, `size`, `mime_type`, `visibility`, `is_archived`, `expires_at`, `created_at`
- **Migration:** 0004 (Applied)

### Notifications (Planned)
- **Table:** `notifications`
- **Columns:** `id`, `user_id`, `actor_id`, `type`, `payload`, `is_read`, `created_at`
- **Migration:** 0005 (Applied)

## Development Phases & Current Status

### Phase 1: Foundation (Complete)
- [x] Auth Flows (Register/Login/Logout)
- [x] Association Web (D3 Graph, Mist Theme, Hover States)
- [x] Basic Drawer Interaction (GSAP animations)
- [x] Styling (Hex-only colors #RRGGBBAA, no comments)

### Phase 2: Communique & Profile (Complete)
- [x] Backend Routes (`GET /api/communiques/:id`, `PUT /api/communiques`)
- [x] Frontend Component (`Communique.tsx` with edit mode)
- [x] Migration File (`0003_create_communiques.sql`)
- [x] Apply D1 Migrations to Remote
- [x] Verification of Communique persistence (Assumed via "proceed")

### Phase 3: Artifacts (Files) (Complete)
- [x] Migration File (`0004_create_files.sql`)
- [x] R2 Backend Endpoints (Upload, List, Delete, Download)
- [x] File Upload UI in Drawer
- [x] File List Component
- [x] Expiration Logic (Worker Cron and Vitality Voting)

### Phase 4: Inbox & Social (Near Complete)
- [x] Migration File (`0005_create_notifications.sql`)
- [x] Backend: Notification Endpoints (List, Read)
- [x] Backend: Trigger Notifications on Social Events
- [x] Frontend: Inbox UI Component & Badge
- [x] Frontend: Sym Request Flows (Friend Request logic)
- [x] Frontend: File Sharing UI

### Phase 5: The Drift (Discovery) (Complete)
- [x] Backend: `GET /api/drift` (Random user/artifact sampling)
- [x] Frontend: "Drift" mode in Association Web (Ghost nodes)
- [x] Frontend: Vitality UI (Boost buttons and count)

### Phase 6: The Pulse (Real-time) (Complete)
- [x] Durable Object WebSocket integration for Presence
- [x] Live "Online" status indicators
- [x] Visual "Signal" propagation on graph

## Handover Notes
**Last Action:** Completed Phase 6 (The Pulse). Implemented real-time presence tracking, broadcasting of communique and artifact signals, and updated frontend to visualize online users.
**Current State:** Fully functional Social, Artifact, Discovery (Drift), and Real-time (Pulse) systems.
**Next Steps:** Begin **Phase 7: Deep Customization** to implement theming and profile aesthetics.