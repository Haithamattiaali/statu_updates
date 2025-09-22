// Full Backend API for Netlify Functions
// This version works without external dependencies by implementing routing manually

const dashboardData = {
  lastUpdated: new Date().toISOString(),
  portfolioSnapshot: null,
  versions: []
};

exports.handler = async (event, context) => {
  const path = event.path.replace('/.netlify/functions/api-full', '').replace('/.netlify/functions/api', '');
  const method = event.httpMethod;

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  try {
    // Route: GET /health
    if ((path === '/health' || path === '') && method === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'ok',
          message: 'Backend API is running successfully',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          endpoints: {
            health: 'GET /health',
            dashboard: 'GET /dashboard',
            upload: 'POST /upload',
            template: 'GET /template',
            versions: 'GET /versions'
          }
        })
      };
    }

    // Route: GET /dashboard
    if (path === '/dashboard' && method === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: dashboardData,
          message: dashboardData.portfolioSnapshot
            ? 'Dashboard data retrieved successfully'
            : 'No data uploaded yet. Please upload an Excel or JSON file.'
        })
      };
    }

    // Route: POST /upload
    if (path === '/upload' && method === 'POST') {
      try {
        let body = {};

        // Parse body if it exists
        if (event.body) {
          // Check if body is base64 encoded
          if (event.isBase64Encoded) {
            const decodedBody = Buffer.from(event.body, 'base64').toString('utf-8');
            try {
              body = JSON.parse(decodedBody);
            } catch {
              body = { raw: decodedBody };
            }
          } else {
            try {
              body = JSON.parse(event.body);
            } catch {
              body = { raw: event.body };
            }
          }
        }

        // Create a new version
        const version = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          filename: body.filename || 'uploaded-file',
          size: body.size || 0,
          uploadedBy: body.uploadedBy || 'Anonymous',
          description: body.description || 'File upload'
        };

        // Update dashboard data
        dashboardData.portfolioSnapshot = body.data || body;
        dashboardData.lastUpdated = new Date().toISOString();
        dashboardData.versions.unshift(version);

        // Keep only last 10 versions
        if (dashboardData.versions.length > 10) {
          dashboardData.versions = dashboardData.versions.slice(0, 10);
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'File uploaded and processed successfully',
            version: version,
            data: dashboardData.portfolioSnapshot
          })
        };

      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Failed to process upload',
            details: error.message
          })
        };
      }
    }

    // Route: GET /template
    if (path === '/template' && method === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Template endpoint ready',
          template: {
            name: 'PROCEED Portfolio Template',
            version: '1.0.0',
            sheets: [
              'Headers',
              'Status',
              'Highlights',
              'Lowlights',
              'Milestones',
              'Metrics',
              'Lookups'
            ],
            structure: {
              headers: {
                title: 'Portfolio Title',
                subtitle: 'Portfolio Subtitle',
                period: 'Reporting Period'
              },
              status: {
                columns: ['Project', 'Status', 'Progress', 'Health', 'Owner']
              },
              highlights: {
                columns: ['Project', 'Description', 'Impact']
              },
              lowlights: {
                columns: ['Project', 'Issue', 'Action', 'Owner', 'Due Date']
              },
              milestones: {
                columns: ['Project', 'Milestone', 'Due Date', 'Status']
              }
            }
          }
        })
      };
    }

    // Route: GET /versions
    if (path === '/versions' && method === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          versions: dashboardData.versions,
          total: dashboardData.versions.length,
          message: dashboardData.versions.length > 0
            ? 'Version history retrieved successfully'
            : 'No versions available yet'
        })
      };
    }

    // Route: POST /versions/:id/rollback
    if (path.startsWith('/versions/') && path.endsWith('/rollback') && method === 'POST') {
      const versionId = path.split('/')[2];
      const version = dashboardData.versions.find(v => v.id === versionId);

      if (!version) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Version not found',
            versionId: versionId
          })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Rollback to version ${versionId} would be performed here`,
          version: version,
          note: 'Full rollback functionality requires database integration'
        })
      };
    }

    // 404 for unmatched routes
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Endpoint not found',
        path: path,
        method: method,
        availableEndpoints: [
          'GET /health',
          'GET /dashboard',
          'POST /upload',
          'GET /template',
          'GET /versions',
          'POST /versions/:id/rollback'
        ]
      })
    };

  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred',
        path: path,
        method: method
      })
    };
  }
};