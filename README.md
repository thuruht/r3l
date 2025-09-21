# R3L:F - Relational Ephemeral Filenet

R3L:F is a decentralized, ephemeral, anti-algorithmic social file-sharing platform that prioritizes user control, organic discovery, and community-driven archiving.

## Quick Start (Working-First)

Use these steps to get a running, testable build fast:

1. Install deps
   - `npm install`
2. Configure Cloudflare (wrangler.jsonc already wired)
   - `wrangler login`
   - `wrangler d1 execute r3l-db --file=./migrations/001_content.sql` (or run `./migrations/apply-migrations.sh`)
   - `wrangler secret put JWT_SECRET`
3. Dev server
   - `npm run dev`
4. Basic QA sweep
   - Typecheck: run the VS Code task "Typecheck" or `npx tsc --noEmit`
   - Lint backend: `npm run lint`
   - Lint frontend: `npm run lint:fe`
   - Static FE module check: `npm run qa:fe`

If something fails, see "Troubleshooting" below.

## Core Philosophy

- **Relational**: Users are connected visually in an association web but only through explicit, mutually agreed relationships
- **Ephemeral by default**: Content expires after 7 days unless explicitly preserved through personal or community archiving
- **User-controlled**: Users have full control over their content, connections, and visibility
- **Privacy-focused**: Uses privacy-respecting technologies throughout the stack
- **Community-driven archiving**: Important content can be preserved through explicit voting
- **Anti-algorithmic**: No engagement optimization or content ranking - pure user-controlled discovery

## Key Features

- **Personal Archive ("Drawer") & Communique**: Customizable public profile with themeable interface
- **File & Archive System**: Upload and share any file format with natural expiration cycle
- **Avatar Management**: Upload custom profile images or use default icons
- **Association Web**: D3.js visualization of user connections with degrees of separation
- **Lurker in the Mist Mode**: Low-visibility status for privacy-conscious browsing
- **Inbox & Notifications**: Centralized system for messages, alerts, and connection prompts
- **Search & Discovery**: Non-algorithmic content discovery through multiple criteria
- **Chronological Feed**: A strictly latest-first feed from the people you connect with (no ranking)
- **Real-time Messaging**: Secure direct messaging with end-to-end encryption
- **Community Archiving**: Democratic content preservation through voting
- **HTML/CSS Customization**: Safe content embedding and styling in communiques

## Technology Stack

- **Backend**: Cloudflare Workers, D1, R2, KV, Durable Objects
- **Frontend**: HTML, CSS, JavaScript with consolidated global styling
- **Fonts**: Bunny Fonts (privacy-respecting alternative to Google Fonts)
- **Visualization**: D3.js for Association Web and geographic mapping
- **Authentication**: JWT-based secure authentication (legacy OAuth pages archived)

## Deployment

This project is designed to be deployed to Cloudflare Workers. All file paths are relative to support deployment to r3l.distorted.work.

### Prerequisites

1. Node.js 18+
2. Cloudflare account with Workers, D1, R2, KV, and Durable Objects
3. Wrangler CLI installed globally

### Deployment Steps

1. Clone this repository
2. Install dependencies: `npm install`
3. Configure your Cloudflare account in wrangler.jsonc
4. Set up required secrets (DO NOT add these to your code or wrangler.jsonc):

   ```
   wrangler secret put R3L_APP_SECRET
   wrangler secret put CLOUDFLARE_ACCOUNT_ID
   ```

5. Deploy with these steps:

   a. Deploy the database migrations:

   ```
   # Apply migrations to the main database
   ./migrations/apply-migrations.sh
   ```

   b. Deploy the main application:

   ```
   npm run build
   npm run deploy

## How It Works (Operator Notes)

- Authentication is JWT-only. Cookies must be sent with requests.
  - Frontend fetch must include `credentials: 'include'` (already enforced via `authenticatedFetch`).
  - Check `/api/auth/jwt/profile` to validate a session quickly.
- Chronological feed lives at `/api/feed`; public UI at `/public/feed.html`.
- Privacy: lurker-mode users are filtered out of discovery where appropriate.
- Durable Objects power realtime connections, visualization, and collaboration; they hibernate and resume safely.

## Minimal Dev Checklist

- [ ] JWT secret set via `wrangler secret put JWT_SECRET`
- [ ] D1 migrations applied (`./migrations/apply-migrations.sh`)
- [ ] Typecheck/lints pass (`npm run lint && npm run lint:fe`)
- [ ] Load `/feed.html` and `/profile.html` without console errors
- [ ] Confirm cookies via `/api/debug/cookie-check`
   ```

## Project Structure

The project follows a modular architecture:

- `public/`: Frontend assets (HTML, CSS, JS)
- `src/`: Backend code (TypeScript)
  - `handlers/`: Request handlers for different features
  - `core/`: Core functionality and utilities
  - `types/`: TypeScript type definitions
- `migrations/`: Database schema and migrations

## Documentation

- [Project Documentation](./project-documentation.md): Detailed technical documentation and runbook
- [Codebase Analysis](./CODEBASE_ANALYSIS.md): Security issues, bugs, and code quality assessment
- [Feature Roadmap](./FEATURE_ROADMAP.md): Implementation priorities and planned features
- [Project State](./PROJECT_STATE.md): Current status and completion tracking
- [Connections & Feed](./public/feed.html): Minimal feed UI powered by `/api/feed`
- [Help & FAQ](./public/help.html): Comprehensive user guide and frequently asked questions
- [Philosophy & Motivation](./public/reMDE.md): In-depth explanation of project principles

## Current Status

### ✅ Live and Working
- JWT-based authentication system
- Content upload and management
- User profiles and drawers
- Search functionality
- Real-time messaging infrastructure
- Geographic map integration (combined best features)
- Association web visualization (D3.js)
- Notification system
- Deployed to: https://r3l.distorted.work

### 🔧 Monitoring
- Performance optimizations needed (see CODEBASE_ANALYSIS.md)
- Real-time features under live testing
- User privacy controls in development

## Troubleshooting

- 401 Unauthorized from API
   - Ensure `credentials: 'include'` on fetch.
   - Verify `JWT_SECRET` exists and cookies are being set (SameSite/secure).
   - Hit `/api/auth/jwt/profile` to confirm the session.
- TypeScript errors on frontend JS
   - We exclude `public/js/**` from tsc. Use `npm run lint:fe` for frontend checks.
- Feed shows no items
   - Confirm content exists and associations are correct. Feed is strictly chronological and privacy-respecting.
- Live Testing
   - Monitor via `wrangler tail` for performance and errors
   - See [CODEBASE_ANALYSIS.md](./CODEBASE_ANALYSIS.md) for known issues

## Contributing

Contributions are welcome if they align with the guiding principles:

- No engagement optimization
- No corporate/capitalist manipulation
- Minimalist, user-controlled interactions
- Privacy-first, ephemeral but intentional

## License

&copy; 2025 R3L:F Project - All Rights Reserved
