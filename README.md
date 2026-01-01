# R3L:F (Relational Relativity & Random Ephemerality File-net)

**Rel F** is an experiment in serendipitous social networking. It fosters connections through guided randomness and ephemeral artifact sharing rather than algorithmic feed matching.

## Overview

Rel F is a Cloudflare-native platform prioritizing user agency, organic discovery, and "digital drift." It stands as a counter-concept to permanent, corporate social media: here, data is temporary, connections are consensual or random, and the primary unit of interaction is the **Artifact** (file).

## Core Concepts

*   **Sym vs. A-Sym**:
    *   **Sym (Symmetric)**: Explicit, mutual relationships. Both parties agree to connect.
    *   **A-Sym (Asymmetric)**: One-way follows or proximity-based connections.
*   **Ephemerality**: Content expires by default (7 days). "Vitality" can extend this life, or users can "Refresh" to reset the clock.
*   **The Drift**: A radar-like discovery mode that samples random public artifacts and users from the network, visualized as pulsating "ghost nodes."

## Features

### 🗃 The Communique (Profile)
*   **Personal Archive**: Contains your "Communique" (manifesto/bio) and Artifacts.
*   **Customization**: Custom CSS support, avatar uploads, themeable preferences.
*   **Relationship Management**: Follow, request Sym connections, view mutual links.

### 📂 Artifacts & File System
*   **Universal Uploads**: Share any file type (images, text, code, audio, video).
*   **Upload Modal**: Drag-and-drop support for multiple files with progress tracking.
*   **Expiration**:
    *   **Default Lifespan**: 7 Days (168 Hours).
    *   **Refresh**: Instantly reset the 7-day timer to keep content alive.
    *   **Vitality**: Boost a file's signal to increase visibility and extend life.
*   **In-Place Editing**: Text-based artifacts can be edited directly in the browser.
*   **Remix**: Create derivative works from existing artifacts.
*   **Burn-on-Read**: Ephemeral files that self-destruct after viewing.
*   **Encryption**: Optional client-side encryption for sensitive files.

### 🔗 Association Web
*   **Interactive Graph**: A D3.js visualization of your social world.
    *   **Me**: Center node.
    *   **Sym**: Glowing, strong connections.
    *   **A-Sym**: Dashed, weaker connections.
    *   **Drift**: Pulsating nodes representing random discoveries.
    *   **Collections**: Grouped artifact nodes.
*   **Presence**: See who's online in real-time.
*   **Navigation**: Persistent top-nav with glassmorphism for easy access to tools.

### ✉️ Inbox & Notifications
*   **Unified Comms**: All signals—connection requests, file shares, system alerts—arrive here.
*   **Real-Time**: WebSocket integration ensures instant delivery.
*   **Swipe Gestures**: Mobile-friendly swipe to accept/decline/delete.
*   **Whispers**: Direct messaging with Sym connections.
*   **Control**: Accept/Decline connection requests or delete notifications.

### 🔍 Discovery
*   **The Drift**: Toggle "Drift Mode" to scan the network for random public artifacts.
*   **Filters**: Filter drift by media type (image, audio, text).
*   **Search**: Find users by username.
*   **Random User**: Discover random users on the network.
*   **Serendipity**: No algorithmic feed. You find what you look for, or what looks for you.

### 🎨 Customization
*   **Theme Toggle**: Dark/Light mode.
*   **Node Aesthetics**: Customize graph node colors and sizes.
*   **Custom CSS**: Per-user CSS for Communique pages.

### 📦 Collections
*   **Organize**: Group related artifacts into collections.
*   **Share**: Collections can be public, sym-only, or private.
*   **Download**: Export entire collections as ZIP files.
*   **Reorder**: Drag-and-drop file ordering.

### 🔐 Security
*   **JWT Authentication**: Secure, httpOnly cookie-based sessions.
*   **Email Verification**: Required for account activation.
*   **Password Reset**: Secure token-based password recovery.
*   **Rate Limiting**: Protection against abuse on all endpoints.
*   **E2EE Support**: Client-side encryption with RSA key pairs.
*   **Admin Controls**: System statistics, user management, broadcast alerts.

