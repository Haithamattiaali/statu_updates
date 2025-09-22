import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import multer from 'multer';

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/json'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and JSON files are allowed.'));
    }
  }
});

// In-memory storage for demo (replace with database later)
let dashboardData = {
  lastUpdated: new Date().toISOString(),
  portfolioSnapshot: null,
  versions: []
};

// Health check endpoint
app.get('/.netlify/functions/api/health', (req, res) => {
  res.json({
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
  });
});

// Dashboard endpoint - Get current dashboard data
app.get('/.netlify/functions/api/dashboard', (req, res) => {
  res.json({
    success: true,
    data: dashboardData,
    message: dashboardData.portfolioSnapshot
      ? 'Dashboard data retrieved successfully'
      : 'No data uploaded yet. Please upload an Excel or JSON file.'
  });
});

// Upload endpoint - Handle Excel/JSON file uploads
app.post('/.netlify/functions/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Parse the uploaded file
    let data;
    if (req.file.mimetype === 'application/json') {
      // Handle JSON upload
      data = JSON.parse(req.file.buffer.toString());
    } else {
      // Handle Excel upload (simplified for now)
      data = {
        message: 'Excel parsing will be implemented with full database integration',
        filename: req.file.originalname,
        size: req.file.size,
        timestamp: new Date().toISOString()
      };
    }

    // Create a new version
    const version = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      filename: req.file.originalname,
      size: req.file.size,
      uploadedBy: req.body.uploadedBy || 'Anonymous',
      description: req.body.description || 'File upload'
    };

    // Update dashboard data
    dashboardData.portfolioSnapshot = data;
    dashboardData.lastUpdated = new Date().toISOString();
    dashboardData.versions.unshift(version);

    // Keep only last 10 versions in memory
    if (dashboardData.versions.length > 10) {
      dashboardData.versions = dashboardData.versions.slice(0, 10);
    }

    res.json({
      success: true,
      message: 'File uploaded and processed successfully',
      version: version,
      data: data
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process upload',
      details: error.message
    });
  }
});

// Template endpoint - Download Excel template
app.get('/.netlify/functions/api/template', (req, res) => {
  // For now, return template information
  // Full Excel generation will be added with exceljs integration
  res.json({
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
      downloadUrl: 'Will be available after full integration'
    }
  });
});

// Versions endpoint - Get version history
app.get('/.netlify/functions/api/versions', (req, res) => {
  res.json({
    success: true,
    versions: dashboardData.versions,
    total: dashboardData.versions.length,
    message: dashboardData.versions.length > 0
      ? 'Version history retrieved successfully'
      : 'No versions available yet'
  });
});

// Version rollback endpoint
app.post('/.netlify/functions/api/versions/:id/rollback', (req, res) => {
  const { id } = req.params;
  const version = dashboardData.versions.find(v => v.id === id);

  if (!version) {
    return res.status(404).json({
      success: false,
      error: 'Version not found'
    });
  }

  res.json({
    success: true,
    message: `Rollback to version ${id} would be performed here`,
    version: version,
    note: 'Full rollback functionality requires database integration'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    path: req.path,
    method: req.method
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'GET /dashboard',
      'POST /upload',
      'GET /template',
      'GET /versions',
      'POST /versions/:id/rollback'
    ]
  });
});

// Export as Netlify function
export const handler = serverless(app);