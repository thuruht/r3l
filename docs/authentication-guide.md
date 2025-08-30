# R3L Authentication Guide

R3L uses JWT-based authentication stored in secure HttpOnly cookies.

## Flow

1. Login via /api/auth/jwt/login
2. Server sets JWT cookie + r3l_auth_state=true
3. Frontend includes credentials: 'include' on all fetches
4. Server validates JWT on protected routes

## Frontend Helpers

Use authenticatedFetch from public/js/utils/cookie-helper.js; it always sets credentials: 'include'.

```js
const resp = await authenticatedFetch('/api/user/profile');
```

## Debugging

- Check /api/auth/jwt/profile
- Use /api/debug/cookie-check to verify cookies
- If in a loop, call fixAuthCookies() and retry

## Secrets

Set JWT_SECRET with:

```
wrangler secret put JWT_SECRET
```