---

## Technical Stack

Built entirely on the **Cloudflare Developer Platform**:

*   **Frontend**: React 18, TypeScript, Vite, D3.js, GSAP, CodeMirror
*   **Backend**: Cloudflare Workers (Hono framework)
*   **Database**: Cloudflare D1 (SQLite)
*   **Storage**: Cloudflare R2 (S3-compatible)
*   **Real-time**: Cloudflare Durable Objects (WebSockets)
*   **Caching**: Cloudflare KV (Rate limiting, sessions)
*   **Email**: Resend API
*   **Collaboration**: Yjs CRDT for real-time document editing

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                      │
├─────────────────────────────────────────────────────────┤
│  React SPA (Vite)  →  Workers (Hono)  →  D1 Database  │
│                            ↓                            │
│                       R2 Storage                        │
│                            ↓                            │
│                   Durable Objects                       │
│                  (WebSocket State)                      │
└─────────────────────────────────────────────────────────┘
```

## Development Status

**Current Phase: Beta - Feature Complete**

*   ✅ **Auth**: Complete (JWT, Email Verification, Password Reset)
*   ✅ **Graph**: Complete (D3.js, Drift Pulse, Presence)
*   ✅ **Files**: Complete (Upload, Edit, Expiration, Vitality, Remix, Burn-on-Read)
*   ✅ **Social**: Complete (Sym/A-Sym, Inbox, Sharing, Messaging)
*   ✅ **Collections**: Complete (Create, Share, ZIP export)
*   ✅ **Customization**: Complete (Themes, Node aesthetics, Custom CSS)
*   ✅ **Real-time**: Complete (WebSockets, Presence, Notifications)
*   ✅ **Collaboration**: Complete (Yjs document editing via DocumentRoom DO)
*   ✅ **Security**: Complete (E2EE, Rate limiting, Admin controls)
*   🚧 **Next Steps**: See ROADMAP.md for planned enhancements

## Getting Started (Dev)

### Prerequisites
- Node.js 18+
- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)

### Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Environment**:
    Create `.dev.vars` file:
    ```
    JWT_SECRET=your_secret_here
    RESEND_API_KEY=your_resend_key
    ENCRYPTION_SECRET=your_encryption_secret
    ADMIN_USER_ID=1
    ```

3.  **Database Setup**:
    ```bash
    wrangler d1 create relf-db
    wrangler d1 migrations apply relf-db --local
    ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Access at `http://localhost:8787`

5.  **Build for Production**:
    ```bash
    npm run build
    npm run deploy
    ```

## Project Structure

```
r3l-main/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── context/     # React contexts
│   │   ├── hooks/       # Custom hooks
│   │   ├── pages/       # Route pages
│   │   ├── styles/      # CSS files
│   │   └── utils/       # Utilities
│   └── public/          # Static assets
├── src/                 # Backend (Workers)
│   ├── index.ts         # Main API routes
│   ├── do.ts            # RelfDO (WebSocket)
│   ├── do/
│   │   └── DocumentRoom.ts  # Collaboration DO
│   └── constants.ts     # Configuration
├── migrations/          # D1 database migrations
├── docs/                # Documentation
└── wrangler.jsonc       # Cloudflare config
```

## Key Files

- `src/index.ts` - Main API endpoints and business logic
- `src/do.ts` - WebSocket Durable Object for real-time features
- `src/do/DocumentRoom.ts` - Collaborative editing Durable Object
- `src/constants.ts` - Configuration constants
- `client/src/App.tsx` - Main React application
- `client/src/components/AssociationWeb.tsx` - D3.js graph visualization
- `wrangler.jsonc` - Cloudflare Workers configuration

## Contributing

Rel F is in active development. See ROADMAP.md for planned features.

## License

MIT

---
*"We are adrift in mist."*
