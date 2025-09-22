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

# Create dist directories
echo "Creating dist directories..."
mkdir -p dist/public
mkdir -p dist/functions

# Copy frontend files
echo "Copying frontend files..."
cp fareye-b2b-project-update-enhanced.html dist/public/index.html || echo "Main HTML not found"
cp dashboard-bind.js dist/public/ || echo "dashboard-bind.js not found"
cp dashboard-bind.production.js dist/public/ || echo "production JS not found"
cp project_update_*.json dist/public/ 2>/dev/null || echo "No JSON files to copy"

# Create a simple Netlify function without dependencies
echo "Creating serverless function..."
mkdir -p netlify/functions
cat > netlify/functions/api.js << 'EOF'
// Simple Netlify Function without external dependencies
exports.handler = async (event, context) => {
  const path = event.path.replace('/.netlify/functions/api', '');
  const method = event.httpMethod;

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Route handling
  try {
    // Health check endpoint
    if (path === '/health' || path === '') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'ok',
          message: 'API is running successfully',
          timestamp: new Date().toISOString(),
          endpoints: [
            'GET /health - Health check',
            'GET /dashboard - Dashboard data',
            'POST /upload - Upload Excel file',
            'GET /template - Download template',
            'GET /versions - Get version history'
          ]
        })
      };
    }

    // Dashboard endpoint
    if (path === '/dashboard' && method === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Dashboard API endpoint',
          data: {
            lastUpdated: new Date().toISOString(),
            status: 'Database connection pending - add DATABASE_URL in Netlify',
            placeholder: true
          }
        })
      };
    }

    // Upload endpoint
    if (path === '/upload' && method === 'POST') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Upload endpoint ready - database integration pending',
          timestamp: new Date().toISOString()
        })
      };
    }

    // Template endpoint
    if (path === '/template' && method === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Template download endpoint',
          note: 'Full implementation pending database setup'
        })
      };
    }

    // Versions endpoint
    if (path === '/versions' && method === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          versions: [],
          message: 'Version history will be available after database connection'
        })
      };
    }

    // 404 for unmatched routes
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Not Found',
        message: `Endpoint ${method} ${path} not found`,
        availableEndpoints: ['/health', '/dashboard', '/upload', '/template', '/versions']
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred'
      })
    };
  }
};
EOF

echo "Build complete!"
ls -la dist/
ls -la dist/public/
ls -la netlify/functions/