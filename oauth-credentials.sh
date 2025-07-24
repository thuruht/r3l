#!/bin/bash

# Script to save and load OAuth credentials
# This ensures you don't have to re-enter them each time

OAUTH_ENV_FILE="./.oauth-env"

# Function to load OAuth credentials from file
load_oauth_credentials() {
  if [ -f "$OAUTH_ENV_FILE" ]; then
    echo "Loading OAuth credentials from $OAUTH_ENV_FILE"
    source "$OAUTH_ENV_FILE"
    return 0
  fi
  return 1
}

# Function to save OAuth credentials to file
save_oauth_credentials() {
  echo "Saving OAuth credentials to $OAUTH_ENV_FILE"
  cat > "$OAUTH_ENV_FILE" << EOF
# OAuth credentials for R3L auth
# Created: $(date)
export GITHUB_CLIENT_ID="$GITHUB_CLIENT_ID"
export GITHUB_CLIENT_SECRET="$GITHUB_CLIENT_SECRET"
export ORCID_CLIENT_ID="$ORCID_CLIENT_ID"
export ORCID_CLIENT_SECRET="$ORCID_CLIENT_SECRET"
EOF
  chmod 600 "$OAUTH_ENV_FILE"  # Set permissions to owner-only read/write
}

# Function to prompt for credentials
prompt_for_credentials() {
  echo "OAuth credentials not found or incomplete. Please enter them now."
  
  if [[ -z "${GITHUB_CLIENT_ID}" ]]; then
    read -p "Enter GitHub OAuth Client ID: " GITHUB_CLIENT_ID
  fi

  if [[ -z "${GITHUB_CLIENT_SECRET}" ]]; then
    read -p "Enter GitHub OAuth Client Secret: " GITHUB_CLIENT_SECRET
  fi

  if [[ -z "${ORCID_CLIENT_ID}" ]]; then
    read -p "Enter ORCID OAuth Client ID: " ORCID_CLIENT_ID
  fi

  if [[ -z "${ORCID_CLIENT_SECRET}" ]]; then
    read -p "Enter ORCID OAuth Client Secret: " ORCID_CLIENT_SECRET
  fi

  # Save entered credentials
  save_oauth_credentials
}

# Check for credentials
check_oauth_credentials() {
  # Try to load credentials first
  load_oauth_credentials
  
  # Check if any credentials are missing
  if [[ -z "${GITHUB_CLIENT_ID}" ]] || [[ -z "${GITHUB_CLIENT_SECRET}" ]] || [[ -z "${ORCID_CLIENT_ID}" ]] || [[ -z "${ORCID_CLIENT_SECRET}" ]]; then
    prompt_for_credentials
  fi
}

# Export credentials to environment if called as source
# Or run the check function if called directly
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  # Script is being sourced
  load_oauth_credentials
else
  # Script is being executed directly
  check_oauth_credentials
fi
