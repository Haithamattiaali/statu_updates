#!/bin/bash
set -e

echo "Starting build process..."

# Install dependencies
echo "Installing root dependencies..."
npm install

echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Build backend
echo "Building backend..."
cd backend
npm run build
cd ..

# Create dist directories
echo "Creating dist directories..."
mkdir -p dist/public
mkdir -p dist/functions

# Copy frontend files
echo "Copying frontend files..."
cp fareye-b2b-project-update-enhanced.html dist/public/index.html
cp dashboard-bind.js dist/public/
cp dashboard-bind.production.js dist/public/
cp -r project_update_*.json dist/public/ 2>/dev/null || true

# Build serverless functions
echo "Building serverless functions..."
cd backend
npx esbuild src/serverless.ts --bundle --platform=node --target=node20 --format=cjs --external:@prisma/client --external:prisma --outfile=../dist/functions/api.js
cd ..

echo "Build complete!"