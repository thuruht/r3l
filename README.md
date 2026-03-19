# R3L:F (Relational Relativity & Random Ephemerality File-net)

**Rel F** is an experiment in serendipitous social networking. It fosters connections through guided randomness and ephemeral artifact sharing rather than algorithmic feed matching.

## Overview

Rel F is a decentralized, Cloudflare-native platform prioritizing user agency, organic discovery, and "digital drift." It stands as a counter-concept to permanent, corporate social media: here, data is temporary, connections are consensual or random, and the primary unit of interaction is the **Artifact** (file). It is non-corporate, minimalist, and free of algorithmic engagement farming, focusing instead on peer-to-peer interaction, temporary content, and personal archives.

## Core Concepts

*   **Relational**: Users are connected visually in an association web that shows or alludes to explicit, mutually agreed relationships (**Sym**) or one-way/proximity-based connections (**A-Sym**).
*   **Ephemeral**: Content expires by default (7 days). "Vitality" can extend this life, users can "Refresh" to reset the clock, or the community can vote to archive it.
*   **Filenet**: A social file-sharing system where documents, audio, video, and creative works are the foundation of interaction.
*   **The Drift**: A radar-like discovery mode that samples random public artifacts and users from the network, visualized as pulsating "ghost nodes."

## Features

### 🗃 The Communique & Personal Archive ("Drawer")
*   Each user has a "drawer" (profile) with a customizable **Communique**—a themeable, linkable window into their stored content.
*   Unconfigured drawers only show a generic avatar and display name and cannot join the association web.

### 📂 Artifacts & File System
*   **Universal Uploads**: Share any file type (images, text, code, audio, zines, books, etc.).
*   **Expiration System**:
    *   **Default Lifespan**: 7 Days (168 Hours). Content is marked for deletion unless acted upon.
    *   **Refresh**: Instantly reset the 7-day timer to keep content alive.
    *   **Vitality**: Boost a file's signal to increase visibility and slightly extend its life.
    *   **Community Archiving**: Content exceeding reaction/share thresholds can be flagged for permanent community storage.
*   **In-Place Editing**: Text-based artifacts (Markdown, Code, JSON) can be edited directly in the browser, with support for real-time collaboration.

### 🔗 Association Web (D3.js Visualization)
*   **Interactive Graph**: A D3.js visualization of your social world.
    *   **Me**: Center node.
    *   **Sym**: Glowing, strong connections.
    *   **A-Sym**: Dashed, weaker connections.
    *   **Drift**: Pulsating nodes representing random discoveries.
*   **Navigation**: A persistent top-nav with glassmorphism provides easy access to tools. Clicking a node opens that user's Communique.

### 👥 Contacts & Social Features
*   **Contacts**: Can be public (visible in the web) or private.
*   **Group Chat**: Create private groups with other users for focused conversation.
*   **“Lurker in the Mist” Mode**: A user-configurable privacy setting for low-visibility status.

### ✉️ Inbox & Notifications
*   **Unified Comms**: All signals—connection requests, file shares, group invites, and system alerts—arrive in a central inbox.
*   **Real-Time**: WebSocket integration ensures instant delivery of notifications.
*   **Control**: Accept/Decline connection requests or simply delete old notifications.

### 🔍 Search & Discovery
*   **The Drift**: Toggle "Drift Mode" to scan the network for random public artifacts and users.
*   **Search**: Find users by name.
*   **Global Community Archive**: Browse all community-archived content, filterable by file type or tags.
*   **Serendipity**: No algorithmic feed. You find what you look for, or what looks for you.

### 🛑 Privacy & Moderation
*   **No Unwanted Labels**: All mutual relationships must be explicitly agreed upon.
*   **Permanent Hide List**: Users can ignore specific connections in the Association Web indefinitely.
*   **Manual History Clearing**: Multi-step confirmation is required to wipe personal history.
*   **Pseudonymity**: Users are encouraged to use pseudonyms. Fully anonymous profiles are not supported, but unconfigured "lurker" profiles have no web presence.

---

## Technical Stack

Built entirely on the **Cloudflare Developer Platform**:

*   **Cloudflare Pages** (React/Vite)
*   **Cloudflare Workers** (Hono API)
*   **Cloudflare D1** (Relational Database)
*   **Cloudflare R2** (Object Storage)
*   **Cloudflare Durable Objects** (WebSockets/Real-time State)
*   **Cloudflare KV** (Session/Rate Limiting)

## Development Status

**Current Phase: Refinement & Polish**
*   ✅ **Auth**: Complete (JWT, Email Verification flow).
*   ✅ **Graph**: Complete (D3.js, Drift Pulse).
*   ✅ **Files**: Advanced (Modals, Editing, Expiration Logic).
*   ✅ **Social**: Functional (Sym/A-Sym, Inbox, Sharing, Group Chat).
*   🚧 **Next Steps**: Collaborative Workspaces, Audio/Video Streaming support.

## Getting Started (Dev)

1.  **Install Dependencies**: `npm install`
2.  **Run Development Server**: `npm run dev` (Starts Vite + Wrangler)
3.  **Database Setup**: Ensure local D1 migrations are applied via `wrangler`.

---
*“We are adrift in mist.”*
