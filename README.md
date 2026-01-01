# R3L:F (Relational Relativity & Random Ephemerality File-net)

**Rel F** is an experiment in serendipitous social networking. It fosters connections through guided randomness and ephemeral artifact sharing rather than algorithmic feed matching.

## Overview

Rel F is a decentralized, Cloudflare-native platform prioritizing user agency, organic discovery, and "digital drift." It stands as a counter-concept to permanent, corporate social media: here, data is temporary, connections are consensual or random, and the primary unit of interaction is the **Artifact** (file).

## Core Concepts

*   **Sym vs. A-Sym**:
    *   **Sym (Symmetric)**: Explicit, mutual relationships. Both parties agree to connect.
    *   **A-Sym (Asymmetric)**: One-way follows or proximity-based connections.
*   **Ephemerality**: Content expires by default (7 days). "Vitality" can extend this life, or users can "Refresh" to reset the clock.
*   **The Drift**: A radar-like discovery mode that samples random public artifacts and users from the network, visualized as pulsating "ghost nodes."

## Features

### 🗃 The Communique (Profile)
*   **Drawer UI**: A personal archive containing your "Communique" (manifesto/bio) and Artifacts.
*   **Customization**: Themeable via JSON preferences (colors, fonts).

### 📂 Artifacts & File System
*   **Universal Uploads**: Share any file type (images, text, code, audio).
*   **New Upload Modal**: Drag-and-drop support for multiple files with progress tracking.
*   **Expiration**:
    *   **Default Lifespan**: 7 Days (168 Hours).
    *   **Refresh**: Instantly reset the 7-day timer to keep content alive.
    *   **Vitality**: Boost a file's signal to increase visibility (and slightly extend life).
*   **In-Place Editing**: Text-based artifacts (Markdown, Code, JSON) can be edited directly in the browser.

### 🔗 Association Web
*   **Interactive Graph**: A D3.js visualization of your social world.
    *   **Me**: Center node.
    *   **Sym**: Glowing, strong connections.
    *   **A-Sym**: Dashed, weaker connections.
    *   **Drift**: Pulsating nodes representing random discoveries.
*   **Navigation**: Persistent top-nav with glassmorphism for easy access to tools.

### ✉️ Inbox & Notifications
*   **Unified Comms**: All signals—connection requests, file shares, system alerts—arrive here.
*   **Real-Time**: WebSocket integration ensures instant delivery.
*   **Control**: Accept/Decline connection requests or simply delete old notifications.

### 🔍 Discovery
*   **The Drift**: Toggle "Drift Mode" to scan the network for random public artifacts.
*   **Search**: Find users by name.
*   **Serendipity**: No algorithmic feed. You find what you look for, or what looks for you.

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
*   ✅ **Social**: Functional (Sym/A-Sym, Inbox, Sharing).
*   🚧 **Next Steps**: Collaborative Workspaces, Audio/Video Streaming support.

## Getting Started (Dev)

1.  **Install Dependencies**: `npm install`
2.  **Run Development Server**: `npm run dev` (Starts Vite + Wrangler)
3.  **Database Setup**: Ensure local D1 migrations are applied.

---
*“We are adrift in mist.”*
