# R3L:F Project State Documentation

## Project Overview

R3L:F (Relational Ephemeral Filenet) is a decentralized, ephemeral, anti-algorithmic social file-sharing platform built on Cloudflare Workers. The project implements a unique social network concept with:

- **Relational**: Users are connected through an explicit association web
- **Ephemeral**: Content expires after a set period unless community-archived
- **Filenet**: A social file-sharing system where documents are the foundation of interaction

## Current State (January 2025) - BETA READY ✅

The project has undergone comprehensive security hardening and feature completion:

### Authentication Status
- Primary: Secure HttpOnly cookie-based sessions
- Security: CSRF protection, rate limiting, input validation
- Legacy OAuth: Completely removed from codebase
- Test/Debug pages: Removed from production build

### AI Status
- AI binding: Present in config but disabled pending policy
- Policy: Anti-algorithmic policy documented in `/docs/anti_algorithmic_policy.md`
- Archiving: Pure vote-based; no engagement metrics

### Known Issues Requiring Attention
- Connections schema drift: backend expects `user_id`/`connected_user_id`; D1 uses `user_a_orcid`/`user_b_orcid`
- Migration: `migrations/017_connections_table.sql` created; run in staging then prod
- ESM: Migration complete; all imports use `.js` in source. Frontend JS excluded from tsc; lint with `npm run lint:fe`.

### Backend (Cloudflare Workers) - PRODUCTION READY

- Authentication: Secure HttpOnly cookies with session management
- User Management: Registration, profiles, preferences, avatars
- Content: R2 uploads, 30-day expiration, community archiving
- Social Features: Connections, feed, comments, reactions, bookmarks
- Messaging: Direct messages between users
- Notifications: Real-time notification system
- Security: Rate limiting, input validation, CSRF protection
- API: RESTful design with proper error handling

### Frontend - BETA READY

- UI: Responsive navigation, interactive slideshow, modern design
- Visualizations: D3.js network visualization with animations
- Auth: Secure cookie-based authentication
- Security: All API calls use secure helper, CSRF protection
- Pages: Complete set of functional pages with error handling
- Performance: Optimized loading, smooth animations
- Accessibility: Proper ARIA labels, semantic HTML

### Infrastructure

- Workers: Main serverless backend
- Durable Objects: Connections, Visualization, Collaboration (hibernation configured)
- D1: Structured data
- R2: Files/avatars
- KV: Sessions/cache/notifications
- Workers AI: Disabled per policy

## Key Files and Components

### Backend

- `src/worker.ts`: Main entry; exports Durable Objects; routes to `Router`
- `src/router.ts`: API routing (auth, content, users, connections, feed)
- `src/handlers/`: Request handlers
   - `jwt-auth.ts`: Active JWT auth
   - `user.ts`: User account management
   - `content.ts`: Content/file management (vote-based archiving)
   - `drawer.ts`: Drawer/collection management
   - `search.ts`: Search
   - `tag.ts`: Tags
   - `notification.ts`, `messaging.ts`, `globe.ts`, `collaboration.ts`
- `src/realtime.ts`: Durable Objects (ConnectionsObject, VisualizationObject, CollaborationRoom)

### Frontend

- `public/*.html`: Main pages
   - `feed.html`: Chronological feed
   - `content.html`: Minimal content detail to avoid dead links
   - `profile.html`, `drawer.html`, `network.html`, `map.html`, `search.html`
- `public/js/components/navigation.js`: Nav + diagnostics + feed link
- `public/js/utils/api-helper.js`: Centralized API endpoints + fetch
- `public/js/utils/cookie-helper.js`: Cookies + authenticatedFetch
- `public/css/`: Global styling
- `archive/debug-pages/`: Legacy OAuth/test pages

### Database Schema

The D1 database includes these key tables:

- `users`: User accounts with ORCID/GitHub identifiers
- `auth_sessions`: Authentication sessions with token
- `content`: User-uploaded content
- `drawers`: Personal content collections
- `content_drawers`: Association between content and drawers
- `content_tags`: Content tagging
- `content_associations`: Relationships between content items
- `archive_votes`: Community votes for content archiving

