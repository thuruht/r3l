# R3L Developer Runbook (Working-First)

Use this as a checklist to get the app working locally and keep it green.

## Setup

1. Install deps
   - npm install
2. Cloudflare
   - wrangler login
   - wrangler secret put JWT_SECRET
3. Database
   - ./migrations/apply-migrations.sh

## Daily Checks

- Typecheck: npx tsc --noEmit
- Lint backend: npm run lint
- Lint frontend: npm run lint:fe
- Static FE module imports: npm run qa:fe

## Smoke Tests

- GET /api/auth/jwt/profile (200 when authenticated)
- Open /feed.html (renders w/o console errors)
- Open /profile.html (avatar + profile data loads)
- Hit /api/debug/cookie-check and verify cookies present

## Common Fixes

- Unauthorized (401): ensure credentials: 'include' on fetch (use authenticatedFetch)
- Cookie issues: call fixAuthCookies() and re-check /api/auth/jwt/profile
- Feed empty: ensure content exists; feed is chronological and privacy-respecting

## Deploy

- npm run build
- npm run deploy

## Notes

- Frontend JS is excluded from TypeScript; use lint:fe for validation
- Durable Objects (Connections/Visualization/Collaboration) support hibernation; alarms persist state
- AI binding is disabled by policy
