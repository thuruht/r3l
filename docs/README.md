# R3L:F (Relational Relativity & Random Ephemerality File-net)

**Rel F** is an experiment in serendipitous social networking. It fosters connections through guided randomness and ephemeral file sharing rather than algorithmic feed matching.

## Philosophy

> *Three ways to connect: openly with SYM, observationally with A-SYM, or invisibly
> with 3SPACE. Three ways to share: publicly into the DRIFT, with your network, or
> only with yourself. Files expire by default. Nothing is permanent unless the
> community makes it so.*

## Overview

Rel F is a decentralized, Cloudflare-native platform prioritizing user agency, organic discovery, and "digital drift." It stands as a counter-concept to permanent, corporate social media: here, data is temporary, connections are consensual or random, and the primary unit of interaction is the **file**. It is non-corporate, minimalist, and free of algorithmic engagement farming, focusing instead on peer-to-peer interaction, temporary content, and personal archives.

## Core Concepts

*   **Relational**: Users are connected visually in the **RELMAP** (D3.js force graph) that shows explicit, mutually agreed relationships (**SYM**), one-way/proximity-based connections (**A-SYM**), or ghost connections (**3SPACE**).
*   **Ephemeral**: Content expires by default (7 days). Refresh or Boost to extend the file's TTL, or the community can vote to archive it.
*   **Filenet**: A social file-sharing system (**3SPACE**) where documents, audio, video, and creative works are the foundation of interaction.
*   **The Drift**: A radar-like discovery mode that samples random public files and users from the network, visualized as pulsating "ghost nodes."
*   **Resonance**: Organic connection prompts emerge when users share shared interest in files (boosting/voting).

## Features

### 🗃 The Communique & Personal Archive
*   Each user has a **COMMUNIQUE** — a themeable, linkable public profile page.
*   **3SPACE** handles private file storage and ghost connections — invisible to the RELMAP.

### 📂 Files & File System
*   **Universal Uploads**: Share any file type (images, text, code, audio, zines, books, etc.).
*   **FLARE**: Secure ephemerality where files are deleted immediately after a non-owner accesses them.
*   **Expiration System**:
    *   **Default Lifespan**: 7 Days (168 Hours). Content is marked for deletion unless acted upon.
    *   **Refresh**: Instantly reset the 7-day timer to keep content alive.
    *   **TTL**: Boost a file's signal to increase visibility and extend its TTL countdown.
    *   **Community Archiving**: Content exceeding reaction/share thresholds (10 votes) is preserved in the permanent community storage.
*   **In-Place Editing**: Text-based files can be edited directly in the browser, with support for real-time collaboration.

### 🔗 RELMAP
*   **Interactive Graph**: A D3.js visualization of your social world.
    *   **Me**: Center node.
    *   **SYM**: Glowing connections. Link thickness represents interaction strength.
    *   **A-SYM**: Dashed, weaker connections.
    *   **Drift**: Pulsating nodes representing random discoveries.
*   **Decay Visuals**: File nodes physically fade and blur as they approach expiration.

### 👥 Contacts & Social Features
*   **Group Chat**: Create private groups with focused conversation and integrated file sharing.
*   **“Lurker in the Mist” Mode**: A user-configurable privacy setting for low-visibility status.
*   **Strength Tracking**: Relationships grow visually stronger based on SYMTXT, boosts, and shared files.

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
*   ✅ **RELMAP**: Advanced (Link strength, Decay tooltips, Load more).
*   ✅ **Discovery**: Drift Mode with auto-refresh and empty states.
*   ✅ **Files**: Universal support, FLARE, Community Archive.
*   ✅ **Social**: Groups, SYMTXT, Resonance suggestions.

---
*“Rel how you want. Know what you share. Choose who you're sym with.”*
