#!/bin/bash

echo "🔄 R3L:F OAuth Integration Update Script 🔄"
echo "=========================================="
echo ""

# Navigate to the project root directory
cd "$(dirname "$0")/.."

# Check if the OAuth Provider Worker is deployed
echo "🔍 Checking if OAuth Provider Worker is deployed..."
WORKER_STATUS=$(npx wrangler whoami 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Wrangler authentication failed. Please run 'npx wrangler login' first."
    exit 1
fi

# Update the main Worker's wrangler.jsonc
echo "✏️ Updating service binding in wrangler.jsonc..."
TEMP_FILE=$(mktemp)

# Check if the service binding already exists
if grep -q '"binding": "OAUTH_PROVIDER"' wrangler.jsonc; then
    echo "ℹ️ Service binding already exists in wrangler.jsonc"
else
    # Add the service binding before the closing brace
    awk '
    /\}$/ && !done {
        print "  \"services\": [";
        print "    {";
        print "      \"binding\": \"OAUTH_PROVIDER\",";
        print "      \"service\": \"workers-oauth-provider\"";
        print "    }";
        print "  ],";
        print $0;
        done=1;
        next;
    }
    { print }
    ' wrangler.jsonc > "$TEMP_FILE"
    
    # Check if the file was modified correctly
    if [ "$(wc -l < "$TEMP_FILE")" -gt "$(wc -l < wrangler.jsonc)" ]; then
        mv "$TEMP_FILE" wrangler.jsonc
        echo "✅ Service binding added to wrangler.jsonc"
    else
        echo "❌ Failed to update wrangler.jsonc. Please add the service binding manually."
        rm "$TEMP_FILE"
        exit 1
    fi
fi

# Update route handler in router.ts
echo "✏️ Checking router.ts for OAuth Provider integration..."
if grep -q "OAUTH_PROVIDER.fetch" src/router.ts; then
    echo "ℹ️ OAUTH_PROVIDER integration already exists in router.ts"
else
    echo "ℹ️ Please update src/router.ts to use the OAUTH_PROVIDER service binding."
    echo "Add the following route handler:"
    echo ""
    echo "  router.all('/auth/:provider/*', async (request, env) => {"
    echo "    return env.OAUTH_PROVIDER.fetch(request);"
    echo "  });"
    echo ""
fi

# Update the Env type
echo "✏️ Checking Env type definition..."
if grep -q "OAUTH_PROVIDER:" src/types/env.ts 2>/dev/null || grep -q "OAUTH_PROVIDER:" src/types/index.ts 2>/dev/null; then
    echo "ℹ️ OAUTH_PROVIDER type already exists in the Env interface"
else
    echo "ℹ️ Please update your Env interface to include the OAUTH_PROVIDER service binding."
    echo "Add the following to your Env interface:"
    echo ""
    echo "  OAUTH_PROVIDER: Fetcher;"
    echo ""
    echo "And ensure you import the Fetcher type if needed:"
    echo "  import { Fetcher } from '@cloudflare/workers-types';"
    echo ""
fi

echo ""
echo "🚀 Next steps:"
echo "1. Deploy the OAuth Provider Worker if not already deployed:"
echo "   cd workers-oauth-provider && ./deploy.sh"
echo ""
echo "2. Make sure all OAuth secrets are set for both Workers:"
echo "   cd workers-oauth-provider && ./setup-secrets.sh"
echo ""
echo "3. Deploy the main application:"
echo "   npm run build && npx wrangler deploy"
echo ""
echo "4. Verify the OAuth flow works correctly by navigating to:"
echo "   https://[your-domain]/auth/github/login"
echo "   https://[your-domain]/auth/orcid/login"
echo ""
echo "✨ Done! The OAuth Provider integration should now be complete."
