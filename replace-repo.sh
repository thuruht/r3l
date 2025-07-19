#!/bin/bash

# Script to initialize Git repository and replace the remote repository with current code
# This script will:
# 1. Initialize a Git repository in the current directory
# 2. Add all files
# 3. Make an initial commit
# 4. Connect to the remote repository
# 5. Force push to the remote repository to replace all content

# Color codes for better output readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Git repository replacement process...${NC}"

# Set repository URL
REPO_URL="https://github.com/thuruht/r3l.git"

# Check if we're in the correct directory
if [ ! -f "wrangler.jsonc" ] || [ ! -d "src" ]; then
    echo -e "${RED}Error: You don't appear to be in the r3l project root directory.${NC}"
    echo "Please run this script from the root of your r3l project."
    exit 1
fi

# Step 1: Initialize Git repository if it doesn't exist
if [ ! -d ".git" ]; then
    echo -e "${GREEN}Initializing Git repository...${NC}"
    git init
else
    echo -e "${YELLOW}Git repository already exists. Clearing any existing history...${NC}"
    rm -rf .git
    git init
fi

# Step 2: Configure Git if needed
echo -e "${GREEN}Configuring Git...${NC}"
if [ -z "$(git config --get user.name)" ]; then
    echo -e "${YELLOW}Git user name not set. Please enter your name:${NC}"
    read git_name
    git config user.name "$git_name"
fi

if [ -z "$(git config --get user.email)" ]; then
    echo -e "${YELLOW}Git user email not set. Please enter your email:${NC}"
    read git_email
    git config user.email "$git_email"
fi

# Step 3: Add all files to Git
echo -e "${GREEN}Adding all files to Git...${NC}"
git add .

# Step 4: Make an initial commit
echo -e "${GREEN}Creating initial commit...${NC}"
git commit -m "Complete rebuild of R3L:F project with anti-algorithmic, ephemeral design"

# Step 5: Add remote repository
echo -e "${GREEN}Adding remote repository...${NC}"
git remote add origin $REPO_URL

# Step 6: Confirm before pushing
echo -e "${RED}WARNING: This will completely replace the content of the remote repository.${NC}"
echo -e "${RED}All previous history and branches will be overwritten.${NC}"
echo -e "${YELLOW}Are you sure you want to continue? (y/N)${NC}"
read confirm

if [[ "$confirm" != [Yy]* ]]; then
    echo -e "${YELLOW}Operation cancelled.${NC}"
    exit 0
fi

# Step 7: Force push to remote repository
echo -e "${GREEN}Force pushing to remote repository...${NC}"
git push -f origin master:main

echo -e "${GREEN}Repository replacement completed successfully!${NC}"
echo -e "${YELLOW}The content of $REPO_URL has been completely replaced with your current code.${NC}"
