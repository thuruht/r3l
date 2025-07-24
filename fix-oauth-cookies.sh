#!/bin/bash

# Set up colors for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
RESET="\033[0m"

echo -e "${YELLOW}Starting OAuth cookie fix script...${RESET}"

# Create backup directory if it doesn't exist
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}Created backup directory: ${BACKUP_DIR}${RESET}"

# Backup current files
echo -e "${YELLOW}Backing up current files...${RESET}"
cp -v src/router.ts "$BACKUP_DIR/router.ts.bak"
cp -v src/handlers/auth.ts "$BACKUP_DIR/auth.ts.bak"

# Copy the fixed files
echo -e "${YELLOW}Installing cookie helper...${RESET}"
cp -v src/cookie-helper.ts src/cookie-helper.ts

echo -e "${YELLOW}Installing fixed router...${RESET}"
cp -v src/fixed-router.ts src/router.ts

echo -e "${YELLOW}Installing fixed auth handler...${RESET}"
cp -v src/fixed-auth.ts src/handlers/auth.ts

echo -e "${GREEN}All files replaced successfully!${RESET}"
echo -e "${YELLOW}Please build and deploy the project to apply the changes.${RESET}"

# Cleanup
echo -e "${YELLOW}Cleaning up...${RESET}"
rm -f src/fixed-router.ts src/fixed-auth.ts

echo -e "${GREEN}Done!${RESET}"
