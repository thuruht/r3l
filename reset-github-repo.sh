#!/bin/bash

# Script to initialize the current r3l directory as the new authority for the GitHub repository
# This will remove all existing content from the repository and replace it with the current local files

# Set up variables
REPO_URL="https://github.com/thuruht/r3l.git"
LOCAL_DIR="/home/jelicopter/Desktop/r3l"
TEMP_DIR="/tmp/r3l_temp_$(date +%s)"

# Ensure we exit on any error
set -e

echo "=== Starting repository reset process ==="

# Step 1: Create a temporary directory
echo "Creating temporary directory..."
mkdir -p "$TEMP_DIR"

# Step 2: Clone the existing repository
echo "Cloning the existing repository..."
git clone "$REPO_URL" "$TEMP_DIR"
cd "$TEMP_DIR"

# Step 3: Remove all files (except .git directory)
echo "Removing all existing files from the repository..."
find . -mindepth 1 -maxdepth 1 -not -name ".git" -exec rm -rf {} \;

# Step 4: Copy all files from the local directory
echo "Copying all files from the local directory..."
find "$LOCAL_DIR" -mindepth 1 -maxdepth 1 -not -name ".git" -exec cp -r {} . \;

# Step 5: Add all files to git
echo "Adding all files to git..."
git add -A

# Step 6: Commit the changes
echo "Committing changes..."
git commit -m "Complete repository reset - new implementation of R3L:F"

# Step 7: Push to remote
echo "Pushing changes to GitHub..."
git push

# Step 8: Clean up
echo "Cleaning up temporary directory..."
cd "$LOCAL_DIR"
rm -rf "$TEMP_DIR"

# Step 9: Initialize git in the local directory if not already initialized
if [ ! -d "$LOCAL_DIR/.git" ]; then
  echo "Initializing git repository in the local directory..."
  cd "$LOCAL_DIR"
  git init
  git remote add origin "$REPO_URL"
  git fetch
  git checkout -b main
  git branch --set-upstream-to=origin/main main
  git pull --rebase
fi

echo "=== Repository reset complete ==="
echo "The GitHub repository now reflects the current local directory."
echo "You may need to provide your GitHub credentials during the push process."
