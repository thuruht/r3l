#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}     R3L:F Deployment Script        ${NC}"
echo -e "${BLUE}=====================================${NC}"

# Step 1: Verify environment
echo -e "\n${YELLOW}Step 1: Verifying environment${NC}"
WRANGLER_VERSION=$(npx wrangler --version)
echo -e "Using: ${GREEN}${WRANGLER_VERSION}${NC}"

# Step 2: Build the project
echo -e "\n${YELLOW}Step 2: Building project...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Please fix any errors and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"

# Step 3: Run database migrations
echo -e "\n${YELLOW}Step 3: Running database migrations${NC}"
echo -e "${BLUE}Local migrations first...${NC}"
for file in migrations/*.sql; do
  echo "Applying migration: $file"
  npx wrangler d1 execute R3L_DB --local --file="$file" || echo -e "${YELLOW}Migration already applied or not applicable locally: $file${NC}"
done

echo -e "${BLUE}Remote migrations...${NC}"
read -p "Do you want to apply migrations to the remote database? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  for file in migrations/*.sql; do
    echo "Applying remote migration: $file"
    npx wrangler d1 execute R3L_DB --remote --file="$file" || echo -e "${YELLOW}Migration already applied or not applicable remotely: $file${NC}"
  done
else
  echo -e "${YELLOW}Skipping remote migrations.${NC}"
fi

# Step 4: Deploy
echo -e "\n${YELLOW}Step 4: Deploying to Cloudflare Workers...${NC}"
npx wrangler deploy

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Deployment failed.${NC}"
  exit 1
fi

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "${BLUE}Your site should now be available at: ${GREEN}https://r3l.distorted.work${NC}"
echo -e "${BLUE}=====================================${NC}"