## Configuration

The project uses `wrangler.jsonc` for configuration with:

- Worker settings
- D1 database binding
- R2 bucket binding
- KV namespace bindings
- Durable Object bindings
- Workers AI binding (disabled - see annotation in file)
- Scheduled tasks
- Routes configuration

## Secrets Management

All sensitive information is managed via `wrangler secret put`:

- `R3L_APP_SECRET`: Main application secret for JWT signing
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account identifier
- Legacy OAuth secrets (not used in current build):
  - `ORCID_CLIENT_ID` / `ORCID_CLIENT_SECRET`
  - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
  - `R3L_ADMIN_ORCID_ID`

## Shutdown Instructions

To properly shut down the R3L:F project:

1. **Backup Data**

   ```bash
   # Backup D1 database
   wrangler d1 backup r3l-db ./backup/r3l-db-backup.sql

   # Backup R2 bucket content
   wrangler r2 backup r3l-content ./backup/r3l-content-backup

   # Export KV namespaces
   wrangler kv:bulk export R3L_USERS ./backup/r3l-users-export.json
   wrangler kv:bulk export R3L_SESSIONS ./backup/r3l-sessions-export.json
   wrangler kv:bulk export R3L_USER_EMBEDDINGS ./backup/r3l-user-embeddings-export.json
   wrangler kv:bulk export R3L_KV ./backup/r3l-kv-export.json
   wrangler kv:bulk export OAUTH_KV ./backup/oauth-kv-export.json
   ```

2. **Notify Users** (if applicable)
   - Implement a notification banner in the UI
   - Send email notifications if user email addresses are available
   - Set a shutdown date at least 30 days in the future

3. **Implement Read-Only Mode** (optional pre-shutdown step)
   - Add code to disable write operations
   - Update UI to reflect read-only status
   - Continue allowing content access

4. **Disable Workers**

   ```bash
   # Disable the worker deployment
   wrangler deployment tag main --remove
   ```

5. **Delete Cloudflare Resources**

   ```bash
   # Delete Worker
   wrangler delete r3l

   # Delete D1 database
   wrangler d1 delete r3l-db

   # Delete R2 bucket
   wrangler r2 delete r3l-content

   # Delete KV namespaces
   wrangler kv:namespace delete R3L_USERS
   wrangler kv:namespace delete R3L_SESSIONS
   wrangler kv:namespace delete R3L_USER_EMBEDDINGS
   wrangler kv:namespace delete R3L_KV
   wrangler kv:namespace delete OAUTH_KV

   # Delete Durable Objects
   # Note: These will be deleted when the worker is deleted if they're bound to it
   ```

6. **DNS Cleanup**
   - Remove custom domain DNS records for `r3l.distorted.work`
   - Update DNS configuration in Cloudflare dashboard

7. **Code Archive**
   - Create a final tagged release on GitHub
   - Update repository README with shutdown notice
   - Consider archiving the repository

## Development Notes

- Backend: TypeScript, ESM (`"type":"module"`), no webpack; native tsc + Wrangler
- Frontend: ESM modules; linted separately (`npm run lint:fe`); static import checker (`npm run qa:fe`)
- Auth: JWT-only (legacy OAuth archived)
- Migrations: SQL under `/migrations`; scripts provided

## Known Issues

1. Connections migration must be applied to enable full connections feature
2. Network visualization polish needed (node shape consistency)
3. Some legacy pages may reference archived OAuth flows (verify links)

## Recent Changes (January 2025)

- All OAuth/GitHub authentication code moved to `/archive/legacy-oauth/`
- Test and debug pages moved to `/archive/debug-pages/`
- AI binding disabled with policy documentation
- Archive threshold made purely vote-based (removed algorithmic influence)
- Created connections schema migration file
- Updated authentication to use JWT cookies exclusively

## Future Recommendations

1. Run connections migration and validate endpoints end-to-end
2. Add minimal integration tests for auth, feed, and connections
3. Expand collaboration UI progressively (stable DOs already available)
4. Continue privacy checks for discovery and search
