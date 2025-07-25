# R3L:F OAuth Implementation Guide

This document provides a comprehensive guide to the OAuth implementation in the R3L:F application, using the Cloudflare Workers OAuth Provider.

## Architecture Overview

The R3L:F OAuth implementation follows Cloudflare's recommended best practices for OAuth integration:

1. **Dedicated OAuth Provider Worker**: A separate Cloudflare Worker (`workers-oauth-provider`) that handles the entire OAuth flow.
2. **Service Binding**: The main R3L:F Worker uses a service binding to communicate with the OAuth Provider Worker.
3. **KV Storage**: OAuth state and tokens are stored in KV namespaces for secure storage.
4. **Multiple Providers**: Both GitHub and ORCID authentication are supported.

## Directory Structure

```
/r3l
├── src/
│   ├── router.ts             # Main router, forwards OAuth requests to the Provider Worker
│   └── types/env.ts          # Env interface with OAUTH_PROVIDER service binding
├── wrangler.jsonc            # Main Worker config with service binding to OAuth Provider
└── workers-oauth-provider/   # Dedicated OAuth Provider Worker
    ├── src/
    │   └── index.ts          # OAuth Provider implementation
    ├── package.json          # Dependencies including @cloudflare/workers-oauth-provider
    ├── tsconfig.json         # TypeScript configuration
    ├── webpack.config.js     # Webpack configuration
    ├── wrangler.toml         # Worker configuration
    ├── deploy.sh             # Deployment script
    └── setup-secrets.sh      # Script to set up OAuth secrets
```

## OAuth Flow

1. **User Initiates Login**: User navigates to `/auth/{provider}/login` (where provider is 'github' or 'orcid')
2. **Main Worker Forwards Request**: The main Worker detects OAuth routes and forwards them to the OAuth Provider Worker
3. **OAuth Provider Redirects**: The Provider Worker redirects to GitHub/ORCID authentication page
4. **User Authenticates**: User logs in with their GitHub/ORCID credentials
5. **Callback Processing**: Provider redirects back to `/auth/{provider}/callback`
6. **Token Exchange**: OAuth Provider Worker exchanges code for access token
7. **User Info Retrieval**: Provider Worker retrieves user profile information
8. **Session Creation**: Provider Worker creates a session and sets authentication cookies
9. **Redirection**: User is redirected to the application home page

## Configuration

### OAuth Provider Worker (`workers-oauth-provider`)

The OAuth Provider Worker is configured with:

- **KV Namespace**: For storing OAuth state and tokens
- **Secrets**: GitHub and ORCID client IDs and secrets
- **Providers**: Configuration for both GitHub and ORCID OAuth

### Main Worker

The main Worker is configured with:

- **Service Binding**: To communicate with the OAuth Provider Worker
- **Route Handling**: To forward OAuth requests to the Provider Worker

## Deployment

1. **Deploy OAuth Provider Worker**:
   ```
   cd workers-oauth-provider
   ./deploy.sh
   ```

2. **Set up OAuth Secrets**:
   ```
   cd workers-oauth-provider
   ./setup-secrets.sh
   ```

3. **Update Main Worker Integration**:
   ```
   cd workers-oauth-provider
   ./update-main-integration.sh
   ```

4. **Deploy Main Worker**:
   ```
   cd ..
   npm run build
   npx wrangler deploy
   ```

## OAuth Provider Configuration

### GitHub OAuth

- **Authorization URL**: `https://github.com/login/oauth/authorize`
- **Token URL**: `https://github.com/login/oauth/access_token`
- **Scopes**: `read:user`, `user:email`
- **Callback URL**: `https://[your-domain]/auth/github/callback`

### ORCID OAuth

- **Authorization URL**: `https://orcid.org/oauth/authorize`
- **Token URL**: `https://orcid.org/oauth/token`
- **Scopes**: `/authenticate`
- **Callback URL**: `https://[your-domain]/auth/orcid/callback`

## Secrets Management

All OAuth secrets should be stored securely using Wrangler secrets:

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put ORCID_CLIENT_ID
npx wrangler secret put ORCID_CLIENT_SECRET
```

Secrets can be verified with:

```bash
npx wrangler secret list
```

## Troubleshooting

### Common Issues

1. **Invalid Callback URL**: Ensure the callback URLs in your OAuth application settings exactly match what's configured in your Worker.
2. **Missing Secrets**: Make sure all required secrets are set with `wrangler secret put`.
3. **Service Binding Issues**: Check that the service binding is correctly set up in wrangler.jsonc.

### Debug Tools

- **OAuth Dashboard**: Navigate to `/auth/dashboard.html` to check the status of your OAuth configuration.
- **Wrangler Logs**: Use `wrangler tail` to view real-time logs for debugging.

### Testing OAuth Flow

You can test the OAuth flow by:

1. Navigating to `/auth/github/login` or `/auth/orcid/login`
2. Following the authentication process
3. Verifying you're redirected back to the application

## Benefits

1. **Standards Compliance**: Implements OAuth 2.0 with best practices
2. **Security**: End-to-end encryption for tokens and sensitive data
3. **Flexibility**: Supports multiple OAuth providers (GitHub, ORCID)
4. **User Experience**: Clean, consistent authorization flow
5. **Maintainability**: Uses a standardized library rather than custom implementation
6. **Scalability**: Dedicated Worker can scale independently of the main application

## Best Practices

1. **Separate Worker**: Using a dedicated Worker for OAuth follows Cloudflare's recommended architecture.
2. **Service Binding**: Service bindings provide secure communication between Workers.
3. **KV Storage**: KV namespaces provide secure storage for OAuth state and tokens.
4. **Secret Management**: Using Wrangler secrets ensures credentials are stored securely.
5. **Error Handling**: Comprehensive error handling provides better user experience and security.

## References

- [Cloudflare Workers OAuth Provider](https://github.com/cloudflare/workers-oauth-provider)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [ORCID OAuth Documentation](https://info.orcid.org/documentation/integration-guide/registering-a-public-api-client/)
