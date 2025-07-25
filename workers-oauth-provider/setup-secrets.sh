#!/bin/bash

echo "🔑 R3L:F OAuth Provider Secrets Setup 🔑"
echo "========================================"
echo ""

# Navigate to the OAuth Provider directory
cd "$(dirname "$0")"

echo "This script will guide you through setting up the required OAuth secrets."
echo "You will need your GitHub and ORCID OAuth application credentials."
echo ""

# GitHub secrets
read -p "Enter your GitHub Client ID: " GITHUB_CLIENT_ID
if [ -z "$GITHUB_CLIENT_ID" ]; then
    echo "❌ GitHub Client ID cannot be empty."
    exit 1
fi

read -p "Enter your GitHub Client Secret: " GITHUB_CLIENT_SECRET
if [ -z "$GITHUB_CLIENT_SECRET" ]; then
    echo "❌ GitHub Client Secret cannot be empty."
    exit 1
fi

# ORCID secrets
read -p "Enter your ORCID Client ID: " ORCID_CLIENT_ID
if [ -z "$ORCID_CLIENT_ID" ]; then
    echo "❌ ORCID Client ID cannot be empty."
    exit 1
fi

read -p "Enter your ORCID Client Secret: " ORCID_CLIENT_SECRET
if [ -z "$ORCID_CLIENT_SECRET" ]; then
    echo "❌ ORCID Client Secret cannot be empty."
    exit 1
fi

# Set the secrets
echo ""
echo "Setting GitHub Client ID..."
npx wrangler secret put GITHUB_CLIENT_ID <<< "$GITHUB_CLIENT_ID"

echo "Setting GitHub Client Secret..."
npx wrangler secret put GITHUB_CLIENT_SECRET <<< "$GITHUB_CLIENT_SECRET"

echo "Setting ORCID Client ID..."
npx wrangler secret put ORCID_CLIENT_ID <<< "$ORCID_CLIENT_ID"

echo "Setting ORCID Client Secret..."
npx wrangler secret put ORCID_CLIENT_SECRET <<< "$ORCID_CLIENT_SECRET"

echo ""
echo "✅ All secrets have been set successfully!"
echo ""
echo "You can verify them with: npx wrangler secret list"
echo ""
echo "Remember to update your OAuth application settings with the correct callback URLs:"
echo "For GitHub: https://[your-domain]/auth/github/callback"
echo "For ORCID: https://[your-domain]/auth/orcid/callback"
