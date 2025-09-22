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
mkdir -p netlify/functions

# Copy frontend files
echo "Copying frontend files..."
cp fareye-b2b-project-update-enhanced.html dist/public/index.html || echo "Main HTML not found"
cp dashboard-bind.js dist/public/ || echo "dashboard-bind.js not found"
cp dashboard-bind.production.js dist/public/ || echo "production JS not found"
cp project_update_*.json dist/public/ 2>/dev/null || echo "No JSON files to copy"

# Check if we have the modern API function
if [ -f "netlify/functions/api.mjs" ]; then
  echo "Using full Express backend with serverless-http..."
  # The .mjs file will be used directly by Netlify
else
  echo "Creating simple fallback API function..."
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

  // Simple routing
  try {
    if (path === '/health' || path === '') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'ok',
          message: 'API is running (simple mode)',
          timestamp: new Date().toISOString()
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Not Found',
        message: `Endpoint ${method} ${path} not found`
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      })
    };
  }
};
EOF
fi

echo "Build complete!"
echo "---"
echo "Frontend files:"
ls -la dist/public/ 2>/dev/null || echo "No frontend files yet"
echo "---"
echo "Backend functions:"
ls -la netlify/functions/ 2>/dev/null || echo "No functions yet"
echo "---"