# OpenAuth Integration Plan

This document outlines the steps needed to integrate the Cloudflare OpenAuth template into our R3L project.

## Overview

We'll use the [Cloudflare OpenAuth template](https://github.com/cloudflare/templates/tree/main/openauth-template) as the basis for our authentication system. This template provides a ready-to-use implementation of OAuth authentication with various providers, including GitHub and ORCID.

## Resources Created

1. **D1 Database**: `r3l-auth-db` (ID: `8e272bc5-43bc-435c-a71c-67e22f3daebd`)
2. **KV Namespace**: `AUTH_STORAGE` (ID: `71b2e51db42c4546bcadebd007d9ec2e`)
3. **Auth Server**: `src/auth-server/index.ts` - Implements the OpenAuth server with GitHub and ORCID providers
4. **Migration Script**: `auth-migrations/0001_create_user_table.sql` - Creates the user table structure
5. **Wrangler Config**: `wrangler.auth.jsonc` - Configuration for the auth server
6. **Setup Script**: `setup-auth.sh` - Script to set up the auth server

## Implementation Steps

1. **Deploy the Auth Server**:
   ```bash
   # Run the setup script to configure secrets and migrations
   ./setup-auth.sh
   
   # Deploy the auth server
   npx wrangler deploy --config wrangler.auth.jsonc
   ```

2. **Configure OAuth Providers**:
   - GitHub: Register a new OAuth app at https://github.com/settings/developers
     - Set the callback URL to `https://r3l-auth.[worker-subdomain].workers.dev/callback`
   - ORCID: Register a new OAuth app at https://orcid.org/developer-tools
     - Set the callback URL to `https://r3l-auth.[worker-subdomain].workers.dev/callback`

3. **Update the Main Application**:
   - Modify `src/router.ts` to proxy auth requests to the auth server
   - Update navigation.js to work with the new auth flow
   - Update login/callback pages to use the OpenAuth endpoints

4. **Integration with Existing System**:
   - Map OpenAuth user schema to our existing user schema
   - Ensure session management works across both systems
   - Update profile pages to work with the new user data structure

## Benefits

1. **Standardized OAuth Implementation**: Uses OpenAuth.js, a robust OAuth implementation
2. **Multiple Providers**: Supports both GitHub and ORCID out of the box
3. **Simplified Code**: Reduces our custom auth code, leveraging a tested solution
4. **Maintainability**: Easier to maintain and update as the OpenAuth library evolves

## Deployment Architecture

The authentication system will be deployed as a separate Worker using `wrangler.auth.jsonc`. This separation provides several benefits:

1. Isolation of auth concerns
2. Independent scaling
3. Easier maintenance and updates
4. Better security through separation

The main application will communicate with the auth server using Cloudflare service bindings.
