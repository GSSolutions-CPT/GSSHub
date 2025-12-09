# Deployment Guide

This guide covers deploying the Business Management System to production.

## Pre-Deployment Checklist

- [ ] Supabase project created and configured
- [ ] Database schema applied (`schema.sql`)
- [ ] Row Level Security (RLS) policies configured
- [ ] Environment variables set
- [ ] Application tested locally
- [ ] Production build tested

## Supabase Configuration

### 1. Database Setup

1. Create a new Supabase project
2. Navigate to SQL Editor
3. Copy and paste the contents of `schema.sql`
4. Execute the SQL to create all tables and relationships

### 2. Row Level Security (RLS)

Enable RLS on all tables for security:

```sql
-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Example policy: Allow authenticated users to read all clients
CREATE POLICY "Allow authenticated users to read clients"
ON clients FOR SELECT
TO authenticated
USING (true);

-- Add similar policies for INSERT, UPDATE, DELETE as needed
```

### 3. Authentication Setup

1. Go to Authentication → Providers in Supabase
2. Enable Email authentication
3. Configure email templates (optional)
4. Set up OAuth providers if needed (Google, GitHub, etc.)

### 4. API Keys

1. Go to Project Settings → API
2. Copy your project URL and anon key
3. Keep the service role key secure (never expose in frontend)

## Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

For production deployment platforms, set these as environment variables in your hosting provider's dashboard.

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI** (optional)
   ```bash
   pnpm add -g vercel
   ```

2. **Deploy via CLI**
   ```bash
   vercel
   ```

3. **Or connect via GitHub**
   - Push code to GitHub
   - Import project in Vercel dashboard
   - Configure environment variables
   - Deploy automatically on push

4. **Configure Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Option 2: Netlify

1. **Install Netlify CLI** (optional)
   ```bash
   pnpm add -g netlify-cli
   ```

2. **Deploy via CLI**
   ```bash
   pnpm run build
   netlify deploy --prod
   ```

3. **Or connect via GitHub**
   - Push code to GitHub
   - Import project in Netlify dashboard
   - Build command: `pnpm run build`
   - Publish directory: `dist`
   - Add environment variables

### Option 3: Custom Server (VPS/Cloud)

1. **Build the application**
   ```bash
   pnpm run build
   ```

2. **Serve with a web server**
   
   Using Nginx:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       root /path/to/business-management-app/dist;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

3. **Set up SSL with Let's Encrypt**
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

### Option 4: Docker

1. **Create Dockerfile**
   ```dockerfile
   FROM node:22-alpine
   WORKDIR /app
   COPY package.json pnpm-lock.yaml ./
   RUN npm install -g pnpm && pnpm install
   COPY . .
   RUN pnpm run build
   
   FROM nginx:alpine
   COPY --from=0 /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Build and run**
   ```bash
   docker build -t business-management-app .
   docker run -p 80:80 business-management-app
   ```

## Post-Deployment Steps

### 1. Verify Deployment

- [ ] Application loads correctly
- [ ] All pages are accessible
- [ ] Supabase connection works
- [ ] Data operations (CRUD) function properly
- [ ] Charts and visualizations render

### 2. Set Up Monitoring

- Enable Supabase monitoring in the dashboard
- Set up error tracking (Sentry, LogRocket, etc.)
- Configure uptime monitoring

### 3. Performance Optimization

- Enable CDN for static assets
- Configure caching headers
- Optimize images
- Enable compression (gzip/brotli)

### 4. Security Hardening

- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] CORS properly set up
- [ ] API keys secured
- [ ] RLS policies tested
- [ ] Rate limiting configured (if needed)

### 5. Backup Strategy

- Enable Supabase automatic backups
- Set up regular database exports
- Document recovery procedures

## Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

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
          node-version: '22'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Troubleshooting

### Build Fails

- Check Node.js version (requires 22+)
- Verify all dependencies are installed
- Check for TypeScript/ESLint errors

### Supabase Connection Issues

- Verify environment variables are set correctly
- Check Supabase project is active
- Verify API keys are valid
- Check CORS settings in Supabase

### Routing Issues (404 on refresh)

- Configure server to serve `index.html` for all routes
- For Netlify: Add `_redirects` file with `/* /index.html 200`
- For Vercel: Add `vercel.json` with rewrites configuration

### Performance Issues

- Enable production mode
- Optimize bundle size
- Use code splitting
- Enable caching
- Use CDN for assets

## Maintenance

### Regular Tasks

- Monitor error logs
- Review Supabase usage and costs
- Update dependencies regularly
- Backup database
- Review and optimize RLS policies
- Monitor application performance

### Updates

1. Test updates in development
2. Create a backup
3. Deploy to staging (if available)
4. Test thoroughly
5. Deploy to production
6. Monitor for issues

## Support

For deployment issues or questions:
- Check Supabase documentation: https://supabase.com/docs
- Review Vite deployment guide: https://vitejs.dev/guide/static-deploy.html
- Consult hosting provider documentation

---

**Last Updated**: October 2025

