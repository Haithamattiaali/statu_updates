/**
 * Netlify Serverless Function Wrapper for Express Application
 * This file adapts the Express app to run as a Netlify Function
 */

import serverless from 'serverless-http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { logger } from './libs/logger.js';
import { AppError } from './libs/errors.js';
import { createUploadRouter } from './routes/upload.js';
import { createTemplateRouter } from './routes/template.js';
import { createDashboardRouter } from './routes/dashboard.js';
import { createVersionsRouter } from './routes/versions.js';
import { createJsonRouter } from './routes/json.js';

// Load environment variables
dotenv.config();

// Create singleton Prisma instance for serverless
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: ['error'],
  });
} else {
  // Development mode - allow query logging
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = (global as any).prisma;
}

// Create Express app
const app = express();

// Configure CORS for production
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests from Netlify domains and configured origins
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN,
      'https://localhost:8888', // Netlify Dev
      /\.netlify\.app$/,
      /\.netlify\.live$/,
    ].filter(Boolean);

    // Allow requests with no origin (like mobile apps)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });

    if (isAllowed || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info({
      method: req.method,
      url: req.url,
      headers: req.headers,
    }, 'Request received');
    next();
  });
}

// Health check endpoint
app.get('/.netlify/functions/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: prisma ? 'connected' : 'disconnected',
  });
});

// API Routes - all prefixed with /.netlify/functions/api
const basePath = '/.netlify/functions/api';
app.use(`${basePath}/upload`, createUploadRouter(prisma));
app.use(`${basePath}/template`, createTemplateRouter(prisma));
app.use(`${basePath}/dashboard`, createDashboardRouter(prisma));
app.use(`${basePath}/versions`, createVersionsRouter(prisma));
app.use(`${basePath}/json`, createJsonRouter(prisma));

// OpenAPI documentation endpoint
app.get(`${basePath}/openapi.json`, (req: Request, res: Response) => {
  const baseUrl = process.env.API_BASE_URL || `https://${req.headers.host}/.netlify/functions/api`;

  res.json({
    openapi: '3.0.0',
    info: {
      title: 'PROCEED Dashboard API',
      version: '1.0.0',
      description: 'Excel-driven dashboard service for portfolio management',
    },
    servers: [
      {
        url: baseUrl,
        description: 'Production server',
      },
    ],
    paths: {
      '/template': {
        get: {
          summary: 'Download Excel template',
          description: 'Returns a pre-filled Excel template with current data',
          responses: {
            '200': {
              description: 'Excel file',
              content: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
              },
            },
          },
        },
      },
      '/upload': {
        post: {
          summary: 'Upload Excel file',
          description: 'Parse and validate Excel file, optionally commit to database',
          parameters: [
            {
              name: 'commit',
              in: 'query',
              schema: { type: 'boolean' },
              description: 'Whether to save the data (true) or just preview (false)',
            },
          ],
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary',
                    },
                    notes: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Upload successful',
            },
            '400': {
              description: 'Validation failed',
            },
          },
        },
      },
      '/dashboard': {
        get: {
          summary: 'Get dashboard data',
          description: 'Returns current dashboard view model',
          responses: {
            '200': {
              description: 'Dashboard data',
            },
          },
        },
      },
      '/versions': {
        get: {
          summary: 'List versions',
          description: 'Get list of saved versions',
          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20 },
            },
          ],
          responses: {
            '200': {
              description: 'Version list',
            },
          },
        },
      },
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn({
      statusCode: err.statusCode,
      message: err.message,
      details: err.details,
    }, 'Application error');

    res.status(err.statusCode).json({
      error: {
        message: err.message,
        details: err.details,
      },
    });
  } else {
    logger.error({
      err,
      method: req.method,
      url: req.url,
    }, 'Unhandled error');

    res.status(500).json({
      error: {
        message: process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message,
      },
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: 'Not found',
      path: req.path,
    },
  });
});

// Export handler for Netlify Functions
export const handler = serverless(app);