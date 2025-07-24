# Deploying R3L with OpenAuth

This document provides detailed instructions for deploying the R3L application with OpenAuth for authentication.

## Overview

The R3L application now uses OpenAuth for authentication, which is deployed as a separate Worker. This provides several benefits:

1. Standardized OAuth implementation using OpenAuth.js
2. Support for multiple providers (GitHub, ORCID)
3. Isolation of authentication concerns
4. Simplified session management

## Deployment Steps

### 1. Deploy the OpenAuth Server

First, deploy the OpenAuth server which handles all authentication flows:

```bash
# Make the deployment script executable
chmod +x ./deploy-openauth.sh

# Run the deployment script
./deploy-openauth.sh
```

This script will:
- Create the necessary D1 database migrations
- Prompt for GitHub and ORCID OAuth credentials
- Set the required secrets
- Deploy the OpenAuth server

### 2. Configure the Service Binding

Next, configure the service binding between the main application and the OpenAuth server:

```bash
# Make the service binding script executable
chmod +x ./setup-service-binding.sh

# Run the service binding script
./setup-service-binding.sh
```

This script will:
- Check if the OpenAuth server is deployed
- Add a service binding to the main application's wrangler.jsonc

### 3. Integrate OpenAuth with the Main Application

Now, integrate the OpenAuth implementation with the main application:

```bash
# Make the integration script executable
chmod +x ./integrate-openauth.sh

# Run the integration script
./integrate-openauth.sh
```

This script will:
- Create a backup of the current auth handler
- Replace it with the OpenAuth-based implementation
- Verify that the service binding is configured

### 4. Deploy the Main Application

Finally, deploy the main application:

```bash
# Deploy the main application
npx wrangler deploy
```

## Configuration

### OAuth Provider Configuration

You'll need to configure your OAuth providers with the correct callback URLs:

#### GitHub

1. Go to GitHub Developer Settings: https://github.com/settings/developers
2. Create a new OAuth app or update an existing one
3. Set the callback URL to: `https://r3l-auth.[worker-subdomain].workers.dev/callback`

#### ORCID

1. Go to ORCID Developer Tools: https://orcid.org/developer-tools
2. Create a new OAuth app or update an existing one
3. Set the callback URL to: `https://r3l-auth.[worker-subdomain].workers.dev/callback`

## Troubleshooting

### Service Binding Issues

If you encounter errors about the AUTH_SERVICE binding, make sure:

1. The OpenAuth server is deployed successfully
2. The service binding is correctly configured in wrangler.jsonc
3. You've deployed the main application after configuring the service binding

### Authentication Flow Issues

If the authentication flow isn't working correctly:

1. Check the Worker logs for both the main application and the OpenAuth server
2. Verify that the OAuth provider credentials are correct
3. Ensure the callback URLs match exactly between the OAuth provider configuration and the OpenAuth server

### Database Migration Issues

If you encounter database errors:

1. Verify that the migrations were applied successfully
2. Check the D1 database schema using the Cloudflare dashboard
3. Run the migrations manually if needed:
   ```bash
   npx wrangler d1 migrations apply AUTH_DB --config wrangler.auth.jsonc
   ```
