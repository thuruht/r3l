# Technology Stack

## Programming Languages
- **TypeScript 5.9.3**: Primary language for both frontend and backend
- **SQL**: Database migrations and queries (SQLite dialect)
- **CSS**: Styling with custom properties and glassmorphism effects

## Frontend Stack

### Core Framework
- **React 18.2.0**: UI library with hooks and functional components
- **React Router DOM 7.10.1**: Client-side routing
- **Vite 5.0.0**: Build tool and dev server

### Visualization & Animation
- **D3.js 7.0.0**: Graph visualization for Association Web
- **GSAP 3.14.2**: Animation library with React integration (@gsap/react 2.1.2)

### Code Editing
- **CodeMirror (@uiw/react-codemirror 4.25.4)**: In-browser code editor
- **Language Support**: CSS, HTML, JavaScript, Markdown, Python extensions

### Real-Time Collaboration
- **Yjs 13.6.28**: CRDT for conflict-free collaborative editing
- **y-codemirror.next 0.3.5**: CodeMirror 6 binding for Yjs
- **y-websocket 3.0.0**: WebSocket provider for Yjs

### Utilities
- **JSZip 3.10.1**: Collection export as ZIP files
- **js-base64 3.7.8**: Base64 encoding/decoding
- **@tabler/icons-react 3.36.0**: Icon library

## Backend Stack

### Runtime & Framework
- **Cloudflare Workers**: Serverless edge computing platform
- **Hono 4.0.0**: Lightweight web framework for Workers
- **Node.js Compatibility**: Via compatibility_flags in wrangler.jsonc

### Cloudflare Services
- **D1**: SQLite-based relational database
- **R2**: S3-compatible object storage for artifacts
- **KV**: Key-value store for rate limiting and sessions
- **Durable Objects**: Stateful WebSocket connections
  - RelfDO: Real-time notifications and presence
  - DocumentRoom: Collaborative document editing

### External Services
- **Resend 6.6.0**: Email delivery API for verification and notifications

## Development Tools

### Build & Deploy
- **Wrangler 3.0.0**: Cloudflare Workers CLI
- **@hono/vite-dev-server 0.0.9**: Local development integration
- **@vitejs/plugin-react 4.2.0**: React support for Vite
- **vite-plugin-pwa 1.2.0**: Progressive Web App support

### TypeScript Configuration
- **Target**: ES2020
- **Module**: ESNext with bundler resolution
- **JSX**: react-jsx transform
- **Strict Mode**: Enabled
- **Types**: @cloudflare/workers-types 4.20251213.0, @types/react, @types/d3

## Database

### D1 (SQLite)
- **Binding**: DB
- **Database Name**: relf-db
- **Migration System**: Sequential SQL files in migrations/
- **Schema**: 17 migrations covering users, relationships, artifacts, collections, messages, notifications

### Key Tables
- users: Authentication and profile data
- relationships: Sym/A-Sym connections
- files: Artifact metadata
- collections: Artifact grouping
- notifications: Inbox system
- messages: Direct messaging (Whispers)
- communiques: User profiles/manifestos

## Storage

### R2 Bucket
- **Binding**: BUCKET
- **Bucket Name**: rr33ll-bucket
- **Public Domain**: r3l-r2.distorted.work
- **Use Cases**: Artifact file storage, avatars, custom CSS

### KV Namespace
- **Binding**: KV
- **Use Cases**: Rate limiting, session management, temporary tokens

## Development Commands

### Local Development
```bash
npm run dev              # Start Wrangler dev server (localhost:8787)
```

### Build
```bash
npm run build:client     # Build React app to dist/
npm run build            # Alias for build:client
```

### Deployment
```bash
npm run deploy           # Build and deploy to Cloudflare
npm run rollback         # Rollback to previous deployment
```

### Database
```bash
wrangler d1 create relf-db                    # Create database
wrangler d1 migrations apply relf-db --local  # Apply migrations locally
wrangler d1 migrations apply relf-db          # Apply migrations to production
```

## Environment Configuration

### Required Environment Variables (.dev.vars)
```
JWT_SECRET=<secret>              # JWT signing key
RESEND_API_KEY=<key>             # Email API key
ENCRYPTION_SECRET=<secret>       # Server-side encryption key
ADMIN_USER_ID=<id>               # Admin user ID
```

### Wrangler Configuration (wrangler.jsonc)
- **Compatibility Date**: 2025-12-15
- **Compatibility Flags**: nodejs_compat
- **Assets**: SPA mode with dist/ directory
- **Observability**: Enabled with full sampling
- **Cron Triggers**: Hourly (0 * * * *)
- **Custom Domain**: r3l.distorted.work

## Security Features
- **JWT Authentication**: httpOnly cookies
- **Email Verification**: Token-based activation
- **Password Hashing**: Secure bcrypt-style hashing
- **Rate Limiting**: KV-based request throttling
- **Client-Side Encryption**: RSA key pairs for E2EE
- **CORS**: Configured for cross-origin requests

## Performance Optimizations
- **Edge Computing**: Global CDN distribution
- **Database Indexes**: Optimized queries (migrations 0016-0017)
- **Asset Caching**: Cloudflare CDN for static files
- **Code Splitting**: Vite automatic chunking
- **Lazy Loading**: React.lazy for route components

## Browser Compatibility
- **Target**: Modern browsers with ES2020 support
- **DOM APIs**: Standard DOM and DOM.Iterable
- **WebSocket**: Required for real-time features
- **Web Crypto API**: Required for client-side encryption
