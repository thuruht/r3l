#!/bin/bash

echo "🚀 R3L:F OAuth Deployment Script"
echo "================================"
echo ""

# Step 1: Verify that secrets are set
echo "Step 1: Verifying secrets..."
SECRETS=$(npx wrangler secret list)

if [[ $SECRETS != *"GITHUB_CLIENT_ID"* || $SECRETS != *"GITHUB_CLIENT_SECRET"* || 
      $SECRETS != *"ORCID_CLIENT_ID"* || $SECRETS != *"ORCID_CLIENT_SECRET"* ]]; then
    echo "❌ Missing required secrets. Please run ./reset-auth-secrets.sh first."
    exit 1
fi
echo "✅ Secrets verified"
echo ""

# Step 2: Update wrangler.jsonc to use custom OAuth implementation
echo "Step 2: Updating wrangler.jsonc configuration..."

# Create a backup of wrangler.jsonc
cp wrangler.jsonc wrangler.jsonc.bak

# Comment out the services section in wrangler.jsonc
sed -i 's/"services": \[/\/\/ COMMENTED OUT: "services": \[/' wrangler.jsonc
sed -i 's/    }/    }\/\//' wrangler.jsonc
sed -i 's/  \],/  \/\/\],/' wrangler.jsonc

echo "✅ Configuration updated"
echo ""

# Step 3: Ensure worker.ts uses the router directly
echo "Step 3: Checking worker.ts configuration..."

# Check if worker.ts contains reference to oauth-provider
if grep -q "createOAuthProvider" src/worker.ts; then
    echo "⚠️ worker.ts contains references to OAuth Provider. Updating..."
    
    # Create a backup of worker.ts
    cp src/worker.ts src/worker.ts.bak
    
    # Remove imports related to OAuth Provider
    sed -i '/import.*oauth-provider/d' src/worker.ts
    
    # Replace the fetch handler to use router directly
    sed -i 's/ctx.waitUntil(setupOAuthClients(env));/\/\/ Using custom OAuth implementation/' src/worker.ts
    sed -i 's/const oauthProvider = createOAuthProvider(env);/\/\/ Create a router instance/' src/worker.ts
    sed -i 's/return oauthProvider.fetch(request, env, ctx);/const router = new Router();\n    return router.handle(request, env);/' src/worker.ts
    
    echo "✅ worker.ts updated"
else
    echo "✅ worker.ts already configured correctly"
fi
echo ""

# Step 4: Build the project
echo "Step 4: Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix any errors and try again."
    
    # Restore backups if build fails
    if [ -f wrangler.jsonc.bak ]; then
        echo "Restoring wrangler.jsonc backup..."
        mv wrangler.jsonc.bak wrangler.jsonc
    fi
    
    if [ -f src/worker.ts.bak ]; then
        echo "Restoring worker.ts backup..."
        mv src/worker.ts.bak src/worker.ts
    fi
    
    exit 1
fi
echo "✅ Build successful"
echo ""

# Step 5: Deploy
echo "Step 5: Deploying to Cloudflare Workers..."
npx wrangler deploy

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed."
    
    # Restore backups if deployment fails
    if [ -f wrangler.jsonc.bak ]; then
        echo "Restoring wrangler.jsonc backup..."
        mv wrangler.jsonc.bak wrangler.jsonc
    fi
    
    exit 1
else
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "Your site should now be available at: https://r3l.distorted.work"
    echo ""
    echo "Authentication Endpoints:"
    echo "• GitHub init: https://r3l.distorted.work/api/auth/github/init"
    echo "• GitHub callback: https://r3l.distorted.work/auth/github/callback"
    echo "• ORCID init: https://r3l.distorted.work/api/auth/orcid/init"
    echo "• ORCID callback: https://r3l.distorted.work/auth/orcid/callback"
    echo ""
    echo "To test the authentication flow, visit: https://r3l.distorted.work/login.html"
fi

# Clean up backups
if [ -f wrangler.jsonc.bak ]; then
    rm wrangler.jsonc.bak
fi

if [ -f src/worker.ts.bak ]; then
    rm src/worker.ts.bak
fi
