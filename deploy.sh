#!/bin/bash

# PROCEED Dashboard - Deployment Script
# This script automates the deployment process to Netlify

set -e  # Exit on error

echo "🚀 PROCEED Dashboard Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js 20 or higher is required${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✓ Node.js version check passed${NC}"

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo -e "${YELLOW}⚠ Netlify CLI not found. Installing...${NC}"
    npm install -g netlify-cli
fi

echo -e "${GREEN}✓ Netlify CLI is available${NC}"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm run install:all

# Build the project
echo ""
echo "🔨 Building project..."
npm run build:all

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}⚠ Warning: .env.production not found${NC}"
    echo "Creating from template..."
    cp .env.production.example .env.production
    echo -e "${YELLOW}Please edit .env.production with your actual values${NC}"
    exit 1
fi

# Deploy to Netlify
echo ""
echo "🌐 Deploying to Netlify..."

# Check if we're logged in to Netlify
if ! netlify status &> /dev/null; then
    echo "Please login to Netlify:"
    netlify login
fi

# Check if site is linked
if ! netlify status | grep -q "Current site"; then
    echo "Linking to Netlify site..."
    netlify link
fi

# Deploy based on argument
if [ "$1" = "--preview" ]; then
    echo "Deploying preview..."
    netlify deploy
else
    echo "Deploying to production..."
    echo -e "${YELLOW}⚠ This will deploy to production. Continue? (y/n)${NC}"
    read -r response
    if [ "$response" = "y" ]; then
        netlify deploy --prod
    else
        echo "Deployment cancelled"
        exit 0
    fi
fi

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Set environment variables in Netlify Dashboard"
echo "2. Run database migrations if needed"
echo "3. Test the deployment"
echo ""
echo "Useful commands:"
echo "  netlify open        - Open Netlify dashboard"
echo "  netlify functions:log - View function logs"
echo "  npm run logs        - View logs via npm"