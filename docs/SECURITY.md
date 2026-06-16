# Security Notes

R3L:F is an experimental platform. This document summarizes the key security measures in place.

## Authentication

- JWT stored as `HttpOnly` cookie (`auth_token`); not accessible from JavaScript
- Passwords: PBKDF2-SHA-256, 100k iterations, per-user random salt
- Rate limiting on auth endpoints via KV-backed per-IP counters (`src/utils/helpers.ts`)
- Email verification required before account activation
- Password reset via time-limited signed token sent to email

## E2EE SYMTXT (Private Messages)

Client-side RSA-OAEP (2048-bit) + AES-GCM (256-bit). The server never sees plaintext message content or the user's private key. The private key is wrapped with the user's password and stored in `localStorage`. Key management is the user's responsibility — there is no server-side recovery if a key is lost.

## Content Sanitization

### HTML (`client/src/utils/sanitize.ts`)
`sanitizeHTML()` uses a DOMParser allowlist — only a safe set of tags and attributes are preserved. `style` attributes are stripped from user HTML (only `class` and `id` pass through). URLs in `href`/`src` are checked against a safe-URL regex.

### User CSS (`client/src/utils/sanitize.ts`)
User-provided `custom_css` (from Communique profile preferences) is scoped to the profile container via `scopeCSS()`. The function:
1. Strips dangerous patterns (`expression()`, `javascript:`, `vbscript:`, `@import`, `behavior:`, `-moz-binding:`, `data:`/`vbscript:` in `url()`)
2. Parses the CSS using the browser's native CSS parser
3. Prefixes every selector with `#communique-user-{userId}` so rules cannot affect elements outside the profile

`html`, `body`, and `:root` selectors are remapped to the scope element. `@keyframes` are prefixed with `rcc-{userId}-` to prevent animation name collisions. All other at-rules (`@import`, `@font-face`, `@charset`, etc.) are dropped.

### Server-Side HTML (`src/utils/security.ts`)
`sanitizeHTML()` uses Cloudflare `HTMLRewriter` for streaming sanitization on the worker side.

## File Storage

- Files are stored in Cloudflare R2; served via a public domain (`R2_PUBLIC_DOMAIN`)
- File encryption: AES-GCM via `encryptData`/`decryptData` in `src/utils/security.ts`
- Client-side encryption option: user's browser encrypts the file before upload; the encryption key is stored in `localStorage` only

## Reporting a Vulnerability

Open an issue on the project repository or contact the maintainer directly.
