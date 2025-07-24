# Integrating OpenAuth with R3L

This document outlines the changes needed to integrate the OpenAuth server with the main R3L application.

## 1. Deployment Steps

1. Deploy the OpenAuth server:
   ```bash
   # Set up secrets and apply migrations
   ./setup-auth.sh
   
   # Deploy the OpenAuth server
   npx wrangler deploy --config wrangler.auth.jsonc
   ```

2. Set up the service binding between the main app and the auth server:
   ```bash
   ./setup-service-binding.sh
   ```

3. Deploy the main application:
   ```bash
   npx wrangler deploy
   ```

## 2. Configuration Steps

1. Configure GitHub OAuth:
   - Go to GitHub Developer Settings: https://github.com/settings/developers
   - Create a new OAuth app
   - Set the callback URL to `https://r3l-auth.[worker-subdomain].workers.dev/callback`
   - Copy the Client ID and Secret
   - Update the wrangler secrets:
     ```bash
     npx wrangler secret put GITHUB_CLIENT_ID --config wrangler.auth.jsonc
     npx wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.auth.jsonc
     ```

2. Configure ORCID OAuth:
   - Go to ORCID Developer Tools: https://orcid.org/developer-tools
   - Create a new OAuth app
   - Set the callback URL to `https://r3l-auth.[worker-subdomain].workers.dev/callback`
   - Copy the Client ID and Secret
   - Update the wrangler secrets:
     ```bash
     npx wrangler secret put ORCID_CLIENT_ID --config wrangler.auth.jsonc
     npx wrangler secret put ORCID_CLIENT_SECRET --config wrangler.auth.jsonc
     ```

## 3. Code Changes

### Auth Handler

Update the `AuthHandler` class to use the `AuthServiceAdapter`:

```typescript
import { AuthServiceAdapter } from '../auth-service-adapter';

export class AuthHandler {
  async validateToken(token: string, env: Env): Promise<string | null> {
    const user = await AuthServiceAdapter.validateSession(env, token);
    return user ? user.id : null;
  }
  
  initGitHubAuth(redirectUri: string, env: Env): string {
    return AuthServiceAdapter.initGitHubAuth(env, redirectUri);
  }
  
  initOrcidAuth(redirectUri: string, env: Env): string {
    return AuthServiceAdapter.initOrcidAuth(env, redirectUri);
  }
  
  async completeGitHubAuth(code: string, redirectUri: string, userAgent: string, ipAddress: string, env: Env): Promise<any> {
    return AuthServiceAdapter.completeAuth(env, code, 'github', redirectUri);
  }
  
  async completeOrcidAuth(code: string, redirectUri: string, userAgent: string, ipAddress: string, env: Env): Promise<any> {
    return AuthServiceAdapter.completeAuth(env, code, 'orcid', redirectUri);
  }
  
  async endSession(token: string, env: Env): Promise<void> {
    await AuthServiceAdapter.endSession(env, token);
  }
}
```

### Frontend Changes

Update the login page to use the new OpenAuth endpoints:

```html
<!-- Login Page -->
<div class="login-container">
  <h1>Login to R3L</h1>
  
  <div class="oauth-buttons">
    <a href="/api/auth/github/init" class="oauth-button github">
      <i class="fab fa-github"></i> Continue with GitHub
    </a>
    
    <a href="/api/auth/orcid/init" class="oauth-button orcid">
      <i class="fab fa-orcid"></i> Continue with ORCID
    </a>
  </div>
</div>
```

## 4. Testing the Integration

1. Test GitHub login:
   - Go to your application's login page
   - Click "Continue with GitHub"
   - Authorize the application
   - Verify you're redirected back and logged in

2. Test ORCID login:
   - Go to your application's login page
   - Click "Continue with ORCID"
   - Authorize the application
   - Verify you're redirected back and logged in

3. Test session validation:
   - After logging in, verify you can access protected routes
   - Check that your user profile is correctly loaded

## 5. Troubleshooting

- **Service Binding Issues**: If you encounter errors about the AUTH_SERVICE binding, make sure you've run the setup-service-binding.sh script and deployed both the auth server and main application.

- **OAuth Configuration Issues**: Double-check that the callback URLs in GitHub and ORCID developer settings match exactly what the auth server expects.

- **Cookie Issues**: The OpenAuth server uses different cookie management. If you encounter issues with sessions not being maintained, you may need to adjust how cookies are handled in the frontend.
