# PROCEED Dashboard - Netlify Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the PROCEED Dashboard application to Netlify. The application consists of:

- **Frontend**: HTML/JavaScript dashboard (static files)
- **Backend**: Express/TypeScript API with Prisma ORM (deployed as Netlify Functions)
- **Database**: PostgreSQL (production) / SQLite (development)

## Prerequisites

1. **Node.js 20 LTS** or higher
2. **npm 10+** or higher
3. **Netlify Account** (free tier is sufficient)
4. **PostgreSQL Database** (choose one):
   - [Supabase](https://supabase.com) (recommended - free tier available)
   - [Neon](https://neon.tech) (serverless PostgreSQL)
   - [Railway](https://railway.app)
   - [Heroku Postgres](https://www.heroku.com/postgres)

## Quick Deployment

### 1. Database Setup

Choose and set up a PostgreSQL database provider:

#### Option A: Supabase (Recommended)

1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string (use "Transaction" mode)
5. Your connection string will look like:
   ```
   postgresql://postgres.[project-id]:[password]@[region].pooler.supabase.com:5432/postgres
   ```

#### Option B: Neon

1. Create account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string from the dashboard
4. Enable connection pooling for serverless

### 2. Deploy to Netlify

#### Method 1: Deploy with Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize Netlify site
netlify init

# Install dependencies
npm run install:all

# Build the project
npm run build:all

# Deploy to Netlify
netlify deploy --prod
```

#### Method 2: Deploy via GitHub

1. Push your code to GitHub
2. Log in to [Netlify](https://app.netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repository
5. Configure build settings:
   - Base directory: `.`
   - Build command: `npm run build:all`
   - Publish directory: `dist/public`
   - Functions directory: `dist/functions`

### 3. Configure Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables, add:

```env
# Required
DATABASE_URL=your_postgresql_connection_string
NODE_ENV=production

# Optional but recommended
FRONTEND_URL=https://your-site.netlify.app
CORS_ORIGIN=https://your-site.netlify.app
API_BASE_URL=https://your-site.netlify.app/.netlify/functions/api

# Security (generate secure random strings)
SESSION_SECRET=your-32-character-secret-here
JWT_SECRET=your-32-character-secret-here
```

### 4. Initialize Database

After deployment, initialize the database schema:

```bash
# Set DATABASE_URL environment variable locally
export DATABASE_URL="your_postgresql_connection_string"

# Generate Prisma client
cd backend
npm run prisma:generate:prod

# Run migrations
npm run prisma:migrate:prod

# Optional: Seed initial data
npm run seed
```

## Production Configuration

### Database Connection Pooling

For serverless environments, use connection pooling:

#### Supabase Pooler

```env
DATABASE_URL=postgresql://postgres.[project]:[password]@[region].pooler.supabase.com:5432/postgres?pgbouncer=true
```

#### Prisma Data Proxy (Alternative)

```env
DATABASE_URL=prisma://aws-us-east-1.prisma-data.com/?api_key=YOUR_API_KEY
```

### Security Headers

The `netlify.toml` file includes security headers:

- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy

Review and adjust these based on your requirements.

### CORS Configuration

CORS is configured in `backend/src/serverless.ts`. Update allowed origins:

```typescript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  'https://your-custom-domain.com',
];
```

## File Structure

```
project-root/
├── netlify.toml                 # Netlify configuration
├── package.json                 # Root package.json with build scripts
├── .env.production.example      # Environment variables template
├── backend/
│   ├── package.json            # Backend dependencies
│   ├── tsconfig.json           # TypeScript configuration
│   ├── src/
│   │   ├── index.ts           # Express app (development)
│   │   ├── serverless.ts      # Netlify Functions wrapper
│   │   └── routes/            # API routes
│   └── prisma/
│       ├── schema.prisma      # Development schema (SQLite)
│       └── schema.production.prisma # Production schema (PostgreSQL)
├── dist/                       # Build output (generated)
│   ├── public/                # Static files for frontend
│   └── functions/             # Serverless functions
├── fareye-b2b-project-update-enhanced.html # Main dashboard HTML
├── dashboard-bind.js           # Dashboard JavaScript (development)
└── dashboard-bind.production.js # Dashboard JavaScript (production)
```

## API Endpoints

After deployment, your API endpoints will be available at:

- Health Check: `https://your-site.netlify.app/.netlify/functions/api/health`
- Dashboard Data: `https://your-site.netlify.app/.netlify/functions/api/dashboard`
- Upload Excel: `https://your-site.netlify.app/.netlify/functions/api/upload`
- Download Template: `https://your-site.netlify.app/.netlify/functions/api/template`
- Version History: `https://your-site.netlify.app/.netlify/functions/api/versions`
- OpenAPI Spec: `https://your-site.netlify.app/.netlify/functions/api/openapi.json`

## Monitoring & Debugging

### View Function Logs

```bash
# Real-time logs
netlify functions:log

# Specific function logs
netlify functions:log api
```

### Netlify Dashboard

- Monitor function invocations
- View error rates
- Check build logs
- Analyze performance metrics

### Local Development with Netlify Dev

```bash
# Run Netlify Dev environment locally
netlify dev

# Access at http://localhost:8888
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Problem**: "Can't reach database server"

**Solution**:
- Verify DATABASE_URL is correctly set in Netlify environment variables
- Ensure PostgreSQL allows connections from Netlify IPs
- Check connection pooling settings
- Use Prisma Data Proxy for better reliability

#### 2. Function Timeout

**Problem**: "Function execution timeout"

**Solution**:
- Netlify Functions have a 10-second timeout (26 seconds on Pro)
- Optimize database queries
- Use connection pooling
- Consider background functions for long operations

#### 3. CORS Errors

**Problem**: "Access blocked by CORS policy"

**Solution**:
- Update CORS_ORIGIN environment variable
- Check allowed origins in serverless.ts
- Ensure frontend URL matches configured origin

#### 4. Build Failures

**Problem**: "Build failed with exit code 1"

**Solution**:
- Check Node.js version (must be 20+)
- Verify all dependencies are installed
- Review build logs for specific errors
- Ensure prisma generate runs before build

### Debug Mode

Enable verbose logging:

```env
LOG_LEVEL=debug
DEBUG=prisma:*
```

## Performance Optimization

### 1. Database Optimization

- Use indexes on frequently queried fields
- Implement pagination for large datasets
- Use Prisma's `select` to fetch only needed fields
- Enable query result caching

### 2. Function Optimization

- Minimize cold starts by keeping functions warm
- Use connection pooling for database
- Implement response caching where appropriate
- Bundle dependencies efficiently with esbuild

### 3. Frontend Optimization

- Enable browser caching for static assets
- Compress images and assets
- Use CDN for external libraries
- Implement lazy loading for large datasets

## Backup & Recovery

### Database Backups

#### Automated Backups

Most PostgreSQL providers offer automated backups:
- Supabase: Daily backups (7-day retention on free tier)
- Neon: Point-in-time recovery
- Railway: Automatic backups

#### Manual Backup

```bash
# Export database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Import database
psql $DATABASE_URL < backup_20240101.sql
```

### Application Version Rollback

The application maintains version history internally:

1. Access version history at `/api/versions`
2. Rollback to previous version via API
3. Or use Netlify's deployment rollback feature

## Custom Domain

### Configure Custom Domain

1. In Netlify Dashboard → Domain Settings
2. Add custom domain
3. Configure DNS:
   - A record: `75.2.60.5`
   - CNAME: `your-site.netlify.app`
4. Enable HTTPS (automatic with Let's Encrypt)

### Update Environment Variables

```env
FRONTEND_URL=https://your-custom-domain.com
CORS_ORIGIN=https://your-custom-domain.com
```

## CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Netlify

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm run install:all

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build:all

      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=dist/public --functions=dist/functions
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Security Best Practices

1. **Environment Variables**: Never commit secrets to repository
2. **Database**: Use SSL connections, implement row-level security
3. **API**: Implement rate limiting, validate all inputs
4. **Authentication**: Add authentication layer if needed
5. **Monitoring**: Set up alerts for errors and anomalies
6. **Updates**: Keep dependencies updated regularly

## Support & Resources

- [Netlify Documentation](https://docs.netlify.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## License

MIT License - See LICENSE file for details

---

For additional support, please open an issue in the project repository.