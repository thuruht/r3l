# R3L JWT Authentication System

This document provides an overview of the JWT-based authentication system implemented for R3L. All OAuth-based authentication has been removed in favor of a more secure and reliable JWT-based system.

## Overview

The R3L JWT authentication system provides:

1. User registration with username/password
2. Secure password hashing using a PBKDF2-like approach with WebCrypto
3. Account recovery via recovery keys
4. JWT-based session management with HttpOnly cookies
5. Comprehensive audit logging
6. Protection against common attack vectors

## Core Components

### JWT Helper (`src/jwt-helper.ts`)

- Generates and verifies JWT tokens
- Sets and clears JWT cookies
- Extracts JWT from requests
- Provides test endpoint for JWT validation

### JWT Auth Handler (`src/handlers/jwt-auth.ts`)

- Handles login, registration, and logout
- Validates tokens and user sessions
- Manages account recovery via recovery keys
- Implements secure password hashing
- Records login attempts and other security events in the audit log

### Router Integration (`src/router.ts`)

- Routes all authentication requests to the JWT Auth Handler
- Validates authentication for protected routes
- Extracts and validates tokens from requests
- All OAuth references and code have been removed

## Authentication Endpoints

### Registration

- Endpoint: `POST /api/auth/jwt/register`
- Payload: `{ username, password, displayName, email }`
- Response: `{ success: true, userId: '...' }`
- Recovery key is returned in response (displayed to user once)
- Creates user account and credentials in database
- Sets JWT cookie for immediate login

### Login

- Endpoint: `POST /api/auth/jwt/login`
- Payload: `{ username, password }`
- Response: `{ success: true, userId: '...' }`
- Sets JWT cookie for authentication
- Records login attempt in audit log

### Logout

- Endpoint: `POST /api/auth/jwt/logout`
- Clears JWT cookie
- Records logout in audit log

### Profile

- Endpoint: `GET /api/auth/jwt/profile`
- Response: User profile data if authenticated
- Requires valid JWT

### Account Recovery

- Verify recovery key: `POST /api/auth/jwt/verify-recovery-key`
  - Payload: `{ username, recoveryKey }`
  - Response: `{ valid: true, userId: '...', newRecoveryKey: '...' }`

- Reset password: `POST /api/auth/jwt/reset-password`
  - Payload: `{ username, recoveryKey, newPassword, newRecoveryKey }`
  - Response: `{ success: true }`
  - Sets JWT cookie for immediate login
  - Records password reset in audit log

## Database Schema

### User Credentials Table

```sql
CREATE TABLE user_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  recovery_key_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Auth Log Table

```sql
CREATE TABLE auth_log (
  id TEXT PRIMARY KEY DEFAULT (uuid()),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  success INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Password Hashing

A PBKDF2-like approach is used for password hashing:

1. Generate a random salt
2. Combine password with salt
3. Apply multiple iterations (10,000) of SHA-256 hashing
4. Store as `pbkdf2:iterations:salt:hash`

This approach provides strong security without requiring external libraries.

## Recovery Keys

Recovery keys are:

1. Generated as 4 groups of 5 characters (e.g., `ABCDE-12345-FGHIJ-67890`)
2. Shown to the user only once during registration
3. Hashed before storage using the same secure hashing algorithm as passwords
4. Used to reset passwords in case of forgotten credentials

## Security Considerations

1. All cookies are HttpOnly to prevent JavaScript access
2. Secure flag is set for HTTPS connections
3. SameSite attribute set appropriately based on context
4. Password hashing uses multiple iterations to slow down brute force attacks
5. JWT tokens are signed with HMAC-SHA256 using a secure secret
6. All authentication attempts are logged for security auditing
7. Both successful and failed login attempts are recorded

## Frontend Integration

1. `/public/auth/login.html` - Login page with JWT authentication
2. `/public/auth/register.html` - Registration page with recovery key display
3. `/public/auth/recovery.html` - Account recovery page for password reset
4. `/public/profile.html` - User profile page after authentication

## Environment Variables

The JWT authentication system requires:

- `JWT_SECRET` - Secret key for signing JWT tokens

## Migration Notes

All OAuth-based authentication (GitHub, ORCID) has been removed from:

1. Router endpoints
2. Frontend UI
3. Auth handlers
4. Helper methods
5. Debug endpoints

The system now exclusively uses JWT-based authentication with username/password credentials.
