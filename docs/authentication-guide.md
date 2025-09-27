# Authentication Guide

This guide explains the authentication system used in R3L:F.

## Overview

The R3L:F authentication system is built on a bearer token mechanism. It does not use JWTs or third-party OAuth providers.

### Authentication Flow

1.  **Registration**: A new user registers via the `/api/register` endpoint with username, password, and display name. A recovery key is generated for account recovery. User record and profile are created in D1, password is hashed using `bcryptjs`.
2.  **Login**: The user logs in via the `/api/login` endpoint with their username and password.
3.  **Session Creation**: Upon successful login, a secure, random session token is generated using `crypto.randomUUID()`.
4.  **Session Storage**: This session token is stored in the `auth_sessions` table in the D1 database, along with the user's ID and expiration time.
5.  **Token Issuance**: The session token is returned to the client in a JSON response. The client-side JavaScript then stores this token in the browser's `localStorage`.

### Making Authenticated Requests

To make a request to a protected endpoint, the client-side `authenticatedFetch` function (located in `public/js/utils/api-helper.js`) automatically retrieves the session token from `localStorage` and includes it in the `Authorization` header as a bearer token.

**Example**:
`Authorization: Bearer <session_token>`

The `bearerAuth` middleware in `src/index.js` intercepts all requests to protected routes, verifies the token against the `auth_sessions` table, and checks that the user-agent matches the one stored in the session to provide an extra layer of security against token hijacking. If the token is invalid or expired, the API will return a `401 Unauthorized` status, and the frontend will redirect the user to the login page.