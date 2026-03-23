# R3L:F (Relational Relativity & Random Ephemerality File-net)

**Rel F** is an experiment in serendipitous social networking. It fosters connections through guided randomness and ephemeral artifact sharing rather than algorithmic feed matching.

## Overview

Rel F is a decentralized, Cloudflare-native platform prioritizing user agency, organic discovery, and "digital drift." It stands as a counter-concept to permanent, corporate social media: here, data is temporary, connections are consensual or random, and the primary unit of interaction is the **Artifact** (file). It is non-corporate, minimalist, and free of algorithmic engagement farming, focusing instead on peer-to-peer interaction, temporary content, and personal archives.

## Core Concepts

*   **Relational**: Users are connected visually in an association web (**RRC — Relational Construct**) that shows explicit, mutually agreed relationships (**Sym**) or one-way/proximity-based connections (**A-Sym**).
*   **Ephemeral**: Content expires by default (7 days). "Vitality" can extend this life, users can "Refresh" to reset the clock, or the community can vote to archive it.
*   **Filenet**: A social file-sharing system (**RPC — Private Cache**) where documents, audio, video, and creative works are the foundation of interaction.
*   **The Drift**: A radar-like discovery mode that samples random public artifacts and users from the network, visualized as pulsating "ghost nodes."
*   **Resonance**: Organic connection prompts emerge when users share shared interest in artifacts (boosting/voting).

## Features

### 🗃 The Communique & Personal Archive (R3C)
*   Each user has a "drawer" (personal hub) known as **R3C — R3LF Cache**.
*   The public-facing window is the **RCC — Cache Communique**, a themeable, linkable window into stored content.
*   **RPC — Private Cache** handles secure, private file storage.

### 📂 Artifacts & File System
*   **Universal Uploads**: Share any file type (images, text, code, audio, zines, books, etc.).
*   **Burn-on-Read**: Secure ephemerality where files are deleted immediately after a non-owner accesses them.
*   **Expiration System**:
    *   **Default Lifespan**: 7 Days (168 Hours). Content is marked for deletion unless acted upon.
    *   **Refresh**: Instantly reset the 7-day timer to keep content alive.
    *   **Vitality**: Boost a file's signal to increase visibility and slightly extend its life.
    *   **Community Archiving**: Content exceeding reaction/share thresholds (10 votes) is preserved in the permanent community storage.
*   **In-Place Editing**: Text-based artifacts can be edited directly in the browser, with support for real-time collaboration.

### 🔗 Association Web (RRC — Relational Construct)
*   **Interactive Graph**: A D3.js visualization of your social world.
    *   **Me**: Center node.
    *   **Sym**: Glowing connections. Link thickness represents interaction strength.
    *   **A-Sym**: Dashed, weaker connections.
    *   **Drift**: Pulsating nodes representing random discoveries.
*   **Decay Visuals**: Artifact nodes physically fade and blur as they approach expiration.

### 👥 Contacts & Social Features
*   **Group Chat**: Create private groups with focused conversation and integrated file sharing.
*   **“Lurker in the Mist” Mode**: A user-configurable privacy setting for low-visibility status.
*   **Strength Tracking**: Relationships grow visually stronger based on whispers, boosts, and shared files.

### ✉️ Inbox & Notifications
*   **Unified Comms**: All signals—connection requests, resonance prompts, file shares, and group invites—arrive in a central inbox.
*   **Unread Awareness**: Badges on Inbox and Groups buttons alert you to new activity.

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

**Current Phase: beta-release**
*   ✅ **Auth**: Complete.
*   ✅ **RRC Graph**: Advanced (Link strength, Decay tooltips, Load more).
*   ✅ **Discovery**: Drift Mode with auto-refresh and empty states.
*   ✅ **Files**: Universal support, Burn-on-Read, Community Archive.
*   ✅ **Social**: Groups, Whispers, Resonance suggestions.

---
*“Rel how you want. Know what you share. Choose who you're sym with.”*
