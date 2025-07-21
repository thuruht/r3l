# R3L:F Project State Documentation

## Project Overview

R3L:F (Relational Ephemeral Filenet) is a decentralized, ephemeral, anti-algorithmic social file-sharing platform built on Cloudflare Workers. The project implements a unique social network concept with:

- **Relational**: Users are connected through an explicit association web
- **Ephemeral**: Content expires after a set period unless community-archived
- **Filenet**: A social file-sharing system where documents are the foundation of interaction

## Current State (July 21, 2025)

The project is currently in a functional state with the following key components implemented:

### Backend (Cloudflare Workers)

- **Authentication**: OAuth-based authentication via ORCID and GitHub
- **User Management**: User creation, profile management, preferences
- **Content Management**: File uploads, content expiration, archiving
- **Drawer System**: Personal content organization system
- **Search**: Basic, location-based, and randomized "lurker" search
- **Tagging**: Content tagging and tag management

### Frontend

- **UI**: Modern UI with accent color system and consistent navigation
- **Visualizations**: D3.js-based network visualization and map views
- **OAuth Flow**: Complete OAuth flow for ORCID and GitHub
- **Responsive Design**: Mobile-friendly layout with compact navigation
- **Real API Integration**: All pages utilize real API endpoints with fallback to demo data

### Infrastructure

- **Cloudflare Workers**: Main serverless backend
- **Durable Objects**: For real-time connections and visualization state
- **D1 Database**: SQL database for structured data storage
- **R2 Storage**: For file content and user avatars
- **KV Namespaces**: For session management and OAuth tokens
- **Workers AI**: For content analysis and recommendations

## Key Files and Components

### Backend

- `src/worker.ts`: Main worker entry point, exports Durable Objects and handles OAuth
- `src/router.ts`: API routing logic for all endpoints
- `src/handlers/`: Individual handler modules for different resource types
  - `auth.ts`: Authentication and session management
  - `user.ts`: User account management
  - `content.ts`: Content/file management
  - `drawer.ts`: Drawer/collection management
  - `search.ts`: Search functionality
  - `tag.ts`: Tag management
- `src/auth/oauth-provider.ts`: OAuth provider integration

### Frontend

- `public/*.html`: Main HTML pages
  - `index.html`: Homepage with network visualization
  - `login.html`: Authentication page with OAuth options
  - `drawer.html`: Personal content drawers
  - `network.html`: Association web visualization
  - `map.html`: Geographic content visualization
  - `search.html`: Content search interface
- `public/js/components/navigation.js`: Shared navigation component
- `public/css/rel-f-global.css`: Global styling
- `public/css/rel-f-accent.css`: Accent color system

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
- Workers AI binding
- Scheduled tasks
- Routes configuration

## Secrets Management

All sensitive information is managed via `wrangler secret put`:
- `ORCID_CLIENT_ID`
- `ORCID_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `R3L_APP_SECRET`
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

- The project uses TypeScript for all backend code
- Webpack is used for bundling
- All HTML pages use the same NavigationBar component for consistency
- Authentication is handled via ORCID and GitHub OAuth
- The database schema is managed through SQL migrations
- The frontend uses a consistent design system with accent colors

## Known Issues

1. New user onboarding flow is implemented in the backend but needs frontend updates
2. Some pages still fall back to demo data when API calls fail
3. Network visualization needs consistent node shapes across all pages
4. Login state visibility in the UI is sometimes inconsistent
5. Auth callback pages need absolute path links to avoid navigation issues

## Future Recommendations

If the project were to continue:

1. Implement the complete onboarding flow for new users
2. Add more OAuth providers (Google, Apple, etc.)
3. Enhance the network visualization with more interaction options
4. Improve mobile responsiveness
5. Add real-time updates using Durable Objects and WebSockets
6. Implement more comprehensive error handling and user feedback
7. Add comprehensive analytics and usage metrics
8. Enhance the content tagging and search capabilities
