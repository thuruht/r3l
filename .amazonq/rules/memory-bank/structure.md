# Project Structure

## Directory Organization

```
r3l-main/
├── client/              # React frontend application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── context/     # React context providers
│   │   ├── hooks/       # Custom React hooks
│   │   ├── pages/       # Route-level page components
│   │   ├── styles/      # CSS stylesheets
│   │   ├── utils/       # Utility functions
│   │   ├── App.tsx      # Main application component
│   │   └── main.tsx     # Application entry point
│   ├── public/          # Static assets
│   └── index.html       # HTML template
├── src/                 # Backend (Cloudflare Workers)
│   ├── do/              # Durable Objects
│   │   └── DocumentRoom.ts  # Collaborative editing DO
│   ├── index.ts         # Main API routes and business logic
│   ├── do.ts            # RelfDO WebSocket implementation
│   └── constants.ts     # Configuration constants
├── migrations/          # D1 database schema migrations
├── docs/                # Project documentation
├── scripts/             # Utility scripts
├── .amazonq/            # Amazon Q configuration
│   └── rules/
│       └── memory-bank/ # Project memory bank
├── wrangler.jsonc       # Cloudflare Workers configuration
├── package.json         # Node.js dependencies
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite build configuration
```

## Core Components

### Frontend (client/)

**Components** (`client/src/components/`)
- `AssociationWeb.tsx`: D3.js-powered social graph visualization
- UI components for artifacts, collections, inbox, profiles
- Reusable form elements and modals

**Context** (`client/src/context/`)
- React context providers for global state management
- Authentication, user data, WebSocket connections

**Hooks** (`client/src/hooks/`)
- `useNetworkData.ts`: Network graph data management
- `useSpatialAudio.ts`: Audio spatialization for graph nodes
- Custom hooks for API calls, real-time updates, and UI state

**Pages** (`client/src/pages/`)
- Route-level components for main application views
- Profile, inbox, discovery, collections, settings

**Utils** (`client/src/utils/`)
- `crypto.ts`: Client-side encryption utilities
- API client functions
- Helper utilities for data transformation

### Backend (src/)

**Main API** (`src/index.ts`)
- Hono framework routing
- Authentication endpoints (register, login, verify, reset)
- User management (profile, relationships, search)
- Artifact operations (upload, download, edit, delete)
- Collection management
- Notification system
- Admin controls
- Rate limiting middleware

**Durable Objects**
- `do.ts` (RelfDO): WebSocket state management for real-time features
  - Presence tracking
  - Live notifications
  - Connection state
- `do/DocumentRoom.ts`: Yjs CRDT collaborative editing
  - Real-time document synchronization
  - Multi-user editing support

**Configuration** (`src/constants.ts`)
- Application-wide constants
- Feature flags
- Default values

### Database (migrations/)

Sequential SQL migrations for D1 database:
- `0001_init.sql`: Initial user tables
- `0002_create_relationship_tables.sql`: Sym/A-Sym relationships
- `0003_create_communiques.sql`: User profiles
- `0004_create_files.sql`: Artifact storage metadata
- `0005_create_notifications.sql`: Notification system
- `0006-0017`: Incremental schema updates (vitality, collections, messages, encryption, indexes)

## Architectural Patterns

### Cloudflare-Native Architecture
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

### Frontend Architecture
- **SPA Pattern**: React 18 with React Router for client-side routing
- **Context + Hooks**: Global state management without external libraries
- **Component Composition**: Reusable, modular UI components
- **Real-Time Integration**: WebSocket connections via Durable Objects

### Backend Architecture
- **Serverless Workers**: Hono framework on Cloudflare Workers
- **Edge Computing**: Global distribution with low latency
- **Stateful WebSockets**: Durable Objects for persistent connections
- **Relational Data**: D1 (SQLite) for structured data
- **Object Storage**: R2 for artifact files
- **Key-Value Cache**: KV for rate limiting and sessions

### Data Flow
1. **Client Request** → React component
2. **API Call** → Hono route handler in Worker
3. **Data Layer** → D1 query or R2 operation
4. **Real-Time** → Durable Object WebSocket broadcast
5. **Response** → JSON to client, state update

### Key Relationships
- **Users** ↔ **Relationships** (Sym/A-Sym connections)
- **Users** → **Artifacts** (file ownership)
- **Artifacts** → **Collections** (organization)
- **Users** ↔ **Notifications** (inbox system)
- **Users** ↔ **Messages** (Whispers/DMs)
- **Users** → **Communiques** (profiles)

### Security Layers
1. **Authentication**: JWT tokens in httpOnly cookies
2. **Authorization**: User-based access control in API routes
3. **Rate Limiting**: KV-based request throttling
4. **Encryption**: Optional client-side E2EE with RSA
5. **Validation**: Input sanitization and type checking
