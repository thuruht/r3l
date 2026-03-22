# GEMINI.md

## Project Overview

**Rel F (R3L:F)** is a decentralized, Cloudflare-native social networking experiment focused on serendipitous discovery and ephemeral interactions. It prioritizes user agency and "digital drift" over algorithmic engagement, using a visual "Association Web" (D3.js) to navigate connections.

### Core Philosophy
- **Artifacts**: The primary unit of interaction is the file (Artifact).
- **Ephemerality**: Content expires in 7 days unless "Refreshed" or "Boosted" (Vitality).
- **The Drift**: A discovery mode for sampling random public artifacts and "ghost nodes."
- **Sym/A-Sym**: Explicit mutual connections (Sym) vs. one-way follows or proximity (A-Sym).

### Technical Stack
- **Runtime**: Cloudflare Workers (Hono)
- **Database**: Cloudflare D1 (Relational)
- **Object Storage**: Cloudflare R2 (Artifacts and Avatars)
- **Key-Value Store**: Cloudflare KV (Sessions, Rate Limiting)
- **Real-time State**: Cloudflare Durable Objects (WebSockets, Collaborative Editing, Chat)
- **Frontend**: React (Vite), TypeScript, D3.js (Association Web), GSAP/Framer Motion (Animations), Three.js (Ambient Backgrounds), Yjs (Collaboration)

---

## Project Structure

```text
/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # UI Components (Feature-based)
│   │   │   └── ui/         # Reusable UI primitives (Button, Modal, etc.)
│   │   ├── context/        # React Contexts (Theme, Toast, etc.)
│   │   ├── hooks/          # Custom Hooks (useNetworkData, etc.)
│   │   ├── styles/         # CSS Modules & Global Styles
│   │   └── utils/          # Frontend Utilities (animations, crypto, etc.)
│   └── public/             # Static Assets
├── src/                    # Worker Backend (Hono)
│   ├── do/                 # Durable Object Classes (ChatRoom, DocumentRoom)
│   ├── index.ts            # API Routes & Worker Entry Point
│   └── constants.ts        # Shared Backend Constants
├── migrations/             # Cloudflare D1 SQL Migrations
├── docs/                   # Architectural & Deployment Documentation
├── wrangler.jsonc          # Cloudflare Wrangler Configuration
└── package.json            # Project Dependencies & Scripts
```

---

## Building and Running

### Prerequisites
- Node.js (v20+)
- Cloudflare Account & Wrangler CLI (`npx wrangler login`)

### Key Commands
- **Install Dependencies**: `npm install`
- **Development**: `npm run dev` (Starts Vite for frontend and Wrangler for backend)
- **Build Frontend**: `npm run build:client`
- **Deploy to Production**: `npm run deploy` (Builds and deploys to Cloudflare Pages/Workers)
- **Local Database Migrations**: `npx wrangler d1 migrations apply relf-db --local`
- **Production Database Migrations**: `npx wrangler d1 migrations apply relf-db --remote`

---

## Development Conventions

### Styling & Design System
- **Design Tokens**: Follow the scale defined in `client/src/styles/design-tokens.css`. Use CSS variables (e.g., `var(--spacing-md)`, `var(--accent-sym)`).
- **Icons**: Use `@tabler/icons-react`. Reference `client/src/constants/iconSizes.ts` for standard sizing (e.g., `ICON_SIZES.md`).
- **Animations**: Prefer CSS animations in `animations.css` or `GSAPAnimations` utility for complex sequences.
- **Themes**: Support "Mist" (default) and "Verdant" dark themes.

### Frontend Patterns
- **Components**: Functional components with TypeScript interfaces for props.
- **Data Fetching**: Use custom hooks (e.g., `useNetworkData`) to encapsulate API interaction.
- **State Management**: React Context for global state (Theme, Auth, Toasts).
- **Sanitization**: All user-generated content must be sanitized using `client/src/utils/sanitize.ts` before rendering.

### Backend Patterns
- **Hono**: Use Hono for routing and middleware.
- **Auth**: JWT-based authentication via HttpOnly cookies.
- **Durable Objects**: Use DOs for all stateful/real-time features (Chat, Collaborative Editing).
- **Rate Limiting**: Implement rate limiting for sensitive endpoints (register, login, drift) using KV.
- **E2EE**: Private messages (Whispers) are end-to-end encrypted; public keys are stored in the `users` table.

---

## Technical Debt & TODOs
- **Collaborative Workspaces**: Implementation of multi-file shared editing.
- **Media Streaming**: Improved support for large audio/video artifacts.
- **Mobile Optimization**: PWA refinements for better mobile "drift" experience.
